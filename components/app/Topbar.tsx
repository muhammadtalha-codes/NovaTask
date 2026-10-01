"use client";

import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  Search,
  Bell,
  Sparkles,
  Sun,
  Moon,
  Menu,
  LogOut,
  User,
  Settings as SettingsIcon,
  Command,
  Plus,
  Timer,
  Keyboard,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Clock, Greeting } from "./clock";
import { useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useTimerStore } from "@/store/timer-store";
import { ShortcutsHelpDialog } from "@/components/app/ShortcutsHelpDialog";

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  assistant: "AI Assistant",
  tasks: "Tasks",
  calendar: "Calendar",
  schedule: "Schedule",
  analytics: "Analytics",
  reminders: "Reminders",
  settings: "Settings",
};

export function Topbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setAiPanel = useAppStore((s) => s.setAiPanel);
  const setEditingTask = useAppStore((s) => s.setEditingTask);
  const setQuickOpen = useAppStore((s) => s.setQuickOpen);
  const setNotifCenter = useAppStore((s) => s.setNotifCenter);
  const unreadNotifs = useAppStore((s) => s.unreadNotifications);
  const setUnreadNotifs = useAppStore((s) => s.setUnreadNotifications);
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  useEffect(() => {
    // next-themes hydration-safe mount flag (documented pattern).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Poll the notifications endpoint for the unread badge count + due reminders.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await api<{ unread?: number; reminders: any[]; taskReminders: any[] }>(
          "/api/notifications"
        );
        if (!active) return;
        if (typeof res.unread === "number") setUnreadNotifs(res.unread);
      } catch {
        /* ignore */
      }
    };
    load();
    const id = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [setUnreadNotifs]);

  // keyboard shortcut: cmd+k -> quick command
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setQuickOpen(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAiPanel(true);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        useTimerStore.getState().setOpen(true);
      }
      if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        const target = e.target as HTMLElement;
        if (!target.closest("dialog") && !target.closest("[role=dialog]")) {
          setEditingTask("new");
        }
      }
      // ? opens shortcuts help (when not typing)
      if (
        (e.key === "?" || (e.shiftKey && e.key === "/")) &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setQuickOpen, setAiPanel, setEditingTask]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 px-4 sm:px-6">
      <div className="glass-strong flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2">
        {/* Left: menu + title */}
        <div className="flex min-w-0 items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onOpenSidebar}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Greeting />
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">
                {new Date().toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="truncate text-base font-semibold leading-tight">
              {TITLES[view] ?? "Dashboard"}
            </div>
          </div>
        </div>

        {/* Center: search (desktop) */}
        <div className="hidden md:block flex-1 max-w-md">
          <button
            onClick={() => setQuickOpen(true)}
            className="glass flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Search className="h-4 w-4" />
            <span>Search or jump to...</span>
            <kbd className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[10px] font-mono">
              <Command className="h-3 w-3" /> K
            </kbd>
          </button>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          <div className="hidden lg:flex items-center gap-2 mr-2 text-sm text-muted-foreground">
            <Clock />
          </div>

          <Button
            size="sm"
            variant="default"
            className="hidden sm:inline-flex"
            onClick={() => setEditingTask("new")}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New task</span>
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setAiPanel(true)}
            title="Open Nova AI (Ctrl+J)"
            className="relative"
          >
            <Sparkles className="h-5 w-5 text-[var(--brand)]" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => useTimerStore.getState().setOpen(true)}
            title="Focus timer (Ctrl+I)"
            className="relative"
          >
            <Timer className="h-5 w-5 text-[var(--brand-3)]" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
            className="hidden sm:inline-flex"
          >
            <Keyboard className="h-5 w-5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setNotifCenter(true)}
            title="Notifications"
            className="relative"
          >
            <Bell className="h-5 w-5" />
            {unreadNotifs > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand-2)] px-1 text-[10px] font-bold text-white animate-pulse">
                {unreadNotifs > 9 ? "9+" : unreadNotifs}
              </span>
            )}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white transition-transform hover:scale-105" style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }}>
                {(session?.user?.name ?? "U").slice(0, 1).toUpperCase()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none">
                    {session?.user?.name ?? "User"}
                  </span>
                  <span className="text-xs leading-none text-muted-foreground mt-1">
                    {session?.user?.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setView("settings")}>
                <User className="mr-2 h-4 w-4" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setView("settings")}>
                <SettingsIcon className="mr-2 h-4 w-4" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  signOut({ callbackUrl: "/", redirect: true });
                }}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <ShortcutsHelpDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </header>
  );
}
