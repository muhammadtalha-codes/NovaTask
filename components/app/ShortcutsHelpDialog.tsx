"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

const SHORTCUTS: { keys: string[]; label: string; group: string }[] = [
  { keys: ["⌘", "K"], label: "Open quick command palette", group: "Navigation" },
  { keys: ["⌘", "J"], label: "Open Nova AI assistant", group: "Navigation" },
  { keys: ["⌘", "I"], label: "Open focus timer", group: "Navigation" },
  { keys: ["?"], label: "Toggle this shortcuts panel", group: "Navigation" },
  { keys: ["Esc"], label: "Close dialogs / AI panel", group: "Navigation" },
  { keys: ["N"], label: "Create a new task", group: "Tasks" },
  { keys: ["⌘", "K"], label: "then search → jump to a task", group: "Tasks" },
  { keys: ["G", "D"], label: "Go to Dashboard (coming soon)", group: "Go to" },
  { keys: ["G", "T"], label: "Go to Tasks (coming soon)", group: "Go to" },
  { keys: ["G", "C"], label: "Go to Calendar (coming soon)", group: "Go to" },
  { keys: ["Enter"], label: "Send AI message (in chat)", group: "AI" },
  { keys: ["Shift", "Enter"], label: "New line in AI message", group: "AI" },
];

export function ShortcutsHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const groups = Array.from(new Set(SHORTCUTS.map((s) => s.group)));
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[color-mix(in_oklch,var(--brand)_16%,transparent)]">
              <Keyboard className="h-4 w-4 text-[var(--brand)]" />
            </div>
            Keyboard shortcuts
          </DialogTitle>
          <DialogDescription>
            Move faster through NovaTask. Shortcuts work everywhere except while
            you&apos;re typing in a text field.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {groups.map((g) => (
            <div key={g}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {g}
              </div>
              <div className="space-y-1">
                {SHORTCUTS.filter((s) => s.group === g).map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/40"
                  >
                    <span className="text-sm">{s.label}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((k, j) => (
                        <kbd
                          key={j}
                          className="min-w-[1.5rem] rounded border border-border bg-muted/60 px-1.5 py-0.5 text-center text-[11px] font-mono"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
