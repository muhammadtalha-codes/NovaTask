import type { Subtask, Task, Reminder, AppNotification } from "@/types";
import type { RecurringRule } from "@/types";

export function parseRecurring(s: string | null | undefined): RecurringRule {
  if (!s) return { type: "NONE" };
  try {
    return JSON.parse(s) as RecurringRule;
  } catch {
    return { type: "NONE" };
  }
}

export function serializeTask(t: any): Task {
  const toDate = (v: any) => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "string") return v;
    return null;
  };
  return {
    id: t.id,
    title: t.title,
    description: t.description ?? null,
    subject: t.subject ?? null,
    type: (t.type ?? "OTHER") as Task["type"],
    date: toDate(t.date),
    time: t.time ?? null,
    deadline: toDate(t.deadline),
    priority: (t.priority ?? "MEDIUM") as Task["priority"],
    status: (t.status ?? "PENDING") as Task["status"],
    reminderEnabled: !!t.reminderEnabled,
    reminderTime: toDate(t.reminderTime),
    recurring: parseRecurring(t.recurring),
    notes: t.notes ?? null,
    order: t.order ?? 0,
    completedAt: toDate(t.completedAt),
    subtasks: t.subtasks ? t.subtasks.map(serializeSubtask) : undefined,
    createdAt: toDate(t.createdAt) ?? new Date().toISOString(),
    updatedAt: toDate(t.updatedAt) ?? new Date().toISOString(),
  };
}

export function serializeSubtask(s: any): Subtask {
  const toDate = (v: any) => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "string") return v;
    return null;
  };
  return {
    id: s.id,
    taskId: s.taskId,
    title: s.title,
    done: !!s.done,
    order: s.order ?? 0,
    createdAt: toDate(s.createdAt) ?? new Date().toISOString(),
    updatedAt: toDate(s.updatedAt) ?? new Date().toISOString(),
  };
}

export function serializeReminder(r: any): Reminder {
  const toDate = (v: any) => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "string") return v;
    return null;
  };
  return {
    id: r.id,
    taskId: r.taskId ?? null,
    title: r.title,
    message: r.message ?? null,
    time: toDate(r.time) ?? new Date().toISOString(),
    status: (r.status ?? "PENDING") as Reminder["status"],
    snoozedUntil: toDate(r.snoozedUntil),
    createdAt: toDate(r.createdAt) ?? new Date().toISOString(),
  };
}

export function serializeNotification(n: any): AppNotification {
  const toDate = (v: any) => {
    if (!v) return null;
    if (v instanceof Date) return v.toISOString();
    if (typeof v === "string") return v;
    return null;
  };
  return {
    id: n.id,
    kind: (n.kind ?? "info") as AppNotification["kind"],
    title: n.title,
    message: n.message ?? null,
    link: n.link ?? null,
    read: !!n.read,
    createdAt: toDate(n.createdAt) ?? new Date().toISOString(),
  };
}
