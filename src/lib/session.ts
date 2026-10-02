import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// Returns the user id or null when not authenticated.
export async function getAuthUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}

// Throws a 401-shaped error object to be used in API routes.
export async function requireUserId(): Promise<string> {
  const id = await getAuthUserId();
  if (!id) {
    const e: any = new Error("UNAUTHORIZED");
    e.status = 401;
    throw e;
  }
  return id;
}

// Load user preferences (with defaults)
export async function getUserPreferences(userId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  let prefs: any = {};
  try {
    prefs = user.preferences ? JSON.parse(user.preferences) : {};
  } catch {
    prefs = {};
  }
  return {
    theme: prefs.theme ?? "dark",
    timeFormat: prefs.timeFormat ?? "12h",
    dateFormat: prefs.dateFormat ?? "MMM d, yyyy",
    notifications: {
      browser: prefs.notifications?.browser ?? true,
      reminders: prefs.notifications?.reminders ?? true,
      dailyDigest: prefs.notifications?.dailyDigest ?? false,
    },
    ai: {
      tone: prefs.ai?.tone ?? "friendly",
      autoPlan: prefs.ai?.autoPlan ?? true,
      proactive: prefs.ai?.proactive ?? true,
    },
    reminder: {
      defaultSnoozeMinutes: prefs.reminder?.defaultSnoozeMinutes ?? 10,
      leadTimeMinutes: prefs.reminder?.leadTimeMinutes ?? 0,
    },
    onboarded: prefs.onboarded ?? false,
  };
}
