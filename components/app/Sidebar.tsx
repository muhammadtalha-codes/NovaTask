"use client";

import { useAppStore, type ViewKey } from "@/store/app-store";
import {
  LayoutDashboard,
  Sparkles,
  CheckSquare,
  CalendarDays,
  CalendarClock,
  BarChart3,
  Bell,
  Settings,
  Brain,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";

const NAV: { key: ViewKey; label: string; icon: LucideIcon; hint?: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "assistant", label: "AI Assistant", icon: Sparkles },
  { key: "tasks", label: "Tasks", icon: CheckSquare },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "schedule", label: "Schedule", icon: CalendarClock },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "reminders", label: "Reminders", icon: Bell },
  { key: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({ onNav }: { onNav?: () => void }) {
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const { data: session } = useSession();
  const tasks = useAppStore((s) => s.tasks);
  const pendingCount = tasks.filter((t) => t.status !== "COMPLETED").length;

  return (
    <div className="flex h-full flex-col gap-2 p-3">
      {/* Brand */}
      <div className="flex items-center gap-3 px-2 py-3">
        <div className="relative h-9 w-9">
          <div
            className="absolute inset-0 rounded-lg glow-ring"
            style={{
              background: "linear-gradient(135deg, var(--brand), var(--brand-2))",
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <Brain className="h-4 w-4" />
          </div>
        </div>
        <div className="leading-tight">
          <div className="text-base font-semibold text-gradient">NovaTask</div>
          <div className="text-[11px] text-muted-foreground">
            AI productivity
          </div>
        </div>
      </div>

      <nav className="mt-2 flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = view === item.key;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => {
                setView(item.key);
                onNav?.();
              }}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                "hover:bg-[color-mix(in_oklch,var(--brand)_10%,transparent)]",
                active && "bg-[color-mix(in_oklch,var(--brand)_16%,transparent)]"
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full"
                  style={{ background: "var(--brand)" }}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              <Icon
                className={cn(
                  "h-4.5 w-4.5 shrink-0 transition-colors",
                  active ? "text-[var(--brand)]" : "text-muted-foreground group-hover:text-foreground"
                )}
                style={{ width: 18, height: 18 }}
              />
              <span className={cn(active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
                {item.label}
              </span>
              {item.key === "tasks" && pendingCount > 0 && (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[color-mix(in_oklch,var(--brand)_22%,transparent)] px-1.5 text-[11px] font-semibold text-[var(--brand)]">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User card */}
      <div className="mt-2 rounded-xl border border-border/60 bg-[color-mix(in_oklch,var(--card)_50%,transparent)] p-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }}
          >
            {(session?.user?.name ?? "U").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-sm font-medium">
              {session?.user?.name ?? "User"}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {session?.user?.email}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
