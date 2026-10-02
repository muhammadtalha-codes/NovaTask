"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Background3D } from "@/components/3d/Background3D";
import { Sidebar } from "@/components/app/Sidebar";
import { Topbar } from "@/components/app/Topbar";
import { AIChatPanel } from "@/components/app/AIChatPanel";
import { TaskDialog } from "@/components/app/TaskDialog";
import { QuickCommand } from "@/components/app/QuickCommand";
import { FocusTimer } from "@/components/app/FocusTimer";
import { NotificationCenter } from "@/components/app/NotificationCenter";
import { OnboardingTour } from "@/components/app/OnboardingTour";
import { useAppData } from "@/hooks/use-app-data";
import { DashboardView } from "@/components/views/DashboardView";
import { AssistantView } from "@/components/views/AssistantView";
import { TasksView } from "@/components/views/TasksView";
import { CalendarView } from "@/components/views/CalendarView";
import { ScheduleView } from "@/components/views/ScheduleView";
import { AnalyticsView } from "@/components/views/AnalyticsView";
import { RemindersView } from "@/components/views/RemindersView";
import { SettingsView } from "@/components/views/SettingsView";
import { Loader2 } from "lucide-react";

export function AppShell() {
  const { status } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useAppData();

  if (status === "loading") {
    return (
      <div className="relative flex min-h-screen items-center justify-center">
        <Background3D />
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--brand)]" />
          <p className="text-sm text-muted-foreground">Loading NovaTask...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null; // AuthScreen handled by page.tsx
  }

  return (
    <div className="relative flex min-h-screen">
      <Background3D />

      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="glass sticky top-0 h-screen rounded-r-2xl">
          <Sidebar />
        </div>
      </aside>

      {/* Mobile sidebar (sheet) */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <span className="sr-only">Mobile navigation</span>
        <SheetContent side="left" className="w-72 p-0 glass-strong">
          <Sidebar onNav={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 px-4 pb-12 pt-2 sm:px-6">
          <ViewRouter />
        </main>
        <Footer />
      </div>

      <AIChatPanel />
      <TaskDialog />
      <QuickCommand />
      <FocusTimer />
      <NotificationCenter />
    </div>
  );
}

function ViewRouter() {
  // Lazy import the view based on store to keep bundle reasonable
  const view = useView();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {view === "dashboard" && <DashboardView />}
        {view === "assistant" && <AssistantView />}
        {view === "tasks" && <TasksView />}
        {view === "calendar" && <CalendarView />}
        {view === "schedule" && <ScheduleView />}
        {view === "analytics" && <AnalyticsView />}
        {view === "reminders" && <RemindersView />}
        {view === "settings" && <SettingsView />}
      </motion.div>
    </AnimatePresence>
  );
}

// Inline useView to avoid an extra import cycle file
import { useAppStore } from "@/store/app-store";
function useView() {
  return useAppStore((s) => s.view);
}

function Footer() {
  return (
    <footer className="mt-auto px-4 sm:px-6 pb-4 pt-2">
      <div className="glass-strong flex items-center justify-between gap-2 rounded-2xl px-4 py-2.5 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Nova is online · your data stays in your workspace
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>
            <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>{" "}
            search
          </span>
          <span>
            <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">⌘J</kbd>{" "}
            Nova
          </span>
          <span>
            <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">⌘I</kbd>{" "}
            focus
          </span>
          <span>
            <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">N</kbd>{" "}
            new task
          </span>
          <span>
            <kbd className="rounded border border-border px-1 py-0.5 font-mono text-[10px]">?</kbd>{" "}
            shortcuts
          </span>
        </div>
      </div>
    </footer>
  );
}
