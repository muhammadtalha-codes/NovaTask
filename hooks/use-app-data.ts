"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store/app-store";
import { api } from "@/lib/api-client";
import type { Task, Reminder, UserPreferences, AppNotification } from "@/types";
import { toast } from "sonner";

// Initial data load + browser-notification polling.
export function useAppData() {
  const setTasks = useAppStore((s) => s.setTasks);
  const setReminders = useAppStore((s) => s.setReminders);
  const setChatMessages = useAppStore((s) => s.setChatMessages);
  const setPreferences = useAppStore((s) => s.setPreferences);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const setUnreadNotifications = useAppStore((s) => s.setUnreadNotifications);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [tasksRes, remindersRes, prefsRes, notifsRes] = await Promise.all([
          api<{ tasks: Task[] }>("/api/tasks"),
          api<{ reminders: Reminder[] }>("/api/reminders"),
          api<{ preferences: UserPreferences }>("/api/profile"),
          api<{ notifications: AppNotification[]; unread: number }>("/api/notifications"),
        ]);
        if (cancelled) return;
        setTasks(tasksRes.tasks ?? []);
        setReminders(remindersRes.reminders ?? []);
        setPreferences(prefsRes.preferences);
        setNotifications(notifsRes.notifications ?? []);
        setUnreadNotifications(notifsRes.unread ?? 0);
      } catch (e) {
        // ignore auth errors here (session may still be loading)
      }
      try {
        const chat = await api<{ messages: any[] }>("/api/chat");
        if (!cancelled) setChatMessages(chat.messages ?? []);
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [setTasks, setReminders, setChatMessages, setPreferences, setNotifications, setUnreadNotifications]);

  // Browser notification polling (every 60s)
  useEffect(() => {
    const prefs = useAppStore.getState().preferences;
    if (prefs?.notifications?.browser) {
      if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(() => {});
      }
    }
    let lastNotified = new Set<string>();
    const poll = async () => {
      try {
        const res = await api<{ reminders: any[]; taskReminders: any[] }>(
          "/api/notifications"
        );
        const all = [
          ...(res.reminders ?? []),
          ...(res.taskReminders ?? []),
        ];
        for (const n of all) {
          if (lastNotified.has(n.id)) continue;
          lastNotified.add(n.id);
          if (
            "Notification" in window &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification("NovaTask Reminder", {
                body: n.title + (n.message ? ` — ${n.message}` : ""),
                tag: n.id,
              });
            } catch {
              /* ignore */
            }
          }
          toast(n.title, { description: n.message ?? undefined });
        }
      } catch {
        /* ignore */
      }
    };
    poll();
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, []);
}
