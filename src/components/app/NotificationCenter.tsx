"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Bell,
  CheckCheck,
  Trash2,
  Sparkles,
  CalendarClock,
  Info,
} from "lucide-react";
import { useAppStore, type ViewKey } from "@/store/app-store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { AppNotification, NotificationKind } from "@/types";

const KIND_ICON: Record<NotificationKind, typeof Bell> = {
  reminder: Bell,
  deadline: CalendarClock,
  system: Info,
  ai: Sparkles,
  info: Info,
};
const KIND_COLOR: Record<NotificationKind, string> = {
  reminder: "var(--brand-3)",
  deadline: "oklch(0.78 0.16 70)",
  system: "var(--muted-foreground)",
  ai: "var(--brand)",
  info: "var(--muted-foreground)",
};

export function NotificationCenter() {
  const open = useAppStore((s) => s.notifCenterOpen);
  const setOpen = useAppStore((s) => s.setNotifCenter);
  const notifications = useAppStore((s) => s.notifications);
  const setNotifications = useAppStore((s) => s.setNotifications);
  const setUnread = useAppStore((s) => s.setUnreadNotifications);
  const upsertNotification = useAppStore((s) => s.upsertNotification);
  const removeNotification = useAppStore((s) => s.removeNotification);
  const setView = useAppStore((s) => s.setView);
  const setEditingTask = useAppStore((s) => s.setEditingTask);

  // Load notifications whenever the panel opens
  useEffect(() => {
    if (!open) return;
    api<{ notifications: AppNotification[]; unread: number }>(
      "/api/notifications"
    )
      .then((res) => {
        setNotifications(res.notifications ?? []);
        setUnread(res.unread ?? 0);
      })
      .catch(() => {});
  }, [open, setNotifications, setUnread]);

  async function markAllRead() {
    try {
      await api("/api/notifications", { method: "PATCH" });
      setNotifications(notifications.map((n) => ({ ...n, read: true })));
      setUnread(0);
    } catch {
      toast.error("Couldn't mark all as read.");
    }
  }

  async function markRead(n: AppNotification) {
    if (n.read) return;
    try {
      const res = await api<{ notification: AppNotification }>(
        `/api/notifications/${n.id}`,
        { method: "PATCH", json: { read: true } }
      );
      upsertNotification(res.notification);
    } catch {
      /* ignore */
    }
  }

  async function remove(n: AppNotification) {
    try {
      await api(`/api/notifications/${n.id}`, { method: "DELETE" });
      removeNotification(n.id);
    } catch {
      toast.error("Couldn't remove notification.");
    }
  }

  function handleClick(n: AppNotification) {
    markRead(n);
    if (n.link) {
      // if link is a view key, navigate; otherwise treat as task id -> open editor
      const views: ViewKey[] = [
        "dashboard",
        "assistant",
        "tasks",
        "calendar",
        "schedule",
        "analytics",
        "reminders",
        "settings",
      ];
      if ((views as string[]).includes(n.link)) {
        setView(n.link as ViewKey);
        setOpen(false);
      } else {
        // task id — find in store
        const task = useAppStore.getState().tasks.find((t) => t.id === n.link);
        if (task) {
          setEditingTask(task);
          setOpen(false);
        }
      }
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col p-3 sm:p-4"
          >
            <div className="glass-strong gradient-border relative flex h-full flex-col overflow-hidden rounded-2xl">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="relative h-8 w-8">
                    <div
                      className="absolute inset-0 rounded-lg animate-pulse-glow"
                      style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <Bell className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-semibold">Notifications</div>
                    <div className="text-[11px] text-muted-foreground">
                      {notifications.length} total
                      {useAppStore.getState().unreadNotifications > 0 && (
                        <span className="ml-1 text-[var(--brand-2)]">
                          · {useAppStore.getState().unreadNotifications} unread
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={markAllRead}
                    title="Mark all as read"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    <CheckCheck className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    title="Close"
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                {notifications.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="relative h-14 w-14 mb-3">
                      <div
                        className="absolute inset-0 rounded-2xl opacity-50"
                        style={{ background: "radial-gradient(circle, var(--brand), transparent 70%)" }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Bell className="h-6 w-6 text-[var(--brand)]" />
                      </div>
                    </div>
                    <p className="font-medium">You&apos;re all caught up</p>
                    <p className="text-sm text-muted-foreground">
                      New activity from Nova and your reminders will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence initial={false}>
                      {notifications.map((n) => {
                        const Icon = KIND_ICON[n.kind] ?? Info;
                        const color = KIND_COLOR[n.kind] ?? "var(--muted-foreground)";
                        return (
                          <motion.div
                            key={n.id}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="group relative"
                          >
                            <button
                              onClick={() => handleClick(n)}
                              className="glass flex w-full items-start gap-3 rounded-xl p-3 text-left transition-all hover:translate-y-[-1px] hover:border-[var(--brand)]/30"
                              style={{
                                borderLeft: `2px solid ${color}`,
                                opacity: n.read ? 0.6 : 1,
                              }}
                            >
                              <div
                                className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                                style={{ background: `color-mix(in oklch, ${color} 16%, transparent)` }}
                              >
                                <Icon className="h-4 w-4" style={{ color }} />
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-medium">{n.title}</span>
                                  {!n.read && (
                                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-2)]" />
                                  )}
                                </div>
                                {n.message && (
                                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                    {n.message}
                                  </p>
                                )}
                                <div className="mt-1 text-[10px] text-muted-foreground">
                                  {relativeTime(n.createdAt)}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  remove(n);
                                }}
                                className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                                title="Dismiss"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </button>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-border/50 p-3">
                <button
                  onClick={() => {
                    setView("reminders");
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/60 bg-card/40 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <CalendarClock className="h-3.5 w-3.5" /> View all reminders
                </button>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
