"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Loader2, Sparkles, CornerDownLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/store/app-store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Priority, TaskType } from "@/types";

const PRIORITIES: Priority[] = ["MEDIUM", "HIGH", "LOW"];
const TYPES: { value: TaskType; label: string }[] = [
  { value: "OTHER", label: "Task" },
  { value: "ASSIGNMENT", label: "Assignment" },
  { value: "QUIZ", label: "Quiz" },
  { value: "EXAM", label: "Exam" },
  { value: "MEETING", label: "Meeting" },
  { value: "PROJECT", label: "Project" },
  { value: "STUDY", label: "Study" },
  { value: "PERSONAL", label: "Personal" },
];

/**
 * Fast inline task creator. Type a title + optional quick filters, press Enter.
 * Avoids opening the full TaskDialog for the common "just add a task" case.
 */
export function QuickAddBar({ defaultDate }: { defaultDate?: string | null }) {
  const upsertTask = useAppStore((s) => s.upsertTask);
  const setAiPanel = useAppStore((s) => s.setAiPanel);
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [type, setType] = useState<TaskType>("OTHER");
  const [saving, setSaving] = useState(false);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    const t = title.trim();
    if (!t || saving) return;
    setSaving(true);
    try {
      const res = await api<{ task: any }>("/api/tasks", {
        method: "POST",
        json: {
          title: t,
          priority,
          type,
          date: defaultDate ?? null,
        },
      });
      upsertTask(res.task);
      setTitle("");
      toast.success("Task added", { description: t });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't add task.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.form
      onSubmit={submit}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="glass-strong gradient-border flex flex-wrap items-center gap-2 rounded-2xl p-2"
    >
      <div className="relative min-w-[180px] flex-1">
        <Plus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Quick add a task… (press Enter)"
          className="border-0 bg-transparent pl-9 shadow-none focus-visible:ring-0"
          disabled={saving}
        />
        {title.trim() && (
          <CornerDownLeft
            className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        )}
      </div>

      <Select value={type} onValueChange={(v) => setType(v as TaskType)}>
        <SelectTrigger className="h-9 w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={priority} onValueChange={(v) => setPriority(v as Priority)}>
        <SelectTrigger className="h-9 w-[110px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PRIORITIES.map((p) => (
            <SelectItem key={p} value={p}>
              {p === "HIGH" ? "🔴 High" : p === "MEDIUM" ? "🟡 Medium" : "🟢 Low"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="submit" size="sm" disabled={saving || !title.trim()} className="h-9">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Plus className="h-4 w-4" /> Add
          </>
        )}
      </Button>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-9"
        onClick={() => setAiPanel(true)}
        title="Describe in natural language instead"
      >
        <Sparkles className="h-4 w-4 text-[var(--brand)]" />
        <span className="hidden sm:inline">Ask Nova</span>
      </Button>
    </motion.form>
  );
}
