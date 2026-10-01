"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, BellOff, BellRing, Check, Clock, Plus, Sparkles, X, AlertCircle, ChevronDown, Inbox, Loader2, type LucideIcon } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useClock } from "@/components/app/clock";
import { relativeDay } from "@/lib/task-helpers";
import type { Reminder, ReminderStatus } from "@/types";
import { cn } from "@/lib/utils";

// --- helpers ---------------------------------------------------------------

function formatRelative(date: string | Date, now: Date): string {
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return "";
  const diff = t - now.getTime();
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const future = diff > 0;
  if (mins < 1) return "now";
  if (mins < 60) return future ? `in ${mins}m` : `${mins}m ago`;
  if (hrs < 24) return future ? `in ${hrs}h` : `${hrs}h ago`;
  if (days < 7) return future ? `in ${days}d` : `${days}d ago`;
  return relativeDay(date);
}

function formatFull(date: string | Date, timeFmt: "12h" | "24h"): string {
  const d = new Date(date);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFmt === "12h",
  });
}

// Default datetime-local value = now rounded up to next 10 minutes.
function defaultDateTimeLocal(): string {
  const d = new Date();
  d.setMinutes(Math.ceil(d.getMinutes() / 10) * 10, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

// --- main view -------------------------------------------------------------

export function RemindersView() {
  const now = useClock();
  const reminders = useAppStore((s) => s.reminders);
  const tasks = useAppStore((s) => s.tasks);
  const upsertReminder = useAppStore((s) => s.upsertReminder);
  const removeReminder = useAppStore((s) => s.removeReminder);
  const setAiPanel = useAppStore((s) => s.setAiPanel);
  const prefs = useAppStore((s) => s.preferences);
  const timeFmt = prefs?.timeFormat ?? "12h";

  const [form, setForm] = useState({
    title: "",
    time: defaultDateTimeLocal(),
    message: "",
    taskId: "none",
  });
  const [submitting, setSubmitting] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | null>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : null
  );
  const [completedOpen, setCompletedOpen] = useState(false);

  // Group reminders
  const groups = useMemo(() => {
    const cutoff = new Date(now.getTime() + 60 * 60 * 1000); // now + 1h
    const dueNow: Reminder[] = [];
    const upcoming: Reminder[] = [];
    const snoozed: Reminder[] = [];
    const completed: Reminder[] = [];

    for (const r of reminders) {
      if (r.status === "SNOOZED") {
        snoozed.push(r);
      } else if (r.status === "COMPLETED") {
        completed.push(r);
      } else if (r.status === "DISMISSED") {
        // skip dismissed
      } else {
        // PENDING
        const time = new Date(r.time);
        if (time.getTime() <= cutoff.getTime()) dueNow.push(r);
        else upcoming.push(r);
      }
    }

    const byTime = (a: Reminder, b: Reminder) =>
      new Date(a.time).getTime() - new Date(b.time).getTime();
    dueNow.sort(byTime);
    upcoming.sort(byTime);
    snoozed.sort((a, b) => {
      const ta = new Date(a.snoozedUntil ?? a.time).getTime();
      const tb = new Date(b.snoozedUntil ?? b.time).getTime();
      return ta - tb;
    });
    completed.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return { dueNow, upcoming, snoozed, completed };
  }, [reminders, now]);

  async function createReminder(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.time) return;
    setSubmitting(true);
    try {
      const iso = new Date(form.time).toISOString();
      const res = await api<{ reminder: Reminder }>("/api/reminders", {
        method: "POST",
        json: {
          title: form.title.trim(),
          time: iso,
          message: form.message.trim() ? form.message.trim() : null,
          taskId: form.taskId === "none" ? null : form.taskId,
        },
      });
      upsertReminder(res.reminder);
      toast.success("Reminder set.", {
        description: `"${res.reminder.title}" · ${formatFull(res.reminder.time, timeFmt)}`,
      });
      setForm({
        title: "",
        time: defaultDateTimeLocal(),
        message: "",
        taskId: "none",
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't create reminder.");
    } finally {
      setSubmitting(false);
    }
  }

  async function completeReminder(id: string) {
    try {
      const res = await api<{ reminder: Reminder }>(`/api/reminders/${id}`, {
        method: "PATCH",
        json: { status: "COMPLETED" },
      });
      upsertReminder(res.reminder);
      toast.success("Reminder completed.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't complete reminder.");
    }
  }

  async function snoozeReminder(id: string, minutes = 10) {
    try {
      const res = await api<{ reminder: Reminder }>(`/api/reminders/${id}`, {
        method: "PATCH",
        json: { snoozeMinutes: minutes },
      });
      upsertReminder(res.reminder);
      toast.success(`Snoozed ${minutes}m.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't snooze reminder.");
    }
  }

  async function dismissReminder(id: string) {
    try {
      await api(`/api/reminders/${id}`, { method: "DELETE" });
      removeReminder(id);
      toast.success("Reminder dismissed.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't dismiss reminder.");
    }
  }

  async function enableNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast.error("This browser doesn't support notifications.");
      return;
    }
    if (Notification.permission === "granted") {
      setNotifPermission("granted");
      toast.success("Notifications are already enabled.");
      return;
    }
    if (Notification.permission === "denied") {
      setNotifPermission("denied");
      toast("Notifications are blocked in your browser settings.", {
        description: "In-app reminders still work while NovaTask is open.",
      });
      return;
    }
    try {
      const result = await Notification.requestPermission();
      setNotifPermission(result);
      if (result === "granted") {
        toast.success("Browser notifications enabled.");
      } else if (result === "denied") {
        toast("Notifications blocked.", {
          description: "In-app reminders still work while NovaTask is open.",
        });
      }
    } catch {
      toast.error("Couldn't request notification permission.");
    }
  }

  const totalActive =
    groups.dueNow.length +
    groups.upcoming.length +
    groups.snoozed.length;
  const isEmpty = reminders.length === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card className="glass-strong card-3d gradient-border relative overflow-hidden">
          <div
            className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full blur-3xl opacity-50"
            style={{
              background:
                "radial-gradient(circle, var(--brand), transparent 70%)",
            }}
          />
          <CardContent className="relative grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BellRing className="h-4 w-4 text-[var(--brand)]" />
                <span>{totalActive} active reminder{totalActive === 1 ? "" : "s"}</span>
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                <span className="text-gradient">Reminders</span>
              </h1>
              <p className="mt-2 text-muted-foreground">
                Stay in the loop without the noise — Nova rings a gentle bell
                right when you need it. Snooze, complete, or dismiss from here.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={enableNotifications} variant="outline">
                  <Bell className="h-4 w-4" />
                  {notifPermission === "granted"
                    ? "Notifications enabled"
                    : notifPermission === "denied"
                    ? "Notifications blocked"
                    : "Enable browser notifications"}
                </Button>
                <Button variant="outline" onClick={() => setAiPanel(true)}>
                  <Sparkles className="h-4 w-4" /> Ask Nova to set one
                </Button>
              </div>
              {notifPermission === "denied" && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Browser notifications are blocked — in-app reminders still
                  work while NovaTask is open.
                </p>
              )}
            </div>

            {/* Quick create form */}
            <form
              onSubmit={createReminder}
              className="glass rounded-2xl p-4"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <Plus className="h-4 w-4 text-[var(--brand)]" />
                New reminder
              </div>
              <div className="mt-3 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="r-title">Title</Label>
                  <Input
                    id="r-title"
                    placeholder="e.g. Review my notes"
                    value={form.title}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, title: e.target.value }))
                    }
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="r-time">Time</Label>
                    <Input
                      id="r-time"
                      type="datetime-local"
                      value={form.time}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, time: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="r-task">Linked task</Label>
                    <Select
                      value={form.taskId}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, taskId: v }))
                      }
                    >
                      <SelectTrigger id="r-task" className="w-full">
                        <SelectValue placeholder="No task" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No task</SelectItem>
                        {tasks
                          .filter((t) => t.status !== "COMPLETED")
                          .slice(0, 50)
                          .map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="r-message">Message (optional)</Label>
                  <Textarea
                    id="r-message"
                    rows={2}
                    placeholder="Anything Nova should remind you about…"
                    value={form.message}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, message: e.target.value }))
                    }
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full text-white"
                  style={{
                    background:
                      "linear-gradient(120deg, var(--brand), var(--brand-2))",
                    borderColor: "transparent",
                  }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Setting…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Set reminder
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* Empty state */}
      {isEmpty && (
        <Card className="glass">
          <CardContent className="flex flex-col items-center justify-center gap-4 rounded-2xl py-16 text-center">
            <div className="relative h-16 w-16">
              <div
                className="absolute inset-0 rounded-2xl animate-pulse-glow"
                style={{
                  background:
                    "radial-gradient(circle, var(--brand), transparent 70%)",
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <BellOff className="h-7 w-7 text-[var(--brand)]" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">No reminders yet</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Tell Nova &ldquo;Remind me at 9 PM to review my notes.&rdquo; or
                add one above and Nova will ring you right on time.
              </p>
            </div>
            <Button variant="outline" onClick={() => setAiPanel(true)}>
              <Sparkles className="h-4 w-4" /> Ask Nova
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Due now / upcoming (within 1h) */}
      {groups.dueNow.length > 0 && (
        <Section
          title="Due now / upcoming"
          icon={AlertCircle}
          accent="oklch(0.64 0.23 27)"
          count={groups.dueNow.length}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {groups.dueNow.map((r) => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  now={now}
                  timeFmt={timeFmt}
                  urgent
                  onComplete={() => completeReminder(r.id)}
                  onSnooze={() => snoozeReminder(r.id, 10)}
                  onDismiss={() => dismissReminder(r.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </Section>
      )}

      {/* Upcoming */}
      {groups.upcoming.length > 0 && (
        <Section
          title="Upcoming"
          icon={Clock}
          accent="var(--brand)"
          count={groups.upcoming.length}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {groups.upcoming.map((r) => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  now={now}
                  timeFmt={timeFmt}
                  onComplete={() => completeReminder(r.id)}
                  onSnooze={() => snoozeReminder(r.id, 10)}
                  onDismiss={() => dismissReminder(r.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </Section>
      )}

      {/* Snoozed */}
      {groups.snoozed.length > 0 && (
        <Section
          title="Snoozed"
          icon={BellRing}
          accent="oklch(0.78 0.16 70)"
          count={groups.snoozed.length}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence mode="popLayout">
              {groups.snoozed.map((r) => (
                <ReminderCard
                  key={r.id}
                  reminder={r}
                  now={now}
                  timeFmt={timeFmt}
                  onComplete={() => completeReminder(r.id)}
                  onSnooze={() => snoozeReminder(r.id, 10)}
                  onDismiss={() => dismissReminder(r.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        </Section>
      )}

      {/* Completed (collapsible) */}
      {groups.completed.length > 0 && (
        <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
          <Card className="glass">
            <CollapsibleTrigger asChild>
              <CardHeader className="flex cursor-pointer flex-row items-center justify-between space-y-0 pb-3 transition-colors hover:bg-accent/30">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Check className="h-4 w-4 text-oklch(0.78 0.16 150)" />
                  Completed
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground">
                    {groups.completed.length}
                  </span>
                </CardTitle>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    completedOpen && "rotate-180"
                  )}
                />
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {groups.completed.map((r) => (
                      <ReminderCard
                        key={r.id}
                        reminder={r}
                        now={now}
                        timeFmt={timeFmt}
                        completed
                        onComplete={() => completeReminder(r.id)}
                        onSnooze={() => snoozeReminder(r.id, 10)}
                        onDismiss={() => dismissReminder(r.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Dismissed hint */}
      {reminders.some((r) => r.status === "DISMISSED") && (
        <p className="text-center text-xs text-muted-foreground">
          <Inbox className="mr-1 inline h-3 w-3" />
          Dismissed reminders are hidden — they&apos;re kept out of the way.
        </p>
      )}
    </div>
  );
}

// --- sub-components --------------------------------------------------------

function Section({
  title,
  icon: Icon,
  accent,
  count,
  children,
}: {
  title: string;
  icon: LucideIcon;
  accent: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Icon className="h-4 w-4" style={{ color: accent }} />
            {title}
            <span
              className="rounded-full px-2 py-0.5 text-[11px] tabular-nums"
              style={{
                background: `color-mix(in oklch, ${accent} 18%, transparent)`,
                color: accent,
              }}
            >
              {count}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function ReminderCard({
  reminder,
  now,
  timeFmt,
  urgent = false,
  completed = false,
  onComplete,
  onSnooze,
  onDismiss,
}: {
  reminder: Reminder;
  now: Date;
  timeFmt: "12h" | "24h";
  urgent?: boolean;
  completed?: boolean;
  onComplete: () => void;
  onSnooze: () => void;
  onDismiss: () => void;
}) {
  const linkedTask = useAppStore((s) =>
    reminder.taskId
      ? s.tasks.find((t) => t.id === reminder.taskId)
      : undefined
  );
  const t = new Date(reminder.time);
  const overdue = !completed && t.getTime() < now.getTime();
  const relative = formatRelative(reminder.time, now);
  const snoozedRelative = reminder.snoozedUntil
    ? formatRelative(reminder.snoozedUntil, now)
    : null;

  const accent = urgent
    ? overdue
      ? "oklch(0.64 0.23 27)"
      : "oklch(0.78 0.16 70)"
    : "var(--brand)";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.18 } }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className={cn(
          "glass card-3d relative overflow-hidden rounded-xl p-4 pl-5",
          completed && "opacity-70"
        )}
        style={{
          borderColor: completed
            ? undefined
            : `color-mix(in oklch, ${accent} 38%, transparent)`,
        }}
      >
        {/* Accent rail */}
        <span
          className="absolute inset-y-1 left-0 w-1 rounded-full"
          style={{
            background: accent,
            boxShadow: completed ? "none" : `0 0 12px ${accent}`,
          }}
        />
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              urgent && !completed && "animate-pulse"
            )}
            style={{
              background: `color-mix(in oklch, ${accent} 18%, transparent)`,
              color: accent,
            }}
          >
            {completed ? (
              <Check className="h-4 w-4" />
            ) : reminder.status === "SNOOZED" ? (
              <BellRing className="h-4 w-4" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h4
                className={cn(
                  "text-sm font-semibold leading-tight",
                  completed && "line-through decoration-muted-foreground/50"
                )}
              >
                {reminder.title}
              </h4>
              {!completed && (
                <span
                  className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide"
                  style={{
                    background: `color-mix(in oklch, ${accent} 16%, transparent)`,
                    color: accent,
                  }}
                >
                  {overdue ? "Overdue" : reminder.status === "SNOOZED" ? "Snoozed" : "Pending"}
                </span>
              )}
            </div>
            {reminder.message && (
              <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                {reminder.message}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 tabular-nums">
                <Clock className="h-3 w-3" />
                {formatFull(reminder.time, timeFmt)}
              </span>
              {reminder.status === "SNOOZED" && snoozedRelative ? (
                <span className="inline-flex items-center gap-1 tabular-nums">
                  <BellRing className="h-3 w-3" /> rings {snoozedRelative}
                </span>
              ) : (
                <span className="tabular-nums">{relative}</span>
              )}
              {linkedTask && (
                <span className="inline-flex items-center gap-1 truncate">
                  <Sparkles className="h-3 w-3 text-[var(--brand)]" />
                  <span className="truncate">{linkedTask.title}</span>
                </span>
              )}
            </div>
            {!completed && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={onComplete}>
                  <Check className="h-3.5 w-3.5" /> Complete
                </Button>
                <Button size="sm" variant="ghost" onClick={onSnooze}>
                  <Clock className="h-3.5 w-3.5" /> Snooze 10m
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" /> Dismiss
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
