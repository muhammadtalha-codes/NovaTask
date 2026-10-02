"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTimerStore, type TimerMode } from "@/store/timer-store";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  RotateCcw,
  X,
  ChevronDown,
  ChevronUp,
  Brain,
  Coffee,
  Timer as TimerIcon,
  Minimize2,
  Maximize2,
  Settings2,
  Target,
} from "lucide-react";
import { toast } from "sonner";
import { ProgressRing } from "@/components/app/ProgressRing";
import { PriorityDot } from "@/components/app/badges";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MODE_META: Record<TimerMode, { label: string; icon: typeof Brain; color: string }> = {
  focus: { label: "Focus", icon: Brain, color: "var(--brand)" },
  short: { label: "Short break", icon: Coffee, color: "var(--brand-3)" },
  long: { label: "Long break", icon: Coffee, color: "var(--brand-2)" },
};

export function FocusTimer() {
  const t = useTimerStore();
  const tasks = useAppStore((s) => s.tasks);
  const setEditingTask = useAppStore((s) => s.setEditingTask);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  // drive the timer
  useEffect(() => {
    if (t.running) {
      intervalRef.current = setInterval(() => {
        const s = useTimerStore.getState();
        if (!s.running) return;
        if (s.secondsLeft <= 1) {
          // phase complete
          const meta = MODE_META[s.mode];
          toast.success(`${meta.label} session complete!`, {
            description:
              s.mode === "focus"
                ? "Time for a well-earned break."
                : "Let's get back to focus.",
          });
          // try a notification
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification("NovaTask Focus Timer", {
                body: `${meta.label} session complete — ${
                  s.mode === "focus" ? "take a break!" : "back to work!"
                }`,
              });
            } catch {
              /* ignore */
            }
          }
          s.advance();
        } else {
          s.tick();
        }
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [t.running]);

  const total = durationSeconds(t.mode, t);
  const pct = total > 0 ? ((total - t.secondsLeft) / total) * 100 : 0;
  const mm = String(Math.floor(t.secondsLeft / 60)).padStart(2, "0");
  const ss = String(t.secondsLeft % 60).padStart(2, "0");
  const meta = MODE_META[t.mode];
  const focusTask = tasks.find((x) => x.id === t.focusTaskId);
  const incompleteTasks = tasks
    .filter((x) => x.status !== "COMPLETED")
    .sort((a, b) => {
      const pr = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;
      return pr[a.priority] - pr[b.priority];
    });

  return (
    <AnimatePresence>
      {t.open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed bottom-6 right-6 z-40"
        >
          <div className="glass-strong gradient-border relative w-[320px] overflow-hidden rounded-2xl p-4 shadow-2xl">
            {/* glow */}
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full blur-2xl opacity-40"
              style={{ background: `radial-gradient(circle, ${meta.color}, transparent 70%)` }}
            />

            {/* header */}
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <meta.icon className="h-4 w-4" style={{ color: meta.color }} />
                {meta.label}
                {t.completedFocus > 0 && t.mode !== "focus" && (
                  <span className="text-[11px] text-muted-foreground">
                    · {t.completedFocus} done
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => t.setExpanded(!t.expanded)}
                  title={t.expanded ? "Minimize" : "Expand"}
                >
                  {t.expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => t.setOpen(false)}
                  title="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {t.expanded ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="relative overflow-hidden"
                >
                  {/* ring + time */}
                  <div className="mt-3 flex flex-col items-center">
                    <div className="relative">
                      <ProgressRing
                        value={pct}
                        size={150}
                        stroke={9}
                        label={`${mm}:${ss}`}
                        sublabel={t.running ? "running" : "paused"}
                      />
                    </div>

                    {/* mode tabs */}
                    <div className="mt-4 flex gap-1 rounded-xl bg-muted/40 p-1">
                      {(["focus", "short", "long"] as TimerMode[]).map((m) => {
                        const active = t.mode === m;
                        return (
                          <button
                            key={m}
                            onClick={() => t.setMode(m)}
                            className="relative rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                            style={
                              active
                                ? {
                                    background: "var(--background)",
                                    color: MODE_META[m].color,
                                    boxShadow: "0 2px 8px color-mix(in oklch, var(--foreground) 8%, transparent)",
                                  }
                                : { color: "var(--muted-foreground)" }
                            }
                          >
                            {MODE_META[m].label}
                          </button>
                        );
                      })}
                    </div>

                    {/* controls */}
                    <div className="mt-4 flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 rounded-full"
                        onClick={() => t.reset()}
                        title="Reset"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                      <Button
                        className="h-12 w-12 rounded-full"
                        onClick={() => t.toggle()}
                        title={t.running ? "Pause" : "Start"}
                        style={{ background: `linear-gradient(135deg, ${meta.color}, var(--brand-2))` }}
                      >
                        {t.running ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5 ml-0.5" />
                        )}
                      </Button>
                      <Popover open={showSettings} onOpenChange={setShowSettings}>
                        <PopoverTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-10 w-10 rounded-full"
                            title="Timer settings"
                          >
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64">
                          <div className="space-y-3">
                            <div className="text-sm font-medium">Focus durations</div>
                            {(["focusMin", "shortMin", "longMin"] as const).map((key) => (
                              <div key={key} className="flex items-center justify-between gap-2">
                                <Label htmlFor={`ft-${key}`} className="text-xs capitalize">
                                  {key === "focusMin" ? "Focus (min)" : key === "shortMin" ? "Short break (min)" : "Long break (min)"}
                                </Label>
                                <Input
                                  id={`ft-${key}`}
                                  type="number"
                                  min={1}
                                  max={120}
                                  className="h-8 w-20"
                                  defaultValue={String((t as any)[key])}
                                  onChange={(e) => {
                                    const v = Math.max(1, Math.min(120, Number(e.target.value) || 1));
                                    t.setDurations({ [key]: v } as any);
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* linked task — pick what to focus on */}
                    {focusTask ? (
                      <button
                        onClick={() => setEditingTask(focusTask)}
                        className="mt-4 flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-2.5 py-1.5 text-xs transition-colors hover:border-[var(--brand)]/40"
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
                        <span className="truncate max-w-[200px]">{focusTask.title}</span>
                      </button>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-[var(--brand)]/40 hover:text-foreground">
                            <Target className="h-3 w-3" />
                            Pick a task to focus on
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-72 p-1" align="center">
                          <div className="max-h-60 overflow-y-auto scrollbar-thin">
                            {incompleteTasks.length === 0 ? (
                              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                                No incomplete tasks. Add one to focus on.
                              </div>
                            ) : (
                              incompleteTasks.slice(0, 12).map((task) => (
                                <button
                                  key={task.id}
                                  onClick={() => {
                                    t.setFocusTask(task.id);
                                    setShowSettings(false);
                                  }}
                                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs transition-colors hover:bg-muted/60"
                                >
                                  <PriorityDot priority={task.priority} />
                                  <span className="min-w-0 flex-1 truncate">{task.title}</span>
                                  {task.subject && (
                                    <span className="shrink-0 text-[10px] text-muted-foreground">{task.subject}</span>
                                  )}
                                </button>
                              ))
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="min"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="relative mt-2 flex items-center gap-2"
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                  <span className="tabular-nums text-lg font-semibold">
                    {mm}:{ss}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0"
                    onClick={() => t.toggle()}
                  >
                    {t.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function durationSeconds(mode: TimerMode, t: { focusMin: number; shortMin: number; longMin: number }) {
  if (mode === "focus") return t.focusMin * 60;
  if (mode === "short") return t.shortMin * 60;
  return t.longMin * 60;
}
