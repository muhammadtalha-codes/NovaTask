"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Flame,
  FolderTree,
  ListTodo,
  PieChart as PieIcon,
  TrendingUp,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import { ProgressRing } from "@/components/app/ProgressRing";
import {
  DeadlineChip,
  PriorityBadge,
  TypeIcon,
} from "@/components/app/badges";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  TYPE_LABEL,
  hoursUntil,
} from "@/lib/task-helpers";
import type { Priority, Task, TaskType } from "@/types";
import { cn } from "@/lib/utils";

interface SubjectStat {
  subject: string;
  total: number;
  completed: number;
  pending: number;
  completionPct: number;
}

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
  bySubject?: SubjectStat[];
  upcomingDeadlines: number;
  streak: number;
}

const EASE = [0.22, 1, 0.36, 1] as const;

const TYPE_COLORS: Record<string, string> = {
  ASSIGNMENT: "var(--chart-1)",
  QUIZ: "var(--chart-2)",
  EXAM: "var(--chart-3)",
  MEETING: "var(--chart-4)",
  PROJECT: "var(--chart-5)",
  STUDY: "var(--brand)",
  PERSONAL: "var(--brand-2)",
  OTHER: "var(--brand-3)",
};

function motivation(pct: number): string {
  if (pct <= 0) return "Let's get started";
  if (pct < 50) return "Building momentum";
  if (pct < 90) return "Great progress";
  return "Outstanding!";
}

