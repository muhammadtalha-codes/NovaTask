import type { Priority, TaskStatus, TaskType } from "@/types";

export const PRIORITY_RANK: Record<Priority, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2,
};

export const STATUS_RANK: Record<TaskStatus, number> = {
  PENDING: 0,
  IN_PROGRESS: 1,
  COMPLETED: 2,
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const PRIORITY_COLOR: Record<Priority, string> = {
  HIGH: "oklch(0.62 0.24 27)", // warm red/orange
  MEDIUM: "oklch(0.75 0.18 70)", // amber
  LOW: "oklch(0.72 0.16 190)", // teal
};

export const PRIORITY_BG: Record<Priority, string> = {
  HIGH: "color-mix(in oklch, oklch(0.62 0.24 27) 18%, transparent)",
  MEDIUM: "color-mix(in oklch, oklch(0.75 0.18 70) 18%, transparent)",
  LOW: "color-mix(in oklch, oklch(0.72 0.16 190) 18%, transparent)",
};

export const PRIORITY_BORDER: Record<Priority, string> = {
  HIGH: "color-mix(in oklch, oklch(0.62 0.24 27) 45%, transparent)",
  MEDIUM: "color-mix(in oklch, oklch(0.75 0.18 70) 45%, transparent)",
  LOW: "color-mix(in oklch, oklch(0.72 0.16 190) 45%, transparent)",
};

export const STATUS_LABEL: Record<TaskStatus, string> = {
  PENDING: "Pending",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
};

export const TYPE_LABEL: Record<TaskType, string> = {
  ASSIGNMENT: "Assignment",
  QUIZ: "Quiz",
  EXAM: "Exam",
  MEETING: "Meeting",
  PROJECT: "Project",
  STUDY: "Study",
  PERSONAL: "Personal",
  OTHER: "Other",
};

export function formatTime(time?: string | null, timeFormat: "12h" | "24h" = "12h") {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  if (timeFormat === "24h") return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function relativeDay(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const startOfDay = (x: Date) => {
    const c = new Date(x);
    c.setHours(0, 0, 0, 0);
    return c.getTime();
  };
  const diff = Math.round((startOfDay(d) - startOfDay(now)) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff < -1 && diff > -7) return `${Math.abs(diff)} days ago`;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function hoursUntil(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  const d = new Date(date).getTime();
  return (d - Date.now()) / 3.6e6;
}

export function isToday(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  const d = new Date(date);
  const n = new Date();
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

export function isOverdue(date: Date | string | null | undefined): boolean {
  if (!date) return false;
  return new Date(date).getTime() < Date.now();
}
