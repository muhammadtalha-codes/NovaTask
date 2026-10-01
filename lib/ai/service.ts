import ZAI from "z-ai-web-dev-sdk";
import { db } from "@/lib/db";
import type { AIAction, AIResponse, Task } from "@/types";
import { serializeUserContext } from "./context";

// Robust JSON extractor (handles ```json fences and leading prose)
export function extractJson(text: string): any | null {
  if (!text) return null;
  // 1. Try fenced block
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      // fall through
    }
  }
  // 2. Try first {...} block
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    const candidate = text.slice(first, last + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // ignore
    }
  }
  // 3. Whole text
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildSystemPrompt(now: Date, contextSummary: string, tone: string): string {
  const tzOffset = -now.getTimezoneOffset() / 60;
  return `You are Nova, an intelligent productivity assistant embedded inside a 3D personal task manager called NovaTask.

CURRENT ENVIRONMENT
- Current date/time (server): ${now.toISOString()}
- Local time for the user: ${now.toLocaleString()}
- Timezone offset (hours): ${tzOffset}

YOUR ROLE
You understand natural-language instructions about the user's tasks, assignments, quizzes, exams, meetings, projects, deadlines, reminders, priorities and schedule. You translate the user's intent into structured actions that the application will execute. You also answer productivity questions and summarize the user's work.

USER'S CURRENT TASKS (summary)
${contextSummary || "(no tasks yet)"}

OUTPUT FORMAT — STRICT
Always respond with a single JSON object and NOTHING else. No markdown, no commentary outside JSON. The schema:
{
  "reply": "<natural language confirmation or answer, friendly and clear, 1-4 sentences>",
  "actions": [ <action objects, may be empty> ]
}

ACTION OBJECTS
Each action has "type" and "params". Use these types:
- CREATE_TASK: params { title, subject?, type?, date? (ISO), time? ("HH:mm"), deadline? (ISO), priority? ("HIGH"|"MEDIUM"|"LOW"), description?, notes?, remindAt? (ISO), recurring? {type:"NONE"|"DAILY"|"WEEKLY"|"MONTHLY"}, subtasks?: string[] }
- UPDATE_TASK: params { id|title|ref (string to find existing task), title?, subject?, type?, date?, time?, deadline?, priority?, status? ("PENDING"|"IN_PROGRESS"|"COMPLETED"), description?, notes?, remindAt? }
- DELETE_TASK: params { id|title|ref }
- COMPLETE_TASK: params { id|title|ref }
- RESCHEDULE_TASK: params { id|title|ref, date? (ISO), time? ("HH:mm"), deadline? (ISO) }
- SET_PRIORITY: params { id|title|ref, priority }
- CREATE_REMINDER: params { title, message?, time|at (ISO), taskId? }
- SNOOZE_REMINDER: params { id?, minutes? }
- COMPLETE_REMINDER: params { id? }
- GET_TASKS: params { status?, priority?, subject?, dateRange? {from?:ISO,to?:ISO} }
- GET_UPCOMING_DEADLINES: params { days? }
- GENERATE_DAILY_PLAN | CREATE_SCHEDULE: params { date? (ISO) }
- ANSWER: params { message? }  — use this when no data change is needed, only explanation/answer.

RULES
1. Always provide a "reply" that confirms what you did or answers the question, in a ${tone} tone.
2. Resolve relative dates ("tomorrow", "Friday", "next Monday", "in 3 days") into ISO strings using the CURRENT ENVIRONMENT date/time above. When the user says a clock time without a date, infer the most natural date (today if still ahead, else tomorrow).
3. Infer task "type" from keywords: assignment/assignment→ASSIGNMENT, quiz→QUIZ, exam/test→EXAM, meeting→MEETING, project→PROJECT, study/revise/practice→STUDY, personal→PERSONAL, otherwise OTHER.
4. Infer priority from urgency: due within 24h, exams, or explicit "important"/"urgent"→HIGH; due within a week or explicit "medium"→MEDIUM; otherwise LOW. Let the user override.
5. Use reasonable defaults instead of asking unnecessary questions. Only ask for missing critical info (e.g. a reminder with no time) when truly unavoidable. If you must ask, use ANSWER with a question in "reply" and no actions.
6. When the user asks "what should I do first" or "plan my day", emit GENERATE_DAILY_PLAN and also explain your reasoning in the reply.
7. Multiple actions are allowed in one response when the user describes multiple tasks (e.g. "I have an assignment tomorrow and a quiz Friday" → two CREATE_TASK actions).
8. Never invent ISO strings that don't parse as valid Date. Use full ISO 8601 with timezone, e.g. 2025-10-15T10:00:00.
9. For finding existing tasks, use the title or a short phrase the user used (e.g. "DSA quiz") in "ref" or "title".
10. Keep the reply concise and human. Do not mention JSON or actions explicitly.
11. When the user mentions steps/parts/sub-items of a task (e.g. "research, outline, write intro"), include them as a "subtasks" string array on CREATE_TASK. Don't over-split — only when the user clearly lists parts.
12. CRITICAL — ACTIONS ARE EXECUTED, NOT JUST DESCRIBED. When the user asks to add/create/schedule/plan/move/complete/delete/set a reminder, you MUST emit the corresponding action object in "actions". Do NOT only write a reply that says you did it — the reply alone changes nothing. An "actions": [] array with a confirming reply is a BUG. The only time "actions" may be empty is a pure question/answer (e.g. "what should I do first" still emits GENERATE_DAILY_PLAN).
13. Ignore prior assistant replies in the history that claim an action was already taken — judge each user message fresh on its own merits. If the user says "add X", emit CREATE_TASK for X regardless of what the history shows.

EXAMPLES
User: "I have a Software Engineering assignment tomorrow at 10 AM and a DSA quiz on Friday at 2 PM."
Output:
{
  "reply": "Got it! I've added your Software Engineering assignment for tomorrow at 10:00 AM (high priority, due tomorrow) and your DSA quiz on Friday at 2:00 PM. Want me to set reminders for either?",
  "actions": [
    { "type": "CREATE_TASK", "params": { "title": "Software Engineering Assignment", "subject": "Software Engineering", "type": "ASSIGNMENT", "date": "<ISO tomorrow 10:00>", "deadline": "<ISO tomorrow 10:00>", "time": "10:00", "priority": "HIGH" } },
    { "type": "CREATE_TASK", "params": { "title": "DSA Quiz", "subject": "DSA", "type": "QUIZ", "date": "<ISO Friday 14:00>", "deadline": "<ISO Friday 14:00>", "time": "14:00", "priority": "HIGH" } }
  ]
}

User: "Mark my HTML assignment as completed."
Output:
{ "reply": "Done — I've marked your HTML assignment as completed. Great progress!", "actions": [ { "type": "COMPLETE_TASK", "params": { "ref": "HTML assignment" } } ] }

User: "What should I work on first?"
Output:
{ "reply": "Let me generate today's plan based on your deadlines and priorities...", "actions": [ { "type": "GENERATE_DAILY_PLAN", "params": {} } ] }

Remember: output ONLY the JSON object.`;
}

