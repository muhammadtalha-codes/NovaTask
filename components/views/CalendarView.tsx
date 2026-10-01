"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskCard } from "@/components/app/TaskCard";
import {
  PriorityBadge,
  TypeBadge,
} from "@/components/app/badges";
import { useAppStore } from "@/store/app-store";
import { PRIORITY_RANK } from "@/lib/task-helpers";
import { cn } from "@/lib/utils";
import type { Priority, Task } from "@/types";

type Mode = "month" | "week" | "day";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Per spec: priority chip colors using color-mix with oklch
const PRIORITY_CHIP_BG: Record<Priority, string> = {
  HIGH: "color-mix(in oklch, oklch(0.62 0.24 27) 16%, transparent)",
  MEDIUM: "color-mix(in oklch, oklch(0.75 0.18 70) 16%, transparent)",
  LOW: "color-mix(in oklch, oklch(0.72 0.16 190) 16%, transparent)",
};
const PRIORITY_CHIP_FG: Record<Priority, string> = {
  HIGH: "oklch(0.62 0.24 27)",
  MEDIUM: "oklch(0.75 0.18 70)",
  LOW: "oklch(0.72 0.16 190)",
};

const TIMELINE_HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7..22

const PRIORITY_ORDER: Priority[] = ["HIGH", "MEDIUM", "LOW"];

function dateKey(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) {
      return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    }
    const at = a.time ?? "zz";
    const bt = b.time ?? "zz";
    if (at !== bt) return at < bt ? -1 : 1;
    const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity;
    const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity;
    return ad - bd;
  });
}

export function CalendarView() {
  const tasks = useAppStore((s) => s.tasks);
  const setEditingTask = useAppStore((s) => s.setEditingTask);
  const setAiPanel = useAppStore((s) => s.setAiPanel);

  const [mode, setMode] = useState<Mode>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());

  // Index tasks by yyyy-MM-dd (local)
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.date) continue;
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) continue;
      const key = dateKey(d);
      const arr = map.get(key) ?? [];
      arr.push(t);
      map.set(key, arr);
    }
    for (const [k, arr] of Array.from(map.entries())) {
      map.set(k, sortTasks(arr));
    }
    return map;
  }, [tasks]);

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(cursor, { weekStartsOn: 0 });
    const end = endOfWeek(cursor, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const dayTasks = useMemo(
    () => sortTasks(tasksByDate.get(dateKey(cursor)) ?? []),
    [tasksByDate, cursor]
  );

  const rangeHasTasks = useMemo(() => {
    if (mode === "month") {
      return monthDays.some(
        (d) => (tasksByDate.get(dateKey(d))?.length ?? 0) > 0
      );
    }
    if (mode === "week") {
      return weekDays.some(
        (d) => (tasksByDate.get(dateKey(d))?.length ?? 0) > 0
      );
    }
    return dayTasks.length > 0;
  }, [mode, monthDays, weekDays, dayTasks, tasksByDate]);

  function goPrev() {
    if (mode === "month") setCursor((c) => subMonths(c, 1));
    else if (mode === "week") setCursor((c) => subWeeks(c, 1));
    else setCursor((c) => subDays(c, 1));
  }
  function goNext() {
    if (mode === "month") setCursor((c) => addMonths(c, 1));
    else if (mode === "week") setCursor((c) => addWeeks(c, 1));
    else setCursor((c) => addDays(c, 1));
  }
  function goToday() {
    setCursor(new Date());
  }

  const title =
    mode === "month"
      ? format(cursor, "MMMM yyyy")
      : mode === "week"
        ? `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d, yyyy")}`
        : format(cursor, "EEEE, MMM d, yyyy");

  function openTask(t: Task) {
    setEditingTask(t);
  }
  function openDay(d: Date) {
    setCursor(d);
    setMode("day");
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Header card */}
      <Card className="glass card-3d gradient-border">
        <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_oklch,var(--brand)_14%,transparent)] text-[var(--brand)]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-gradient">
                {title}
              </h2>
              <Legend />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="outline"
                onClick={goPrev}
                aria-label="Previous"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={goToday}>
                Today
              </Button>
              <Button
                size="icon"
                variant="outline"
                onClick={goNext}
                aria-label="Next"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
              <TabsList className="h-9">
                <TabsTrigger value="month">Month</TabsTrigger>
                <TabsTrigger value="week">Week</TabsTrigger>
                <TabsTrigger value="day">Day</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          {!rangeHasTasks ? (
            <EmptyRange onAsk={() => setAiPanel(true)} />
          ) : mode === "month" ? (
            <MonthGrid
              days={monthDays}
              cursor={cursor}
              tasksByDate={tasksByDate}
              onTaskClick={openTask}
              onMore={openDay}
            />
          ) : mode === "week" ? (
            <WeekStrip
              days={weekDays}
              cursor={cursor}
              tasksByDate={tasksByDate}
              onTaskClick={openTask}
              onDayClick={openDay}
            />
          ) : (
            <DayTimeline
              date={cursor}
              tasks={dayTasks}
              onTaskClick={openTask}
              onAdd={() => setEditingTask("new")}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
      {PRIORITY_ORDER.map((p) => (
        <span key={p} className="inline-flex items-center gap-1.5">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              background: PRIORITY_CHIP_FG[p],
              boxShadow: `0 0 6px ${PRIORITY_CHIP_FG[p]}`,
            }}
          />
          {p.toLowerCase()}
        </span>
      ))}
    </div>
  );
}

