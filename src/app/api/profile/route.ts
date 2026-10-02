import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUserId, getUserPreferences } from "@/lib/session";
import { defaultPreferences } from "@/lib/preferences";
import { z } from "zod";

export async function GET() {
  try {
    const userId = await requireUserId();
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    const prefs = await getUserPreferences(userId);
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt.toISOString(),
      },
      preferences: prefs,
    });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[profile GET]", e);
    return NextResponse.json({ error: "Failed to load profile." }, { status: 500 });
  }
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  image: z.string().nullable().optional(),
  preferences: z.any().optional(),
});

export async function PATCH(req: Request) {
  try {
    const userId = await requireUserId();
    const body = await req.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }
    const data: any = {};
    if (parsed.data.name !== undefined) data.name = parsed.data.name;
    if (parsed.data.image !== undefined) data.image = parsed.data.image;
    if (parsed.data.preferences !== undefined) {
      // merge with existing prefs
      const existing = (await getUserPreferences(userId)) ?? defaultPreferences();
      const merged = { ...existing, ...parsed.data.preferences };
      // ensure nested merge for notifications/ai/reminder
      if (parsed.data.preferences.notifications)
        merged.notifications = { ...existing.notifications, ...parsed.data.preferences.notifications };
      if (parsed.data.preferences.ai)
        merged.ai = { ...existing.ai, ...parsed.data.preferences.ai };
      if (parsed.data.preferences.reminder)
        merged.reminder = { ...existing.reminder, ...parsed.data.preferences.reminder };
      data.preferences = JSON.stringify(merged);
    }
    const updated = await db.user.update({ where: { id: userId }, data });
    const prefs = await getUserPreferences(userId);
    return NextResponse.json({
      user: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        image: updated.image,
        createdAt: updated.createdAt.toISOString(),
      },
      preferences: prefs,
    });
  } catch (e: any) {
    if (e?.status === 401)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    console.error("[profile PATCH]", e);
    return NextResponse.json({ error: "Failed to update profile." }, { status: 500 });
  }
}
