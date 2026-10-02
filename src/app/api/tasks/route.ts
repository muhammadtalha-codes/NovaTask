import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { serializeTask } from "@/lib/serialize";
import { z } from "zod";

export async function GET(req: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const priority = url.searchParams.get("priority");
    const subject = url.searchParams.get("subject");
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const search = url.searchParams.get("q");

    const where: any = { userId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (subject) where.subject = { contains: subject };
    if (search) where.title = { contains: search };
    if (from || to) {
      where.AND = [];
      if (from) where.AND.push({ date: { gte: new Date(from) } });
      if (to) where.AND.push({ date: { lte: new Date(to) } });
    }

    const tasks = await db.task.findMany({
      where,
      orderBy: [{ date: "asc" }, { priority: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: { subtasks: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ tasks: tasks.map(serializeTask) });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[tasks GET]", e);
    return NextResponse.json({ error: "Failed to load tasks." }, { status: 500 });
  }
}

const createSchema = z.object({
  title: z.string().min(1),
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

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid task" },
        { status: 400 }
      );
    }
    const d = parsed.data;
    const created = await db.task.create({
      data: {
        userId,
        title: d.title.trim(),
        description: d.description ?? null,
        subject: d.subject ?? null,
        type: d.type ?? "OTHER",
        date: d.date ? new Date(d.date) : null,
        time: d.time ?? null,
        deadline: d.deadline ? new Date(d.deadline) : null,
        priority: d.priority ?? "MEDIUM",
        status: d.status ?? "PENDING",
        reminderEnabled: d.reminderEnabled ?? false,
        reminderTime: d.reminderTime ? new Date(d.reminderTime) : null,
        recurring: JSON.stringify(d.recurring ?? { type: "NONE" }),
        notes: d.notes ?? null,
        order: d.order ?? 0,
      },
      include: { subtasks: { orderBy: { order: "asc" } } },
    });
    return NextResponse.json({ task: serializeTask(created) });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[tasks POST]", e);
    return NextResponse.json({ error: "Failed to create task." }, { status: 500 });
  }
}
