import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";

export async function GET() {
  try {
    const userId = await requireUserId();
    const msgs = await db.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({
      messages: msgs.reverse().map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        actionData: m.actionData ? safeParse(m.actionData) : null,
        createdAt: m.createdAt.toISOString(),
      })),
    });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to load chat history." }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const userId = await requireUserId();
    await db.chatMessage.deleteMany({ where: { userId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to clear chat history." }, { status: 500 });
  }
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
