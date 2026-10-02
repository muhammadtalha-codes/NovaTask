import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";

// Lightweight smart suggestions: finds tasks missing info or due soon,
// without a full LLM round-trip. Keeps UX snappy.
export async function GET() {
  try {
    const userId = await requireUserId();
    const tasks = await db.task.findMany({
      where: { userId, status: { not: "COMPLETED" } },
      orderBy: [{ deadline: "asc" }, { priority: "desc" }],
      take: 80,
    });
    const suggestions: {
      kind: "missing_time" | "missing_subject" | "due_soon" | "high_load" | "empty";
      taskId?: string;
      title: string;
      message: string;
    }[] = [];

    const now = Date.now();
    for (const t of tasks) {
      if (t.priority === "HIGH" && !t.time) {
        suggestions.push({
          kind: "missing_time",
          taskId: t.id,
          title: t.title,
          message: `"${t.title}" is high priority but has no specific time. Want to set one?`,
        });
      }
      if (!t.subject && tasks.length <= 30) {
        suggestions.push({
          kind: "missing_subject",
          taskId: t.id,
          title: t.title,
          message: `Add a subject for "${t.title}" to organize it better.`,
        });
      }
      if (t.deadline) {
        const hours = (t.deadline.getTime() - now) / 3.6e6;
        if (hours < 24 && hours > 0 && t.status !== "IN_PROGRESS") {
          suggestions.push({
            kind: "due_soon",
            taskId: t.id,
            title: t.title,
            message: `"${t.title}" is due in under 24h. Should I bump it to high priority?`,
          });
        }
      }
    }

    // high load today?
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const todayTasks = tasks.filter(
      (t) => t.date && t.date >= start && t.date < end
    );
    if (todayTasks.length >= 5) {
      suggestions.push({
        kind: "high_load",
        title: "Busy day ahead",
        message: `You have ${todayTasks.length} tasks today. Want me to plan an optimized schedule?`,
      });
    }

    if (tasks.length === 0) {
      suggestions.push({
        kind: "empty",
        title: "Welcome to NovaTask",
        message:
          "Tell Nova what you have to do — e.g. \"I have a quiz on Friday at 2 PM\" — and I'll organize everything for you.",
      });
    }

    return NextResponse.json({ suggestions: suggestions.slice(0, 5) });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to load suggestions." }, { status: 500 });
  }
}
