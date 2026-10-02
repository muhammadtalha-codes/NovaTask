import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { serializeTask } from "@/lib/serialize";
import { nextOccurrence } from "@/lib/recurring";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  subject: z.string().nullable().optional(),
  type: z.string().optional(),
  date: z.string().nullable().optional(),
  time: z.string().nullable().optional(),
  deadline: z.string().nullable().optional(),
  priority: z.string().optional(),
  status: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().nullable().optional(),
  recurring: z.any().optional(),
  notes: z.string().nullable().optional(),
  order: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid update" },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const data: any = {};
    if (d.title !== undefined) data.title = d.title.trim();
    if (d.description !== undefined) data.description = d.description ?? null;
    if (d.subject !== undefined) data.subject = d.subject ?? null;
    if (d.type !== undefined) data.type = d.type;
    if (d.date !== undefined) data.date = d.date ? new Date(d.date) : null;
    if (d.time !== undefined) data.time = d.time ?? null;
    if (d.deadline !== undefined)
      data.deadline = d.deadline ? new Date(d.deadline) : null;
    if (d.priority !== undefined) data.priority = d.priority;
    if (d.status !== undefined) {
      data.status = d.status;
      if (d.status === "COMPLETED") data.completedAt = new Date();
      else data.completedAt = null;
    }
    if (d.reminderEnabled !== undefined) data.reminderEnabled = d.reminderEnabled;
    if (d.reminderTime !== undefined)
      data.reminderTime = d.reminderTime ? new Date(d.reminderTime) : null;
    if (d.recurring !== undefined) data.recurring = JSON.stringify(d.recurring);
    if (d.notes !== undefined) data.notes = d.notes ?? null;
    if (d.order !== undefined) data.order = d.order;

    const updated = await db.task.update({
      where: { id },
      data,
      include: { subtasks: { orderBy: { order: "asc" } } },
    });

    // Recurring-task expansion: when a recurring task is marked COMPLETED,
    // spawn the next occurrence (PENDING) so the cycle continues.
    let nextTask: any = null;
    if (
      d.status === "COMPLETED" &&
      existing.recurring &&
      existing.recurring !== '{"type":"NONE"}'
    ) {
      try {
        const rule = JSON.parse(existing.recurring);
        const nextDate = nextOccurrence(rule, existing.date ?? existing.deadline);
        if (nextDate) {
          nextTask = await db.task.create({
            data: {
              userId,
              title: existing.title,
              description: existing.description,
              subject: existing.subject,
              type: existing.type,
              date: nextDate,
              time: existing.time,
              deadline: existing.deadline
                ? new Date(
                    nextDate.getTime() +
                      (new Date(existing.deadline).getTime() -
                        (existing.date
                          ? new Date(existing.date).getTime()
                          : new Date().setHours(0, 0, 0, 0)))
                  )
                : null,
              priority: existing.priority,
              status: "PENDING",
              recurring: existing.recurring,
              notes: existing.notes,
            },
            include: { subtasks: { orderBy: { order: "asc" } } },
          });
        }
      } catch (e) {
        // malformed recurring JSON — ignore, don't block completion
        console.error("[tasks PATCH] recurring expansion error", e);
      }
    }

    return NextResponse.json({
      task: serializeTask(updated),
      ...(nextTask ? { nextTask: serializeTask(nextTask) } : {}),
    });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[tasks PATCH]", e);
    return NextResponse.json({ error: "Failed to update task." }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await db.task.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    await db.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[tasks DELETE]", e);
    return NextResponse.json({ error: "Failed to delete task." }, { status: 500 });
  }
}
