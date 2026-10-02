import type { Task } from "@/types";

// Serialize a small summary of the user's tasks for the AI context window.
export function serializeUserContext(tasks: Task[]): string {
  if (!tasks || tasks.length === 0) return "";
  const lines: string[] = [];
  for (const t of tasks) {
    const parts: string[] = [];
    parts.push(`#${t.id.slice(-6)}`);
    parts.push(`"${t.title}"`);
    if (t.subject) parts.push(`subject=${t.subject}`);
    parts.push(`type=${t.type}`);
    parts.push(`priority=${t.priority}`);
    parts.push(`status=${t.status}`);
    if (t.date) parts.push(`date=${new Date(t.date).toISOString().slice(0, 16)}`);
    if (t.time) parts.push(`time=${t.time}`);
    if (t.deadline) parts.push(`deadline=${new Date(t.deadline).toISOString().slice(0, 16)}`);
    if (t.recurring && t.recurring.type !== "NONE") parts.push(`recurring=${t.recurring.type}`);
    lines.push("- " + parts.join(" | "));
  }
  return lines.join("\n");
}
