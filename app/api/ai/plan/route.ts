import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { generateDailyPlan } from "@/lib/ai/service";

export async function POST(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json().catch(() => ({}));
    const date = body.date ? String(body.date) : undefined;
    const { summary, schedule } = await generateDailyPlan(userId, date);

    // persist the plan
    const target = date ? new Date(date) : new Date();
    target.setHours(0, 0, 0, 0);
    await db.plan.create({
      data: {
        userId,
        date: target,
        content: JSON.stringify(schedule),
        summary,
      },
    });

    return NextResponse.json({ summary, schedule });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[ai/plan] error", e);
    return NextResponse.json(
      { error: "Could not generate a plan right now. Please try again." },
      { status: 500 }
    );
  }
}
