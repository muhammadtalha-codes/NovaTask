import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId } from "@/lib/session";
import { serializeNotification } from "@/lib/serialize";

// PATCH /api/notifications/[id] — mark single notification as read (or unread)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await db.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    const read = body.read !== undefined ? !!body.read : true;
    const updated = await db.notification.update({
      where: { id },
      data: { read },
    });
    return NextResponse.json({ notification: serializeNotification(updated) });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to update notification." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await requireUserId();
    const { id } = await params;
    const existing = await db.notification.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return NextResponse.json({ error: "Notification not found" }, { status: 404 });
    }
    await db.notification.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ error: "Failed to delete notification." }, { status: 500 });
  }
}
