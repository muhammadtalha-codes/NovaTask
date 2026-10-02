import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { serializeSubtask } from "@/lib/serialize";
import { z } from "zod";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  done: z.boolean().optional(),
  order: z.number().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await db.subtask.findUnique({
      where: { id },
      include: { task: { select: { userId: true } } },
    });
    if (!existing || existing.task.userId !== userId) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
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
    if (parsed.data.title !== undefined) data.title = parsed.data.title.trim();
    if (parsed.data.done !== undefined) data.done = parsed.data.done;
    if (parsed.data.order !== undefined) data.order = parsed.data.order;
    const updated = await db.subtask.update({ where: { id }, data });
    return NextResponse.json({ subtask: serializeSubtask(updated) });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[subtask PATCH]", e);
    return NextResponse.json({ error: "Failed to update subtask." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await db.subtask.findUnique({
      where: { id },
      include: { task: { select: { userId: true } } },
    });
    if (!existing || existing.task.userId !== userId) {
      return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
    }
    await db.subtask.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete subtask." }, { status: 500 });
  }
}
