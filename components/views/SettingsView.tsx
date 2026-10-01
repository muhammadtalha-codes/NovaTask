"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { signOut, useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Bell,
  Brain,
  Clock,
  Loader2,
  LogOut,
  Monitor,
  Moon,
  Palette,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sun,
  Trash2,
  User,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/store/app-store";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { UserPreferences } from "@/types";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

interface Profile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  createdAt: string;
}

const DATE_FORMATS = [
  { value: "MMM d, yyyy", label: "Sep 9, 2025" },
  { value: "ddd, MMM d", label: "Tue, Sep 9" },
  { value: "yyyy-MM-dd", label: "2025-09-09" },
  { value: "dd/MM/yyyy", label: "09/09/2025" },
];

const SNOOZE_OPTIONS = [
  { value: 5, label: "5 minutes" },
  { value: 10, label: "10 minutes" },
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
];

const DEFAULT_PREFS: UserPreferences = {
  theme: "system",
  timeFormat: "12h",
  dateFormat: "MMM d, yyyy",
  notifications: { browser: false, reminders: true, dailyDigest: false },
  ai: { tone: "friendly", autoPlan: false, proactive: true },
  reminder: { defaultSnoozeMinutes: 10, leadTimeMinutes: 15 },
  onboarded: true,
};

