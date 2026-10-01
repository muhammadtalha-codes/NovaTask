"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import { TaskCard } from "@/components/app/TaskCard";
import { ProgressRing } from "@/components/app/ProgressRing";
import { PriorityBadge, TypeBadge, DeadlineChip } from "@/components/app/badges";
import { useSession } from "next-auth/react";
import { useClock } from "@/components/app/clock";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  CalendarClock,
  AlertTriangle,
  CheckCircle2,
  Flame,
  ArrowRight,
  Plus,
  Zap,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  isToday,
  isOverdue,
  hoursUntil,
  relativeDay,
} from "@/lib/task-helpers";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCountUp } from "@/hooks/use-count-up";

interface AnalyticsData {
  total: number;
  completed: number;
  pending: number;
  inProgress: number;
  completionPct: number;
  high: number;
  medium: number;
  low: number;
  weekly: { label: string; count: number }[];
  byType: Record<string, number>;
  upcomingDeadlines: number;
  streak: number;
}
interface Suggestion {
  kind: string;
  taskId?: string;
  title: string;
  message: string;
}

export function DashboardView() {
  const { data: session } = useSession();
  const now = useClock();
  const tasks = useAppStore((s) => s.tasks);
  const setView = useAppStore((s) => s.setView);
  const setEditingTask = useAppStore((s) => s.setEditingTask);
  const setAiPanel = useAppStore((s) => s.setAiPanel);
  const upsertTask = useAppStore((s) => s.upsertTask);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => {
    api<AnalyticsData>("/api/analytics")
      .then(setAnalytics)
      .catch(() => {});
    api<{ suggestions: Suggestion[] }>("/api/ai/suggest")
      .then((r) => setSuggestions(r.suggestions ?? []))
      .catch(() => {});
  }, [tasks.length]);

  const todayTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status !== "COMPLETED" && isToday(t.date ?? t.deadline))
        .sort((a, b) => (a.time ?? "99").localeCompare(b.time ?? "99")),
    [tasks]
  );

  const upcoming = useMemo(
    () =>
      tasks
        .filter(
          (t) =>
            t.status !== "COMPLETED" &&
            t.deadline &&
            !isOverdue(t.deadline) &&
            (hoursUntil(t.deadline) ?? Infinity) < 7 * 24
        )
        .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
        .slice(0, 5),
    [tasks]
  );

  const overdue = useMemo(
    () => tasks.filter((t) => t.status !== "COMPLETED" && isOverdue(t.deadline ?? t.date)),
    [tasks]
  );

  const greeting =
    now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 18
      ? "Good afternoon"
      : "Good evening";

  const completedToday = tasks.filter(
    (t) =>
      t.status === "COMPLETED" && t.completedAt && isToday(t.completedAt)
  ).length;

  async function planMyDay() {
    setPlanLoading(true);
    try {
      const res = await api<{ summary: string; schedule: any[] }>(
        "/api/ai/plan",
        { method: "POST", json: {} }
      );
      toast.success("Nova planned your day!", {
        description: res.summary.slice(0, 80) + (res.summary.length > 80 ? "…" : ""),
      });
      setView("schedule");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't generate a plan.");
    } finally {
      setPlanLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="glass-strong card-3d gradient-border relative overflow-hidden">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-50" style={{ background: "radial-gradient(circle, var(--brand-2), transparent 70%)" }} />
          <CardContent className="relative grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Sparkles className="h-4 w-4 text-[var(--brand)]" />
                {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                {greeting}, <span className="text-gradient-animate">{session?.user?.name?.split(" ")[0] ?? "there"}</span>
              </h1>
              <p className="mt-2 text-muted-foreground">
                {overdue.length > 0
                  ? `You have ${overdue.length} overdue task${overdue.length > 1 ? "s" : ""} needing attention.`
                  : todayTasks.length > 0
                  ? `You have ${todayTasks.length} task${todayTasks.length > 1 ? "s" : ""} scheduled for today.`
                  : "Your day looks clear. Tell Nova what you have to do and I'll organize it."}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={planMyDay} disabled={planLoading}>
                  {planLoading ? (
                    <>
                      <Sparkles className="h-4 w-4 animate-pulse" /> Planning…
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" /> Plan my day
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setAiPanel(true)}>
                  <Sparkles className="h-4 w-4" /> Ask Nova
                </Button>
                <Button variant="outline" onClick={() => setEditingTask("new")}>
                  <Plus className="h-4 w-4" /> Add task
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <ProgressRing
                value={analytics?.completionPct ?? 0}
                size={150}
                sublabel="completed"
              />
              <div className="space-y-2">
                <MiniStat label="Today" value={todayTasks.length} icon={CalendarClock} color="var(--brand)" />
                <MiniStat label="Completed today" value={completedToday} icon={CheckCircle2} color="oklch(0.78 0.16 150)" />
                <MiniStat label="Overdue" value={overdue.length} icon={AlertTriangle} color="oklch(0.64 0.23 27)" />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Current streak"
          value={`${analytics?.streak ?? 0} day${(analytics?.streak ?? 0) === 1 ? "" : "s"}`}
          color="var(--brand-2)"
          delay={0.05}
        />
        <StatCard
          icon={AlertTriangle}
          label="High priority"
          value={analytics?.high ?? 0}
          color="oklch(0.64 0.23 27)"
          delay={0.1}
        />
        <StatCard
          icon={CalendarClock}
          label="Due this week"
          value={analytics?.upcomingDeadlines ?? 0}
          color="oklch(0.78 0.16 70)"
          delay={0.15}
        />
        <StatCard
          icon={CheckCircle2}
          label="Total completed"
          value={analytics?.completed ?? 0}
          color="oklch(0.78 0.16 150)"
          delay={0.2}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Today's tasks */}
        <Card className="glass lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-base">Today&apos;s tasks</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView("tasks")}>
              View all <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {todayTasks.length === 0 ? (
              <EmptyState
                title="No tasks for today"
                desc="Enjoy the calm — or tell Nova what you have coming up."
                action={
                  <Button size="sm" variant="outline" onClick={() => setAiPanel(true)}>
                    <Sparkles className="h-4 w-4" /> Ask Nova
                  </Button>
                }
              />
            ) : (
              <div className="grid gap-3 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
                {todayTasks.map((t) => (
                  <TaskCard key={t.id} task={t} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          {/* Upcoming deadlines */}
          <Card className="glass">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-[var(--brand)]" /> Upcoming deadlines
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {upcoming.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deadlines in the next 7 days.</p>
              ) : (
                upcoming.map((t) => {
                  const h = hoursUntil(t.deadline);
                  const soon = (h ?? Infinity) < 24;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setEditingTask(t)}
                      className="group w-full rounded-xl border border-border/60 bg-card/40 p-3 text-left transition-all hover:border-[var(--brand)]/40 hover:translate-y-[-2px]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">{t.title}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            {t.subject && (
                              <span className="text-[11px] text-muted-foreground">{t.subject}</span>
                            )}
                            <DeadlineChip deadline={t.deadline} soon={soon} />
                          </div>
                        </div>
                        <PriorityBadge priority={t.priority} />
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Weekly productivity mini chart */}
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-[var(--brand-3)]" /> Weekly productivity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WeeklyBars data={analytics?.weekly ?? []} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Smart suggestions */}
      {suggestions.length > 0 && (
        <Card className="glass gradient-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[var(--brand)]" /> Nova&apos;s suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {suggestions.map((s, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={s}
                  onAct={async () => {
                    if (s.kind === "high_load") {
                      await planMyDay();
                    } else if (s.kind === "empty") {
                      setAiPanel(true);
                    } else if (s.taskId) {
                      // try bumping to high priority for due_soon
                      try {
                        const res = await api<{ task: any }>(
                          `/api/tasks/${s.taskId}`,
                          {
                            method: "PATCH",
                            json:
                              s.kind === "due_soon"
                                ? { priority: "HIGH" }
                                : s.kind === "missing_time"
                                ? {}
                                : {},
                          }
                        );
                        upsertTask(res.task);
                        if (s.kind === "due_soon") {
                          toast.success("Bumped to high priority.");
                          setSuggestions((prev) =>
                            prev.filter((x) => x.title !== s.title)
                          );
                        } else if (s.kind === "missing_time" || s.kind === "missing_subject") {
                          setEditingTask(res.task);
                        }
                      } catch (e: any) {
                        toast.error(e?.message ?? "Couldn't apply.");
                      }
                    }
                  }}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div className="glass flex items-center gap-2.5 rounded-xl px-3 py-2">
      <Icon className="h-4 w-4" style={{ color }} />
      <div className="leading-tight">
        <div className="text-sm font-semibold tabular-nums">{value}</div>
        <div className="text-[11px] text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  delay = 0,
}: {
  icon: LucideIcon;
  label: string;
  value: number | string;
  color: string;
  delay?: number;
}) {
  const numeric = typeof value === "number" ? value : parseInt(String(value).replace(/[^0-9]/g, ""), 10);
  const isNumeric = !isNaN(numeric) && /\d/.test(String(value));
  const display = useCountUp(isNumeric ? numeric : 0);
  const shown = isNumeric
    ? (Number.isInteger(numeric) ? Math.round(display) : Math.round(display * 10) / 10)
    : value;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3 }}
    >
      <Card className="glass card-3d relative overflow-hidden">
        <div
          className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl opacity-40"
          style={{ background: `radial-gradient(circle, ${color}, transparent 70%)` }}
        />
        <CardContent className="relative flex items-center gap-3 p-4">
          <div
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={{ background: `color-mix(in oklch, ${color} 18%, transparent)`, color }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="leading-tight">
            <div className="text-2xl font-semibold tabular-nums">{shown}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function WeeklyBars({ data }: { data: { label: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex h-28 items-end justify-between gap-2">
      {data.map((d, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex w-full flex-1 items-end">
            <motion.div
              className="w-full rounded-t-md"
              style={{
                background: "linear-gradient(180deg, var(--brand), var(--brand-2))",
                minHeight: 4,
              }}
              initial={{ height: 0 }}
              animate={{ height: `${(d.count / max) * 100}%` }}
              transition={{ duration: 0.6, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
              title={`${d.count} completed`}
            />
          </div>
          <div className="text-[10px] text-muted-foreground">{d.label}</div>
          <div className="text-[10px] font-medium tabular-nums">{d.count}</div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  title,
  desc,
  action,
}: {
  title: string;
  desc: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 py-10 text-center">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-xl opacity-60" style={{ background: "radial-gradient(circle, var(--brand), transparent 70%)" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-[var(--brand)]" />
        </div>
      </div>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      {action}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onAct,
}: {
  suggestion: Suggestion;
  onAct: () => void;
}) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{suggestion.title}</div>
          <p className="text-xs text-muted-foreground">{suggestion.message}</p>
        </div>
        <Button size="sm" variant="outline" onClick={onAct} className="shrink-0">
          Apply
        </Button>
      </div>
    </div>
  );
}
