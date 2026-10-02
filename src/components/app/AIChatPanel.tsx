"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  X,
  Send,
  Sparkles,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Brain,
  Wand2,
  CalendarClock,
  ListChecks,
  Bell,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { ChatMessage, AIActionResult } from "@/types";

const QUICK_PROMPTS = [
  "I have a Software Engineering assignment tomorrow at 10 AM and a DSA quiz on Friday at 2 PM.",
  "Plan my day for today.",
  "What should I work on first?",
  "Show me everything due this week.",
  "Remind me at 9 PM to review my notes.",
];

export function AIChatPanel() {
  const open = useAppStore((s) => s.aiPanelOpen);
  const setOpen = useAppStore((s) => s.setAiPanel);
  const messages = useAppStore((s) => s.chatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const setChatMessages = useAppStore((s) => s.setChatMessages);
  const upsertTasks = useAppStore((s) => s.upsertTasks);
  const upsertReminders = useAppStore((s) => s.upsertReminders);
  const upsertNotifications = useAppStore((s) => s.upsertNotifications);
  const setUnreadNotifications = useAppStore((s) => s.setUnreadNotifications);
  const removeTask = useAppStore((s) => s.removeTask);
  const setView = useAppStore((s) => s.setView);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [open, messages.length, sending]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput("");
    setSending(true);
    // optimistic user message
    const tempId = `temp-${Date.now()}`;
    addChatMessage({
      id: tempId,
      role: "user",
      content: trimmed,
      createdAt: new Date().toISOString(),
    });

    try {
      const res = await api<{
        reply: string;
        actions: any[];
        results: AIActionResult[];
        tasks: any[];
        reminders: any[];
        notifications?: any[];
        unreadNotifications?: number;
      }>("/api/ai/chat", { method: "POST", json: { message: trimmed } });

      // Replace optimistic user msg with the persisted (we can keep optimistic)
      addChatMessage({
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        actionData: { actions: res.actions, results: res.results },
        createdAt: new Date().toISOString(),
      });

      // Update store with fresh snapshots
      if (res.tasks) upsertTasks(res.tasks);
      if (res.reminders) upsertReminders(res.reminders);
      if (res.notifications) upsertNotifications(res.notifications);
      if (typeof res.unreadNotifications === "number")
        setUnreadNotifications(res.unreadNotifications);

      // Surface any deletions
      for (const r of res.results ?? []) {
        if (r.deleted) for (const id of r.deleted) removeTask(id);
      }

      // Toast summary of actions
      const okActions = (res.results ?? []).filter((r) => r.ok);
      if (okActions.length > 0) {
        toast.success(okActions[0].summary, {
          description:
            okActions.length > 1
              ? `+${okActions.length - 1} more action(s)`
              : undefined,
        });
      }
      const failed = (res.results ?? []).filter((r) => !r.ok);
      if (failed.length > 0) {
        toast.error(failed[0].summary);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Nova couldn't respond. Try again.");
      addChatMessage({
        id: `e-${Date.now()}`,
        role: "assistant",
        content:
          "I ran into a problem handling that. Please try again in a moment.",
        createdAt: new Date().toISOString(),
      });
    } finally {
      setSending(false);
    }
  }

  async function clearHistory() {
    setClearing(true);
    try {
      await api("/api/chat", { method: "DELETE" });
      setChatMessages([]);
      toast.success("Chat history cleared.");
    } catch {
      toast.error("Couldn't clear history.");
    } finally {
      setClearing(false);
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
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
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
                  <div className="relative h-9 w-9">
                    <div
                      className="absolute inset-0 rounded-lg animate-pulse-glow"
                      style={{
                        background:
                          "linear-gradient(135deg, var(--brand), var(--brand-2))",
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-white">
                      <Brain className="h-4 w-4" />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      Nova <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Your AI productivity copilot
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={clearHistory}
                    disabled={clearing}
                    title="Clear history"
                  >
                    {clearing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setOpen(false)}
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
                {messages.length === 0 && !sending && (
                  <EmptyState onPrompt={(p) => send(p)} />
                )}
                {messages.map((m) => (
                  <MessageBubble key={m.id} m={m} />
                ))}
                {sending && <TypingBubble />}
              </div>

              {/* Composer */}
              <div className="border-t border-border/50 p-3">
                <div className="glass flex items-end gap-2 rounded-xl p-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send(input);
                      }
                    }}
                    placeholder="Tell Nova what you have to do..."
                    rows={2}
                    className="min-h-[44px] resize-none border-0 bg-transparent focus-visible:ring-0 shadow-none"
                  />
                  <Button
                    size="icon"
                    onClick={() => send(input)}
                    disabled={sending || !input.trim()}
                    className="shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {QUICK_PROMPTS.slice(0, 3).map((p) => (
                    <button
                      key={p}
                      onClick={() => send(p)}
                      disabled={sending}
                      className="rounded-full border border-border/60 bg-card/40 px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground hover:border-[var(--brand)]/40"
                    >
                      {p.length > 38 ? p.slice(0, 38) + "…" : p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function EmptyState({ onPrompt }: { onPrompt: (p: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center text-center">
      <div className="relative h-16 w-16 mb-4">
        <div
          className="absolute inset-0 rounded-2xl animate-pulse-glow"
          style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-3))" }}
        />
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <Sparkles className="h-7 w-7" />
        </div>
      </div>
      <h3 className="text-lg font-semibold">How can I help today?</h3>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Describe your tasks, deadlines, and reminders in plain English. I'll
        organize everything for you.
      </p>
      <div className="mt-5 grid w-full gap-2">
        {QUICK_PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => onPrompt(p)}
            className="glass rounded-xl px-3 py-2.5 text-left text-sm transition-transform hover:translate-y-[-2px]"
          >
            <span className="line-clamp-2">{p}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[85%] ${isUser ? "" : "w-full"}`}>
        <div
          className={
            isUser
              ? "rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm text-white shadow-sm"
              : "glass rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm shadow-sm"
          }
          style={
            isUser
              ? { background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }
              : undefined
          }
        >
          <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
        </div>
        {!isUser && m.actionData?.results && m.actionData.results.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {m.actionData.results.map((r, i) => (
              <ActionResultCard key={i} result={r} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function ActionResultCard({ result }: { result: AIActionResult }) {
  const Icon = result.ok ? CheckCircle2 : AlertTriangle;
  const iconCls = result.ok
    ? "text-emerald-400"
    : "text-amber-400";
  const actionIcon = ACTION_ICONS[result.type] ?? Sparkles;
  const AIcon = actionIcon;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass flex items-start gap-2 rounded-lg px-3 py-2 text-xs"
    >
      <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${iconCls}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 font-medium">
          <AIcon className="h-3 w-3 text-[var(--brand)]" />
          {actionLabel(result.type)}
        </div>
        <div className="text-muted-foreground">{result.summary}</div>
      </div>
    </motion.div>
  );
}

function TypingBubble() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
      <div className="glass rounded-2xl rounded-bl-sm px-3.5 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-[var(--brand)]"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

import {
  Plus as PlusIcon,
  Pencil,
  Trash as TrashIcon,
  Flag,
  Clock,
} from "lucide-react";

const ACTION_ICONS: Record<string, any> = {
  CREATE_TASK: PlusIcon,
  UPDATE_TASK: Pencil,
  DELETE_TASK: TrashIcon,
  COMPLETE_TASK: CheckCircle2,
  RESCHEDULE_TASK: CalendarClock,
  SET_PRIORITY: Flag,
  CREATE_REMINDER: Bell,
  SNOOZE_REMINDER: Clock,
  COMPLETE_REMINDER: CheckCircle2,
  CREATE_SCHEDULE: ListChecks,
  GENERATE_DAILY_PLAN: Wand2,
  GET_TASKS: ListChecks,
  GET_UPCOMING_DEADLINES: CalendarClock,
  ANSWER: Sparkles,
};

function actionLabel(type: string) {
  const map: Record<string, string> = {
    CREATE_TASK: "Task created",
    UPDATE_TASK: "Task updated",
    DELETE_TASK: "Task deleted",
    COMPLETE_TASK: "Task completed",
    RESCHEDULE_TASK: "Task rescheduled",
    SET_PRIORITY: "Priority set",
    CREATE_REMINDER: "Reminder set",
    SNOOZE_REMINDER: "Reminder snoozed",
    COMPLETE_REMINDER: "Reminder completed",
    CREATE_SCHEDULE: "Schedule created",
    GENERATE_DAILY_PLAN: "Daily plan generated",
    GET_TASKS: "Tasks retrieved",
    GET_UPCOMING_DEADLINES: "Deadlines retrieved",
    ANSWER: "Answer",
  };
  return map[type] ?? "Action";
}