export function SettingsView() {
  const { data: session } = useSession();
  const setPreferences = useAppStore((s) => s.setPreferences);
  const setChatMessages = useAppStore((s) => s.setChatMessages);
  const { setTheme } = useTheme();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [name, setName] = useState("");
  const [nameDirty, setNameDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearingChat, setClearingChat] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api<{ user: Profile; preferences: UserPreferences }>("/api/profile")
      .then((res) => {
        if (!active) return;
        setProfile(res.user);
        setPrefs(res.preferences ?? DEFAULT_PREFS);
        setName(res.user.name ?? "");
        // Sync global store so other views react immediately.
        setPreferences(res.preferences ?? DEFAULT_PREFS);
      })
      .catch((e: any) => {
        toast.error(e?.message ?? "Couldn't load settings.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setPreferences]);

  async function persistPreferences(next: UserPreferences) {
    setSaving(true);
    try {
      const res = await api<{ preferences: UserPreferences }>("/api/profile", {
        method: "PATCH",
        json: { preferences: next },
      });
      setPrefs(res.preferences);
      setPreferences(res.preferences);
      toast.success("Settings saved.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save settings.");
    } finally {
      setSaving(false);
    }
  }

  function updatePrefs(patch: Partial<UserPreferences>) {
    if (!prefs) return;
    const next: UserPreferences = { ...prefs, ...patch };
    setPrefs(next);
    persistPreferences(next);
  }

  function updateNotifications(patch: Partial<UserPreferences["notifications"]>) {
    if (!prefs) return;
    updatePrefs({ notifications: { ...prefs.notifications, ...patch } });
  }

  function updateAI(patch: Partial<UserPreferences["ai"]>) {
    if (!prefs) return;
    updatePrefs({ ai: { ...prefs.ai, ...patch } });
  }

  function updateReminder(patch: Partial<UserPreferences["reminder"]>) {
    if (!prefs) return;
    updatePrefs({ reminder: { ...prefs.reminder, ...patch } });
  }

  function handleThemeChange(value: string) {
    if (value !== "light" && value !== "dark" && value !== "system") return;
    setTheme(value);
    updatePrefs({ theme: value });
  }

  async function handleBrowserNotifications(enabled: boolean) {
    if (enabled && typeof Notification !== "undefined" && Notification.permission !== "granted") {
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          toast.error("Browser notifications blocked.", {
            description: "Enable them in your browser settings to receive alerts.",
          });
          return;
        }
      } catch {
        toast.error("Couldn't request notification permission.");
        return;
      }
    }
    updateNotifications({ browser: enabled });
  }

  async function saveProfile() {
    if (!name.trim()) {
      toast.error("Name can't be empty.");
      return;
    }
    setSaving(true);
    try {
      const res = await api<{ user: Profile }>("/api/profile", {
        method: "PATCH",
        json: { name: name.trim() },
      });
      setProfile(res.user);
      setNameDirty(false);
      toast.success("Profile saved.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function clearChat() {
    setClearingChat(true);
    try {
      await api("/api/chat", { method: "DELETE" });
      setChatMessages([]);
      toast.success("Chat history cleared.");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't clear chat history.");
    } finally {
      setClearingChat(false);
    }
  }

  const initial =
    (name || profile?.name || session?.user?.name || "N")
      .trim()
      .split(/\s+/)
      .map((s) => s[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "N";

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="h-9 w-40 animate-pulse rounded-md bg-muted/60" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass h-32 animate-pulse rounded-xl"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE }}
      >
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          <SettingsIcon className="h-7 w-7 text-[var(--brand)]" />
          <span className="text-gradient">Settings</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tune NovaTask to match how you work. Changes save automatically.
        </p>
      </motion.div>

      {/* Profile */}
      <SectionCard
        icon={User}
        title="Profile"
        description="How Nova and teammates see you."
        delay={0.04}
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-semibold text-white shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--brand), var(--brand-2) 60%, var(--brand-3))",
                boxShadow:
                  "0 8px 24px color-mix(in oklch, var(--brand) 35%, transparent)",
              }}
            >
              {initial}
            </div>
            <div>
              <p className="text-sm font-medium">{name || profile?.name || "Your name"}</p>
              <p className="text-xs text-muted-foreground">
                {profile?.email ?? session?.user?.email ?? ""}
              </p>
            </div>
          </div>
          <div className="flex-1 space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameDirty(true);
              }}
              placeholder="Your name"
              className="max-w-sm"
            />
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Email</Label>
            <p className="text-sm font-medium">
              {profile?.email ?? session?.user?.email ?? "—"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              Email is managed by your account — read-only here.
            </p>
          </div>
          <Button onClick={saveProfile} disabled={!nameDirty || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save profile
          </Button>
        </div>
      </SectionCard>

      {/* Appearance */}
      <SectionCard
        icon={Palette}
        title="Appearance"
        description="Theme and how the app surfaces in your space."
        delay={0.08}
      >
        <div className="space-y-4">
          <div>
            <Label className="mb-2">Theme</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              <ThemePreview
                active={prefs?.theme === "light"}
                onClick={() => handleThemeChange("light")}
                label="Light"
                icon={Sun}
              />
              <ThemePreview
                active={prefs?.theme === "dark"}
                onClick={() => handleThemeChange("dark")}
                label="Dark"
                icon={Moon}
              />
              <ThemePreview
                active={prefs?.theme === "system"}
                onClick={() => handleThemeChange("system")}
                label="System"
                icon={Monitor}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Time & Date */}
      <SectionCard
        icon={Clock}
        title="Time & date"
        description="Choose how times and dates are formatted across the app."
        delay={0.12}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label className="mb-2">Time format</Label>
            <ToggleGroup
              type="single"
              value={prefs?.timeFormat ?? "12h"}
              onValueChange={(v) => {
                if (v === "12h" || v === "24h") updatePrefs({ timeFormat: v });
              }}
              variant="outline"
              className="w-full"
            >
              <ToggleGroupItem value="12h" className="flex-1">
                12-hour · 3:30 PM
              </ToggleGroupItem>
              <ToggleGroupItem value="24h" className="flex-1">
                24-hour · 15:30
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <div>
            <Label htmlFor="date-format" className="mb-2">
              Date format
            </Label>
            <Select
              value={prefs?.dateFormat ?? "MMM d, yyyy"}
              onValueChange={(v) => updatePrefs({ dateFormat: v })}
            >
              <SelectTrigger id="date-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard
        icon={Bell}
        title="Notifications"
        description="Decide where and when Nova pings you."
        delay={0.16}
      >
        <div className="space-y-1">
          <ToggleRow
            title="Browser notifications"
            description="Native desktop notifications for reminders and deadlines."
            checked={prefs?.notifications.browser ?? false}
            onChange={handleBrowserNotifications}
          />
          <Separator />
          <ToggleRow
            title="In-app reminders"
            description="Show a toast and badge inside NovaTask when a reminder fires."
            checked={prefs?.notifications.reminders ?? true}
            onChange={(v) => updateNotifications({ reminders: v })}
          />
          <Separator />
          <ToggleRow
            title="Daily digest email"
            description="A short summary of what's due tomorrow, sent each evening."
            checked={prefs?.notifications.dailyDigest ?? false}
            onChange={(v) => updateNotifications({ dailyDigest: v })}
          />
        </div>
      </SectionCard>

      {/* AI preferences */}
      <SectionCard
        icon={Brain}
        title="AI preferences"
        description="Tune Nova's voice and how proactive she is."
        delay={0.2}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label htmlFor="ai-tone" className="mb-2">
              AI tone
            </Label>
            <Select
              value={prefs?.ai.tone ?? "friendly"}
              onValueChange={(v) =>
                updateAI({
                  tone: v as UserPreferences["ai"]["tone"],
                })
              }
            >
              <SelectTrigger id="ai-tone" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="concise">Concise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="self-end">
            <ToggleRow
              title="Auto-plan my day"
              description="Nova drafts a schedule each morning using your tasks."
              checked={prefs?.ai.autoPlan ?? false}
              onChange={(v) => updateAI({ autoPlan: v })}
            />
          </div>
        </div>
        <Separator className="my-2" />
        <ToggleRow
          title="Proactive suggestions"
          description="Surface smart nudges (overdue tasks, gaps, reschedule ideas) inline."
          checked={prefs?.ai.proactive ?? true}
          onChange={(v) => updateAI({ proactive: v })}
        />
      </SectionCard>

      {/* Reminder preferences */}
      <SectionCard
        icon={Clock}
        title="Reminders"
        description="How snooze and lead times behave."
        delay={0.24}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="snooze" className="mb-2">
              Default snooze
            </Label>
            <Select
              value={String(prefs?.reminder.defaultSnoozeMinutes ?? 10)}
              onValueChange={(v) =>
                updateReminder({ defaultSnoozeMinutes: Number(v) })
              }
            >
              <SelectTrigger id="snooze" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SNOOZE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={String(s.value)}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              Applied when you tap snooze on a reminder.
            </p>
          </div>
          <div>
            <Label className="mb-2">
              Reminder lead time: {prefs?.reminder.leadTimeMinutes ?? 15} min
            </Label>
            <Slider
              min={0}
              max={60}
              step={5}
              value={[prefs?.reminder.leadTimeMinutes ?? 15]}
              onValueChange={([v]) => updateReminder({ leadTimeMinutes: v })}
            />
            <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
              <span>At deadline</span>
              <span>60 min before</span>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Privacy */}
      <SectionCard
        icon={Shield}
        title="Privacy & data"
        description="Your data stays in your workspace."
        delay={0.28}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            <p>
              NovaTask stores your tasks, reminders, and chat history in a local
              SQLite workspace bound to this server. AI completions go through
              Nova&apos;s secure server-side API key — your data never exposes
              credentials to the browser.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Clear chat history</p>
              <p className="text-xs text-muted-foreground">
                Removes all AI conversation messages. Tasks and reminders are
                kept.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  disabled={clearingChat}
                  className="text-destructive hover:text-destructive"
                >
                  {clearingChat ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Clear chat
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass-strong">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all chat history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently removes every conversation with Nova from
                    this workspace. This can&apos;t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={clearingChat}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={clearChat}
                    disabled={clearingChat}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    {clearingChat ? "Clearing…" : "Clear history"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </SectionCard>

      {/* Sign out */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: EASE, delay: 0.3 }}
      >
        <Card className="glass">
          <CardContent className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-xs text-muted-foreground">
                End your session on this device.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: "/", redirect: true })}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* Sticky save indicator */}
      {saving && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center">
          <div className="glass-strong flex items-center gap-2 rounded-full px-4 py-2 text-xs shadow-xl">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--brand)]" />
            Saving changes…
          </div>
        </div>
      )}
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  delay = 0,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: EASE, delay }}
    >
      <Card className="glass card-3d">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background:
                  "color-mix(in oklch, var(--brand) 14%, transparent)",
                color: "var(--brand)",
              }}
            >
              <Icon className="h-4 w-4" />
            </span>
            {title}
          </CardTitle>
          <CardDescription className="ml-10">{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </motion.div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="mt-0.5" />
    </div>
  );
}

