// Shared domain types for NovaTask

export type Priority = "HIGH" | "MEDIUM" | "LOW";
export type TaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type TaskType =
  | "ASSIGNMENT"
  | "QUIZ"
  | "EXAM"
  | "MEETING"
  | "PROJECT"
  | "STUDY"
  | "PERSONAL"
  | "OTHER";

export type ReminderStatus = "PENDING" | "SNOOZED" | "COMPLETED" | "DISMISSED";

export interface RecurringRule {
  type: "NONE" | "DAILY" | "WEEKLY" | "MONTHLY";
  until?: string; // ISO
  daysOfWeek?: number[]; // 0-6 for WEEKLY
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  done: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  subject?: string | null;
  type: TaskType;
  date?: string | null; // ISO
  time?: string | null; // "HH:mm"
  deadline?: string | null; // ISO
  priority: Priority;
  status: TaskStatus;
  reminderEnabled: boolean;
  reminderTime?: string | null;
  recurring: RecurringRule;
  notes?: string | null;
  order: number;
  completedAt?: string | null;
  subtasks?: Subtask[];
  createdAt: string;
  updatedAt: string;
}

export type NotificationKind = "reminder" | "deadline" | "system" | "ai" | "info";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export interface Reminder {
  id: string;
  taskId?: string | null;
  title: string;
  message?: string | null;
  time: string; // ISO
  status: ReminderStatus;
  snoozedUntil?: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  actionData?: AIActionData | null;
  createdAt: string;
}

/** Structured payload stored alongside an assistant chat message. */
export interface AIActionData {
  actions: AIAction[];
  results: AIActionResult[];
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  timeFormat: "12h" | "24h";
  dateFormat: string;
  notifications: {
    browser: boolean;
    reminders: boolean;
    dailyDigest: boolean;
  };
  ai: {
    tone: "friendly" | "professional" | "concise";
    autoPlan: boolean;
    proactive: boolean;
  };
  reminder: {
    defaultSnoozeMinutes: number;
    leadTimeMinutes: number;
  };
  onboarded: boolean;
}

// --- AI action system types ---

export type AIActionType =
  | "CREATE_TASK"
  | "UPDATE_TASK"
  | "DELETE_TASK"
  | "COMPLETE_TASK"
  | "RESCHEDULE_TASK"
  | "SET_PRIORITY"
  | "CREATE_REMINDER"
  | "SNOOZE_REMINDER"
  | "COMPLETE_REMINDER"
  | "CREATE_SCHEDULE"
  | "GET_TASKS"
  | "GET_UPCOMING_DEADLINES"
  | "GENERATE_DAILY_PLAN"
  | "ANSWER";

export interface AIAction {
  type: AIActionType;
  params: Record<string, any>;
  // resolved task id after execution (filled by executor)
  targetId?: string;
}

export interface AIActionResult {
  ok: boolean;
  type: AIActionType;
  summary: string;
  created?: Partial<Task>[];
  updated?: Partial<Task>[];
  deleted?: string[];
  reminders?: Partial<Reminder>[];
  schedule?: ScheduleBlock[];
  query?: {
    tasks?: Task[];
    deadlines?: Task[];
  };
}

export interface ScheduleBlock {
  start: string; // ISO time HH:mm or ISO datetime
  end: string;
  title: string;
  reason: string;
  taskId?: string;
  priority: Priority;
  type: TaskType;
}

export interface AIResponse {
  reply: string;
  actions: AIAction[];
  results: AIActionResult[];
}
