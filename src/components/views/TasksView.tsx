"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useAppStore } from "@/store/app-store";
import { TaskCard } from "@/components/app/TaskCard";
import { QuickAddBar } from "@/components/app/QuickAddBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, ListChecks, Columns3, SlidersHorizontal, CheckCircle2, GripVertical, ArrowRightLeft, Check } from "lucide-react";
import type { Priority, Task, TaskStatus, TaskType } from "@/types";
import { PRIORITY_RANK } from "@/lib/task-helpers";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const PRIORITIES: (Priority | "ALL")[] = ["ALL", "HIGH", "MEDIUM", "LOW"];
const STATUSES: (TaskStatus | "ALL")[] = ["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"];
const TYPES: (TaskType | "ALL")[] = ["ALL", "ASSIGNMENT", "QUIZ", "EXAM", "MEETING", "PROJECT", "STUDY", "PERSONAL", "OTHER"];
const SORTS = ["priority", "deadline", "date", "created"] as const;
type SortKey = (typeof SORTS)[number];

export function TasksView() {
  const tasks = useAppStore((s) => s.tasks);
  const setEditingTask = useAppStore((s) => s.setEditingTask);
  const setAiPanel = useAppStore((s) => s.setAiPanel);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<TaskStatus | "ALL">("ALL");
  const [priority, setPriority] = useState<Priority | "ALL">("ALL");
  const [type, setType] = useState<TaskType | "ALL">("ALL");
  const [subject, setSubject] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("priority");
  const [layout, setLayout] = useState<"list" | "board">("list");

  const subjects = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => t.subject && set.add(t.subject));
    return Array.from(set).sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    let arr = tasks.filter((t) => {
      if (search && !`${t.title} ${t.description ?? ""} ${t.subject ?? ""} ${t.notes ?? ""}`.toLowerCase().includes(search.toLowerCase())) return false;
      if (status !== "ALL" && t.status !== status) return false;
      if (priority !== "ALL" && t.priority !== priority) return false;
      if (type !== "ALL" && t.type !== type) return false;
      if (subject !== "ALL" && t.subject !== subject) return false;
      return true;
    });
    arr = [...arr].sort((a, b) => {
      if (sort === "priority") return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (sort === "deadline") {
        const ad = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const bd = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return ad - bd;
      }
      if (sort === "date") {
        const ad = a.date ? new Date(a.date).getTime() : Infinity;
        const bd = b.date ? new Date(b.date).getTime() : Infinity;
        return ad - bd;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return arr;
  }, [tasks, search, status, priority, type, subject, sort]);

  const hasActiveFilters = !!(search || status !== "ALL" || priority !== "ALL" || type !== "ALL" || subject !== "ALL");

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      {/* Quick add bar */}
      <QuickAddBar />

      {/* Toolbar */}
      <Card className="glass">
        <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as any)}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s === "ALL" ? "All status" : s.replace("_", " ").toLowerCase()}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
              <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
              <SelectContent>{PRIORITIES.map((p) => <SelectItem key={p} value={p} className="capitalize">{p === "ALL" ? "All priority" : p.toLowerCase()}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t === "ALL" ? "All types" : t.toLowerCase()}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All subjects</SelectItem>
                {subjects.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
              <SelectTrigger className="w-[120px]"><SlidersHorizontal className="h-4 w-4" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => <SelectItem key={s} value={s} className="capitalize">Sort: {s}</SelectItem>)}
              </SelectContent>
            </Select>
            <Tabs value={layout} onValueChange={(v) => setLayout(v as any)}>
              <TabsList className="h-9">
                <TabsTrigger value="list"><ListChecks className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="board"><Columns3 className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </Tabs>
            <Button onClick={() => setEditingTask("new")}>
              <Plus className="h-4 w-4" /> New
            </Button>
          </div>
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <EmptyTasks hasFilters={hasActiveFilters} onCreate={() => setEditingTask("new")} onAsk={() => setAiPanel(true)} />
      ) : layout === "list" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <AnimatePresence>
            {filtered.map((t) => (
              <TaskCard key={t.id} task={t} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <Board tasks={filtered} />
      )}
    </div>
  );
}