function ThemePreview({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group relative overflow-hidden rounded-xl border p-3 text-left transition-all",
        active
          ? "border-[var(--brand)] shadow-[0_0_0_1px_var(--brand)]"
          : "border-border/60 hover:border-[var(--brand)]/40 hover:translate-y-[-2px]"
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </span>
        {active && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: "var(--brand)" }}
          />
        )}
      </div>
      {/* Tiny mock dashboard swatch */}
      <div
        className="h-14 w-full rounded-md border border-border/40 p-1.5"
        style={{
          background:
            label === "Dark"
              ? "oklch(0.16 0.02 280)"
              : label === "Light"
              ? "oklch(0.99 0.005 280)"
              : "linear-gradient(120deg, oklch(0.99 0.005 280) 0 50%, oklch(0.16 0.02 280) 50% 100%)",
        }}
      >
        <div
          className="h-1.5 w-6 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, var(--brand), var(--brand-2), var(--brand-3))",
          }}
        />
        <div
          className="mt-1 h-1 w-10 rounded-full"
          style={{
            background:
              label === "Dark"
                ? "oklch(0.32 0.02 280)"
                : "oklch(0.85 0.01 280)",
          }}
        />
        <div
          className="mt-1 h-1 w-7 rounded-full"
          style={{
            background:
              label === "Dark"
                ? "oklch(0.28 0.02 280)"
                : "oklch(0.9 0.01 280)",
          }}
        />
      </div>
    </button>
  );
}
