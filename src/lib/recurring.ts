import type { RecurringRule } from "@/types";

/**
 * Compute the next occurrence date for a recurring task.
 * Returns null if the rule is NONE or the new date would exceed the "until"
 * cap. The next occurrence is computed from the task's current date (or
 * deadline, or now if neither is set).
 */
export function nextOccurrence(
  rule: RecurringRule,
  fromDate: Date | null | undefined
): Date | null {
  if (!rule || rule.type === "NONE") return null;
  const base = fromDate ? new Date(fromDate) : new Date();
  let next: Date;
  switch (rule.type) {
    case "DAILY":
      next = addDays(base, 1);
      break;
    case "WEEKLY":
      next = addDays(base, 7);
      break;
    case "MONTHLY":
      next = addMonths(base, 1);
      break;
    default:
      return null;
  }
  if (rule.until && next.getTime() > new Date(rule.until).getTime()) {
    return null;
  }
  return next;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

/** Human label for a recurring rule, for UI badges. */
export function recurringLabel(rule: RecurringRule | null | undefined): string {
  if (!rule || rule.type === "NONE") return "";
  const map: Record<string, string> = {
    DAILY: "Daily",
    WEEKLY: "Weekly",
    MONTHLY: "Monthly",
  };
  return map[rule.type] ?? rule.type;
}
