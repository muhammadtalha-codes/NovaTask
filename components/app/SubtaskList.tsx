"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, X, ListChecks } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Subtask } from "@/types";

export function SubtaskList({
  taskId,
  subtasks,
  compact = false,
}: {
  taskId: string;
  subtasks: Subtask[];
  compact?: boolean;
}) {
  const upsertSubtask = useAppStore((s) => s.upsertSubtask);
  const removeSubtask = useAppStore((s) => s.removeSubtask);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  const done = subtasks.filter((s) => s.done).length;
  const total = subtasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  async function toggle(sub: Subtask) {
    try {
      const res = await api<{ subtask: Subtask }>(`/api/subtasks/${sub.id}`, {
        method: "PATCH",
        json: { done: !sub.done },
      });
      upsertSubtask(taskId, res.subtask);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update subtask.");
    }
  }

  async function add() {
    const t = newTitle.trim();
    if (!t) return;
    setSaving(true);
    try {
      const res = await api<{ subtask: Subtask }>(
        `/api/tasks/${taskId}/subtasks`,
        { method: "POST", json: { title: t } }
      );
      upsertSubtask(taskId, res.subtask);
      setNewTitle("");
      setAdding(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't add subtask.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(sub: Subtask) {
    try {
      await api(`/api/subtasks/${sub.id}`, { method: "DELETE" });
      removeSubtask(taskId, sub.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't remove subtask.");
    }
  }

  if (total === 0 && !adding && compact) return null;

  return (
    <div className="mt-2.5 space-y-1.5" onClick={(e) => e.stopPropagation()}>
      {total > 0 && (
        <div className="flex items-center gap-2">
          <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
          <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/60">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {done}/{total}
          </span>
        </div>
      )}
      <AnimatePresence initial={false}>
        {subtasks.map((sub) => (
          <motion.div
            key={sub.id}
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="group/sub flex items-center gap-2"
          >
            <button
              onClick={() => toggle(sub)}
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all",
                sub.done
                  ? "border-emerald-400 bg-emerald-400 text-white"
                  : "border-border hover:border-[var(--brand)]"
              )}
              aria-label={sub.done ? "Mark incomplete" : "Mark complete"}
            >
              {sub.done && <Check className="h-3 w-3" strokeWidth={3} />}
            </button>
            <span
              className={cn(
                "flex-1 text-xs",
                sub.done ? "line-through text-muted-foreground" : "text-foreground/90"
              )}
            >
              {sub.title}
            </span>
            <button
              onClick={() => remove(sub)}
              className="opacity-0 transition-opacity group-hover/sub:opacity-100 text-muted-foreground hover:text-destructive"
              aria-label="Remove subtask"
            >
              <X className="h-3 w-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
      {adding ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add();
              if (e.key === "Escape") {
                setAdding(false);
                setNewTitle("");
              }
            }}
            placeholder="Subtask title…"
            className="flex-1 rounded-md border border-border bg-background/50 px-2 py-1 text-xs outline-none focus:border-[var(--brand)]"
          />
          <button
            onClick={add}
            disabled={saving || !newTitle.trim()}
            className="rounded-md bg-[var(--brand)] px-2 py-1 text-xs text-white disabled:opacity-50"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground transition-colors hover:text-[var(--brand)]"
        >
          <Plus className="h-3 w-3" /> Add subtask
        </button>
      )}
    </div>
  );
}
