"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Sparkles,
  Brain,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  Plus,
  Clock,
  MessageSquare,
  CalendarDays,
} from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { PriorityBadge, TypeIcon } from "@/components/app/badges";
import {
  PRIORITY_COLOR,
  formatTime,
} from "@/lib/task-helpers";
import type { Priority, TaskType } from "@/types";
import { cn } from "@/lib/utils";

interface PlanBlock {
  start: string; // ISO
  end: string; // ISO
  title: string;
  reason: string;
  priority: Priority;
  type: TaskType;
  taskId?: string;
}

interface PlanResult {
  summary: string;
  schedule: PlanBlock[];
}

const TIMELINE_START_HOUR = 8; // 08:00
const TIMELINE_END_HOUR = 22; // 22:00
const TIMELINE_HOURS = TIMELINE_END_HOUR - TIMELINE_START_HOUR;

// AI may return "MED" or other variants — normalize to the strict Priority union.
function normalizePriority(p: any): Priority {
  if (p === "HIGH" || p === "MED" || p === "MEDIUM" || p === "LOW") {
    if (p === "MED") return "MEDIUM";
    return p as Priority;
  }
  return "MEDIUM";
}

function toYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isoToHhMm(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function prettyDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function ScheduleView() {
  const setAiPanel = useAppStore((s) => s.setAiPanel);
  const setEditingTask = useAppStore((s) => s.setEditingTask);
  const prefs = useAppStore((s) => s.preferences);
  const timeFmt = prefs?.timeFormat ?? "12h";

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dateKey = toYmd(selectedDate);

  const generatePlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api<PlanResult>("/api/ai/plan", {
        method: "POST",
        json: { date: dateKey },
      });
      const normalized: PlanResult = {
        summary: res.summary ?? "Here is your plan for the day.",
        schedule: (res.schedule ?? []).map((b) => ({
          ...b,
          priority: normalizePriority(b.priority),
          type: (b.type ?? "STUDY") as TaskType,
        })),
      };
      setPlan(normalized);
      toast.success("Nova planned your day!", {
        description:
          normalized.summary.slice(0, 90) +
          (normalized.summary.length > 90 ? "…" : ""),
      });
    } catch (e: any) {
      const msg = e?.message ?? "Couldn't generate a plan right now.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  // Generate on mount and whenever the date changes.
  useEffect(() => {
    generatePlan();
  }, [dateKey]);

  const blocks = useMemo(() => {
    if (!plan) return [];
    return [...plan.schedule]
      .filter((b) => {
        const s = new Date(b.start).getTime();
        return !Number.isNaN(s);
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [plan]);

  // hour markers for the timeline
  const hourMarks = useMemo(() => {
    const arr: { hour: number; label: string }[] = [];
    for (let h = TIMELINE_START_HOUR; h <= TIMELINE_END_HOUR; h++) {
      arr.push({
        hour: h,
        label: formatTime(`${String(h).padStart(2, "0")}:00`, timeFmt),
      });
    }
    return arr;
  }, [timeFmt]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
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
                "radial-gradient(circle, var(--brand-2), transparent 70%)",
            }}
          />
          <div
            className="pointer-events-none absolute -bottom-16 -left-12 h-48 w-48 rounded-full blur-3xl opacity-40"
            style={{
              background:
                "radial-gradient(circle, var(--brand-3), transparent 70%)",
            }}
          />
          <CardContent className="relative grid gap-6 p-6 lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 text-[var(--brand)]" />
                <span>{prettyDate(selectedDate)}</span>
              </div>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Plan My <span className="text-gradient">Day</span>
              </h1>
              <p className="mt-2 text-muted-foreground">
                Let Nova look at your tasks, deadlines and energy to draft a
                calm, focused schedule — then tweak it any way you like.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  onClick={generatePlan}
                  disabled={loading}
                  className="relative overflow-hidden text-white shadow-lg"
                  style={{
                    background:
                      "linear-gradient(120deg, var(--brand), var(--brand-2))",
                    borderColor: "transparent",
                  }}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" /> Generate plan with Nova
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={generatePlan} disabled={loading}>
                  <RefreshCw
                    className={cn("h-4 w-4", loading && "animate-spin")}
                  />
                  Regenerate
                </Button>
                <Button variant="outline" onClick={() => setAiPanel(true)}>
                  <MessageSquare className="h-4 w-4" /> Open in AI chat
                </Button>
              </div>
            </div>

            {/* Date navigation */}
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate((d) => addDays(d, -1))}
                  aria-label="Previous day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex flex-1 flex-col items-center">
                  <input
                    type="date"
                    value={dateKey}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v) {
                        const [y, m, d] = v.split("-").map(Number);
                        setSelectedDate(new Date(y, m - 1, d));
                      } else {
                        setSelectedDate(new Date());
                      }
                    }}
                    className="bg-transparent text-center text-sm font-medium outline-none [color-scheme:light_dark]"
                  />
                  <div className="mt-1 flex gap-1">
                    <button
                      onClick={() => setSelectedDate(new Date())}
                      className="rounded-full px-2 py-0.5 text-[11px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      Today
                    </button>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedDate((d) => addDays(d, 1))}
                  aria-label="Next day"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading skeleton */}
      {loading && !plan && (
        <Card className="glass">
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-6 w-32" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {error && !loading && (
        <Card className="glass">
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="text-sm text-muted-foreground">{error}</div>
            <Button variant="outline" onClick={generatePlan}>
              <RefreshCw className="h-4 w-4" /> Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loaded plan */}
      {plan && !error && (
        <>
          {/* AI summary callout */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="glass gradient-border relative overflow-hidden">
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl opacity-40"
                style={{
                  background:
                    "radial-gradient(circle, var(--brand), transparent 70%)",
                }}
              />
              <CardContent className="relative flex items-start gap-4 p-5">
                <div
                  className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--brand), var(--brand-2))",
                  }}
                >
                  <Brain className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5 text-[var(--brand)]" />
                    Nova&apos;s summary
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {plan.summary}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Timeline / empty state */}
          {blocks.length === 0 ? (
            <EmptySchedule
              onAdd={() => setEditingTask("new")}
              onAsk={() => setAiPanel(true)}
            />
          ) : (
            <Card className="glass">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Clock className="h-4 w-4 text-[var(--brand)]" />
                  Your day&apos;s flow
                </CardTitle>
                <span className="text-xs text-muted-foreground">
                  {blocks.length} block{blocks.length === 1 ? "" : "s"} ·{" "}
                  {formatTime(isoToHhMm(blocks[0].start), timeFmt)} →{" "}
                  {formatTime(isoToHhMm(blocks[blocks.length - 1].end), timeFmt)}
                </span>
              </CardHeader>
              <CardContent>
                <Timeline
                  blocks={blocks}
                  hourMarks={hourMarks}
                  timeFmt={timeFmt}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Timeline({
  blocks,
  hourMarks,
  timeFmt,
}: {
  blocks: PlanBlock[];
  hourMarks: { hour: number; label: string }[];
  timeFmt: "12h" | "24h";
}) {
  return (
    <div className="relative">
      {/* hour grid */}
      <div
        className="relative ml-2"
        style={{ minHeight: `${TIMELINE_HOURS * 64}px` }}
      >
        {hourMarks.map((m) => {
          const top = ((m.hour - TIMELINE_START_HOUR) / TIMELINE_HOURS) * 100;
          return (
            <div
              key={m.hour}
              className="absolute left-0 right-0 flex items-center"
              style={{ top: `${top}%`, height: 0 }}
            >
              <div className="w-14 shrink-0 pr-2 text-right text-[11px] tabular-nums text-muted-foreground">
                {m.label}
              </div>
              <div className="h-px flex-1 bg-border/50" />
            </div>
          );
        })}

        {/* blocks */}
        <div className="absolute inset-0 ml-16">
          <AnimatePresence mode="popLayout">
            {blocks.map((b, i) => {
              const start = new Date(b.start);
              const end = new Date(b.end);
              const startH =
                start.getHours() +
                start.getMinutes() / 60 +
                start.getSeconds() / 3600;
              const endH =
                end.getHours() +
                end.getMinutes() / 60 +
                end.getSeconds() / 3600;
              const topPct =
                ((Math.max(startH, TIMELINE_START_HOUR) -
                  TIMELINE_START_HOUR) /
                  TIMELINE_HOURS) *
                100;
              const dur = Math.max(0.25, Math.min(endH - startH, TIMELINE_HOURS));
              const heightPct = (dur / TIMELINE_HOURS) * 100;
              const color = PRIORITY_COLOR[b.priority];

              return (
                <motion.div
                  key={`${b.title}-${start.toISOString()}-${i}`}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.22, 1, 0.36, 1],
                    delay: Math.min(0.04 * i, 0.6),
                  }}
                  className="absolute left-0 right-2"
                  style={{
                    top: `${topPct}%`,
                    height: `${heightPct}%`,
                    minHeight: 56,
                  }}
                >
                  <ScheduleCard block={b} color={color} timeFmt={timeFmt} />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function ScheduleCard({
  block,
  color,
  timeFmt,
}: {
  block: PlanBlock;
  color: string;
  timeFmt: "12h" | "24h";
}) {
  const startLabel = formatTime(isoToHhMm(block.start), timeFmt);
  const endLabel = formatTime(isoToHhMm(block.end), timeFmt);

  return (
    <div
      className="glass card-3d relative h-full overflow-hidden rounded-xl p-3 pl-4"
      style={{
        borderColor: `color-mix(in oklch, ${color} 40%, transparent)`,
      }}
    >
      {/* Priority rail */}
      <span
        className="absolute inset-y-1 left-0 w-1 rounded-full"
        style={{
          background: color,
          boxShadow: `0 0 12px ${color}`,
        }}
      />
      <div className="flex h-full flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
              style={{
                background: `color-mix(in oklch, ${color} 18%, transparent)`,
                color,
              }}
            >
              <TypeIcon type={block.type} className="h-3.5 w-3.5" />
            </span>
            <span className="text-sm font-semibold leading-tight line-clamp-1">
              {block.title}
            </span>
          </div>
          <PriorityBadge priority={block.priority} className="shrink-0" />
        </div>
        <div className="flex items-center gap-1.5 text-[11px] tabular-nums text-muted-foreground">
          <Clock className="h-3 w-3" />
          {startLabel} – {endLabel}
        </div>
        {block.reason && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {block.reason}
          </p>
        )}
      </div>
    </div>
  );
}

function EmptySchedule({
  onAdd,
  onAsk,
}: {
  onAdd: () => void;
  onAsk: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="glass">
        <CardContent className="flex flex-col items-center justify-center gap-4 rounded-2xl py-16 text-center">
          <div className="relative h-16 w-16">
            <div
              className="absolute inset-0 rounded-2xl animate-pulse-glow"
              style={{
                background:
                  "radial-gradient(circle, var(--brand-3), transparent 70%)",
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="h-7 w-7 text-[var(--brand-3)]" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">
              No tasks to schedule — enjoy a calm day!
            </h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add a task or two and Nova will weave them into a focused daily
              flow. Or just chat with Nova about what&apos;s on your plate.
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onAdd}>
              <Plus className="h-4 w-4" /> Add a task
            </Button>
            <Button variant="outline" onClick={onAsk}>
              <Sparkles className="h-4 w-4" /> Ask Nova
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