function Chip({
  task,
  onClick,
}: {
  task: Task;
  onClick: (t: Task) => void;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -1, scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      onClick={(e) => {
        e.stopPropagation();
        onClick(task);
      }}
      className="flex w-full items-center gap-1 rounded-md border px-1.5 py-1 text-left text-[11px] font-medium transition-colors"
      style={{
        background: PRIORITY_CHIP_BG[task.priority],
        color: PRIORITY_CHIP_FG[task.priority],
        borderColor: `color-mix(in oklch, ${PRIORITY_CHIP_FG[task.priority]} 30%, transparent)`,
      }}
      title={task.title}
    >
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: PRIORITY_CHIP_FG[task.priority] }}
      />
      {task.time && (
        <span className="shrink-0 tabular-nums opacity-70">{task.time}</span>
      )}
      <span className="truncate">{task.title}</span>
    </motion.button>
  );
}

function MonthGrid({
  days,
  cursor,
  tasksByDate,
  onTaskClick,
  onMore,
}: {
  days: Date[];
  cursor: Date;
  tasksByDate: Map<string, Task[]>;
  onTaskClick: (t: Task) => void;
  onMore: (d: Date) => void;
}) {
  return (
    <Card className="glass">
      <CardContent className="p-3 sm:p-4">
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="px-1 pb-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {days.map((d, i) => {
            const key = dateKey(d);
            const dayTasks = tasksByDate.get(key) ?? [];
            const inMonth = isSameMonth(d, cursor);
            const today = isToday(d);
            const visible = dayTasks.slice(0, 3);
            const extra = dayTasks.length - visible.length;
            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.22,
                  delay: Math.min(i * 0.008, 0.16),
                  ease: [0.22, 1, 0.36, 1],
                }}
                onClick={() => onMore(d)}
                className={cn(
                  "group relative flex min-h-[88px] cursor-pointer flex-col gap-1 rounded-xl border p-1.5 text-left transition-all",
                  "hover:shadow-md hover:-translate-y-0.5",
                  inMonth
                    ? "glass"
                    : "border-dashed border-border/40 bg-transparent",
                  today && "glow-ring"
                )}
                style={
                  today
                    ? {
                        borderColor:
                          "color-mix(in oklch, var(--brand) 60%, transparent)",
                      }
                    : undefined
                }
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold",
                      today
                        ? "bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] text-white shadow-[0_0_10px_color-mix(in_oklch,var(--brand)_40%,transparent)]"
                        : inMonth
                          ? "text-foreground"
                          : "text-muted-foreground/50"
                    )}
                  >
                    {format(d, "d")}
                  </span>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                      {dayTasks.length}
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  {visible.map((t) => (
                    <Chip key={t.id} task={t} onClick={onTaskClick} />
                  ))}
                  {extra > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMore(d);
                      }}
                      className="text-left text-[10px] font-semibold text-[var(--brand)] hover:underline"
                    >
                      +{extra} more
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function WeekStrip({
  days,
  cursor,
  tasksByDate,
  onTaskClick,
  onDayClick,
}: {
  days: Date[];
  cursor: Date;
  tasksByDate: Map<string, Task[]>;
  onTaskClick: (t: Task) => void;
  onDayClick: (d: Date) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((d, i) => {
        const key = dateKey(d);
        const dayTasks = tasksByDate.get(key) ?? [];
        const today = isToday(d);
        const isCursor = isSameDay(d, cursor);
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.24,
              delay: Math.min(i * 0.03, 0.21),
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Card
              className={cn(
                "glass card-3d h-full min-h-[220px]",
                today && "glow-ring"
              )}
            >
              <CardContent className="flex h-full flex-col p-3">
                <button
                  type="button"
                  onClick={() => onDayClick(d)}
                  className="mb-2 flex items-center justify-between rounded-lg px-1 py-0.5 text-left transition-colors hover:bg-muted/40"
                >
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {format(d, "EEE")}
                    </div>
                    <div
                      className={cn(
                        "text-lg font-bold leading-none",
                        today
                          ? "text-gradient"
                          : isCursor
                            ? "text-[var(--brand)]"
                            : "text-foreground"
                      )}
                    >
                      {format(d, "d")}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold",
                      dayTasks.length
                        ? "bg-[color-mix(in_oklch,var(--brand)_14%,transparent)] text-[var(--brand)]"
                        : "bg-muted/40 text-muted-foreground"
                    )}
                  >
                    {dayTasks.length}
                  </span>
                </button>
                <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto pr-1">
                  <AnimatePresence initial={false}>
                    {dayTasks.map((t) => (
                      <motion.div
                        key={t.id}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                        onClick={(e) => {
                          if (
                            (e.target as HTMLElement).closest(
                              "button, [role='menuitem']"
                            )
                          )
                            return;
                          onTaskClick(t);
                        }}
                        className="cursor-pointer"
                      >
                        <TaskCard task={t} compact showSubject={false} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  {dayTasks.length === 0 && (
                    <div className="flex h-24 items-center justify-center text-center text-[11px] text-muted-foreground/70">
                      Nothing scheduled
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}

function DayTimeline({
  date,
  tasks,
  onTaskClick,
  onAdd,
}: {
  date: Date;
  tasks: Task[];
  onTaskClick: (t: Task) => void;
  onAdd: () => void;
}) {
  const scheduled = useMemo(() => tasks.filter((t) => !!t.time), [tasks]);
  const unscheduled = useMemo(() => tasks.filter((t) => !t.time), [tasks]);

  const byHour = useMemo(() => {
    const map = new Map<number, Task[]>();
    for (const t of scheduled) {
      const h = Number(t.time!.split(":")[0]);
      if (Number.isNaN(h)) continue;
      const arr = map.get(h) ?? [];
      arr.push(t);
      map.set(h, arr);
    }
    return map;
  }, [scheduled]);

  return (
    <Card className="glass card-3d">
      <CardContent className="p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold">{format(date, "EEEE")}</h3>
            <p className="text-xs text-muted-foreground">
              {format(date, "MMM d, yyyy")} · {tasks.length} task
              {tasks.length === 1 ? "" : "s"}
            </p>
          </div>
          <Button onClick={onAdd} size="sm">
            <Plus className="h-4 w-4" />
            Add task for this day
          </Button>
        </div>

        {/* Unscheduled tasks */}
        {unscheduled.length > 0 && (
          <div className="mb-5">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Unscheduled · {unscheduled.length}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <AnimatePresence initial={false}>
                {unscheduled.map((t) => (
                  <motion.div
                    key={t.id}
                    layout
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    onClick={(e) => {
                      if (
                        (e.target as HTMLElement).closest(
                          "button, [role='menuitem']"
                        )
                      )
                        return;
                      onTaskClick(t);
                    }}
                    className="cursor-pointer"
                  >
                    <TaskCard task={t} compact showSubject={false} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Hourly timeline */}
        <div className="relative">
          <div className="absolute bottom-0 left-[68px] top-0 w-px bg-border/50" />
          <div className="space-y-2">
            {TIMELINE_HOURS.map((h, i) => {
              const hourTasks = byHour.get(h) ?? [];
              return (
                <motion.div
                  key={h}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    delay: Math.min(i * 0.02, 0.2),
                    ease: [0.22, 1, 0.36, 1],
                  }}
                  className="flex gap-3"
                >
                  <div className="w-16 shrink-0 pt-1.5 text-right text-[11px] font-medium text-muted-foreground tabular-nums">
                    {format(new Date(2000, 0, 1, h, 0), "h aaa")}
                  </div>
                  <div className="relative flex-1 pl-3">
                    {hourTasks.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <AnimatePresence initial={false}>
                          {hourTasks.map((t) => (
                            <motion.div
                              key={t.id}
                              layout
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, scale: 0.96 }}
                              whileHover={{ y: -2 }}
                              transition={{
                                duration: 0.2,
                                ease: [0.22, 1, 0.36, 1],
                              }}
                              onClick={() => onTaskClick(t)}
                              className="cursor-pointer rounded-xl border p-3 transition-all"
                              style={{
                                background: PRIORITY_CHIP_BG[t.priority],
                                borderColor: `color-mix(in oklch, ${PRIORITY_CHIP_FG[t.priority]} 30%, transparent)`,
                              }}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{
                                    background: PRIORITY_CHIP_FG[t.priority],
                                  }}
                                />
                                <span
                                  className="text-xs font-semibold tabular-nums"
                                  style={{
                                    color: PRIORITY_CHIP_FG[t.priority],
                                  }}
                                >
                                  {t.time}
                                </span>
                                <div className="ml-auto">
                                  <PriorityBadge priority={t.priority} />
                                </div>
                              </div>
                              <div className="mt-1 truncate text-sm font-medium text-foreground">
                                {t.title}
                              </div>
                              {t.subject && (
                                <div className="mt-1.5">
                                  <TypeBadge type={t.type} />
                                </div>
                              )}
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    ) : (
                      <div className="h-10 rounded-lg border border-dashed border-border/40" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyRange({ onAsk }: { onAsk: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/60 py-16 text-center">
      <div className="relative h-16 w-16">
        <div
          className="absolute inset-0 rounded-2xl animate-pulse-glow"
          style={{
            background:
              "radial-gradient(circle, var(--brand), transparent 70%)",
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-[var(--brand)]" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">No tasks in this range</h3>
        <p className="mx-auto max-w-sm text-sm text-muted-foreground">
          Let Nova plan this stretch for you, or jump to a different date.
        </p>
      </div>
      <Button onClick={onAsk}>
        <Sparkles className="h-4 w-4" />
        Ask Nova to plan
      </Button>
    </div>
  );
}