export function AnalyticsView() {
  const tasks = useAppStore((s) => s.tasks);
  const setEditingTask = useAppStore((s) => s.setEditingTask);

  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let active = true;
    setLoading(true);
    api<AnalyticsData>("/api/analytics")
      .then((d) => {
        if (active) setAnalytics(d);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [tasks.length]);

  const upcoming = useMemo(() => {
    const now = Date.now();
    const week = now + 7 * 24 * 60 * 60 * 1000;
    return tasks
      .filter(
        (t) =>
          t.status !== "COMPLETED" &&
          t.deadline &&
          new Date(t.deadline).getTime() >= now &&
          new Date(t.deadline).getTime() <= week
      )
      .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
      .slice(0, 6);
  }, [tasks]);

  const pieData = useMemo(() => {
    if (!analytics?.byType) return [];
    return Object.entries(analytics.byType)
      .filter(([, count]) => count > 0)
      .map(([type, count]) => ({
        type,
        label: TYPE_LABEL[type as TaskType] ?? type,
        count,
        color: TYPE_COLORS[type] ?? "var(--brand)",
      }));
  }, [analytics?.byType]);

  const priorityBreakdown = useMemo(() => {
    const high = analytics?.high ?? 0;
    const medium = analytics?.medium ?? 0;
    const low = analytics?.low ?? 0;
    const total = high + medium + low;
    return { high, medium, low, total };
  }, [analytics]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
        className="flex items-end justify-between gap-4"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            <BarChart3 className="h-7 w-7 text-[var(--brand)]" />
            <span className="text-gradient">Analytics</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track your productivity, streaks, and work distribution at a glance.
          </p>
        </div>
      </motion.div>

      {/* Stat row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] rounded-xl" />
            ))
          : (
            <>
              <StatCard
                icon={ListTodo}
                label="Total tasks"
                value={analytics?.total ?? 0}
                color="var(--brand)"
                delay={0.05}
              />
              <StatCard
                icon={CheckCircle2}
                label="Completed"
                value={analytics?.completed ?? 0}
                color="oklch(0.78 0.16 150)"
                delay={0.1}
              />
              <StatCard
                icon={TrendingUp}
                label="Completion %"
                value={`${analytics?.completionPct ?? 0}%`}
                color="var(--brand-3)"
                delay={0.15}
              />
              <StatCard
                icon={Flame}
                label="Current streak"
                value={`${analytics?.streak ?? 0}d`}
                color="var(--brand-2)"
                delay={0.2}
              />
            </>
          )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Completion ring */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.1 }}
          className="lg:col-span-1"
        >
          <Card className="glass gradient-border card-3d relative overflow-hidden">
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl opacity-50"
              style={{
                background:
                  "radial-gradient(circle, var(--brand-2), transparent 70%)",
              }}
            />
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Completion</CardTitle>
              <CardDescription>Your overall progress</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4 pb-6">
              {loading ? (
                <Skeleton className="h-[150px] w-[150px] rounded-full" />
              ) : (
                <ProgressRing
                  value={analytics?.completionPct ?? 0}
                  size={150}
                  sublabel="completed"
                />
              )}
              <div className="text-center">
                <p className="text-sm font-medium">
                  {motivation(analytics?.completionPct ?? 0)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {analytics && analytics.completed > 0
                    ? `${analytics.completed} of ${analytics.total} tasks done`
                    : "Complete a task to begin your streak."}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Weekly productivity chart */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.18 }}
          className="lg:col-span-2"
        >
          <Card className="glass card-3d h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-[var(--brand-3)]" />
                Weekly productivity
              </CardTitle>
              <CardDescription>Tasks completed per day (last 7 days)</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              {loading || !mounted ? (
                <Skeleton className="h-[240px] w-full rounded-xl" />
              ) : (
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={analytics?.weekly ?? []}
                      margin={{ top: 8, right: 8, left: -18, bottom: 0 }}
                      barCategoryGap="22%"
                    >
                      <defs>
                        <linearGradient
                          id="weekly-bar"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor="var(--brand)" />
                          <stop offset="100%" stopColor="var(--brand-2)" />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        dy={6}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        width={28}
                        tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                        allowDecimals={false}
                      />
                      <Tooltip
                        cursor={{ fill: "color-mix(in oklch, var(--muted) 40%, transparent)", rx: 6 }}
                        content={<GlassTooltip />}
                      />
                      <Bar
                        dataKey="count"
                        name="Completed"
                        fill="url(#weekly-bar)"
                        radius={[6, 6, 4, 4]}
                        maxBarSize={48}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Priority breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.05 }}
        >
          <Card className="glass card-3d h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Priority breakdown</CardTitle>
              <CardDescription>Incomplete tasks by priority</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-md" />
                ))
              ) : (
                <>
                  <PriorityBar
                    priority="HIGH"
                    count={priorityBreakdown.high}
                    total={priorityBreakdown.total}
                  />
                  <PriorityBar
                    priority="MEDIUM"
                    count={priorityBreakdown.medium}
                    total={priorityBreakdown.total}
                  />
                  <PriorityBar
                    priority="LOW"
                    count={priorityBreakdown.low}
                    total={priorityBreakdown.total}
                  />
                  {priorityBreakdown.total === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No incomplete tasks — you&apos;re all caught up!
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Tasks by type donut */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE, delay: 0.12 }}
          className="lg:col-span-2"
        >
          <Card className="glass card-3d h-full">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <PieIcon className="h-4 w-4 text-[var(--brand)]" />
                Tasks by type
              </CardTitle>
              <CardDescription>
                Distribution of incomplete tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading || !mounted ? (
                <Skeleton className="h-[260px] w-full rounded-xl" />
              ) : pieData.length === 0 ? (
                <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-center">
                  <PieIcon className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">
                    No incomplete tasks to chart.
                  </p>
                </div>
              ) : (
                <div className="grid items-center gap-4 sm:grid-cols-[1.1fr_1fr]">
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="count"
                          nameKey="label"
                          innerRadius={56}
                          outerRadius={92}
                          paddingAngle={2}
                          stroke="color-mix(in oklch, var(--background) 60%, transparent)"
                          strokeWidth={2}
                        >
                          {pieData.map((entry) => (
                            <Cell key={entry.type} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={<GlassTooltip suffix="tasks" />}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="grid gap-1.5">
                    {pieData.map((entry) => {
                      const total = pieData.reduce(
                        (sum, e) => sum + e.count,
                        0
                      );
                      const pct =
                        total > 0 ? Math.round((entry.count / total) * 100) : 0;
                      return (
                        <li
                          key={entry.type}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                              style={{ background: entry.color }}
                            />
                            <TypeIcon
                              type={entry.type as TaskType}
                              className="h-3.5 w-3.5 text-muted-foreground"
                            />
                            <span className="truncate text-sm">
                              {entry.label}
                            </span>
                          </span>
                          <span className="flex items-center gap-2 text-xs tabular-nums">
                            <span className="font-semibold">{entry.count}</span>
                            <span className="text-muted-foreground">{pct}%</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Per-subject progress breakdown */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE, delay: 0.05 }}
      >
        <Card className="glass card-3d">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderTree className="h-4 w-4 text-[var(--brand-2)]" />
              Progress by subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!analytics?.bySubject || analytics.bySubject.length === 0) ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
                <FolderTree className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  Add subjects to your tasks to see progress by subject here.
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {analytics.bySubject.map((s, i) => (
                  <SubjectRow key={s.subject} stat={s} delay={i * 0.05} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming deadlines strip */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: EASE, delay: 0.05 }}
      >
        <Card className="glass card-3d">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-[var(--brand)]" />
              Upcoming deadlines
            </CardTitle>
            <CardDescription>Next 7 days — click to edit</CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border/60 py-8 text-center">
                <CalendarClock className="h-7 w-7 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No deadlines in the next 7 days. You&apos;re in good shape.
                </p>
              </div>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {upcoming.map((task: Task) => {
                  const h = hoursUntil(task.deadline);
                  const soon = (h ?? Infinity) < 24;
                  return (
                    <li key={task.id}>
                      <button
                        onClick={() => setEditingTask(task)}
                        className="group w-full rounded-xl border border-border/60 bg-card/40 p-3 text-left transition-all hover:border-[var(--brand)]/40 hover:translate-y-[-2px]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {task.title}
                            </div>
                            {task.subject && (
                              <div className="mt-0.5 text-[11px] text-muted-foreground">
                                {task.subject}
                              </div>
                            )}
                            <div className="mt-1.5">
                              <DeadlineChip
                                deadline={task.deadline}
                                soon={soon}
                              />
                            </div>
                          </div>
                          <PriorityBadge priority={task.priority} />
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </motion.div>
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
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE, delay }}
      whileHover={{ y: -3 }}
    >
      <Card className="glass card-3d h-full">
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{
              background: `color-mix(in oklch, ${color} 18%, transparent)`,
              color,
            }}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 leading-tight">
            <div className="text-2xl font-semibold tabular-nums">{value}</div>
            <div className="truncate text-xs text-muted-foreground">{label}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function PriorityBar({
  priority,
  count,
  total,
}: {
  priority: Priority;
  count: number;
  total: number;
}) {
  const color = PRIORITY_COLOR[priority];
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const width = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-medium">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ background: color }}
          />
          {PRIORITY_LABEL[priority]}
        </span>
        <span className="tabular-nums text-muted-foreground">
          {count} {count === 1 ? "task" : "tasks"} · {pct}%
        </span>
      </div>
      <div
        className="h-2.5 w-full overflow-hidden rounded-full"
        style={{
          background:
            "color-mix(in oklch, var(--foreground) 8%, transparent)",
        }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${color}, color-mix(in oklch, ${color} 70%, var(--brand-2)))`,
            boxShadow: `0 0 12px color-mix(in oklch, ${color} 40%, transparent)`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(width, count > 0 ? 6 : 0)}%` }}
          transition={{ duration: 0.7, ease: EASE }}
        />
      </div>
    </div>
  );
}

interface TooltipPayloadItem {
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: { label?: string; count?: number; color?: string };
}

function GlassTooltip({
  active,
  payload,
  suffix,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  suffix?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0];
  const label =
    item?.payload?.label ?? (typeof item?.name === "string" ? item.name : "");
  const value = item?.value ?? 0;
  const color = item?.color ?? item?.payload?.color ?? "var(--brand)";
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 px-3 py-2 text-xs shadow-xl",
        "glass-strong"
      )}
    >
      {label && (
        <div className="mb-0.5 font-medium text-foreground">{label}</div>
      )}
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full"
          style={{ background: color }}
        />
        <span className="font-semibold tabular-nums">{value}</span>
        {suffix && (
          <span className="text-muted-foreground">
            {Number(value) === 1 ? suffix.replace(/s$/, "") : suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function SubjectRow({ stat, delay = 0 }: { stat: SubjectStat; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: EASE, delay }}
      whileHover={{ y: -2 }}
      className="glass rounded-xl p-3"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--brand-2)" }} />
          <span className="truncate text-sm font-medium">{stat.subject}</span>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {stat.completed}/{stat.total} done
        </span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted/60">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            background:
              stat.completionPct >= 75
                ? "linear-gradient(90deg, oklch(0.7 0.16 150), var(--brand-3))"
                : stat.completionPct >= 40
                ? "linear-gradient(90deg, var(--brand), var(--brand-2))"
                : "linear-gradient(90deg, oklch(0.75 0.18 70), var(--brand-2))",
          }}
          initial={{ width: 0 }}
          animate={{ width: `${stat.completionPct}%` }}
          transition={{ duration: 0.6, ease: EASE, delay: delay + 0.1 }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{stat.pending} pending</span>
        <span className="font-medium tabular-nums">{stat.completionPct}%</span>
      </div>
    </motion.div>
  );
}
