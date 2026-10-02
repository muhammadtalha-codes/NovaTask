"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Send,
  Brain,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Wand2,
  CalendarClock,
  ListChecks,
  Bell,
  Plus as PlusIcon,
  Pencil,
  Trash as TrashIcon,
  Flag,
  Clock,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { AIActionResult, ChatMessage } from "@/types";

const QUICK_PROMPTS = [
  "I have a Software Engineering assignment tomorrow at 10 AM and a DSA quiz on Friday at 2 PM.",
  "Plan my day for today.",
  "What should I work on first?",
  "Show me everything due this week.",
  "Remind me at 9 PM to review my notes.",
  "Mark my HTML assignment as completed.",
  "Move my DSA quiz preparation to tonight.",
];

export function AssistantView() {
  const messages = useAppStore((s) => s.chatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const setChatMessages = useAppStore((s) => s.setChatMessages);
  const upsertTasks = useAppStore((s) => s.upsertTasks);
  const upsertReminders = useAppStore((s) => s.upsertReminders);
  const upsertNotifications = useAppStore((s) => s.upsertNotifications);
  const setUnreadNotifications = useAppStore((s) => s.setUnreadNotifications);
  const removeTask = useAppStore((s) => s.removeTask);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [clearing, setClearing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, sending]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setInput("");
    setSending(true);
    addChatMessage({
      id: `temp-${Date.now()}`,
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
      addChatMessage({
        id: `a-${Date.now()}`,
        role: "assistant",
        content: res.reply,
        actionData: { actions: res.actions, results: res.results },
        createdAt: new Date().toISOString(),
      });
      if (res.tasks) upsertTasks(res.tasks);
      if (res.reminders) upsertReminders(res.reminders);
      if (res.notifications) upsertNotifications(res.notifications);
      if (typeof res.unreadNotifications === "number")
        setUnreadNotifications(res.unreadNotifications);
      for (const r of res.results ?? []) {
        if (r.deleted) for (const id of r.deleted) removeTask(id);
      }
      const okActions = (res.results ?? []).filter((r) => r.ok);
      if (okActions.length > 0) {
        toast.success(okActions[0].summary, {
          description: okActions.length > 1 ? `+${okActions.length - 1} more` : undefined,
        });
      }
      const failed = (res.results ?? []).filter((r) => !r.ok);
      if (failed.length > 0) toast.error(failed[0].summary);
    } catch (e: any) {
      toast.error(e?.message ?? "Nova couldn't respond.");
      addChatMessage({
        id: `e-${Date.now()}`,
        role: "assistant",
        content: "I ran into a problem. Please try again.",
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
      toast.success("Chat cleared.");
    } catch {
      toast.error("Couldn't clear chat.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Chat column */}
        <Card className="glass-strong flex h-[calc(100vh-220px)] flex-col">
          <CardHeader className="flex-row items-center justify-between space-y-0 border-b border-border/50 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <div className="relative h-8 w-8">
                <div className="absolute inset-0 rounded-lg animate-pulse-glow" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }} />
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  <Brain className="h-4 w-4" />
                </div>
              </div>
              Nova Assistant
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={clearHistory} disabled={clearing}>
              {clearing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </CardHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
            {messages.length === 0 && !sending && (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="relative h-16 w-16 mb-4">
                  <div className="absolute inset-0 rounded-2xl animate-pulse-glow" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-3))" }} />
                  <div className="absolute inset-0 flex items-center justify-center text-white">
                    <Sparkles className="h-7 w-7" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold">How can I help today?</h3>
                <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                  Describe what you have to do in plain English. I'll create tasks,
                  set priorities, schedule, and remind you.
                </p>
              </div>
            )}
            <AnimatePresence>
              {messages.map((m) => (
                <Bubble key={m.id} m={m} />
              ))}
            </AnimatePresence>
            {sending && <Typing />}
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
              <Button size="icon" onClick={() => send(input)} disabled={sending || !input.trim()} className="shrink-0">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </Card>

        {/* Side: quick actions + examples */}
        <div className="space-y-4">
          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Try saying</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => send(p)}
                  disabled={sending}
                  className="glass block w-full rounded-xl px-3 py-2 text-left text-xs transition-transform hover:-translate-y-0.5"
                >
                  {p}
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">What Nova can do</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground">
              {[
                { icon: PlusIcon, text: "Create tasks from plain English" },
                { icon: Pencil, text: "Update & reschedule tasks" },
                { icon: Flag, text: "Set priorities intelligently" },
                { icon: Bell, text: "Create reminders & alarms" },
                { icon: Wand2, text: "Plan your day automatically" },
                { icon: ListChecks, text: "Summarize what's due" },
              ].map((c, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--brand)_14%,transparent)]">
                    <c.icon className="h-3.5 w-3.5 text-[var(--brand)]" />
                  </div>
                  <span>{c.text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Bubble({ m }: { m: ChatMessage }) {
  const isUser = m.role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[80%] ${isUser ? "" : "w-full"}`}>
        <div
          className={
            isUser
              ? "rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm text-white"
              : "glass rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm"
          }
          style={isUser ? { background: "linear-gradient(135deg, var(--brand), var(--brand-2))" } : undefined}
        >
          <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
        </div>
        {!isUser && m.actionData?.results && m.actionData.results.length > 0 && (
          <div className="mt-2 space-y-1.5">
            {m.actionData.results.map((r, i) => (
              <div key={i} className="glass flex items-start gap-2 rounded-lg px-3 py-2 text-xs">
                {r.ok ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-400" /> : <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{actionLabel(r.type)}</div>
                  <div className="text-muted-foreground">{r.summary}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function Typing() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
      <div className="glass rounded-2xl rounded-bl-sm px-3.5 py-3">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="h-2 w-2 rounded-full bg-[var(--brand)]"
              animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

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
