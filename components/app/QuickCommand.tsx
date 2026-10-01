"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useAppStore, type ViewKey } from "@/store/app-store";
import {
  LayoutDashboard,
  Sparkles,
  CheckSquare,
  CalendarDays,
  CalendarClock,
  BarChart3,
  Bell,
  Settings,
  Plus,
  Search,
  ArrowRight,
  Brain,
  Loader2,
} from "lucide-react";
import { useAppStore as useStore } from "@/store/app-store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

const VIEWS: { key: ViewKey; label: string; icon: any }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "assistant", label: "AI Assistant", icon: Sparkles },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "schedule", label: "Schedule", icon: CalendarClock },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "reminders", label: "Reminders", icon: Bell },
  { key: "settings", label: "Settings", icon: Settings },
];

export function QuickCommand() {
  const open = useAppStore((s) => s.quickOpen);
  const setOpen = useAppStore((s) => s.setQuickOpen);
  const setView = useAppStore((s) => s.setView);
  const setEditingTask = useAppStore((s) => s.setEditingTask);
  const setAiPanel = useAppStore((s) => s.setAiPanel);
  const upsertTasks = useAppStore((s) => s.upsertTasks);
  const upsertReminders = useAppStore((s) => s.upsertReminders);
  const upsertNotifications = useAppStore((s) => s.upsertNotifications);
  const setUnreadNotifications = useAppStore((s) => s.setUnreadNotifications);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const tasks = useStore((s) => s.tasks);
  const [query, setQuery] = useState("");
  const [nlLoading, setNlLoading] = useState(false);

  // Does the query look like a natural-language task/reminder request?
  const looksLikeTask = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 6) return false;
    return /\b(add|create|make|remind|schedule|plan|set a reminder|i have|i need to)\b/.test(q);
  }, [query]);

  async function runNlCreate() {
    const msg = query.trim();
    if (!msg || nlLoading) return;
    setNlLoading(true);
    // Optimistic user message in the AI history
    addChatMessage({
      id: `temp-${Date.now()}`,
      role: "user",
      content: msg,
      createdAt: new Date().toISOString(),
    });
    try {
      const res = await api<{
        reply: string;
        actions: any[];
        results: any[];
        tasks: any[];
        reminders: any[];
        notifications?: any[];
        unreadNotifications?: number;
      }>("/api/ai/chat", { method: "POST", json: { message: msg } });
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
      const ok = (res.results ?? []).filter((r) => r.ok);
      if (ok.length > 0) {
        toast.success(ok[0].summary, {
          description: ok.length > 1 ? `+${ok.length - 1} more` : undefined,
        });
      }
      setOpen(false);
      setQuery("");
    } catch (e: any) {
      toast.error(e?.message ?? "Nova couldn't process that.");
    } finally {
      setNlLoading(false);
    }
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <CommandInput
        value={query}
        onValueChange={setQuery}
        placeholder="Search tasks, jump to a view, or type 'add...' to create via Nova…"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* Dynamic NL-create action */}
        {looksLikeTask && (
          <CommandGroup heading="Nova AI">
            <CommandItem
              onSelect={runNlCreate}
              value={`nl-${query}`}
            >
              {nlLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[var(--brand)]" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4 text-[var(--brand)]" />
              )}
              <span className="truncate">
                {nlLoading ? "Nova is creating…" : `Ask Nova: "${query.trim().slice(0, 60)}${query.trim().length > 60 ? "…" : ""}"`}
              </span>
            </CommandItem>
          </CommandGroup>
        )}

        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              setOpen(false);
              setEditingTask("new");
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create new task
          </CommandItem>
          <CommandItem
            onSelect={() => {
              setOpen(false);
              setAiPanel(true);
            }}
          >
            <Brain className="mr-2 h-4 w-4" />
            Ask Nova AI
          </CommandItem>
          <CommandItem
            onSelect={async () => {
              setOpen(false);
              setView("schedule");
              toast("Generating today's plan with Nova...", {
                action: {
                  label: "Open",
                  onClick: () => setView("schedule"),
                },
              });
            }}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Plan my day with AI
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Navigate">
          {VIEWS.map((v) => (
            <CommandItem
              key={v.key}
              onSelect={() => {
                setOpen(false);
                setView(v.key);
              }}
            >
              <v.icon className="mr-2 h-4 w-4" />
              {v.label}
            </CommandItem>
          ))}
        </CommandGroup>

        {tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {tasks
                .filter(
                  (t) =>
                    !query ||
                    t.title.toLowerCase().includes(query.toLowerCase()) ||
                    (t.subject ?? "").toLowerCase().includes(query.toLowerCase())
                )
                .slice(0, 8)
                .map((t) => (
                  <CommandItem
                    key={t.id}
                    onSelect={() => {
                      setOpen(false);
                      setEditingTask(t);
                    }}
                    value={`${t.title} ${t.subject ?? ""} ${t.priority}`}
                  >
                    <Search className="mr-2 h-4 w-4" />
                    <span className="truncate flex-1">{t.title}</span>
                    {t.subject && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        {t.subject}
                      </span>
                    )}
                    <ArrowRight className="ml-2 h-3 w-3 text-muted-foreground" />
                  </CommandItem>
                ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
