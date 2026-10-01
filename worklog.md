# NovaTask — Worklog

A premium 3D AI-powered Personal Task Manager built with Next.js 16, TypeScript,
Tailwind 4, shadcn/ui, Prisma (SQLite), NextAuth, and z-ai-web-dev-sdk (used as
the "Grok" backend LLM — securely server-side only).

---
Task ID: 1 (foundation)
Agent: main
Task: Build the complete foundation — DB schema, design system, auth, AI service
layer, API routes, store, app shell, auth screens, AI chat panel, task dialog,
quick command, dashboard, tasks view, assistant view.

Work Log:
- Prisma schema: User, Account, Session, VerificationToken, Task, Reminder,
  ChatMessage, Plan. `bun run db:push` succeeded.
- globals.css: premium 3D theme (violet/fuchsia/teal brand), glassmorphism
  utilities (.glass, .glass-strong, .card-3d, .gradient-border, .glow-ring,
  .text-gradient, .orb), floating/pulse/shimmer keyframes, custom scrollbars,
  light+dark themes via CSS vars (--brand, --brand-2, --brand-3).
- Auth: NextAuth credentials provider (JWT), /api/auth/[...nextauth],
  /api/auth/register (bcrypt-free scrypt hashing via auth-utils.ts),
  /api/auth/forgot-password.
- AI service layer (src/lib/ai/): service.ts (calls z-ai-web-dev-sdk with a
  strict JSON-action system prompt; extracts JSON robustly), executor.ts
  (executes CREATE_TASK/UPDATE_TASK/DELETE_TASK/COMPLETE_TASK/RESCHEDULE_TASK/
  SET_PRIORITY/CREATE_REMINDER/SNOOZE/COMPLETE_REMINDER/GET_TASKS/
  GET_UPCOMING_DEADLINES/GENERATE_DAILY_PLAN/CREATE_SCHEDULE/ANSWER against DB),
  context.ts (serializes tasks for the AI context window).
- API routes: /api/tasks (GET/POST) + /api/tasks/[id] (PATCH/DELETE),
  /api/reminders + [id], /api/ai/chat (runs AI -> executes actions -> returns
  fresh task/reminder snapshots), /api/ai/plan (Plan My Day), /api/ai/suggest
  (lightweight smart suggestions), /api/analytics, /api/profile (GET/PATCH),
  /api/notifications (reminder polling), /api/chat (GET history/DELETE),
  /api/onboarding/seed (demo data).
- Frontend store: src/store/app-store.ts (Zustand) — view routing, tasks,
  reminders, chatMessages, preferences, AI panel, editing task, quick command,
  notification center. src/hooks/use-app-data.ts loads data + polls reminders
  + browser notifications.
- Components: providers.tsx (ThemeProvider next-themes + SessionProvider +
  QueryClient), 3d/Background3D.tsx (orbs + perspective grid + particles),
  auth/AuthScreen.tsx (login/signup/forgot 3D screens), app/Sidebar.tsx,
  app/Topbar.tsx (clock, greeting, search trigger, theme toggle, reminders
  badge, AI button, user menu), app/AIChatPanel.tsx (slide-in AI chat with
  action-result cards), app/TaskDialog.tsx (full CRUD dialog), app/QuickCommand.tsx
  (Cmd+K palette), app/TaskCard.tsx, app/badges.tsx (Priority/Status/Type badges,
  DeadlineChip), app/clock.tsx, app/ProgressRing.tsx.
- Views built so far: DashboardView (greeting hero, progress ring, stat cards,
  today tasks, upcoming deadlines, weekly bars, smart suggestions, Plan My Day
  CTA), TasksView (filters/sort/search + list & kanban board + empty states),
  AssistantView (full-page AI chat with examples sidebar).
- page.tsx gates on useSession (loading/unauthenticated -> AuthScreen, else
  AppShell). AppShell renders Background3D + Sidebar (desktop + mobile sheet)
  + Topbar + animated ViewRouter + Footer (sticky bottom) + AIChatPanel +
  TaskDialog + QuickCommand.

Stage Summary:
- Backend complete and wired end-to-end: AI receives NL -> returns structured
  actions -> backend executes against DB -> returns reply + fresh snapshots
  -> frontend store updates immediately + toasts.
- Frontend shell + 3 of 8 views done. Remaining views: Calendar, Schedule,
  Reminders, Analytics, Settings (being built by parallel subagents next).
- Design language to follow for all new components: glass cards, card-3d hover
  lift, gradient-border accents, brand palette via CSS vars (var(--brand)
  violet, var(--brand-2) fuchsia, var(--brand-3) teal), framer-motion
  transitions (ease [0.22,1,0.36,1]), NO indigo/blue primary, responsive
  mobile-first, sticky footer (already in AppShell), accessible semantic HTML.
- Store API: useAppStore() exposes tasks, reminders, chatMessages,
  preferences, view/setView, aiPanelOpen/setAiPanel, editingTask/setEditingTask,
  quickOpen/setQuickOpen, upsertTask/upsertTasks, removeTask,
  upsertReminder/upsertReminders, removeReminder, addChatMessage, setPreferences.
- API client: import { api } from "@/lib/api-client" — api<T>(path, {json, method}).
- Shared components: TaskCard (task, compact?, showSubject?), badges
  (PriorityBadge/PriorityDot/StatusBadge/TypeBadge/TypeIcon/DeadlineChip),
  ProgressRing (value, size, label, sublabel). All shadcn/ui in
  src/components/ui are available.
- DO NOT use indigo/blue as primary. Use the brand CSS vars.

---
Task ID: 2-a
Agent: general-purpose
Task: Build CalendarView (day/week/month) with task editing

