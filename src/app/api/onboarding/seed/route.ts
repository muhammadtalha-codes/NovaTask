import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";

// Seed demo tasks so new users see a populated, working app on first login.
export async function POST() {
  try {
    const userId = await requireUserId();

    // Avoid duplicating if tasks already exist
    const existing = await db.task.count({ where: { userId } });
    if (existing > 0) {
      return NextResponse.json({
        ok: true,
        message: "You already have tasks — no demo data added.",
      });
    }

    const now = new Date();
    const today = (h: number, m = 0) => {
      const d = new Date(now);
      d.setHours(h, m, 0, 0);
      return d;
    };
    const tomorrow = (h: number, m = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(h, m, 0, 0);
      return d;
    };
    const dayOffset = (n: number, h: number, m = 0) => {
      const d = new Date(now);
      d.setDate(d.getDate() + n);
      d.setHours(h, m, 0, 0);
      return d;
    };

    const seedTasks = [
      {
        title: "Software Engineering Assignment",
        subject: "Software Engineering",
        type: "ASSIGNMENT",
        date: tomorrow(10),
        deadline: tomorrow(10),
        time: "10:00",
        priority: "HIGH",
        description: "Complete the design patterns assignment — Factory, Observer, Strategy.",
      },
      {
        title: "DSA Quiz Preparation",
        subject: "Data Structures & Algorithms",
        type: "QUIZ",
        date: dayOffset(3, 14),
        deadline: dayOffset(3, 14),
        time: "14:00",
        priority: "HIGH",
        description: "Revise graphs, DP, and greedy algorithms.",
      },
      {
        title: "Database Project Milestone",
        subject: "Databases",
        type: "PROJECT",
        date: dayOffset(7, 23),
        deadline: dayOffset(7, 23),
        priority: "MEDIUM",
        description: "Implement ER diagram + initial schema for the course project.",
      },
      {
        title: "Daily Programming Practice",
        subject: "DSA",
        type: "STUDY",
        date: today(20),
        deadline: today(23),
        time: "20:00",
        priority: "LOW",
        recurring: JSON.stringify({ type: "DAILY" }),
        description: "Solve 2 problems on LeetCode.",
      },
      {
        title: "Team Project Meeting",
        subject: "Capstone",
        type: "MEETING",
        date: dayOffset(2, 16),
        deadline: dayOffset(2, 17),
        time: "16:00",
        priority: "MEDIUM",
        description: "Sprint planning + task assignment.",
      },
      {
        title: "Operating Systems Reading",
        subject: "Operating Systems",
        type: "STUDY",
        date: dayOffset(1, 21),
        time: "21:00",
        priority: "LOW",
        description: "Read chapter 5 — process scheduling.",
      },
    ];

    for (const t of seedTasks) {
      await db.task.create({
        data: {
          userId,
          title: t.title,
          description: t.description,
          subject: t.subject,
          type: t.type,
          date: t.date,
          time: t.time ?? null,
          deadline: t.deadline ?? null,
          priority: t.priority,
          status: "PENDING",
          recurring: t.recurring ?? JSON.stringify({ type: "NONE" }),
        },
      });
    }

    return NextResponse.json({ ok: true, count: seedTasks.length });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[seed] error", e);
    return NextResponse.json({ error: "Failed to seed demo tasks." }, { status: 500 });
  }
}
