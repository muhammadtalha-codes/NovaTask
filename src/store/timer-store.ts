"use client";

import { create } from "zustand";

export type TimerMode = "focus" | "short" | "long";

interface TimerState {
  mode: TimerMode;
  secondsLeft: number;
  running: boolean;
  // durations in seconds
  focusMin: number;
  shortMin: number;
  longMin: number;
  completedFocus: number; // focus sessions completed in the current cycle
  cycle: number; // total cycles (4 = long break)
  open: boolean;
  expanded: boolean; // expanded panel vs minimized pill
  // current task being focused on (optional)
  focusTaskId?: string | null;

  setMode: (m: TimerMode) => void;
  start: () => void;
  pause: () => void;
  reset: () => void;
  tick: () => void; // called every second by the widget
  toggle: () => void; // start/pause toggle
  setOpen: (v: boolean) => void;
  setExpanded: (v: boolean) => void;
  setDurations: (d: Partial<Pick<TimerState, "focusMin" | "shortMin" | "longMin">>) => void;
  setFocusTask: (id: string | null) => void;
  // advance to next phase automatically
  advance: () => void;
}

const DEFAULTS = { focusMin: 25, shortMin: 5, longMin: 15 };

function durationFor(mode: TimerMode, s: { focusMin: number; shortMin: number; longMin: number }) {
  if (mode === "focus") return s.focusMin * 60;
  if (mode === "short") return s.shortMin * 60;
  return s.longMin * 60;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  mode: "focus",
  secondsLeft: DEFAULTS.focusMin * 60,
  running: false,
  ...DEFAULTS,
  completedFocus: 0,
  cycle: 0,
  open: false,
  expanded: true,
  focusTaskId: null,

  setMode: (mode) =>
    set((s) => ({
      mode,
      running: false,
      secondsLeft: durationFor(mode, s),
    })),
  start: () => set({ running: true }),
  pause: () => set({ running: false }),
  reset: () =>
    set((s) => ({ running: false, secondsLeft: durationFor(s.mode, s) })),
  toggle: () => set((s) => ({ running: !s.running })),
  tick: () =>
    set((s) => {
      if (!s.running) return {};
      if (s.secondsLeft <= 1) {
        // phase complete — handled by advance() via the widget, but guard here
        return { secondsLeft: 0, running: false };
      }
      return { secondsLeft: s.secondsLeft - 1 };
    }),
  advance: () =>
    set((s) => {
      let nextMode: TimerMode;
      let nextCompleted = s.completedFocus;
      let nextCycle = s.cycle;
      if (s.mode === "focus") {
        nextCompleted = s.completedFocus + 1;
        nextCycle = s.cycle + 1;
        // every 4 focus sessions -> long break
        nextMode = nextCompleted % 4 === 0 ? "long" : "short";
      } else {
        // after a break, go back to focus
        nextMode = "focus";
      }
      return {
        mode: nextMode,
        completedFocus: nextCompleted,
        cycle: nextCycle,
        running: false,
        secondsLeft: durationFor(nextMode, s),
      };
    }),
  setOpen: (open) => set({ open }),
  setExpanded: (expanded) => set({ expanded }),
  setDurations: (d) =>
    set((s) => {
      const next = { ...s, ...d };
      return {
        ...d,
        // if not running, reflect new duration on current mode
        secondsLeft: s.running ? s.secondsLeft : durationFor(s.mode, next),
      };
    }),
  setFocusTask: (focusTaskId) => set({ focusTaskId }),
}));
