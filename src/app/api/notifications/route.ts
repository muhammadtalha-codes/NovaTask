import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { serializeNotification } from "@/lib/serialize";
import { z } from "zod";

// GET /api/notifications — list recent notifications for the user.
// Also returns due-reminder polling data (backward compat for the topbar
// badge + browser-notification polling in use-app-data.ts).
export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "1";
    const where: any = { userId };
    if (unreadOnly) where.read = false;
    const [items, unreadCount] = await Promise.all([
      db.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.notification.count({ where: { userId, read: false } }),
    ]);

    // Due-reminder polling (backward compat)
    const now = new Date();
    const horizon = new Date(now.getTime() + 15 * 60 * 1000);
    const dueReminders = await db.reminder.findMany({
      where: { userId, status: "PENDING", time: { lte: horizon } },
      orderBy: { time: "asc" },
      take: 20,
    });
    const dueTasks = await db.task.findMany({
      where: {
        userId,
        reminderEnabled: true,
        status: { not: "COMPLETED" },
        reminderTime: { lte: horizon },
      },
      take: 20,
    });

    return NextResponse.json({
      notifications: items.map(serializeNotification),
      unread: unreadCount,
      // legacy fields used by the topbar badge + browser-notification polling
      reminders: dueReminders.map((r) => ({
        id: r.id,
        title: r.title,
        message: r.message,
        time: r.time ? r.time.toISOString() : null,
        taskId: r.taskId,
      })),
      taskReminders: dueTasks.map((t) => ({
        id: t.id,
        title: `Reminder: ${t.title}`,
        time: t.reminderTime ? t.reminderTime.toISOString() : null,
        taskId: t.id,
      })),
    });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to load notifications." }, { status: 500 });
  }
}

const createSchema = z.object({
  kind: z.string().optional(),
  title: z.string().min(1).max(200),
  message: z.string().nullable().optional(),
  link: z.string().nullable().optional(),
});

// POST /api/notifications — create a notification (used internally + by AI)
export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid notification" },
        { status: 400 }
      );
    }
    const created = await db.notification.create({
      data: {
        userId,
        kind: parsed.data.kind ?? "info",
        title: parsed.data.title,
        message: parsed.data.message ?? null,
        link: parsed.data.link ?? null,
      },
    });
    return NextResponse.json({ notification: serializeNotification(created) });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to create notification." }, { status: 500 });
  }
}

// PATCH /api/notifications — mark all as read
export async function PATCH() {
  try {
    const userId = await requireUserId();
    await db.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to update notifications." }, { status: 500 });
  }
}
