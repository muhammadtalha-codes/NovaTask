import { db } from "@/lib/db";
import { serializeTask, serializeReminder } from "@/lib/serialize";
import { nextOccurrence } from "@/lib/recurring";
import type {
  AIAction,
  AIActionResult,
  Priority,
  RecurringRule,
  ScheduleBlock,
  Task,
  TaskStatus,
  TaskType,
} from "@/types";

// Helper: parse recurring JSON safely
function parseRecurring(s: string | null | undefined): RecurringRule {
  if (!s) return { type: "NONE" };
  try {
    return JSON.parse(s) as RecurringRule;
  } catch {
    return { type: "NONE" };
  }
}

// Resolve a target task by natural description (title contains / subject match / id)
async function findTaskByReference(
  userId: string,
  ref: string
): Promise<string | null> {
  if (!ref) return null;
  // direct id?
  const byId = await db.task.findUnique({ where: { id: ref } });
  if (byId && byId.userId === userId) return byId.id;

  // by exact title (case-insensitive)
  const tasks = await db.task.findMany({ where: { userId } });
  const refLower = ref.toLowerCase().trim();
  // best match: title includes ref, prefer incomplete
  let best: { id: string; score: number } | null = null;
  for (const t of tasks) {
    const title = t.title.toLowerCase();
    const subject = (t.subject ?? "").toLowerCase();
    let score = 0;
    if (title === refLower) score = 100;
    else if (title.includes(refLower)) score = 70;
    else if (subject && subject.includes(refLower)) score = 50;
    else if (refLower.includes(title) && title.length > 3) score = 40;
    if (score > 0 && (best === null || score > best.score)) {
      best = { id: t.id, score };
    }
  }
  return best?.id ?? null;
}

function clampPriority(p?: string): Priority {
  const v = String(p ?? "MEDIUM").toUpperCase();
  return v === "HIGH" || v === "LOW" ? v : "MEDIUM";
}
function clampStatus(p?: string): TaskStatus {
  const v = String(p ?? "PENDING").toUpperCase();
  if (v === "COMPLETED" || v === "IN_PROGRESS" || v === "PENDING") return v;
  return "PENDING";
}
function clampType(t?: string): TaskType {
  const v = String(t ?? "OTHER").toUpperCase();
  const allowed: TaskType[] = [
    "ASSIGNMENT",
    "QUIZ",
    "EXAM",
    "MEETING",
    "PROJECT",
    "STUDY",
    "PERSONAL",
    "OTHER",
  ];
  return (allowed as string[]).includes(v) ? (v as TaskType) : "OTHER";
}

function toISODate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

