import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { z } from "zod";

const patchSchema = z.object({
  status: z.string().optional(),
  snoozeMinutes: z.number().optional(),
  title: z.string().optional(),
  message: z.string().nullable().optional(),
  time: z.string().optional(),
});

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await db.reminder.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }
    const body = await req.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid update" },
        { status: 400 }
      );
    }
    const data: any = {};
    if (parsed.data.status) data.status = parsed.data.status;
    if (parsed.data.title) data.title = parsed.data.title;
    if (parsed.data.message !== undefined) data.message = parsed.data.message ?? null;
    if (parsed.data.time) data.time = new Date(parsed.data.time);
    if (parsed.data.snoozeMinutes) {
      data.status = "SNOOZED";
      data.snoozedUntil = new Date(
        Date.now() + parsed.data.snoozeMinutes * 60 * 1000
      );
    }
    const updated = await db.reminder.update({ where: { id }, data });
    return NextResponse.json({ reminder: serializeReminder(updated) });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[reminders PATCH]", e);
    return NextResponse.json({ error: "Failed to update reminder." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await db.reminder.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Reminder not found" }, { status: 404 });
    }
    await db.reminder.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete reminder." }, { status: 500 });
  }
}
