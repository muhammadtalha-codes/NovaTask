import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { z } from "zod";

function serializeReminder(r: any) {
  return {
    id: r.id,
    taskId: r.taskId ?? null,
    title: r.title,
    message: r.message ?? null,
    time: r.time ? r.time.toISOString() : null,
    status: r.status ?? "PENDING",
    snoozedUntil: r.snoozedUntil ? r.snoozedUntil.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const where: any = { userId };
    if (status) where.status = status;
    const reminders = await db.reminder.findMany({
      where,
      orderBy: { time: "asc" },
      take: 200,
    });
    return NextResponse.json({ reminders: reminders.map(serializeReminder) });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to load reminders." }, { status: 500 });
  }
}

const createSchema = z.object({
  title: z.string().min(1),
  message: z.string().nullable().optional(),
  time: z.string(),
  taskId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid reminder" },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const created = await db.reminder.create({
      data: {
        userId,
        taskId: d.taskId ?? null,
        title: d.title,
        message: d.message ?? null,
        time: new Date(d.time),
        status: "PENDING",
      },
    });
    return NextResponse.json({ reminder: serializeReminder(created) });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[reminders POST]", e);
    return NextResponse.json({ error: "Failed to create reminder." }, { status: 500 });
  }
}
