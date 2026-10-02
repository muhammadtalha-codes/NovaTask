import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { serializeSubtask } from "@/lib/serialize";
import { z } from "zod";

// GET /api/tasks/[id]/subtasks — list subtasks for a task
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const task = await db.task.findUnique({ where: { id } });
    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const subtasks = await db.subtask.findMany({
      where: { taskId: id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ subtasks: subtasks.map(serializeSubtask) });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to load subtasks." }, { status: 500 });
  }
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  order: z.number().optional(),
});

// POST /api/tasks/[id]/subtasks — add a subtask
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const task = await db.task.findUnique({ where: { id } });
    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid subtask" },
        { status: 400 }
      );
    }
    const count = await db.subtask.count({ where: { taskId: id } });
    const created = await db.subtask.create({
      data: {
        taskId: id,
        title: parsed.data.title.trim(),
        order: parsed.data.order ?? count,
      },
    });
    return NextResponse.json({ subtask: serializeSubtask(created) });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[subtasks POST]", e);
    return NextResponse.json({ error: "Failed to create subtask." }, { status: 500 });
  }
}