export async function executeAction(
  userId: string,
  action: AIAction
): Promise<AIActionResult> {
  try {
    switch (action.type) {
      case "CREATE_TASK": {
        const p = action.params || {};
        const title = String(p.title ?? "Untitled task").trim();
        // Compute dates. date may be "tomorrow", "friday", ISO, etc. AI should
        // pass ISO strings, but we guard.
        const date = toISODate(p.date);
        const deadline = toISODate(p.deadline ?? p.date);
        const time = p.time ? String(p.time) : null;
        const priority = clampPriority(p.priority);
        const type = clampType(p.type);
        const subject = p.subject ? String(p.subject) : null;
        const description = p.description ? String(p.description) : null;
        const recurring: RecurringRule =
          p.recurring && typeof p.recurring === "object"
            ? { type: "NONE", ...p.recurring }
            : { type: "NONE" };

        // reminder
        const reminderEnabled = !!p.remindAt;
        const reminderTime = toISODate(p.remindAt);

        const created = await db.task.create({
          data: {
            userId,
            title,
            description,
            subject,
            type,
            date,
            time,
            deadline,
            priority,
            status: "PENDING",
            reminderEnabled,
            reminderTime,
            recurring: JSON.stringify(recurring),
            notes: p.notes ? String(p.notes) : null,
            order: p.order ? Number(p.order) : 0,
          },
        });

        // also create a reminder record if remindAt set
        let reminder: any = null;
        if (reminderEnabled && reminderTime) {
          reminder = await db.reminder.create({
            data: {
              userId,
              taskId: created.id,
              title: `Reminder: ${title}`,
              message: description ?? undefined,
              time: reminderTime,
              status: "PENDING",
            },
          });
        }

        // create subtasks if provided
        let subtasks: any[] = [];
        if (Array.isArray(p.subtasks) && p.subtasks.length > 0) {
          for (let i = 0; i < p.subtasks.length; i++) {
            const st = p.subtasks[i];
            const stTitle = typeof st === "string" ? st : String(st?.title ?? "").trim();
            if (!stTitle) continue;
            subtasks.push(
              await db.subtask.create({
                data: { taskId: created.id, title: stTitle, order: i },
              })
            );
          }
        }

        // record a notification for the new task
        await db.notification.create({
          data: {
            userId,
            kind: "ai",
            title: `New task: ${title}`,
            message: subject ? `Subject: ${subject} · ${priority} priority` : `${priority} priority`,
            link: created.id,
          },
        });

        // Build a task shape that serializeTask can consume in one pass.
        // created.subtasks is undefined here (db.task.create didn't include it),
        // so attach the raw Prisma subtask rows — serializeTask will serialize them.
        const taskForSerialize = subtasks.length
          ? { ...created, subtasks }
          : created;

        return {
          ok: true,
          type: "CREATE_TASK",
          summary: `Created "${title}"${subject ? ` (${subject})` : ""} — ${priority} priority${
            subtasks.length ? ` with ${subtasks.length} subtask${subtasks.length > 1 ? "s" : ""}` : ""
          }.`,
          created: [serializeTask(taskForSerialize)],
          reminders: reminder ? [serializeReminder(reminder)] : undefined,
        };
      }

      case "UPDATE_TASK": {
        const p = action.params || {};
        const id = await findTaskByReference(userId, p.id ?? p.title ?? p.ref);
        if (!id) {
          return {
            ok: false,
            type: "UPDATE_TASK",
            summary: `Could not find a task matching "${p.id ?? p.title ?? p.ref}".`,
          };
        }
        const data: any = {};
        if (p.title) data.title = String(p.title);
        if (p.description !== undefined) data.description = p.description ? String(p.description) : null;
        if (p.subject !== undefined) data.subject = p.subject ? String(p.subject) : null;
        if (p.type) data.type = clampType(p.type);
        if (p.priority) data.priority = clampPriority(p.priority);
        if (p.status) data.status = clampStatus(p.status);
        if (p.date !== undefined) {
          const d = toISODate(p.date);
          data.date = d;
          if (p.deadline === undefined) data.deadline = d;
        }
        if (p.time !== undefined) data.time = p.time ? String(p.time) : null;
        if (p.deadline !== undefined) data.deadline = toISODate(p.deadline);
        if (p.notes !== undefined) data.notes = p.notes ? String(p.notes) : null;
        if (p.recurring) data.recurring = JSON.stringify(p.recurring);
        if (p.remindAt !== undefined) {
          const rt = toISODate(p.remindAt);
          data.reminderEnabled = !!rt;
          data.reminderTime = rt;
        }

        const updated = await db.task.update({ where: { id }, data });
        return {
          ok: true,
          type: "UPDATE_TASK",
          summary: `Updated "${updated.title}".`,
          updated: [serializeTask(updated)],
        };
      }

      case "DELETE_TASK": {
        const p = action.params || {};
        const id = await findTaskByReference(userId, p.id ?? p.title ?? p.ref);
        if (!id) {
          return {
            ok: false,
            type: "DELETE_TASK",
            summary: `Could not find a task matching "${p.id ?? p.title ?? p.ref}".`,
          };
        }
        const t = await db.task.delete({ where: { id } });
        return {
          ok: true,
          type: "DELETE_TASK",
          summary: `Deleted "${t.title}".`,
          deleted: [id],
        };
      }

      case "COMPLETE_TASK": {
        const p = action.params || {};
        const id = await findTaskByReference(userId, p.id ?? p.title ?? p.ref);
        if (!id) {
          return {
            ok: false,
            type: "COMPLETE_TASK",
            summary: `Could not find a task matching "${p.id ?? p.title ?? p.ref}".`,
          };
        }
        const before = await db.task.findUnique({ where: { id } });
        const updated = await db.task.update({
          where: { id },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
        // Recurring-task expansion: spawn next occurrence if applicable.
        let nextCreated: any = null;
        if (before?.recurring && before.recurring !== '{"type":"NONE"}') {
          try {
            const rule = JSON.parse(before.recurring);
            const nextDate = nextOccurrence(rule, before.date ?? before.deadline);
            if (nextDate) {
              nextCreated = await db.task.create({
                data: {
                  userId,
                  title: before.title,
                  description: before.description,
                  subject: before.subject,
                  type: before.type,
                  date: nextDate,
                  time: before.time,
                  priority: before.priority,
                  status: "PENDING",
                  recurring: before.recurring,
                  notes: before.notes,
                },
              });
            }
          } catch {
            /* ignore malformed recurring JSON */
          }
        }
        return {
          ok: true,
          type: "COMPLETE_TASK",
          summary:
            `Marked "${updated.title}" as completed.` +
            (nextCreated ? " Next occurrence scheduled." : " Nice work!"),
          updated: [serializeTask(updated), ...(nextCreated ? [serializeTask(nextCreated)] : [])],
        };
      }

      case "RESCHEDULE_TASK": {
        const p = action.params || {};
        const id = await findTaskByReference(userId, p.id ?? p.title ?? p.ref);
        if (!id) {
          return {
            ok: false,
            type: "RESCHEDULE_TASK",
            summary: `Could not find a task matching "${p.id ?? p.title ?? p.ref}".`,
          };
        }
        const data: any = {};
        if (p.date) data.date = toISODate(p.date);
        if (p.time !== undefined) data.time = p.time ? String(p.time) : null;
        if (p.deadline) data.deadline = toISODate(p.deadline);
        const updated = await db.task.update({ where: { id }, data });
        return {
          ok: true,
          type: "RESCHEDULE_TASK",
          summary: `Rescheduled "${updated.title}".`,
          updated: [serializeTask(updated)],
        };
      }

      case "SET_PRIORITY": {
        const p = action.params || {};
        const id = await findTaskByReference(userId, p.id ?? p.title ?? p.ref);
        if (!id) {
          return {
            ok: false,
            type: "SET_PRIORITY",
            summary: `Could not find a task matching "${p.id ?? p.title ?? p.ref}".`,
          };
        }
        const updated = await db.task.update({
          where: { id },
          data: { priority: clampPriority(p.priority) },
        });
        return {
          ok: true,
          type: "SET_PRIORITY",
          summary: `Set "${updated.title}" to ${updated.priority} priority.`,
          updated: [serializeTask(updated)],
        };
      }

      case "CREATE_REMINDER": {
        const p = action.params || {};
        const time = toISODate(p.time ?? p.at);
        if (!time) {
          return {
            ok: false,
            type: "CREATE_REMINDER",
            summary: "I couldn't understand the reminder time. Please specify a date and time.",
          };
        }
        const title = String(p.title ?? "Reminder");
        const taskId = p.taskId
          ? await findTaskByReference(userId, p.taskId)
          : null;
        const reminder = await db.reminder.create({
          data: {
            userId,
            taskId,
            title,
            message: p.message ? String(p.message) : null,
            time,
            status: "PENDING",
          },
        });
        return {
          ok: true,
          type: "CREATE_REMINDER",
          summary: `Reminder set for "${title}" at ${time.toLocaleString()}.`,
          reminders: [serializeReminder(reminder)],
        };
      }

      case "SNOOZE_REMINDER": {
        const p = action.params || {};
        const minutes = Number(p.minutes ?? 10);
        const snoozeUntil = new Date(Date.now() + minutes * 60 * 1000);
        // find the most recent pending reminder for the user
        let reminder = p.id
          ? await db.reminder.findUnique({ where: { id: String(p.id) } })
          : await db.reminder.findFirst({
              where: { userId, status: "PENDING" },
              orderBy: { time: "asc" },
            });
        if (!reminder || reminder.userId !== userId) {
          return {
            ok: false,
            type: "SNOOZE_REMINDER",
            summary: "No pending reminder found to snooze.",
          };
        }
        reminder = await db.reminder.update({
          where: { id: reminder.id },
          data: { status: "SNOOZED", snoozedUntil: snoozeUntil },
        });
        return {
          ok: true,
          type: "SNOOZE_REMINDER",
          summary: `Snoozed reminder for ${minutes} minutes.`,
          reminders: [serializeReminder(reminder)],
        };
      }

      case "COMPLETE_REMINDER": {
        const p = action.params || {};
        let reminder = p.id
          ? await db.reminder.findUnique({ where: { id: String(p.id) } })
          : null;
        if (!reminder) {
          reminder = await db.reminder.findFirst({
            where: { userId, status: { in: ["PENDING", "SNOOZED"] } },
            orderBy: { time: "asc" },
          });
        }
        if (!reminder || reminder.userId !== userId) {
          return {
            ok: false,
            type: "COMPLETE_REMINDER",
            summary: "No reminder to complete.",
          };
        }
        reminder = await db.reminder.update({
          where: { id: reminder.id },
          data: { status: "COMPLETED" },
        });
        return {
          ok: true,
          type: "COMPLETE_REMINDER",
          summary: `Marked reminder "${reminder.title}" as done.`,
          reminders: [serializeReminder(reminder)],
        };
      }

      case "GET_TASKS": {
        const p = action.params || {};
        const where: any = { userId };
        if (p.status) where.status = clampStatus(p.status);
        if (p.priority) where.priority = clampPriority(p.priority);
        if (p.subject)
          where.subject = { contains: String(p.subject) };
        if (p.dateRange) {
          const from = toISODate(p.dateRange.from);
          const to = toISODate(p.dateRange.to);
          if (from || to) {
            where.AND = [];
            if (from) where.AND.push({ date: { gte: from } });
            if (to) where.AND.push({ date: { lte: to } });
          }
        }
        const tasks = await db.task.findMany({
          where,
          orderBy: [{ date: "asc" }, { priority: "desc" }],
          take: 50,
        });
        return {
          ok: true,
          type: "GET_TASKS",
          summary: `Found ${tasks.length} task(s).`,
          query: { tasks: tasks.map(serializeTask) },
        };
      }

      case "GET_UPCOMING_DEADLINES": {
        const p = action.params || {};
        const days = Number(p.days ?? 7);
        const from = new Date();
        const to = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
        const tasks = await db.task.findMany({
          where: {
            userId,
            status: { not: "COMPLETED" },
            deadline: { gte: from, lte: to },
          },
          orderBy: { deadline: "asc" },
          take: 20,
        });
        return {
          ok: true,
          type: "GET_UPCOMING_DEADLINES",
          summary: `Found ${tasks.length} upcoming deadline(s).`,
          query: { deadlines: tasks.map(serializeTask) },
        };
      }

      case "GENERATE_DAILY_PLAN":
      case "CREATE_SCHEDULE": {
        const p = action.params || {};
        const targetDate = p.date ? new Date(p.date) : new Date();
        targetDate.setHours(0, 0, 0, 0);
        const end = new Date(targetDate);
        end.setDate(end.getDate() + 1);

        const tasks = await db.task.findMany({
          where: {
            userId,
            status: { not: "COMPLETED" },
            OR: [
              { date: { gte: targetDate, lt: end } },
              { deadline: { gte: targetDate, lt: end } },
              { date: null, deadline: null }, // unscheduled, include
            ],
          },
          orderBy: [{ priority: "desc" }, { deadline: "asc" }],
        });

        // Build a simple schedule from 8:00 to 22:00
        const blocks: ScheduleBlock[] = [];
        const sorted = [...tasks].sort((a, b) => {
          const pr = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
          if (pr[a.priority as Priority] !== pr[b.priority as Priority])
            return pr[a.priority as Priority] - pr[b.priority as Priority];
          const ad = a.deadline?.getTime() ?? a.date?.getTime() ?? Infinity;
          const bd = b.deadline?.getTime() ?? b.date?.getTime() ?? Infinity;
          return ad - bd;
        });

        let cursor = new Date(targetDate);
        cursor.setHours(8, 0, 0, 0);
        for (const t of sorted.slice(0, 8)) {
          const durationMin =
            t.type === "QUIZ" || t.type === "EXAM"
              ? 60
              : t.priority === "HIGH"
              ? 90
              : 60;
          const start = new Date(cursor);
          const end = new Date(cursor.getTime() + durationMin * 60 * 1000);
          // skip past 22:00
          if (end.getHours() >= 22) break;
          const reason = explainPriority(t);
          blocks.push({
            start: start.toISOString(),
            end: end.toISOString(),
            title: t.title,
            reason,
            taskId: t.id,
            priority: t.priority as Priority,
            type: t.type as TaskType,
          });
          cursor = new Date(end.getTime() + 10 * 60 * 1000); // 10 min break
        }

        // persist plan
        await db.plan.create({
          data: {
            userId,
            date: targetDate,
            content: JSON.stringify(blocks),
            summary: p.summary ?? null,
          },
        });

        return {
          ok: true,
          type: action.type,
          summary: blocks.length
            ? `Generated a daily plan with ${blocks.length} block(s).`
            : "No tasks to schedule today — enjoy the breather!",
          schedule: blocks,
        };
      }

      case "ANSWER":
      default:
        return {
          ok: true,
          type: "ANSWER",
          summary: action.params?.message ?? "Answered.",
        };
    }
  } catch (e: any) {
    console.error("[executeAction] error", e);
    return {
      ok: false,
      type: action.type,
      summary: `I ran into an issue while performing that action. ${e?.message ?? ""}`.trim(),
    };
  }
}

function explainPriority(t: any): string {
  const reasons: string[] = [];
  const now = Date.now();
  if (t.deadline) {
    const hours = (t.deadline.getTime() - now) / 3.6e6;
    if (hours < 24) reasons.push("deadline within 24h");
    else if (hours < 72) reasons.push("deadline in a couple of days");
  }
  if (t.priority === "HIGH") reasons.push("high priority");
  if (t.type === "QUIZ" || t.type === "EXAM") reasons.push("needs focused review");
  if (t.type === "ASSIGNMENT") reasons.push("assignment");
  if (reasons.length === 0) reasons.push("steady progress");
  return reasons.join(", ");
}
