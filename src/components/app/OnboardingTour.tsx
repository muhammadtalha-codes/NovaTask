"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronRight, ChevronLeft, Check, Brain, ListChecks, CalendarDays, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/store/app-store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface Step {
  title: string;
  body: string;
  icon: typeof Brain;
  accent: string;
}

const STEPS: Step[] = [
  {
    title: "Meet Nova — your AI copilot",
    body: "Tell Nova what you have to do in plain English. It creates tasks, sets priorities, deadlines, and reminders for you — no forms needed.",
    icon: Brain,
    accent: "var(--brand)",
  },
  {
    title: "Talk to your tasks",
    body: "Open the AI panel with ⌘J and try: “I have an assignment tomorrow at 10 AM and a quiz Friday at 2 PM.” Nova parses both and organizes everything.",
    icon: Sparkles,
    accent: "var(--brand-2)",
  },
  {
    title: "Drag, drop, and dive deep",
    body: "Switch the Tasks view to a board and drag cards between To do / In progress / Done. Click any task to edit details, add subtasks, or set a reminder.",
    icon: ListChecks,
    accent: "var(--brand-3)",
  },
  {
    title: "Plan your day, stay focused",
    body: "Hit “Plan my day” on the dashboard — Nova builds a prioritized timeline. Then open the Focus timer (⌘I) to run Pomodoro sessions on a specific task.",
    icon: Zap,
    accent: "var(--brand)",
  },
  {
    title: "Everything in one calendar",
    body: "The Calendar view shows assignments, quizzes, deadlines, and reminders across Month / Week / Day. Click any item to jump straight to it.",
    icon: CalendarDays,
    accent: "var(--brand-2)",
  },
];

/**
 * Lightweight first-run onboarding overlay. Shows once per user (gated by
 * preferences.onboarded). A premium glass modal with icon, title, body, and
 * step dots. Dismissing or finishing marks the user as onboarded.
 */
export function OnboardingTour() {
  const preferences = useAppStore((s) => s.preferences);
  const setPreferences = useAppStore((s) => s.setPreferences);
  const setAiPanel = useAppStore((s) => s.setAiPanel);
  const setView = useAppStore((s) => s.setView);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  // Show the tour once preferences load and the user isn't onboarded.
  useEffect(() => {
    if (preferences && !preferences.onboarded) {
      // small delay so the dashboard mounts first
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, [preferences]);

  async function finish(skipToAi = false) {
    setOpen(false);
    // persist onboarded flag
    try {
      const res = await api<{ preferences: any }>("/api/profile", {
        method: "PATCH",
        json: { preferences: { onboarded: true } },
      });
      if (res.preferences) setPreferences(res.preferences);
    } catch {
      // non-fatal — the local flag below still prevents re-show this session
      if (preferences) setPreferences({ ...preferences, onboarded: true });
    }
    if (skipToAi) {
      setView("dashboard");
      setTimeout(() => setAiPanel(true), 300);
    }
    toast.success("Welcome to NovaTask!", {
      description: "Try telling Nova what you have to do.",
    });
  }

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        >
          {/* backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => finish(false)}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="glass-strong gradient-border relative w-full max-w-md overflow-hidden rounded-2xl p-6"
          >
            {/* ambient glow */}
            <div
              className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full blur-3xl opacity-50"
              style={{ background: `radial-gradient(circle, ${current.accent}, transparent 70%)` }}
            />

            {/* close */}
            <button
              onClick={() => finish(false)}
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
              aria-label="Skip tour"
            >
              <X className="h-4 w-4" />
            </button>

            {/* step icon */}
            <div className="relative mb-4 flex justify-center">
              <div className="relative h-16 w-16">
                <div
                  className="absolute inset-0 rounded-2xl animate-pulse-glow"
                  style={{ background: `linear-gradient(135deg, ${current.accent}, var(--brand-2))` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <Icon className="h-7 w-7" />
                </div>
              </div>
            </div>

            {/* content */}
            <div className="relative text-center">
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Step {step + 1} of {STEPS.length}
              </div>
              <h2 className="text-xl font-semibold tracking-tight">
                {current.title}
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                {current.body}
              </p>
            </div>

            {/* step dots */}
            <div className="relative mt-5 flex items-center justify-center gap-1.5">
              {STEPS.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setStep(i)}
                  className="h-1.5 rounded-full transition-all"
                  style={{
                    width: i === step ? 24 : 8,
                    background:
                      i === step
                        ? current.accent
                        : i < step
                        ? "color-mix(in oklch, var(--foreground) 30%, transparent)"
                        : "color-mix(in oklch, var(--foreground) 15%, transparent)",
                  }}
                  aria-label={`Go to step ${i + 1}`}
                />
              ))}
            </div>

            {/* controls */}
            <div className="relative mt-5 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => finish(false)}
                className="text-muted-foreground"
              >
                Skip
              </Button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" /> Back
                  </Button>
                )}
                {isLast ? (
                  <Button size="sm" onClick={() => finish(true)}>
                    <Sparkles className="h-4 w-4" /> Try Nova
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                    style={{ background: `linear-gradient(135deg, ${current.accent}, var(--brand-2))` }}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
