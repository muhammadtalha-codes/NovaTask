"use client";

import {
  AlertCircle,
  BookOpen,
  Calendar,
  ClipboardList,
  Code2,
  GraduationCap,
  NotebookPen,
  Users,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PRIORITY_BG,
  PRIORITY_BORDER,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  STATUS_LABEL,
  TYPE_LABEL,
} from "@/lib/task-helpers";
import type { Priority, TaskStatus, TaskType } from "@/types";

const TYPE_ICON: Record<TaskType, React.ComponentType<{ className?: string }>> = {
  ASSIGNMENT: ClipboardList,
  QUIZ: GraduationCap,
  EXAM: NotebookPen,
  MEETING: Users,
  PROJECT: Wrench,
  STUDY: BookOpen,
  PERSONAL: Calendar,
  OTHER: Code2,
};

export function TypeIcon({ type, className }: { type: TaskType; className?: string }) {
  const Icon = TYPE_ICON[type] ?? Code2;
  return <Icon className={className} />;
}

export function TypeBadge({ type, className }: { type: TaskType; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        "border",
        className
      )}
      style={{
        background: "color-mix(in oklch, var(--muted) 60%, transparent)",
        borderColor: "color-mix(in oklch, var(--border) 80%, transparent)",
        color: "var(--muted-foreground)",
      }}
    >
      <TypeIcon type={type} className="h-3 w-3" />
      {TYPE_LABEL[type]}
    </span>
  );
}

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        className
      )}
      style={{
        background: PRIORITY_BG[priority],
        borderColor: PRIORITY_BORDER[priority],
        color: PRIORITY_COLOR[priority],
        borderWidth: 1,
        borderStyle: "solid",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: PRIORITY_COLOR[priority] }}
      />
      {PRIORITY_LABEL[priority]}
    </span>
  );
}

export function PriorityDot({ priority, className }: { priority: Priority; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2.5 w-2.5 rounded-full", className)}
      style={{ background: PRIORITY_COLOR[priority], boxShadow: `0 0 8px ${PRIORITY_COLOR[priority]}` }}
    />
  );
}

export function StatusBadge({ status, className }: { status: TaskStatus; className?: string }) {
  const map: Record<TaskStatus, { bg: string; fg: string; label: string }> = {
    PENDING: {
      bg: "color-mix(in oklch, var(--muted) 60%, transparent)",
      fg: "var(--muted-foreground)",
      label: STATUS_LABEL.PENDING,
    },
    IN_PROGRESS: {
      bg: "color-mix(in oklch, var(--brand-3) 22%, transparent)",
      fg: "var(--brand-3)",
      label: STATUS_LABEL.IN_PROGRESS,
    },
    COMPLETED: {
      bg: "color-mix(in oklch, oklch(0.7 0.16 150) 22%, transparent)",
      fg: "oklch(0.78 0.16 150)",
      label: STATUS_LABEL.COMPLETED,
    },
  };
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium border",
        className
      )}
      style={{ background: s.bg, color: s.fg, borderColor: "color-mix(in oklch, currentColor 30%, transparent)" }}
    >
      {s.label}
    </span>
  );
}

export function DeadlineChip({
  deadline,
  overdue,
  soon,
}: {
  deadline: string | null | undefined;
  overdue?: boolean;
  soon?: boolean;
}) {
  if (!deadline) return null;
  const color = overdue
    ? "oklch(0.64 0.23 27)"
    : soon
    ? "oklch(0.78 0.16 70)"
    : "var(--muted-foreground)";
  const bg = overdue
    ? "color-mix(in oklch, oklch(0.64 0.23 27) 16%, transparent)"
    : soon
    ? "color-mix(in oklch, oklch(0.78 0.16 70) 16%, transparent)"
    : "color-mix(in oklch, var(--muted) 60%, transparent)";
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
      style={{ background: bg, color, border: `1px solid color-mix(in oklch, currentColor 25%, transparent)` }}
    >
      <AlertCircle className="h-3 w-3" />
      {new Date(deadline).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}
    </span>
  );
}
