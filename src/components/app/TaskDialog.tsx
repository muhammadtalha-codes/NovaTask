"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/store/app-store";
import type { Priority, Task, TaskStatus, TaskType } from "@/types";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const TYPES: TaskType[] = ["ASSIGNMENT", "QUIZ", "EXAM", "MEETING", "PROJECT", "STUDY", "PERSONAL", "OTHER"];
const PRIORITIES: Priority[] = ["HIGH", "MEDIUM", "LOW"];
const STATUSES: TaskStatus[] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

export function TaskDialog() {
  const editing = useAppStore((s) => s.editingTask);
  const setEditing = useAppStore((s) => s.setEditingTask);
  const upsertTask = useAppStore((s) => s.upsertTask);
  const removeTask = useAppStore((s) => s.removeTask);

  const [form, setForm] = useState<Partial<Task>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isNew = editing === "new";
  const open = editing !== null;

  useEffect(() => {
    if (editing === "new") {
      setForm({
        title: "",
        description: "",
        subject: "",
        type: "OTHER",
        date: null,
        time: null,
        deadline: null,
        priority: "MEDIUM",
        status: "PENDING",
        reminderEnabled: false,
        reminderTime: null,
        notes: "",
        recurring: { type: "NONE" },
      });
    } else if (editing) {
      setForm({ ...editing });
    }
  }, [editing]);

  function update<K extends keyof Task>(key: K, value: Task[K] | any) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  // Convert ISO to datetime-local input value
  function isoToLocal(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 16);
  }
  function isoToDateLocal(iso?: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 10);
  }

  async function save() {
    if (!form.title?.trim()) {
      toast.error("Please give your task a title.");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        title: form.title,
        description: form.description ?? null,
        subject: form.subject || null,
        type: form.type ?? "OTHER",
        date: form.date ? new Date(form.date).toISOString() : null,
        time: form.time ?? null,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
        priority: form.priority ?? "MEDIUM",
        status: form.status ?? "PENDING",
        reminderEnabled: !!form.reminderEnabled,
        reminderTime: form.reminderTime ? new Date(form.reminderTime).toISOString() : null,
        notes: form.notes ?? null,
        recurring: form.recurring ?? { type: "NONE" },
      };
      if (isNew) {
        const res = await api<{ task: Task }>("/api/tasks", {
          method: "POST",
          json: payload,
        });
        upsertTask(res.task);
        toast.success("Task created.");
      } else if (editing) {
        const res = await api<{ task: Task }>(`/api/tasks/${editing.id}`, {
          method: "PATCH",
          json: payload,
        });
        upsertTask(res.task);
        toast.success("Task updated.");
      }
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to save task.");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing || isNew) return;
    setDeleting(true);
    try {
      await api(`/api/tasks/${editing.id}`, { method: "DELETE" });
      removeTask(editing.id);
      toast.success("Task deleted.");
      setEditing(null);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to delete task.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && setEditing(null)}>
      <DialogContent className="glass-strong max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isNew ? "Create task" : "Edit task"}</DialogTitle>
          <DialogDescription>
            {isNew
              ? "Add a new task. Nova can also create tasks from natural language — try the AI panel."
              : "Update the details of your task."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="t-title">Title</Label>
            <Input
              id="t-title"
              autoFocus
              value={form.title ?? ""}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Submit Database Assignment"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="t-desc">Description</Label>
            <Textarea
              id="t-desc"
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Optional details about this task..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Subject</Label>
              <Input
                value={form.subject ?? ""}
                onChange={(e) => update("subject", e.target.value)}
                placeholder="e.g. Databases"
              />
            </div>
            <div className="grid gap-2">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v) => update("type", v as TaskType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t.toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date ? isoToDateLocal(form.date) : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  update("date", v ? new Date(v).toISOString() : null);
                }}
              />
            </div>
            <div className="grid gap-2">
              <Label>Time</Label>
              <Input
                type="time"
                value={form.time ?? ""}
                onChange={(e) => update("time", e.target.value || null)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Deadline</Label>
            <Input
              type="datetime-local"
              value={form.deadline ? isoToLocal(form.deadline) : ""}
              onChange={(e) => {
                const v = e.target.value;
                update("deadline", v ? new Date(v).toISOString() : null);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => update("priority", v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">{p.toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => update("status", v as TaskStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">{s.replace("_", " ").toLowerCase()}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Recurring</Label>
            <Select
              value={(form.recurring as any)?.type ?? "NONE"}
              onValueChange={(v) => update("recurring", { type: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["NONE", "DAILY", "WEEKLY", "MONTHLY"].map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">{r.toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
            <div>
              <Label htmlFor="t-remind" className="text-sm font-medium">Reminder</Label>
              <p className="text-xs text-muted-foreground">Get notified before this task.</p>
            </div>
            <Switch
              id="t-remind"
              checked={!!form.reminderEnabled}
              onCheckedChange={(v) => update("reminderEnabled", v)}
            />
          </div>
          {form.reminderEnabled && (
            <div className="grid gap-2">
              <Label>Reminder time</Label>
              <Input
                type="datetime-local"
                value={form.reminderTime ? isoToLocal(form.reminderTime) : ""}
                onChange={(e) => {
                  const v = e.target.value;
                  update("reminderTime", v ? new Date(v).toISOString() : null);
                }}
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="t-notes">Notes</Label>
            <Textarea
              id="t-notes"
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Private notes, links, references..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {!isNew && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="mr-auto" disabled={deleting}>
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this task?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action can't be undone. The task "{form.title}" will be permanently removed.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isNew ? "Create task" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
