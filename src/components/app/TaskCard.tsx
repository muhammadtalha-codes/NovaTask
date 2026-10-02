"use client";

import { motion } from "framer-motion";
import { Check, Clock, MoreVertical, Bell, Repeat } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  PriorityBadge,
  PriorityDot,
  StatusBadge,
  TypeBadge,
  TypeIcon,
  DeadlineChip,
} from "@/components/app/badges";
import { SubtaskList } from "@/components/app/SubtaskList";
import { useAppStore } from "@/store/app-store";
import {
  formatTime,
  hoursUntil,
  isOverdue,
  relativeDay,
} from "@/lib/task-helpers";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";

export function TaskCard({
  task,
  compact = false,
  showSubject = true,
}: {
  task: Task;
  compact?: boolean;
  showSubject?: boolean;
}) {
  const setEditingTask = useAppStore((s) => s.setEditingTask);
  const upsertTask = useAppStore((s) => s.upsertTask);
  const removeTask = useAppStore((s) => s.removeTask);
  const prefs = useAppStore((s) => s.preferences);
  const timeFmt = prefs?.timeFormat ?? "12h";

  const completed = task.status === "COMPLETED";
  const overdue =
    !completed && isOverdue(task.deadline ?? task.date);
  const soon =
    !completed &&
    !overdue &&
    ((hoursUntil(task.deadline ?? task.date) ?? Infinity) < 24);

  async function toggleComplete() {
    const next = completed ? "PENDING" : "COMPLETED";
    try {
      const res = await api<{ task: Task; nextTask?: Task }>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        json: { status: next },
      });
      upsertTask(res.task);
      if (next === "COMPLETED") {
        if (res.nextTask) {
          upsertTask(res.nextTask);
          toast.success("Marked complete", {
            description: `Next occurrence scheduled for ${new Date(
              res.nextTask.date ?? res.nextTask.deadline ?? Date.now()
            ).toLocaleDateString(undefined, { month: "short", day: "numeric" })}.`,
          });
        } else {
          toast.success("Marked complete. Nice work!");
        }
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update.");
    }
  }

  async function quickDelete() {
    try {
      await api(`/api/tasks/${task.id}`, { method: "DELETE" });
      removeTask(task.id);
      toast.success("Task deleted.");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete.");
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      whileHover={{ y: -3 }}
      className={cn(
        "group glass card-3d relative rounded-2xl p-4",
        completed && "opacity-70"
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={toggleComplete}
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all",
            completed
              ? "border-emerald-400 bg-emerald-400 text-white"
              : "border-border hover:border-[var(--brand)]"
          )}
          aria-label={completed ? "Mark as pending" : "Mark as completed"}
        >
          {completed && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <PriorityDot priority={task.priority} />
                <h3
                  className={cn(
                    "truncate text-sm font-semibold",
                    completed && "line-through text-muted-foreground"
                  )}
                >
                  {task.title}
                </h3>
              </div>
              {!compact && task.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {task.description}
                </p>
              )}
              {task.subtasks && task.subtasks.length > 0 && (
                <SubtaskList
                  taskId={task.id}
                  subtasks={task.subtasks}
                  compact={compact}
                />
              )}
              {showSubject && task.subject && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <TypeBadge type={task.type} />
                  {task.subject && (
                    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] text-muted-foreground border border-border/60 bg-muted/40">
                      <TypeIcon type={task.type} className="h-3 w-3" />
                      {task.subject}
                    </span>
                  )}
                </div>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <PriorityBadge priority={task.priority} />
                <StatusBadge status={task.status} />
                {task.time && (
                  <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-muted-foreground bg-muted/40 border border-border/60">
                    <Clock className="h-3 w-3" />
                    {formatTime(task.time, timeFmt)}
                  </span>
                )}
                {task.date && (
                  <span className="text-[11px] text-muted-foreground">
                    {relativeDay(task.date)}
                  </span>
                )}
                {(task.deadline || task.reminderEnabled) && (
                  <DeadlineChip deadline={task.deadline} overdue={overdue} soon={soon} />
                )}
                {task.reminderEnabled && (
                  <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[var(--brand-2)] bg-[color-mix(in_oklch,var(--brand-2)_12%,transparent)] border border-[color-mix(in_oklch,var(--brand-2)_25%,transparent)]">
                    <Bell className="h-3 w-3" />
                    {task.reminderTime ? relativeDay(task.reminderTime) : "On"}
                  </span>
                )}
                {task.recurring && task.recurring.type !== "NONE" && (
                  <span className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-[var(--brand-3)] bg-[color-mix(in_oklch,var(--brand-3)_12%,transparent)] border border-[color-mix(in_oklch,var(--brand-3)_25%,transparent)]" title="Completing this task will create the next occurrence">
                    <Repeat className="h-3 w-3" />
                    {task.recurring.type.toLowerCase()}
                  </span>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setEditingTask(task)}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleComplete}>
                  {completed ? "Mark as pending" : "Mark as completed"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={quickDelete}
                  className="text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
