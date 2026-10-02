import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, getUserPreferences } from "@/lib/session";
import { runAIChat } from "@/lib/ai/service";
import { executeAction } from "@/lib/ai/executor";
import type { AIAction, AIActionResult } from "@/types";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));
    const message = String(body.message ?? "").trim();
    if (!message) {
      return NextResponse.json({ error: "Please provide a message." }, { status: 400 });
    }
    const prefs = await getUserPreferences(userId);
    const tone = prefs?.ai.tone ?? "friendly";

    // Load chat history for context (last 12)
    const historyRows = await db.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 12,
    });
    const history = historyRows
      .reverse()
      .map((m) => ({ role: m.role, content: m.content }));

    // 1. Run AI -> get reply + actions
    const { reply, actions } = await runAIChat(userId, message, history, tone);

    // 2. Execute each action against the DB
    const results: AIActionResult[] = [];
    for (const a of actions) {
      const r = await executeAction(userId, a as AIAction);
      results.push(r);
    }

    // 3. Persist chat messages
    await db.chatMessage.create({
      data: { userId, role: "user", content: message },
    });
    await db.chatMessage.create({
      data: {
        userId,
        role: "assistant",
        content: reply,
        actionData: JSON.stringify({ actions, results }),
      },
    });

    // 4. Refresh current data so the UI updates immediately
    const [tasks, reminders, notifications, unreadCount] = await Promise.all([
      db.task.findMany({
        where: { userId },
        orderBy: [{ date: "asc" }, { priority: "desc" }],
        take: 200,
        include: { subtasks: { orderBy: { order: "asc" } } },
      }),
      db.reminder.findMany({
        where: { userId },
        orderBy: { time: "asc" },
        take: 200,
      }),
      db.notification.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.notification.count({ where: { userId, read: false } }),
    ]);

    return NextResponse.json({
      reply,
      actions,
      results,
      // fresh snapshots for the frontend store
      tasks: tasks.map((t) => serializeTask(t)),
      reminders: reminders.map((r) => ({
        id: r.id,
        taskId: r.taskId ?? null,
        title: r.title,
        message: r.message ?? null,
        time: r.time ? r.time.toISOString() : null,
        status: r.status ?? "PENDING",
        snoozedUntil: r.snoozedUntil ? r.snoozedUntil.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
      })),
      notifications: notifications.map((n) => ({
        id: n.id,
        kind: n.kind ?? "info",
        title: n.title,
        message: n.message ?? null,
        link: n.link ?? null,
        read: !!n.read,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadNotifications: unreadCount,
    });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[ai/chat] error", e);
    // Friendly fallback — don't expose raw stack to the user
    return NextResponse.json(
      {
        error:
          "Nova had trouble responding right now. Please try again in a moment.",
        detail: e?.message,
      },
      { status: 500 }
    );
  }
}

function serializeTask(t: any) {
  let recurring = { type: "NONE" };
  try {
    recurring = JSON.parse(t.recurring ?? '{"type":"NONE"}');
  } catch {}
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    subject: t.subject ?? null,
    type: t.type ?? "OTHER",
    date: t.date ? t.date.toISOString() : null,
    time: t.time ?? null,
    deadline: t.deadline ? t.deadline.toISOString() : null,
    priority: t.priority ?? "MEDIUM",
    status: t.status ?? "PENDING",
    reminderEnabled: !!t.reminderEnabled,
    reminderTime: t.reminderTime ? t.reminderTime.toISOString() : null,
    recurring,
    notes: t.notes ?? null,
    order: t.order ?? 0,
    completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}