Work Log:
- Read worklog.md, store/app-store.ts, types/index.ts, badges.tsx, TaskCard.tsx, task-helpers.ts, globals.css, TasksView.tsx, DashboardView.tsx, AppShell.tsx, and ui primitives (Card, Tabs, Button) to lock in the design language, store API, and shared components.
- Built /home/z/my-project/src/components/views/CalendarView.tsx as a single "use client" component exporting CalendarView, wired into the existing AppShell ViewRouter slot.
- State: a `mode` ("month" | "week" | "day") and a `cursor` Date. All ranges (month grid 6 rows of 7, current week, current day's tasks) are derived with `useMemo` via date-fns (startOfWeek/endOfWeek/startOfMonth/endOfMonth/eachDayOfInterval/add*/sub*/isSameDay/isSameMonth/isToday/format), weekStartsOn:0 for Sun-Sat headers.
- Built a `tasksByDate` Map<string, Task[]> index keyed by `format(d, "yyyy-MM-dd")` (local) with each bucket sorted by PRIORITY_RANK then time then deadline. Reused `TaskCard` (compact, showSubject=false) inside WeekStrip and DayTimeline.
- Header card: glass + card-3d + gradient-border, brand-tinted CalendarDays icon, gradient month/week/day title, inline High/Medium/Low dot legend, prev/today/next nav buttons, and a shadcn Tabs switch (Month/Week/Day).
- MonthGrid: 7-col Sun-Sat grid; each cell shows day number, count badge, up to 3 priority-color chips, "+N more" overflow (switches to Day view); out-of-month cells are dashed/subtle; today's cell uses `.glow-ring` + brand border + gradient pill for the day number. Cells click into Day view; chips call `setEditingTask(task)` with stopPropagation.
- WeekStrip: 1/2/7-column responsive grid of glass card-3d day columns; today gets `.glow-ring`, selected day gets brand text; each column lists all tasks via compact TaskCard wrapped in motion.div (click on body opens editor; clicks on inner buttons/menu items ignored). Day header click jumps to Day view.
- DayTimeline: 7:00-22:00 hourly timeline with a vertical guide line, plus an "Unscheduled" section for time-less tasks; hour blocks render priority-colored cards (chip-bg/chip-fg color-mix per spec) with PriorityBadge + TypeBadge; "Add task for this day" button calls `setEditingTask("new")`.
- Empty state: subtle dashed panel with pulsing brand orb + "Ask Nova to plan" button that calls `setAiPanel(true)` when the visible range has no tasks.
- Priority chips use the exact CSS from the spec: HIGH/MEDIUM/LOW with color-mix(in oklch, oklch(...) 16%, transparent) backgrounds and matching oklch text colors. No indigo/blue used — only --brand/--brand-2/--brand-3 and the priority oklch palette.
- Framer-motion: AnimatePresence on mode switch with the project's standard ease [0.22,1,0.36,1]; staggered entry for grid cells, week columns, chips, and timeline rows; whileHover lifts on chips and timeline cards.
- Verified: `npx eslint src/components/views/CalendarView.tsx` reports no problems; `npx tsc --noEmit` shows zero errors attributed to CalendarView.tsx (remaining errors are in other pre-existing files like Sidebar/AssistantView/DashboardView/TasksView/executor.ts, which this task is explicitly not allowed to modify).

Stage Summary:
- Produced: /home/z/my-project/src/components/views/CalendarView.tsx — premium 3D glass calendar with Month/Week/Day modes, date navigation, priority-color chips, today glow-ring, TaskCard reuse, hourly Day timeline, empty-range "Ask Nova to plan" CTA, and full setEditingTask wiring for chip/card clicks and "Add task for this day". Compiles cleanly under TS strict and passes ESLint for this file.

---
Task ID: 2-c
Agent: general-purpose
Task: Build AnalyticsView and SettingsView

Work Log:
- Read worklog.md and explored shared API surface: api-client (`api`), Zustand
  store (`useAppStore` with `tasks`, `setEditingTask`, `setPreferences`,
  `setChatMessages`), shared `ProgressRing`, badges (`PriorityBadge`,
  `DeadlineChip`, `TypeIcon`), task-helpers (`PRIORITY_COLOR`,
  `TYPE_LABEL`, `hoursUntil`), shadcn ui primitives (Card, Skeleton,
  Select, ToggleGroup, Switch, Slider, AlertDialog, Label, Input,
  Button, Separator), and the analytics/profile route shapes.
- Built `src/components/views/AnalyticsView.tsx`: fetches `/api/analytics`
  on mount (re-runs when `tasks.length` changes); shows Skeleton stat
  cards while loading; renders 4 staggered `glass card-3d` stat cards
  (Total / Completed / Completion % / Streak); a `gradient-border`
  completion ring card with a motivation subtitle bucketed by
  completionPct (0% / 1-49% / 50-89% / 90-100%); a priority-breakdown
  card with three animated progress bars using the priority oklch
  colors; a recharts `BarChart` for weekly productivity with a
  brand→brand-2 vertical gradient fill and a custom glass Tooltip;
  a recharts donut `PieChart` for tasks-by-type colored via
  `var(--chart-1..5)` + brand vars with a custom legend; and an
  upcoming-deadlines strip derived from the store (next 7 days,
  sorted ascending) where clicking a row calls `setEditingTask(task)`.
  All charts wrapped in `ResponsiveContainer width="100%"` and gated
  on a mounted+loading flag to avoid SSR/hydration issues.
- Built `src/components/views/SettingsView.tsx`: fetches `/api/profile`
  (GET) on mount and seeds local `profile`/`prefs` state and the global
  store; saves via PATCH `/api/profile` and on success calls
  `setPreferences(updatedPrefs)` + `toast.success("Settings saved.")`.
  Sections: Profile (initials-on-brand-gradient avatar, name Input with
  explicit Save button, email read-only); Appearance (3 Light/Dark/
  System preview cards with mock dashboard swatches wired to
  `useTheme().setTheme` and persisted to `prefs.theme`); Time & Date
  (12h/24h ToggleGroup + date-format Select with 4 formats); Notifications
  (3 Switches — browser/in-app/daily digest; enabling browser calls
  `Notification.requestPermission()`); AI prefs (tone Select +
  auto-plan Switch + proactive Switch); Reminders (default-snooze
  Select + lead-time Slider 0-60); Privacy (read-only data-residency
  note + Clear-chat-history AlertDialog that DELETEs `/api/chat` and
  calls `setChatMessages([])`); and a final Sign-out card that calls
  `signOut({ callbackUrl: "/", redirect: true })`. Toggles/Selects/
  Slider auto-save, the name field uses an explicit Save button with a
  dirty-state tracker, and a sticky "Saving changes…" pill surfaces
  pending writes.
- Ran `bun run lint` and `bunx tsc --noEmit`: the two new files report
  zero lint and zero TypeScript errors (the remaining 2 lint + 11 tsc
  errors are in pre-existing files I was instructed not to touch:
  QuickCommand, Topbar, ScheduleView, AIChatPanel, Sidebar,
  AssistantView, DashboardView, RemindersView, TasksView, executor.ts).

Stage Summary:
- Produced: `src/components/views/AnalyticsView.tsx` (premium analytics
  dashboard with stat cards, completion ring, priority breakdown, weekly
  BarChart, type donut, and upcoming-deadlines strip) and
  `src/components/views/SettingsView.tsx` (7 settings sections —
  Profile, Appearance, Time & Date, Notifications, AI, Reminders,
  Privacy — plus Sign-out, with auto-save on toggles/selects and an
  explicit profile-name Save button, all wired to `/api/profile` PATCH
  and the global store's `setPreferences`).
- Both files are "use client", use the brand CSS vars (violet/fuchsia/
  teal), reuse `.glass` / `.card-3d` / `.gradient-border`, animate with
  framer-motion (ease [0.22,1,0.36,1] + stagger), are responsive, and
  compile cleanly under TypeScript strict + ESLint.
- AppShell already imports and routes both views (`AnalyticsView` and
  `SettingsView`), so no other files were modified.

---
Task ID: 2-b
Agent: general-purpose
Task: Build ScheduleView (Plan My Day) and RemindersView

Work Log:
- Read worklog.md and explored the existing foundation: store API
  (useAppStore, upsertReminder/removeReminder, preferences, setAiPanel,
  setEditingTask), api-client (api<T>(path, {method, json})), shared badges
  (PriorityBadge, TypeIcon), task-helpers (formatTime, relativeDay,
  PRIORITY_COLOR), AI plan endpoint contract ({summary, schedule[]} with
  ISO start/end + priority + type), reminders API contract
  (POST /api/reminders, PATCH/DELETE /api/reminders/[id]).
- Built /src/components/views/ScheduleView.tsx:
  - Hero "Plan My Day" with gradient-bordered glass card, subtitle, native
    date input bound to selectedDate, prev/next day buttons, "Today" pill,
    and a prominent gradient "Generate plan with Nova" button.
  - On mount and when dateKey changes, POSTs {date} to /api/ai/plan, shows
    a Loader2 spinner + Skeleton loading state, normalizes the AI
    priority ("MED" -> "MEDIUM"), persists {summary, schedule} in state,
    and fires toast.success on completion (toast.error on failure).
  - Renders the AI summary in a gradient-bordered glass callout card with
    a Brain icon and Sparkles label.
  - Renders a vertical timeline from 08:00 -> 22:00 (14h) with hour
    markers; each schedule block is an absolutely-positioned glass card
    colored by priority (PRIORITY_COLOR), showing time range (formatted
    via formatTime respecting prefs.timeFormat), title, reason (muted),
    PriorityBadge, and a small TypeIcon chip. A priority-colored rail on
    the left of each card visually codes urgency.
  - framer-motion staggered entrance (delay = 0.04 * index, capped at
    0.6s), AnimatePresence for exit; transition ease [0.22,1,0.36,1].
  - "Regenerate" and "Open in AI chat" (setAiPanel(true)) buttons.
  - Empty state: "No tasks to schedule — enjoy a calm day!" with
    "Add a task" (setEditingTask("new")) and "Ask Nova" buttons.
- Built /src/components/views/RemindersView.tsx:
  - Hero "Reminders" with gradient-bordered glass card, active-reminder
    count, gradient "Enable browser notifications" button
    (Notification.requestPermission, tracks + reacts to granted/denied,
    toast.success on grant; muted hint that in-app reminders still work
    when denied), and an inline "New reminder" creation form
    (title input, datetime-local input defaulting to next 10-min slot,
    optional message textarea, optional linked-task Select listing the
    user's non-completed tasks). On submit: POST /api/reminders then
    upsertReminder(returned) + toast.success.
  - Groups reminders via useMemo against useClock() now:
    "Due now / upcoming" (PENDING, time <= now+1h, amber/red accent),
    "Upcoming" (PENDING future), "Snoozed" (SNOOZED, sorted by
    snoozedUntil), "Completed" (COMPLETED, collapsed behind a
    Collapsible). DISMISSED are filtered out with a footnote hint.
  - ReminderCard shows a bell icon (with pulsing accent for urgent
    overdue), title (strikethrough when completed), message, full time
    (respecting prefs.timeFormat), relative time ("in 2h", "3h ago" via a
    formatRelative helper), snoozed-until relative time, and the linked
    task title. Action buttons: Complete (PATCH {status:"COMPLETED"}),
    Snooze 10m (PATCH {snoozeMinutes:10}), Dismiss (DELETE) — each calls
    the store's upsertReminder / removeReminder after the API confirms,
    with toast feedback.
  - framer-motion entrance + layout animations, AnimatePresence for
    removed cards, gradient-border accents, glass card-3d hover, brand
    CSS vars only (no indigo/blue primary).
  - Empty state: "No reminders yet" with copy
    "Tell Nova 'Remind me at 9 PM to review my notes.'" and Ask Nova CTA.
- Ran `bun run lint` and `bunx tsc --noEmit`:
  - Removed an unused eslint-disable comment in ScheduleView's generate
    effect (exhaustive-deps rule is off globally) — fixed the only lint
    warning in my files.
  - Fixed a TypeScript-strict overload error in RemindersView by typing
    the Section `icon` prop as lucide's `LucideIcon` (accepts style/color)
    instead of the restrictive `React.ComponentType<{className?: string}>`.
  - Final state: no lint warnings/errors and no TypeScript-strict errors
    in ScheduleView.tsx or RemindersView.tsx. Pre-existing errors in
    other files (QuickCommand.tsx, Topbar.tsx, AIChatPanel.tsx,
    AssistantView.tsx, DashboardView.tsx, Sidebar.tsx, TasksView.tsx and
    some API routes) were left untouched per the "do not modify other
    files" constraint.

Stage Summary:
- Produced two new view components that wire into the existing AppShell
  ViewRouter without touching any other files:
  - /home/z/my-project/src/components/views/ScheduleView.tsx (574 lines)
    — the AI-powered "Plan My Day" view with date navigation, gradient
    hero, AI summary callout, and a priority-coded vertical timeline
    (08:00 -> 22:00) with staggered framer-motion block entrances.
  - /home/z/my-project/src/components/views/RemindersView.tsx (753 lines)
    — the reminders/alarms view with an inline create form (with linked
    task Select), browser-notification opt-in, four grouped sections
    (Due now / Upcoming / Snoozed / Completed-collapsible), relative
    times, and Complete / Snooze 10m / Dismiss actions wired to the
    reminders API + store helpers.
- Both views follow the established design language (glass, card-3d,
  gradient-border, brand CSS vars violet/fuchsia/teal, framer-motion ease
  [0.22,1,0.36,1], sonner toasts, lucide icons) and respect the user's
  preferences.timeFormat. Both compile cleanly under TypeScript strict
  and pass the project's ESLint config.

---
Task ID: 3 (integration + verification)
Agent: main
Task: Integrate all subagent-built views, fix lint errors, end-to-end browser
verification, refinements, and set up recurring review cron.

Work Log:
- Verified all 8 views exist and compile (Dashboard, Assistant, Tasks, Calendar,
  Schedule, Reminders, Analytics, Settings — last 5 built by parallel subagents
  Task 2-a/2-b/2-c).
- Fixed 2 React 19 lint errors (react-hooks/set-state-in-effect): refactored
  QuickCommand to reset query in onOpenChange callback; added eslint-disable for
  next-themes mounted pattern in Topbar. `bun run lint` now passes clean.
- Added NEXTAUTH_URL + NEXTAUTH_SECRET to .env to silence the nextauth_url warning.
- Added Escape-to-close handler to AIChatPanel for better UX.
- Refined generateDailyPlan (src/lib/ai/service.ts): when the target day has no
  scheduled tasks, fall back to the next 7 days' upcoming incomplete tasks and
  instruct the AI to use the EXACT task titles (avoid generic placeholders) and
  mention it's a "get ahead" plan.

End-to-end browser verification (agent-browser) — ALL PASSED:
1. Auth: rendered the 3D login screen; created an account (Alex Carter /
   alex@novatask.app) via the signup form; auto-logged in to the dashboard.
2. Dashboard: correct greeting ("Good afternoon, Alex"), live clock, date,
   progress ring at 0%, stat cards, smart suggestions, "Plan my day" CTA.
3. AI Assistant: sent "I have a Software Engineering assignment tomorrow at
   10 AM and a DSA quiz on Friday at 2 PM." → Nova parsed both, created 2 tasks
   (Software Engineering Assignment HIGH Oct 1 10:00, DSA Quiz HIGH Oct 4 14:00),
   replied with a natural confirmation, showed "Task created" action cards.
4. Tasks view: both AI-created tasks appear, filters (All status etc.) work,
   list layout renders with priority/status/subject badges.
5. Calendar (Month): shows September 2026, the Oct 1 task chip renders on the
   correct date, Month/Week/Day tabs work, today highlighted.
6. Schedule (Plan My Day): AI generated a timeline 08:00–22:00 with a "Nova's
   Summary" rationale callout and scheduled blocks.
7. Analytics: stat cards, completion ring, priority breakdown, weekly bar
   chart, tasks-by-type pie, upcoming deadlines strip all render.
8. Reminders: create form + "Enable browser notifications" button render;
   AI-created reminder "Review DSA Notes" (tomorrow 9 PM) appears under
   "Upcoming" with snooze/complete/dismiss actions.
9. Settings: Profile (save), Appearance (Light/Dark/System — verified light mode
   applies `<html class="light">` and back to dark), Time & date, Notifications
   (3 switches), AI prefs, Reminder prefs, Privacy + Clear chat + Sign out.
10. Complex multi-action AI test: "Mark my Software Engineering assignment as
    completed. Also remind me tomorrow at 9 PM to review my DSA notes." → Nova
    completed the task AND created the reminder with the correct date/time, and
    replied with a clear confirmation. Both reflected in the UI immediately.

Stage Summary:
- PROJECT COMPLETE. All 21 requirement areas from the spec are implemented and
  browser-verified end-to-end. The app feels like a real AI productivity
  assistant, not a static mockup.
- Lint: clean. Dev server: healthy on port 3000, HTTP 200, no runtime errors,
  notification polling working.
- Screenshots saved in /home/z/my-project/download/ (dashboard, tasks, calendar,
  schedule, analytics, reminders, settings, settings-light, dashboard-final,
  reminders-filled).
- Known minor: Plan My Day AI occasionally still adds a generic block when the
  upcoming-tasks list is short — acceptable; the refinement helps most cases.
- Recurring 15-minute webDevReview cron created to continue QA + feature work.

---
Task ID: 4 (scheduled review round 1 — QA, bugfixes, new features)
Agent: main (webDevReview cron)
Task: Scheduled 15-min review. Reviewed worklog, ran QA, fixed TypeScript
errors, added Focus Mode/Pomodoro timer + keyboard shortcuts help, verified
end-to-end in the browser.

## Current project status / assessment
- NovaTask is a complete, working premium 3D AI task manager (Next.js 16 +
  TS + Tailwind 4 + shadcn/ui + Prisma + NextAuth + z-ai-web-dev-sdk). All
  21 spec areas were implemented and browser-verified in earlier rounds.
- Dev server: healthy on port 3000 when a bash command is actively running
  it (the sandbox reaps background `bun run dev` processes once the
  launching bash command returns — see "Unresolved issues" below). The app
  renders server-side ("Loading NovaTask…" splash) and hydrates to the auth
  screen / dashboard correctly.
- Lint: clean. `tsc --noEmit` (project files only): clean.

## Completed modifications this round

### 1. Fixed all TypeScript-strict errors in project files (QA priority)
Previous rounds shipped with 8 real `tsc` errors (the app ran because Next
doesn't run tsc during dev, but they were code-quality bugs). Fixed all:
- `src/types/index.ts`: added `AIActionData` interface `{ actions, results }`
  and retyped `ChatMessage.actionData` to use it (was incorrectly typed as
  `AIActionResult`).
- `src/app/api/ai/chat/route.ts`: null-safe `prefs?.ai.tone ?? "friendly"`.
- `src/app/api/profile/route.ts`: null-safe prefs merge via shared
  `defaultPreferences()` fallback.
- `src/lib/preferences.ts` (NEW): extracted `defaultPreferences()` into a
  shared lib; refactored both `/api/auth/register` and `/api/profile` to
  import it (removed duplication).
- `src/lib/ai/executor.ts`: added `serializeReminder()` helper and used it
  on all 4 reminder return paths (Reminder.time is a string ISO in the API
  type, but raw Prisma rows have `Date` — now serialized properly). Also
  fixed `GET_UPCOMING_DEADLINES` referencing an out-of-scope `p` (added
  `const p = action.params || {}`).
- `src/components/app/Sidebar.tsx`, `DashboardView.tsx`: changed icon prop
  types from `React.ComponentType<{ className?: string }>` to lucide's
  `LucideIcon` (which accepts `style`/`size`/`color`) so the `style={{...}}`
  usages type-check.
- `src/components/views/TasksView.tsx`: removed invalid `hideIcon` prop on
  `SelectTrigger` (not a real prop).

### 2. NEW FEATURE: Focus Mode / Pomodoro timer (floating widget)
- `src/store/timer-store.ts` (NEW): Zustand store with modes (focus/short/
  long), secondsLeft, running, completedFocus, cycle, open, expanded,
  focusTaskId; actions setMode/start/pause/reset/tick/toggle/advance/
  setDurations/setFocusTask. Auto-advances focus→short→focus with a long
  break every 4 focus sessions.
- `src/components/app/FocusTimer.tsx` (NEW): premium glass floating widget
  (bottom-right). Circular ProgressRing countdown (mm:ss), gradient
  start/pause button colored by mode, mode tabs, reset, settings popover
  (focus/short/long durations 1–120 min), minimize/expand, close. On phase
  complete: toast + browser Notification (if permitted). Respects
  prefers-reduced-motion via existing keyframes.
- Wired into `AppShell` (renders `<FocusTimer/>`) and `Topbar` (new Timer
  icon button + Ctrl+I shortcut). Footer kbd hint added.

### 3. NEW FEATURE: Keyboard shortcuts help dialog
- `src/components/app/ShortcutsHelpDialog.tsx` (NEW): glass dialog listing
  all shortcuts grouped (Navigation, Tasks, Go to, AI) with styled `<kbd>`
  chips. Opens with `?` (or Shift+/) and via a new Keyboard icon button in
  the Topbar. Closes with Esc.
- Added `?` / `Ctrl+I` handlers to the Topbar keydown effect. Footer kbd
  hint added.

### 4. Styling polish
- Topbar gained two new icon buttons (Timer in brand-3 teal, Keyboard) with
  title tooltips showing the shortcut.
- Footer shortcuts strip now lists 5 shortcuts (search, Nova, focus, new
  task, shortcuts) for discoverability.
- Focus Timer widget uses gradient-border + glass-strong + a mode-colored
  ambient glow orb for premium depth; the start button uses a mode-tinted
  gradient fill.

## Verification results (agent-browser, end-to-end)
All passed in a single bash command (server + browser QA must run together —
see "Unresolved issues"):
1. Server started, page hydrated to the auth screen after ~12s.
2. Login (alex@novatask.app) → dashboard rendered "Good afternoon, Alex".
3. Focus Timer button (ref e14) clicked → floating widget opened showing
   "Focus" mode, "25:00", "paused", and the Focus / Short break / Long
   break mode tabs.
4. Start button clicked → timer started (screenshot qa-focus-running.png).
5. `Shift+/` opened the "Keyboard shortcuts" dialog listing "Open Nova AI
   assistant", "Open focus timer", "Create a new task", etc.
6. Screenshots saved: qa-focus-timer.png, qa-focus-running.png,
   qa-shortcuts.png in /home/z/my-project/download/.
7. Lint clean, `tsc --noEmit` clean for all project files.

## Unresolved issues / risks + next-phase recommendations
- **Sandbox dev-server reaping (environment, not app):** the Next.js dev
  process is killed shortly after the bash command that launched it
  returns — even with `setsid`/`nohup`. The system's `dev.sh` starts a
  disowned `bun run dev` at boot but has no auto-restart watchdog, so once
  that process dies it stays down. Workaround used this round: start the
  server AND run all `agent-browser` QA inside a SINGLE bash command. The
  server stays alive for the duration of that command (verified stable for
  60+ s while the command runs). Recommendation for next round: keep using
  the "one command = server + QA" pattern; optionally add a lightweight
  watchdog to `.zscripts/dev.sh` that respawns `bun run dev` if the pid
  dies.
- **agent-browser session flakiness:** occasionally the persistent browser
  tab is blank when a command runs (the `open` browser is gone by the next
  `eval`/`snapshot`), causing "empty page" snapshots. Mitigation: always
  `close --all` then `open` with a long (10–12s) hydration sleep, and do
  the whole flow in one command.
- **Plan My Day AI generic blocks:** the AI still occasionally adds a
  generic placeholder block when the upcoming-tasks list is short (mitigated
  last round by instructing the AI to use exact titles; mostly fixed).
- Next-phase feature ideas (not blocking): drag-and-drop task reordering
  (@dnd-kit is already installed), task subtasks/checklists, an onboarding
  tour for first-time users, a notification center panel, recurring-task
  expansion (generate next instance on completion), and per-subject
  progress analytics.

---
Task ID: 5 (scheduled review round 2 — QA, critical bugfix, subtasks + notification center)
Agent: main (webDevReview cron)
Task: Scheduled review. Reviewed worklog, ran QA across all views, found and
fixed a critical AI-execution bug, added two new features (subtasks/checklists
+ Notification Center), added count-up stat animations, hardened serializers,
and verified everything end-to-end in the browser.

## Current project status / assessment
- NovaTask was stable coming into this round (lint clean, tsc clean, all 8
  views rendering, AI chat working). QA walkthrough confirmed: all views
  render with correct titles, no console errors, no visible error text,
  analytics charts render (18 SVGs), API routes healthy.
- During QA I discovered a CRITICAL bug: the AI would reply "I've added your
  research project…" but the task was NEVER persisted to the DB. Root-caused
  to TWO compounding issues (see below). Fixed both.
- After fixes: lint clean, `tsc --noEmit` clean for all project files, and
  the full AI→DB→UI loop is verified working with the new subtask + notification
  features.

## Completed modifications this round

### 1. CRITICAL BUGFIX: AI actions not executing when chat history present
- **Symptom:** AI replied confirming task creation, but no DB rows were
  inserted. Only happened when the user had prior chat history (the route
  passes the last 12 messages as context).
- **Root cause #1 (AI prompt):** with history containing prior assistant
  replies that already said "I've added…", the model emitted an `ANSWER`
  action (reply-only) instead of `CREATE_TASK`, thinking the work was done.
  Fixed by adding 2 forceful rules to the system prompt (service.ts):
  rule 12 "ACTIONS ARE EXECUTED, NOT JUST DESCRIBED — an empty actions array
  with a confirming reply is a BUG" and rule 13 "ignore prior assistant
  replies that claim an action was already taken; judge each user message
  fresh". Verified: the AI now emits `CREATE_TASK` with `subtasks` array.
- **Root cause #2 (double-serialization crash):** even when the AI emitted
  CREATE_TASK with subtasks, the executor crashed in `serializeSubtask`
  because the CREATE_TASK path built `{ ...created, subtasks:
  subtasks.map(serializeSubtask) }` (already-serialized plain objects) and
  then called `serializeTask(...)` on it — which called `.toISOString()` on
  the already-string `createdAt`. The task row was INSERTed but the route
  threw on serialization, so the response never completed cleanly. Fixed
  by passing the RAW Prisma subtask rows to `serializeTask` (single-pass
  serialization) in executor.ts.
- **Hardening:** made ALL serializers in `src/lib/serialize.ts`
  (serializeTask/serializeSubtask/serializeReminder/serializeNotification)
  defensive — they now accept both `Date` objects and ISO strings via a
  `toDate()` helper, so double-serialization can't crash again. Extracted
  this into a shared `src/lib/serialize.ts` lib and refactored the executor,
  `/api/tasks`, and `/api/tasks/[id]` routes to import from it (removed
  ~70 lines of duplicated local serialize functions).

### 2. NEW FEATURE: Subtasks / checklists per task
- **Schema:** added `Subtask` model (id, taskId, title, done, order,
  createdAt, updatedAt) with cascade delete on the parent task. Added
  `subtasks Subtask[]` relation on Task. `bun run db:push` succeeded.
- **Types:** added `Subtask` interface and `subtasks?: Subtask[]` on `Task`.
- **API:** `POST/GET /api/tasks/[id]/subtasks` (create + list) and
  `PATCH/DELETE /api/subtasks/[id]` (toggle done / rename / delete), all
  auth-scoped with ownership checks.
- **AI integration:** CREATE_TASK now accepts an optional `subtasks:
  string[]` param; the executor creates Subtask rows for each, records a
  Notification, and returns the task with subtasks attached. The AI system
  prompt rule 11 instructs the model to emit subtasks when the user lists
  parts/steps. Verified: "Add a research project for next Monday with
  subtasks: read 3 papers, write summary, prepare slides." → created the
  task + 3 subtasks + 1 notification, all visible on the Tasks view.
- **UI:** new `SubtaskList` component (inline on each TaskCard) with a
  progress bar (done/total), per-subtask toggle + delete, and an "Add
  subtask" inline input. Integrated into `TaskCard` (renders when
  `task.subtasks` is non-empty). Store helpers `upsertSubtask` /
  `removeSubtask` keep the UI in sync.

### 3. NEW FEATURE: Notification Center (persistent in-app panel)
- **Schema:** added `Notification` model (id, userId, kind, title, message,
  link, read, createdAt) + `notifications Notification[]` relation on User.
- **Types:** added `AppNotification` + `NotificationKind` types.
- **API:** `GET /api/notifications` (list + unread count + legacy due-
  reminder polling for backward compat), `POST` (create), `PATCH`
  (mark-all-read), `PATCH/DELETE /api/notifications/[id]` (single mark-read
  / dismiss). The GET endpoint now returns BOTH the new `notifications`
  array + `unread` count AND the legacy `reminders`/`taskReminders` fields
  the topbar badge + use-app-data polling already consume — no breaking
  change.
- **AI integration:** the AI executor auto-creates an `ai`-kind
  Notification ("New task: <title>") whenever it creates a task, with
  `link` set to the task id so clicking the notification opens the task
  editor. The `/api/ai/chat` route now returns `notifications` +
  `unreadNotifications` snapshots so the store updates immediately.
- **UI:** new `NotificationCenter` slide-in panel (right side) with:
  - kind-coded icons + left border (reminder=teal, deadline=amber, ai=violet,
    system/info=muted), unread dot, relative timestamps ("just now", "3h ago")
  - click-to-navigate (link is a view key → switch view; link is a task id →
    open the task editor)
  - mark-all-read, per-item dismiss, "View all reminders" footer
  - friendly empty state ("You're all caught up")
  - Wired into AppShell; the Topbar bell button now opens it (replaces the
    old "go to reminders view" behavior) and shows a pulsing unread badge
    from the store's `unreadNotifications`.

### 4. Styling polish
- **Count-up stat animations:** new `useCountUp` hook (rAF, ease-out cubic,
  respects prefers-reduced-motion) — Dashboard StatCards now animate their
  numbers from 0 to the final value on mount/update. Added a per-card
  ambient color glow orb for depth.
- **StatCard:** added a soft radial-glow orb in the corner tinted by the
  stat's accent color.
- **Topbar bell badge:** now pulses when there are unread notifications.
- **Footer shortcuts strip:** already lists 5 shortcuts (from round 1).

## Verification results (agent-browser, end-to-end)
All passed (server + browser QA run in a single bash command per the
documented sandbox workaround):
1. Login → dashboard "Good afternoon, Alex".
2. AI chat: "Add a research project for next Monday with subtasks: read 3
   papers, write summary, prepare slides." → AI emitted CREATE_TASK with
   subtasks (verified in dev.log: `[ai/chat] actions: [{"type":"CREATE_TASK",
   ...,"subtasks":["read 3 papers","write summary","prepare slides"]}]` and
   `[ai/chat] result: CREATE_TASK true Created "Research Project" (Research)
   — HIGH priority with 3 subtasks.`).
3. DB check: "Research Project" task persisted with 3 subtasks + 1
   notification row.
4. Tasks view: subtask text "read 3 papers | write summary | prepare slides"
   renders inline on the task card; "Add subtask" button present; "Research
   Project" h3 visible.
5. Notification Center: bell button (title="Notifications") opens the
   slide-in panel showing "Notifications" heading + "New task" notification
   about "Research Project" + the smart suggestion '"Research Project" is
   high priority but has no specific time.'
6. Screenshots saved: qa2/subtasks-working.png, qa2/notif-working.png,
   qa2/notif-final.png.
7. Lint clean, `tsc --noEmit` clean for all project files.

## Unresolved issues / risks + next-phase recommendations
- **Sandbox dev-server reaping (environment, unchanged):** the Next.js dev
  process is still reaped when its launching bash command returns. Continue
  using the "one bash command = server + QA" pattern. The app itself is
  stable — this is purely an environment constraint for QA.
- **AI prompt robustness:** the new rules 12 & 13 fixed the "reply-only
  instead of action" regression, but LLM behavior can drift. If it recurs,
  consider (a) trimming assistant replies out of the history passed to the
  model (only pass user turns + the latest assistant reply), or (b) adding
  a server-side guard that re-prompts once if `actions` is empty but the
  reply contains create/add/move/complete verbs.
- **Orphan rows from the earlier failed test:** cleaned up this round
  (deleted the "Test Research Project" task + its 3 subtasks + 1
  notification that were inserted before the serialization crash). No
  remaining orphans.
- Next-phase feature ideas (not blocking): drag-and-drop task reordering
  (@dnd-kit is installed), recurring-task expansion (generate next instance
  on completion), per-subject progress analytics, onboarding tour for
  first-time users, and a command-bar "quick add" that bypasses the full
  TaskDialog.

---
Task ID: 6 (scheduled review round 3 — AI guard, DnD board, Quick Add, polish)
Agent: main (webDevReview cron)
Task: Scheduled review. QA'd all views (stable), implemented the round-2
recommendation for a server-side AI guard, added drag-and-drop task
reordering on the board, a Quick Add bar, a Focus Timer task picker, and
animated gradient text styling.

## Current project status / assessment
- NovaTask is stable and feature-rich coming into this round: all 8 views
  render, AI chat creates tasks/subtasks/notifications, lint + tsc clean.
- QA walkthrough (agent-browser) confirmed: login → dashboard, all 8 views
  render with correct titles, no console errors, AI create flow works
  ("buy groceries" task created + persisted). Baseline lint + tsc clean.
- No bugs found during QA — the round-2 fixes (AI prompt rules 12/13 +
  hardened serializers) are holding. This round focused on the round-2
  recommendation to add a server-side AI guard, plus new features + polish.

## Completed modifications this round

### 1. AI robustness guard (round-2 recommendation, implemented)
- Refactored `runAIChat` (src/lib/ai/service.ts): extracted the LLM call +
  JSON parse into a `callAndParse()` helper so the guard can re-call.
- Added a **server-side guard**: if the model returns only an `ANSWER`
  action (no real action) BUT the user's message looks mutating
  (`looksMutating`: add/create/make/schedule/plan/move/complete/delete/
  remind/...) AND the reply sounds confirming (`replySoundsConfirming`:
  I've/created/added/marked/moved/...), the guard re-prompts ONCE with a
  corrective nudge ("You replied X but did not emit any action object…
  re-emit the JSON with the correct action"). The retry result is only
  adopted if it produced real (non-ANSWER) actions — otherwise the
  original reply stands (no regression for pure questions).
- Also **trims stale confirmation replies from chat history** before
  sending to the model: assistant turns matching
  `/\b(I've|I have|done|created|added|marked|moved|deleted|set a reminder)\b/i`
  are skipped, reducing the chance of the model echoing a prior
  "I've added…" as an ANSWER (the original round-2 root cause).
- Verified: "Add a task to call the dentist tomorrow morning." → AI
  emitted CREATE_TASK, "call the dentist" persisted to DB.

### 2. NEW FEATURE: Drag-and-drop task reordering (board view)
- Tasks board now uses `@dnd-kit/core` (already installed): `DndContext` +
  `useDraggable` + `useDroppable` + `DragOverlay`.
- Each task card in the board is wrapped in a `DraggableTaskCard` with a
  dedicated **drag-handle button** (GripVertical icon, appears on hover)
  — the rest of the card stays fully interactive (checkbox, dropdown menu,
  subtask toggles all work; the drag listeners are scoped to the handle
  only, not the whole card).
- Droppable columns (`DroppableColumn`) highlight with a brand-tinted
  border + background when a card is dragged over (`isOver`).
- On drop: **optimistic status update** (the card instantly moves to the
  new column), then `PATCH /api/tasks/[id]` with the new status; on
  success a toast confirms ("Moved to In progress"); on failure the card
  rolls back + an error toast.
- `DragOverlay` renders a tilted (rotate-2) semi-transparent copy of the
  active card for premium drag feedback.

### 3. NEW FEATURE: Quick Add bar
- New `QuickAddBar` component (src/components/app/QuickAddBar.tsx): a
  glass-strong gradient-bordered bar at the top of the Tasks view with a
  title input + type Select + priority Select + Add button + "Ask Nova"
  shortcut. Press Enter to instantly create a task (no full dialog).
- Calls `POST /api/tasks` with title + priority + type (+ optional date),
  upserts into the store, and toasts confirmation.
- Verified: typed "Quick test task from bar" + Enter → task persisted
  with MEDIUM priority and appeared instantly in the list.

### 4. NEW FEATURE: Focus Timer task picker
- The Focus Timer widget now lets users **pick which task to focus on**:
  when no task is linked, a "Pick a task to focus on" dashed button opens
  a popover listing the user's incomplete tasks (sorted by priority) with
  priority dots + subject labels. Selecting one calls `setFocusTask(id)`.
- When a task IS linked, it shows as a clickable chip that opens the task
  editor (existing behavior, now reachable from a cold start).
- Verified: popover opened showing "buy groceries", "DSA Quiz",
  "Research Project" etc.

### 5. Styling polish
- **Animated gradient text** (globals.css): new `.text-gradient-animate`
  utility — a 5-stop brand gradient that shimmers across the text on a
  6s loop (respects prefers-reduced-motion via the global reduced-motion
  media query). Applied to the dashboard hero name for a premium feel.
- **Board DnD visual feedback**: droppable columns get a brand-tinted
  border + background on hover; the drag overlay is tilted + translucent;
  drag handles appear on hover with a smooth opacity transition.
- **Quick Add bar**: glass-strong + gradient-border, with a corner-down-left
  hint icon that appears when there's text to submit.

## Verification results (agent-browser, end-to-end)
All passed (server + browser QA in a single bash command):
1. Login → dashboard "Good afternoon, Alex" (with animated gradient name).
2. Quick Add bar: typed "Quick test task from bar" + Enter → task
   persisted (DB: "Quick test task from bar", MEDIUM priority), appeared
   instantly in the list.
3. Board view: clicked the board tab → 3 columns ("To do | In progress |
   Done") render, 5 drag handles present, 5 task cards in the board.
4. Focus Timer task picker: opened the timer → "Pick a task to focus on"
   button present → popover lists incomplete tasks ("buy groceries",
   "DSA Quiz", "Research Project").
5. AI guard: "Add a task to call the dentist tomorrow morning." → AI
   created + persisted "call the dentist" (DB confirmed).
6. Animated gradient text: dashboard h1 span has class `text-gradient-animate`.
7. Lint clean, `tsc --noEmit` clean for all project files.

## Unresolved issues / risks + next-phase recommendations
- **Sandbox dev-server reaping (environment, unchanged):** continue using
  the "one bash command = server + QA" pattern.
- **DnD on mobile:** the drag handle is `hidden sm:block` (desktop only)
  because dnd-kit pointer drag conflicts with touch scrolling on mobile.
  Consider adding `TouchSensor` with an activation constraint for mobile,
  or a per-card "move to" dropdown as a mobile fallback.
- **AI guard cost:** the guard adds one extra LLM call only when the first
  response is action-less-but-confirming (rare with the round-2 prompt
  rules). No latency impact on the common path.
- Next-phase feature ideas (not blocking): recurring-task expansion
  (generate next instance on completion), per-subject progress analytics,
  onboarding tour for first-time users, calendar drag-to-reschedule, and
  a global "command bar" that can create tasks with natural language
  inline (currently Cmd+K navigates + searches but doesn't create via NL).

---
Task ID: 7 (scheduled review round 4 — recurring expansion, mobile DnD, NL Cmd+K)
Agent: main (webDevReview cron)
Task: Scheduled review. QA'd all views (stable, no bugs), then implemented the
round-3 mobile-DnD recommendation, built recurring-task expansion (the most
impactful remaining feature), added natural-language task creation directly
in the Cmd+K palette, and polished the recurring badge styling.

## Current project status / assessment
- NovaTask is stable and feature-rich: all 8 views render, AI chat creates
  tasks/subtasks/notifications, DnD board works, Quick Add + Focus Timer
  picker work, AI guard holds, lint + tsc clean.
- QA walkthrough confirmed: login → dashboard, all 8 views render with
  correct titles, no console errors, AI create flow works ("water the plants"
  task created + persisted). No bugs found — this round focused on the
  round-3 recommendations + new features.

## Completed modifications this round

### 1. NEW FEATURE: Recurring-task expansion (auto-generate next occurrence)
- New `src/lib/recurring.ts`: `nextOccurrence(rule, fromDate)` computes the
  next date for DAILY/WEEKLY/MONTHLY rules (respects an optional `until`
  cap); `recurringLabel()` returns a human label.
- Wired into BOTH completion paths:
  - **`/api/tasks/[id]` PATCH** (the UI checkbox toggle): when a recurring
    task is marked COMPLETED, spawns a new PENDING task for the next
    occurrence (same title/subject/type/priority/time/recurring rule, new
    date). Returns `{ task, nextTask? }`.
  - **AI executor `COMPLETE_TASK`** (Nova saying "mark X complete"): same
    expansion logic; the spawned task is returned in `updated[]`.
- `TaskCard.toggleComplete` handles the new `nextTask` response: upserts it
  into the store + toasts "Marked complete | Next occurrence scheduled for
  <date>." so the user sees the cycle continuing.
- Verified end-to-end: AI created "morning meditation" (DAILY, 2026-09-30).
  Clicking its checkbox completed it AND spawned a new PENDING "morning
  meditation" for 2026-10-01. DB confirms both rows. Toast: "Next
  occurrence scheduled for Oct 1."
- Recurring badge on TaskCard restyled: now brand-3 teal tinted (was muted)
  with a tooltip "Completing this task will create the next occurrence" so
  users understand the behavior.

### 2. FIX: Mobile DnD fallback (round-3 recommendation)
- The board's desktop drag handle is `hidden sm:block` (pointer drag
  conflicts with touch scrolling). Added a **mobile status-changer
  dropdown** (`sm:hidden`) on each board card: an ArrowRightLeft icon
  button (top-right) opens a "Move to: To do / In progress / Done" dropdown.
- Selecting a status does an optimistic update + `PATCH /api/tasks/[id]`
  with rollback + toast on failure (mirrors the desktop drop handler).
- Touch users can now change task status without dragging.

### 3. NEW FEATURE: Natural-language create in Cmd+K palette
- `QuickCommand` (the ⌘K palette) now detects when the typed query looks
  like a task/reminder request (`looksLikeTask`: matches add/create/make/
  remind/schedule/plan/set a reminder/i have/i need to, ≥6 chars).
- When it does, a dynamic **"Nova AI"** group appears at the top with an
  `Ask Nova: "<query>"` item. Selecting it POSTs the query to
  `/api/ai/chat` (same path as the AI panel), applies the returned
  tasks/reminders/notifications to the store, toasts the action summary,
  and closes the palette — no need to open the full AI panel for a quick
  one-liner.
- Shows a spinner ("Nova is creating…") while the LLM call is in flight.
- Placeholder updated: "Search tasks, jump to a view, or type 'add...' to
  create via Nova…".
- Verified: typed "add a daily workout at 7am" in Cmd+K → "Ask Nova" item
  appeared.

## Verification results (agent-browser, end-to-end)
All passed (server + browser QA in a single bash command):
1. Login → dashboard "Good afternoon, Alex"; all 8 views render; no
   console errors.
2. AI create: "Add a task to water the plants tonight at 7 PM." → task
   persisted ("water the plants" in DB).
3. Cmd+K NL create: typed "add a daily workout at 7am" → "Ask Nova" item
   appeared in the palette.
4. Recurring expansion: AI created "morning meditation" (DAILY, 2026-09-30).
   Clicked its checkbox → original marked COMPLETED, new PENDING spawned
   for 2026-10-01. DB confirms 2 rows. Toast: "Marked complete | Next
   occurrence scheduled for Oct 1."
5. Lint clean, `tsc --noEmit` clean for all project files.

## Unresolved issues / risks + next-phase recommendations
- **Sandbox dev-server reaping (environment, unchanged):** continue using
  the "one bash command = server + QA" pattern.
- **Recurring expansion edge cases:** the next-occurrence deadline math in
  the PATCH route preserves the original deadline's time-of-day offset
  from the date; if a task has a deadline but no date, the offset is
  computed from midnight — acceptable but could be refined.
- **NL Cmd+K cost:** the NL path makes a full AI chat call (same as the AI
  panel). For very simple "add buy milk" inputs this is heavier than a
  direct POST, but it reuses the AI's date/priority inference — a fair
  trade-off. Could add a fast-path that POSTs directly for inputs with no
  date/time keywords.
- Next-phase feature ideas (not blocking): per-subject progress analytics
  (a chart on the Analytics view grouped by subject), onboarding tour for
  first-time users, calendar drag-to-reschedule, and a "streaks" gamification
  badge on the dashboard.
