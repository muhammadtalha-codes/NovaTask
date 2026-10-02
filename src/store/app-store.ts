"use client";

import { create } from "zustand";
import type {
  Task,
  Reminder,
  ChatMessage as ChatMsg,
  AIActionResult,
  UserPreferences,
  AppNotification,
  Subtask,
} from "@/types";

export type ViewKey =
  | "dashboard"
  | "assistant"
  | "tasks"
  | "calendar"
  | "schedule"
  | "analytics"
  | "reminders"
  | "settings";

interface AppState {
  // routing
  view: ViewKey;
  setView: (v: ViewKey) => void;

  // data
  tasks: Task[];
  reminders: Reminder[];
  chatMessages: ChatMsg[];
  notifications: AppNotification[];
  unreadNotifications: number;
  preferences: UserPreferences | null;
  setTasks: (t: Task[]) => void;
  setReminders: (r: Reminder[]) => void;
  setChatMessages: (m: ChatMsg[]) => void;
  setNotifications: (n: AppNotification[]) => void;
  setUnreadNotifications: (n: number) => void;
  upsertNotification: (n: AppNotification) => void;
  upsertNotifications: (n: AppNotification[]) => void;
  removeNotification: (id: string) => void;
  upsertTask: (t: Task) => void;
  upsertTasks: (t: Task[]) => void;
  removeTask: (id: string) => void;
  // subtask helpers
  upsertSubtask: (taskId: string, sub: Subtask) => void;
  removeSubtask: (taskId: string, subId: string) => void;
  upsertReminder: (r: Reminder) => void;
  upsertReminders: (r: Reminder[]) => void;
  removeReminder: (id: string) => void;
  addChatMessage: (m: ChatMsg) => void;
  setPreferences: (p: UserPreferences) => void;

  // AI panel
  aiPanelOpen: boolean;
  setAiPanel: (open: boolean) => void;

  // task editor dialog
  editingTask: Task | "new" | null;
  setEditingTask: (t: Task | "new" | null) => void;

  // quick command
  quickOpen: boolean;
  setQuickOpen: (v: boolean) => void;

  // loading
  loadingTasks: boolean;
  setLoadingTasks: (v: boolean) => void;

  // last AI action results (for toasts/animations)
  lastAction?: AIActionResult | null;

  // notification center
  notifCenterOpen: boolean;
  setNotifCenter: (v: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  view: "dashboard",
  setView: (view) => set({ view }),

  tasks: [],
  reminders: [],
  chatMessages: [],
  notifications: [],
  unreadNotifications: 0,
  preferences: null,
  setTasks: (tasks) => set({ tasks }),
  setReminders: (reminders) => set({ reminders }),
  setChatMessages: (chatMessages) => set({ chatMessages }),
  setNotifications: (notifications) => set({ notifications }),
  setUnreadNotifications: (unreadNotifications) => set({ unreadNotifications }),
  upsertNotification: (n) =>
    set((s) => {
      const idx = s.notifications.findIndex((x) => x.id === n.id);
      const unreadDelta = n.read ? 0 : 1;
      if (idx === -1) {
        return {
          notifications: [n, ...s.notifications],
          unreadNotifications: s.unreadNotifications + unreadDelta,
        };
      }
      const copy = [...s.notifications];
      const wasUnread = !copy[idx].read;
      copy[idx] = n;
      const nowUnread = !n.read;
      const delta = nowUnread === wasUnread ? 0 : nowUnread ? 1 : -1;
      return { notifications: copy, unreadNotifications: Math.max(0, s.unreadNotifications + delta) };
    }),
  upsertNotifications: (arr) =>
    set((s) => {
      const map = new Map(s.notifications.map((n) => [n.id, n]));
      for (const n of arr) map.set(n.id, n);
      const all = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return {
        notifications: all,
        unreadNotifications: all.filter((n) => !n.read).length,
      };
    }),
  removeNotification: (id) =>
    set((s) => {
      const item = s.notifications.find((n) => n.id === id);
      return {
        notifications: s.notifications.filter((n) => n.id !== id),
        unreadNotifications: item && !item.read ? Math.max(0, s.unreadNotifications - 1) : s.unreadNotifications,
      };
    }),
  upsertTask: (t) =>
    set((s) => {
      const idx = s.tasks.findIndex((x) => x.id === t.id);
      if (idx === -1) return { tasks: [t, ...s.tasks] };
      const copy = [...s.tasks];
      copy[idx] = t;
      return { tasks: copy };
    }),
  upsertTasks: (arr) =>
    set((s) => {
      const map = new Map(s.tasks.map((t) => [t.id, t]));
      for (const t of arr) map.set(t.id, t);
      return { tasks: Array.from(map.values()) };
    }),
  removeTask: (id) =>
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  upsertSubtask: (taskId, sub) =>
    set((s) => {
      const idx = s.tasks.findIndex((t) => t.id === taskId);
      if (idx === -1) return {};
      const task = s.tasks[idx];
      const subs = task.subtasks ?? [];
      const sIdx = subs.findIndex((x) => x.id === sub.id);
      const newSubs = sIdx === -1 ? [...subs, sub] : subs.map((x) => (x.id === sub.id ? sub : x));
      const copy = [...s.tasks];
      copy[idx] = { ...task, subtasks: newSubs };
      return { tasks: copy };
    }),
  removeSubtask: (taskId, subId) =>
    set((s) => {
      const idx = s.tasks.findIndex((t) => t.id === taskId);
      if (idx === -1) return {};
      const task = s.tasks[idx];
      const copy = [...s.tasks];
      copy[idx] = { ...task, subtasks: (task.subtasks ?? []).filter((x) => x.id !== subId) };
      return { tasks: copy };
    }),
  upsertReminder: (r) =>
    set((s) => {
      const idx = s.reminders.findIndex((x) => x.id === r.id);
      if (idx === -1) return { reminders: [r, ...s.reminders] };
      const copy = [...s.reminders];
      copy[idx] = r;
      return { reminders: copy };
    }),
  upsertReminders: (arr) =>
    set((s) => {
      const map = new Map(s.reminders.map((r) => [r.id, r]));
      for (const r of arr) map.set(r.id, r);
      return { reminders: Array.from(map.values()) };
    }),
  removeReminder: (id) =>
    set((s) => ({ reminders: s.reminders.filter((r) => r.id !== id) })),
  addChatMessage: (m) =>
    set((s) => ({ chatMessages: [...s.chatMessages, m] })),
  setPreferences: (preferences) => set({ preferences }),

  aiPanelOpen: false,
  setAiPanel: (aiPanelOpen) => set({ aiPanelOpen }),

  editingTask: null,
  setEditingTask: (editingTask) => set({ editingTask }),

  quickOpen: false,
  setQuickOpen: (quickOpen) => set({ quickOpen }),

  loadingTasks: false,
  setLoadingTasks: (loadingTasks) => set({ loadingTasks }),

  lastAction: null,

  notifCenterOpen: false,
  setNotifCenter: (notifCenterOpen) => set({ notifCenterOpen }),
}));