function Board({ tasks }: { tasks: Task[] }) {
  const cols: { key: TaskStatus; title: string; color: string }[] = [
    { key: "PENDING", title: "To do", color: "var(--muted-foreground)" },
    { key: "IN_PROGRESS", title: "In progress", color: "var(--brand-3)" },
    { key: "COMPLETED", title: "Done", color: "oklch(0.78 0.16 150)" },
  ];
  const upsertTask = useAppStore((s) => s.upsertTask);
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const activeTask = activeId ? tasks.find((t) => t.id === activeId) ?? null : null;

  async function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const taskId = String(e.active.id);
    const destKey = e.over?.id as TaskStatus | undefined;
    if (!destKey) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === destKey) return;
    // optimistic update
    const optimistic: Task = {
      ...task,
      status: destKey,
      completedAt: destKey === "COMPLETED" ? new Date().toISOString() : null,
    };
    upsertTask(optimistic);
    try {
      const res = await api<{ task: Task }>(`/api/tasks/${taskId}`, {
        method: "PATCH",
        json: { status: destKey },
      });
      upsertTask(res.task);
      const colTitle = cols.find((c) => c.key === destKey)?.title ?? destKey;
      toast.success(`Moved to "${colTitle}"`, { description: task.title });
    } catch (err: any) {
      // rollback
      upsertTask(task);
      toast.error(err?.message ?? "Couldn't move task.");
    }
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd} onDragStart={onDragStart}>
      <div className="grid gap-4 md:grid-cols-3">
        {cols.map((c) => {
          const colTasks = tasks.filter((t) => t.status === c.key);
          return (
            <DroppableColumn key={c.key} status={c.key} title={c.title} color={c.color} count={colTasks.length}>
              <AnimatePresence>
                {colTasks.map((t) => (
                  <DraggableTaskCard key={t.id} task={t} />
                ))}
              </AnimatePresence>
              {colTasks.length === 0 && (
                <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                  Drop tasks here
                </div>
              )}
            </DroppableColumn>
          );
        })}
      </div>
      <DragOverlay dropAnimation={{ duration: 200, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }}>
        {activeTask ? (
          <div className="rotate-2 opacity-90 cursor-grabbing">
            <TaskCard task={activeTask} compact />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DroppableColumn({
  status,
  title,
  color,
  count,
  children,
}: {
  status: TaskStatus;
  title: string;
  color: string;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          "min-h-[200px] space-y-3 rounded-2xl border border-dashed p-2 transition-colors",
          isOver
            ? "border-[var(--brand)]/60 bg-[color-mix(in_oklch,var(--brand)_8%,transparent)]"
            : "border-border/50"
        )}
      >
        {children}
      </div>
    </div>
  );
}

function DraggableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
  });
  const upsertTask = useAppStore((s) => s.upsertTask);
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  async function quickMove(status: TaskStatus) {
    if (task.status === status) return;
    const optimistic: Task = {
      ...task,
      status,
      completedAt: status === "COMPLETED" ? new Date().toISOString() : null,
    };
    upsertTask(optimistic);
    try {
      const res = await api<{ task: Task }>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        json: { status },
      });
      upsertTask(res.task);
      toast.success(`Moved to ${status.replace("_", " ").toLowerCase()}`);
    } catch (e: any) {
      upsertTask(task);
      toast.error(e?.message ?? "Couldn't move task.");
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "group/drag relative touch-none",
        isDragging && "opacity-40"
      )}
    >
      {/* Desktop drag handle */}
      <button
        {...listeners}
        className="absolute -left-0.5 top-1/2 z-20 hidden -translate-y-1/2 cursor-grab rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-foreground active:cursor-grabbing group-hover/drag:opacity-100 sm:block"
        title="Drag to change status"
        aria-label="Drag task"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <TaskCard task={task} compact />
      {/* Mobile status-changer fallback (touch can't drag) */}
      <div className="absolute right-1 top-1 z-20 sm:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-md bg-card/80 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
              aria-label="Move to status"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel className="text-xs">Move to</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {(["PENDING", "IN_PROGRESS", "COMPLETED"] as TaskStatus[]).map((s) => (
              <DropdownMenuItem
                key={s}
                disabled={task.status === s}
                onClick={() => quickMove(s)}
                className="text-xs capitalize"
              >
                {s === "IN_PROGRESS" ? "In progress" : s === "PENDING" ? "To do" : "Done"}
                {task.status === s && <Check className="ml-auto h-3 w-3" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function EmptyTasks({
  hasFilters,
  onCreate,
  onAsk,
}: {
  hasFilters: boolean;
  onCreate: () => void;
  onAsk: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border/60 py-16 text-center">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-2xl animate-pulse-glow" style={{ background: "radial-gradient(circle, var(--brand), transparent 70%)" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7 text-[var(--brand)]" />
        </div>
      </div>
      <div className="space-y-1">
        <h3 className="text-lg font-semibold">
          {hasFilters ? "No tasks match your filters" : "No tasks yet"}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {hasFilters
            ? "Try adjusting your filters or clearing the search."
            : "Tell Nova what you have to do, or add a task manually to get started."}
        </p>
      </div>
      <div className="flex gap-2">
        <Button onClick={onCreate}><Plus className="h-4 w-4" /> Add task</Button>
        <Button variant="outline" onClick={onAsk}>Ask Nova</Button>
      </div>
    </div>
  );
}
