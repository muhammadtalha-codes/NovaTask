import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await requireUserId();
    const tasks = await db.task.findMany({ where: { userId } });

    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const pending = tasks.filter((t) => t.status === "PENDING").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const high = tasks.filter((t) => t.priority === "HIGH" && t.status !== "COMPLETED").length;
    const medium = tasks.filter((t) => t.priority === "MEDIUM" && t.status !== "COMPLETED").length;
    const low = tasks.filter((t) => t.priority === "LOW" && t.status !== "COMPLETED").length;

    // weekly productivity: completed tasks per day for the last 7 days
    const days: { label: string; date: Date; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
        date: d,
        count: 0,
      });
    }
    for (const t of tasks) {
      if (t.status !== "COMPLETED" || !t.completedAt) continue;
      const c = new Date(t.completedAt);
      c.setHours(0, 0, 0, 0);
      const match = days.find((d) => d.date.getTime() === c.getTime());
      if (match) match.count += 1;
    }

    // tasks by type (excluding completed)
    const byType: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status === "COMPLETED") continue;
      byType[t.type] = (byType[t.type] ?? 0) + 1;
    }

    // upcoming deadlines (next 7 days)
    const from = new Date();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const upcoming = tasks.filter(
      (t) =>
        t.status !== "COMPLETED" &&
        t.deadline &&
        t.deadline >= from &&
        t.deadline <= to
    ).length;

    // streak: consecutive days with at least 1 completion (ending today or yesterday)
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const has = tasks.some((t) => {
        if (t.status !== "COMPLETED" || !t.completedAt) return false;
        const c = new Date(t.completedAt);
        c.setHours(0, 0, 0, 0);
        return c.getTime() === d.getTime();
      });
      if (has) streak += 1;
      else if (i === 0) continue; // today not done yet doesn't break streak
      else break;
    }

    // per-subject breakdown: { subject, total, completed, pending, completionPct }
    const subjectMap: Record<string, { total: number; completed: number; pending: number }> = {};
    for (const t of tasks) {
      const subj = t.subject?.trim() || "Uncategorized";
      if (!subjectMap[subj]) subjectMap[subj] = { total: 0, completed: 0, pending: 0 };
      subjectMap[subj].total += 1;
      if (t.status === "COMPLETED") subjectMap[subj].completed += 1;
      else subjectMap[subj].pending += 1;
    }
    const bySubject = Object.entries(subjectMap)
      .map(([subject, s]) => ({
        subject,
        total: s.total,
        completed: s.completed,
        pending: s.pending,
        completionPct: s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);

    return NextResponse.json({
      total,
      completed,
      pending,
      inProgress,
      completionPct,
      high,
      medium,
      low,
      weekly: days.map((d) => ({ label: d.label, count: d.count })),
      byType,
      bySubject,
      upcomingDeadlines: upcoming,
      streak,
    });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[analytics GET]", e);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}