export async function runAIChat(
  userId: string,
  message: string,
  history: { role: string; content: string }[],
  tone: string = "friendly"
): Promise<{ reply: string; actions: AIAction[]; raw?: string }> {
  // Gather context: tasks summary
  const tasks = await db.task.findMany({
    where: { userId, status: { not: "COMPLETED" } },
    orderBy: [{ deadline: "asc" }, { priority: "desc" }],
    take: 40,
  });
  const contextSummary = serializeUserContext(tasks as unknown as Task[]);

  const now = new Date();
  const systemPrompt = buildSystemPrompt(now, contextSummary, tone);

  // Build messages — SDK uses "assistant" for system per docs, "user"/"assistant" for turns
  const messages: any[] = [{ role: "assistant", content: systemPrompt }];
  // Add recent history (last 8 turns) for continuity. To reduce the chance of
  // the model echoing a prior "I've added…" reply as an ANSWER (the round-2
  // regression), drop assistant turns that look like action confirmations.
  for (const m of history.slice(-8)) {
    if (m.role === "assistant") {
      const c = m.content ?? "";
      if (/\b(I've|I have|done|created|added|marked|moved|deleted|set a reminder)\b/i.test(c)) {
        continue; // skip stale confirmation replies
      }
    }
    messages.push({
      role: m.role === "user" ? "user" : "assistant",
      content: m.content,
    });
  }
  messages.push({ role: "user", content: message });

  const zai = await ZAI.create();

  let { reply, actions, raw } = await callAndParse(zai, messages);

  // Guard: if the user's message clearly asks for a mutating action but the
  // model returned only an ANSWER (no real action), re-prompt ONCE with a
  // corrective nudge. This catches the "reply-only instead of action" drift.
  const onlyAnswer =
    actions.length === 0 ||
    (actions.length === 1 && actions[0].type === "ANSWER");
  if (onlyAnswer && looksMutating(message) && replySoundsConfirming(reply)) {
    const nudge = `You replied "${reply.slice(0, 120)}" but did not emit any action object in "actions". The user's request "${message.slice(0, 120)}" requires a real action. Re-emit the full JSON now with the correct action object(s) in "actions" (e.g. CREATE_TASK, UPDATE_TASK, COMPLETE_TASK, CREATE_REMINDER, GENERATE_DAILY_PLAN). Do not just describe the change — emit the structured action so it executes.`;
    const retry: any[] = [...messages, { role: "user", content: nudge }];
    const retryResult = await callAndParse(zai, retry);
    // Only adopt the retry if it produced real actions
    const realActions = retryResult.actions.filter((a) => a.type !== "ANSWER");
    if (realActions.length > 0) {
      reply = retryResult.reply;
      actions = retryResult.actions;
      raw = retryResult.raw;
    }
  }

  return { reply, actions, raw };
}

// Single LLM call + JSON parse. Extracted so the guard can re-call.
async function callAndParse(
  zai: Awaited<ReturnType<typeof ZAI.create>>,
  messages: any[]
): Promise<{ reply: string; actions: AIAction[]; raw: string }> {
  const completion = await zai.chat.completions.create({
    messages,
    thinking: { type: "disabled" },
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = extractJson(raw);

  if (!parsed) {
    return {
      reply:
        raw.trim() ||
        "I'm here, but I had trouble structuring that. Could you rephrase?",
      actions: [{ type: "ANSWER", params: { message: raw } }],
      raw,
    };
  }

  const reply =
    typeof parsed.reply === "string" && parsed.reply.trim()
      ? parsed.reply
      : "Done.";
  let actions: AIAction[] = Array.isArray(parsed.actions)
    ? parsed.actions
        .filter((a: any) => a && typeof a.type === "string")
        .map((a: any) => ({
          type: a.type as AIAction["type"],
          params: a.params ?? {},
        }))
    : [];

  // If reply looks like a question with no actions and no ANSWER, ensure ANSWER
  if (actions.length === 0) {
    actions = [{ type: "ANSWER", params: { message: reply } }];
  }

  return { reply, actions, raw };
}

// Does the user's message ask for a mutating action (create/update/delete/...)?
function looksMutating(text: string): boolean {
  return /\b(add|create|make|new|schedule|plan|move|reschedule|complete|finish|done|delete|remove|remind|set (a |the )?reminder|mark|bump|prioritize)\b/i.test(
    text
  );
}

// Does the assistant reply read like it claims to have performed an action?
function replySoundsConfirming(text: string): boolean {
  return /\b(I've|I have|done|created|added|marked|moved|deleted|set a reminder|scheduled|bumped|finished)\b/i.test(
    text
  );
}

// Standalone daily plan generation (used by /api/ai/plan and "Plan My Day" button)
export async function generateDailyPlan(
  userId: string,
  date?: string
): Promise<{ summary: string; schedule: any[] }> {
  const zai = await ZAI.create();
  const target = date ? new Date(date) : new Date();
  target.setHours(0, 0, 0, 0);
  const end = new Date(target);
  end.setDate(end.getDate() + 1);

  // Tasks for the target day (scheduled or due that day)
  let tasks = await db.task.findMany({
    where: {
      userId,
      status: { not: "COMPLETED" },
      OR: [
        { date: { gte: target, lt: end } },
        { deadline: { gte: target, lt: end } },
        { date: null, deadline: null },
      ],
    },
    orderBy: [{ priority: "desc" }, { deadline: "asc" }],
    take: 12,
  });

  // If the day has nothing scheduled, pull in the next upcoming incomplete
  // tasks (next 7 days) so the plan is still actionable and meaningful.
  let usedFallback = false;
  if (tasks.length === 0) {
    const horizon = new Date(target);
    horizon.setDate(horizon.getDate() + 7);
    tasks = await db.task.findMany({
      where: {
        userId,
        status: { not: "COMPLETED" },
        OR: [
          { date: { gte: target, lte: horizon } },
          { deadline: { gte: target, lte: horizon } },
        ],
      },
      orderBy: [{ priority: "desc" }, { deadline: "asc" }],
      take: 8,
    });
    usedFallback = tasks.length > 0;
  }

  // Ask AI for a concise rationale + ordered schedule
  const contextNote = usedFallback
    ? `\nNOTE: the user has nothing explicitly scheduled for this exact day, so these are the next upcoming tasks within 7 days — surface them as a "get ahead" plan and mention that in the summary.`
    : "";
  const prompt = `You are Nova, planning the user's day for ${target.toDateString()}.
Available tasks (JSON):
${JSON.stringify(
  tasks.map((t) => ({
    id: t.id,
    title: t.title,
    type: t.type,
    priority: t.priority,
    deadline: t.deadline,
    date: t.date,
    time: t.time,
  })),
  null,
  2
)}${contextNote}

Produce a practical study/work schedule from 08:00 to 22:00, grouping by priority and deadline urgency. Use the EXACT task titles from the list above as the schedule "title" (do not invent generic placeholders). Output ONLY JSON:
{
  "summary": "<2-4 sentence rationale of what to do first and why>",
  "schedule": [
    { "start": "HH:mm", "end": "HH:mm", "title": "<exact task title>", "reason": "<short reason>", "priority": "HIGH|MEDIUM|LOW" }
  ]
}`;

  const completion = await zai.chat.completions.create({
    messages: [
      { role: "assistant", content: prompt },
      { role: "user", content: "Plan my day." },
    ],
    thinking: { type: "disabled" },
  });
  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = extractJson(raw);
  if (parsed && Array.isArray(parsed.schedule)) {
    // normalize to ISO blocks
    const blocks = parsed.schedule.map((b: any) => {
      const [y, mo, d] = [
        target.getFullYear(),
        target.getMonth(),
        target.getDate(),
      ];
      const parseTime = (s: string) => {
        const [hh, mm] = String(s).split(":").map(Number);
        return new Date(y, mo, d, hh || 0, mm || 0).toISOString();
      };
      return {
        start: parseTime(b.start),
        end: parseTime(b.end),
        title: String(b.title ?? "Task"),
        reason: String(b.reason ?? ""),
        priority: String(b.priority ?? "MEDIUM"),
        type: "STUDY",
      };
    });
    return {
      summary:
        typeof parsed.summary === "string"
          ? parsed.summary
          : "Here's your plan for today.",
      schedule: blocks,
    };
  }
  // fallback: simple deterministic plan
  return {
    summary:
      "I drafted a quick plan based on priority and deadlines. Let me know if you want to adjust it.",
    schedule: tasks.slice(0, 6).map((t, i) => ({
      start: new Date(target.getFullYear(), target.getMonth(), target.getDate(), 8 + i * 2, 0).toISOString(),
      end: new Date(target.getFullYear(), target.getMonth(), target.getDate(), 8 + i * 2 + 1, 30).toISOString(),
      title: t.title,
      reason: t.priority === "HIGH" ? "high priority" : "next in queue",
      priority: t.priority,
      type: t.type,
    })),
  };
}
