# Life Builder — Product Requirements Document

> Version: 0.1 (MVP)
> Last updated: 2026-04-08
> Status: Draft

---

## 1. Overview

### 1.1 What is Life Builder?

Life Builder is a time planning web app that helps users design their day with intention. Unlike typical calendar or to-do apps, Life Builder focuses on **how you spend your time across different life horizons** — from this week's errands to lifetime dreams.

Users set up a weekly routine of fixed tasks (school, work, exercise, sleep), and the app automatically fills the remaining hours with time blocks for each life horizon. It then recommends what to work on right now.

### 1.2 Core Value Proposition

- **See your day as a whole** — A single circular chart shows how today's hours are divided
- **Think in time horizons** — Separate "this week" tasks from "10-year" goals
- **Get smart recommendations** — The app tells you what to do next based on the current time block
- **Auto-schedule short-term tasks** — Weekly tasks with deadlines are distributed automatically to ensure on-time completion
- **Stay flexible** — Override any single day without breaking your weekly routine

### 1.3 Target User

- Phase 1 (MVP): Personal use by the creator — validate the concept
- Phase 2: Public release after proven value

---

## 2. Core Concepts

### 2.1 Time Horizons

Six categories that represent different planning scopes:

| # | Horizon | Color | Example goals |
|---|---------|-------|---------------|
| 1 | This Week | `blue-500` | Finish homework, buy groceries |
| 2 | This Month | `cyan-500` | Complete online course module |
| 3 | This Year | `green-500` | Pass certification exam |
| 4 | 3 Years | `amber-500` | Build a portfolio |
| 5 | 10 Years | `orange-500` | Become an expert in my field |
| 6 | Lifetime | `purple-500` | Write a book |

Colors use Tailwind CSS color tokens.

### 2.2 Weekly Routine (Base Template)

A one-time setup that defines the user's recurring weekly schedule. Each day of the week has its own list of fixed tasks.

```
Monday:    Sleep 00-07, Exercise 07-08, School 09-15
Tuesday:   Sleep 00-07, Exercise 07-08, School 09-15, Part-time job 18-22
Wednesday: Sleep 00-07, Exercise 07-08, School 09-12
...
Sunday:    Sleep 00-08
```

This template repeats every week automatically.

### 2.3 Daily Override

When a specific day differs from the routine, the user modifies **only that day**. The base weekly template remains untouched.

Example: Thursday April 10th — school is cancelled, add hospital visit 14-16.
- The override applies only to April 10th
- Next Thursday reverts to the normal routine

### 2.4 Daily Timetable (Auto-generated)

Every day, the app generates a full timetable by:

1. Loading the weekly routine for that day of week
2. Applying any daily overrides
3. Calculating remaining free time
4. Filling free time with horizon blocks based on the user's allocation percentages

```
Example: Wednesday (13h free after fixed tasks)

00:00-07:00  Sleep (fixed)
07:00-08:00  Exercise (fixed)

Gap 1: 08:00-09:00 (60m free)
08:00-08:18  ██ This Week (30%)
08:18-08:30  ██ This Month (20%)
08:30-08:42  ██ This Year (20%)
08:42-09:00  ██ 3 Years + 10 Years + Lifetime (redistributed, <10m blocks merged)

09:00-12:00  School (fixed)

Gap 2: 12:00-24:00 (720m free)
12:00-15:36  ██ This Week (30%)     → 216m
15:36-18:00  ██ This Month (20%)    → 144m
18:00-20:24  ██ This Year (20%)     → 144m
20:24-22:12  ██ 3 Years (15%)       → 108m
22:12-23:24  ██ 10 Years (10%)      → 72m
23:24-24:00  ██ Lifetime (5%)       → 36m

Total: all free time (780m) is allocated to horizons. No unassigned buffer.
```

### 2.5 Goals

Each time horizon can have one or more goals. Tasks belong to goals, giving them context and purpose.

```
Horizon: "3 Years"
└── Goal: "Learn Japanese"
    ├── Task: "Study JLPT N3 vocabulary"
    └── Task: "Watch Japanese drama without subtitles"
```

### 2.6 Auto-Scheduling (This Week & This Month)

Tasks in the **"This Week"** and **"This Month"** horizons support auto-scheduling. When a task has both `estimatedMinutes` and `dueDate`, the app automatically distributes work sessions across available horizon blocks to ensure the task is completed before the deadline.

```
Example:
  Task: "Finish homework" (This Week)
  Estimated: 3 hours
  Due: Friday

  Monday:    This Week block has 2h → assign 1.5h to this task
  Wednesday: This Week block has 1.5h → assign 1h to this task
  Thursday:  This Week block has 2h → assign 30m to this task (done!)
```

**Rules:**
- Tasks are distributed evenly across available days before the deadline
- If deadline is tight, more time is front-loaded to earlier days
- Tasks without `estimatedMinutes` or `dueDate` remain in the recommendation pool (not auto-scheduled)
- User can drag/reorder auto-scheduled tasks in the tomorrow preview
- Long-term horizons (This Year, 3 Years, 10 Years, Lifetime) use recommendation only, not auto-scheduling — these are open-ended by nature

### 2.7 Task Recommendation

For horizon blocks not filled by auto-scheduled tasks, the app recommends:
- **1 primary task** — the most relevant thing to do right now
- **2-3 alternatives** — other options if the primary doesn't fit

---

## 3. User Flows

### 3.1 Onboarding (First Launch)

```
Step 1: Welcome
  "Welcome to Life Builder"
  "Design your day with intention."
  → [Get Started]

Step 2: Set Weekly Routine
  "What does your typical week look like?"
  "Add your regular commitments for each day."

  [Mon] [Tue] [Wed] [Thu] [Fri] [Sat] [Sun]  ← day tabs

  + Add fixed task
  ┌─────────────────────────────┐
  │ Title:     [School        ] │
  │ Start:     [09:00         ] │
  │ End:       [15:00         ] │
  │ Repeats:   [Mon, Wed, Fri ] │
  └─────────────────────────────┘

  → [Next]

Step 3: Set Horizon Allocation
  "How would you like to spend your free time?"
  "The app will suggest a split. Drag to adjust."

  [Circular chart preview with draggable segments]

  This Week    ████████░░  30%
  This Month   ██████░░░░  20%
  This Year    ██████░░░░  20%
  3 Years      █████░░░░░  15%
  10 Years     ███░░░░░░░  10%
  Lifetime     ██░░░░░░░░   5%

  → [Done]
```

### 3.2 Daily Main Screen

```
┌──────────────────────────────────┐
│  ≡       LIFE BUILDER       ⚙️   │
│           Wed, Apr 9             │
│                                  │
│        ┌──────────────┐         │
│       ╱    Circular    ╲        │
│      │    SVG Chart     │       │
│      │                  │       │
│      │  Current block:  │       │
│      │  "This Year"     │       │
│       ╲                ╱        │
│        └──────────────┘         │
│                                  │
│  ┌────────────────────────────┐  │
│  │ Now: Study JLPT N3 vocab  │  │
│  │      Goal: Learn Japanese │  │
│  └────────────────────────────┘  │
│                                  │
│  Also available:                 │
│  · Watch JP drama (no subs)     │
│  · Review kanji flashcards      │
│                                  │
│ ── Tomorrow ──────────── Edit → │
│  07-08 Exercise                  │
│  09-15 School                    │
│  15-17 This Year ██              │
│  ...                             │
│                                  │
│ ─── bottom sheet (drag up) ───  │
│  Tasks    Routine    Horizons   │
└──────────────────────────────────┘
```

**Key elements:**
- Circular chart dominates the screen (60% height)
- Current time horizon highlighted with label
- Primary recommendation card with goal context
- Tomorrow's timetable preview with "Edit" shortcut
- Bottom sheet for accessing tasks, routine settings, horizon config

### 3.3 Tomorrow Preview & Edit

```
┌──────────────────────────────────┐
│  ←    Tomorrow (Thu, Apr 10)     │
│                                  │
│  ┌──────────────────────────┐   │
│  │ Mini circular chart       │   │
│  │ (tomorrow's allocation)   │   │
│  └──────────────────────────┘   │
│                                  │
│  00:00-07:00  Sleep          🔒  │
│  07:00-08:00  Exercise       🔒  │
│  08:00-09:00  This Week      ██  │
│  09:00-15:00  School         🔒  │
│  15:00-16:12  This Month     ██  │
│  16:12-17:24  This Year      ██  │
│  ...                             │
│                                  │
│  [+ Add one-time task]           │
│  [Reset to routine]              │
│                                  │
│  ── Changes from routine ──     │
│  (none)                          │
└──────────────────────────────────┘
```

**Interactions:**
- Tap a fixed task → option to remove it for this day only
- Tap "+ Add one-time task" → add a task for this day only
- Horizon blocks auto-recalculate after any change
- "Reset to routine" reverts all overrides for that day
- Lock icon (🔒) on routine tasks; no icon on overridden items

### 3.4 Add Task

```
┌──────────────────────────────────┐
│  ✕         Add Task        Save  │
│                                  │
│  Title                           │
│  ┌────────────────────────────┐  │
│  │ Study JLPT N3 vocabulary  │  │
│  └────────────────────────────┘  │
│                                  │
│  Horizon                         │
│  [This Week] [This Month]        │
│  [This Year] [3 Years]           │
│  [10 Years]  [Lifetime]          │
│                                  │
│  Goal (optional)                 │
│  ┌────────────────────────────┐  │
│  │ Learn Japanese          ▼ │  │
│  └────────────────────────────┘  │
│                                  │
│  ── Optional fields ──────────  │
│  Due date         [None       ]  │
│  Estimated time   [None       ]  │
│  Energy level     [None       ]  │
│  Repeat           [None       ]  │
│  Location         [None       ]  │
│                                  │
└──────────────────────────────────┘
```

**Design principles:**
- Only "Title" and "Horizon" are required
- When "This Week" or "This Month" is selected, prompt for estimated time and due date
  (shown inline, not hidden in optional fields — these enable auto-scheduling)
- Other optional fields collapsed by default, expand on tap
- Horizon selection as colored chip buttons
- Goal dropdown filtered by selected horizon
- Modal overlay with X/Save pattern (Time Timer style)

### 3.5 Add Goal

```
┌──────────────────────────────────┐
│  ✕         Add Goal        Save  │
│                                  │
│  Title                           │
│  ┌────────────────────────────┐  │
│  │ Learn Japanese            │  │
│  └────────────────────────────┘  │
│                                  │
│  Horizon                         │
│  [3 Years]  (colored chip)       │
│                                  │
│  Priority                        │
│  [Low] [Medium] [High]           │
│                                  │
└──────────────────────────────────┘
```

### 3.6 Edit Routine (Bottom Sheet → "Routine" tab)

```
┌──────────────────────────────────┐
│        Weekly Routine             │
│                                  │
│  [Mon] [Tue] [Wed] [Thu] [Fri]  │
│  [Sat] [Sun]                     │
│                                  │
│  Monday:                         │
│  ┌────────────────────────────┐  │
│  │ ≡  Sleep      00:00-07:00 │  │
│  │ ≡  Exercise   07:00-08:00 │  │
│  │ ≡  School     09:00-15:00 │  │
│  └────────────────────────────┘  │
│                                  │
│  [+ Add fixed task]              │
│                                  │
└──────────────────────────────────┘
```

**Interactions:**
- Tap a day tab to see that day's fixed tasks
- Tap a task to edit (title, time, color)
- Swipe left to delete
- Drag handle (≡) to reorder (visual only, sorted by startTime in engine)
- Same component reused in onboarding Step 2

### 3.7 Task List (Bottom Sheet → "Tasks" tab)

```
┌──────────────────────────────────┐
│  Tasks                     [+]   │
│                                  │
│  Filter: [All] [This Week] ...   │
│                                  │
│  ── This Week ──────────────    │
│  ☐ Finish homework    Due: Fri  │
│  ☐ Buy groceries               │
│                                  │
│  ── 3 Years → Learn Japanese ── │
│  ◉ Study JLPT N3 vocab  60m    │
│  ☐ Watch JP drama              │
│                                  │
│  ── Lifetime ─────────────────  │
│  ☐ Write book outline           │
│                                  │
└──────────────────────────────────┘
```

**Interactions:**
- Grouped by horizon, then by goal within each horizon
- Tap checkbox to mark complete → triggers confetti/micro-animation
- Tap task to edit
- Swipe left to delete
- Filter chips at top to show one horizon only
- [+] button opens Add Task modal
- ◉ = in_progress, ☐ = pending

### 3.8 Task Completion (on Recommendation Card)

```
┌────────────────────────────────┐
│ Now: Study JLPT N3 vocab       │
│ Goal: Learn Japanese    60m    │
│                                │
│ [✓ Done]  [◐ Partial]  [→ Skip]│
└────────────────────────────────┘
```

**Actions:**
- **Done:** marks task as completed, shows next recommendation
- **Partial:** opens mini dialog "How many minutes did you spend?" → updates `completedMinutes`, keeps task in pool
- **Skip:** skips this task for now, shows next alternative as primary

---

## 4. Data Model

### 4.1 Entity Diagram

```
TimeHorizon (constant, not DB)
 ↑ referenced by key

HorizonAllocation ──→ TimeHorizon.key
WeeklyRoutineTask
DailyOverride ──→ WeeklyRoutineTask (for "remove" action)
DailyTimetable (cached, auto-generated)
Goal ──→ TimeHorizon.key
Task ──→ TimeHorizon.key, Goal

Note: No User entity in MVP. All data is single-user, stored locally.
```

### 4.2 Schema

```
Note: No User table in MVP (single user, no auth). User entity added in v0.2 with auth.

TimeHorizon (TypeScript constant, NOT a database table)
  Defined as a static array in code:
  [
    { key: "this-week",   name: "This Week",   color: "blue-500",   order: 1 },
    { key: "this-month",  name: "This Month",  color: "cyan-500",   order: 2 },
    { key: "this-year",   name: "This Year",   color: "green-500",  order: 3 },
    { key: "3-years",     name: "3 Years",     color: "amber-500",  order: 4 },
    { key: "10-years",    name: "10 Years",    color: "orange-500", order: 5 },
    { key: "lifetime",    name: "Lifetime",    color: "purple-500", order: 6 },
  ]

HorizonAllocation
├── id: string (uuid)
├── horizonKey: string ("this-week" | "this-month" | ... | "lifetime")
├── percentage: integer (0-100, all must sum to 100)
├── createdAt: timestamp
└── updatedAt: timestamp

WeeklyRoutineTask
├── id: string (uuid)
├── title: string ("School", "Exercise", "Sleep", etc.)
├── dayOfWeek: integer (0=Sun, 1=Mon, ... 6=Sat)
├── startTime: string ("09:00")
├── endTime: string ("15:00")
├── color?: string (Tailwind token, e.g. "gray-400" — for chart readability)
├── createdAt: timestamp
└── updatedAt: timestamp
  Note: A task repeating on Mon/Wed/Fri creates 3 records (one per day).
  Note: If startTime > endTime (e.g. 23:00-02:00), the task spans midnight.
        Split into two blocks: 23:00-24:00 on current day, 00:00-02:00 on next day.

DailyOverride
├── id: string (uuid)
├── date: string ("2026-04-10")
├── action: string ("add" | "remove")
├── routineTaskId?: string → WeeklyRoutineTask (for "remove")
├── title?: string (for "add")
├── startTime?: string (for "add")
├── endTime?: string (for "add")
├── createdAt: timestamp
└── updatedAt: timestamp

DailyTimetable (auto-generated, cached)
├── id: string (uuid)
├── date: string ("2026-04-09")
├── blocks: json [
│     {
│       start: "00:00",
│       end: "07:00",
│       type: "fixed",
│       title: "Sleep",
│       sourceId: "<routineTaskId>"
│     },
│     {
│       start: "08:00",
│       end: "09:48",
│       type: "horizon",
│       horizonId: "<id>",
│       horizonName: "This Week",
│       scheduledTasks: [
│         { taskId: "<id>", title: "Finish homework", minutes: 60 },
│         { taskId: "<id>", title: "Buy groceries", minutes: 30 }
│       ],
│       unscheduledMinutes: 18  ← remaining time for recommendations
│     },
│     ...
│   ]
├── isConfirmed: boolean
├── generatedAt: timestamp
└── modifiedAt: timestamp

Goal
├── id: string (uuid)
├── horizonKey: string → TimeHorizon.key
├── title: string
├── priority: string ("low" | "medium" | "high")
├── createdAt: timestamp
└── updatedAt: timestamp

Task
├── id: string (uuid)
├── horizonKey: string → TimeHorizon.key
├── goalId?: string → Goal
├── title: string
├── dueDate?: string              ← required for auto-scheduling (This Week / This Month)
├── estimatedMinutes?: integer    ← required for auto-scheduling (This Week / This Month)
├── completedMinutes: integer     ← logged progress so far (default 0)
│     Note: remaining = estimatedMinutes - completedMinutes (computed, not stored)
├── energyLevel?: string ("high" | "medium" | "low")
├── repeatCycle?: string ("daily" | "weekly" | "monthly")
├── location?: string
├── status: string ("pending" | "in_progress" | "completed")
├── createdAt: timestamp
├── completedAt?: timestamp
└── updatedAt: timestamp
  Note: For "This Week" and "This Month" tasks, the app prompts for
  estimatedMinutes and dueDate at creation (recommended, not forced).
  Tasks with both fields are auto-scheduled into daily timetables.
  Tasks without them fall back to the recommendation engine.
```

---

## 5. Timetable Generation Algorithm

### 5.1 Daily Timetable Builder

```
Input:
  - date (e.g. 2026-04-09, Wednesday)
  - WeeklyRoutineTask[] for dayOfWeek = 3 (Wed)
  - DailyOverride[] for date = 2026-04-09
  - HorizonAllocation[] (percentages)
  - Task[] with auto-schedule data (estimatedMinutes + dueDate)

Steps:

1. LOAD routine tasks for this day of week
2. APPLY overrides:
   - For each "remove" override: exclude that routine task
   - For each "add" override: insert as additional fixed block
3. SORT all fixed blocks by startTime
4. VALIDATE no overlapping fixed blocks (warn user if found)
5. CALCULATE total free minutes:
   freeMinutes = 1440 - sum(all fixed block durations)
6. IDENTIFY free time gaps between fixed blocks
7. FILL free gaps with horizon blocks:
   For each gap (sorted chronologically):
     a. Distribute proportionally: each horizon gets gapDuration * (percentage / 100)
     b. Check minimum: if any horizon block < 10 minutes, mark it as "skipped"
     c. Redistribute skipped time: divide skipped minutes among non-skipped horizons
        proportionally to their original percentages (re-normalize to 100%)
     d. Place horizon blocks in order (horizon.order 1→6)
     e. Each gap is independent — no carry-over between gaps
8. AUTO-SCHEDULE tasks into horizon blocks (This Week & This Month):
   a. Collect tasks where: horizon is "This Week" or "This Month"
      AND estimatedMinutes > 0 AND dueDate >= today AND status != "completed"
   b. Sort by dueDate ascending (tightest deadline first)
   c. For each task:
      - daysUntilDue = dueDate - today
      - IF daysUntilDue == 0: dailyAllocation = all remaining minutes (front-load today)
      - ELSE: dailyAllocation = ceil(remainingMinutes / daysUntilDue)
      - Assign dailyAllocation minutes to this day's matching horizon block
      - Record as a scheduled sub-block within the horizon block
   d. Remaining horizon block time → filled by recommendation engine
9. OUTPUT: ordered list of blocks (fixed + horizon with scheduled tasks)

Edge cases:
  - If total fixed tasks >= 24h: show warning, no horizon blocks
  - If a horizon has 0% allocation: skip it
  - Minimum horizon block: 10 minutes (skip if less)
  - Midnight-spanning fixed tasks: split at 00:00
  - If auto-scheduled tasks exceed horizon block capacity:
    show warning "Not enough time for all tasks by deadline"
  - If dueDate is today: front-load all remaining minutes
```

### 5.2 Example

```
Wednesday routine:
  Sleep       00:00-07:00 (420m)
  Exercise    07:00-08:00 (60m)
  School      09:00-12:00 (180m)
  Total fixed: 660m → Free: 780m (13h)

Free gaps:
  08:00-09:00 (60m)
  12:00-24:00 (720m)

Allocation: This Week 30%, This Month 20%, This Year 20%,
            3 Years 15%, 10 Years 10%, Lifetime 5%

Gap 1 (08:00-09:00, 60m):
  Initial:  This Week 18m, This Month 12m, This Year 12m,
            3 Years 9m (skip), 10 Years 6m (skip), Lifetime 3m (skip)
  Skipped total: 18m
  Redistribute 18m among surviving horizons (30+20+20=70%):
    This Week:  18 + 18*(30/70) = 18+7.7 ≈ 26m  → 08:00-08:26
    This Month: 12 + 18*(20/70) = 12+5.1 ≈ 17m  → 08:26-08:43
    This Year:  12 + 18*(20/70) = 12+5.1 ≈ 17m  → 08:43-09:00

Gap 2 (12:00-24:00, 720m):
  This Week:  216m → 12:00-15:36
  This Month: 144m → 15:36-18:00
  This Year:  144m → 18:00-20:24
  3 Years:    108m → 20:24-22:12
  10 Years:    72m → 22:12-23:24
  Lifetime:    36m → 23:24-24:00
```

---

## 6. Recommendation Engine (Rule-based v1)

### 6.1 Algorithm

```
Input:
  - currentTime
  - today's DailyTimetable
  - Task[] with status != "completed"

Steps:

1. FIND current block from timetable:
   block = timetable.blocks.find(b => currentTime >= b.start && currentTime < b.end)

2. IF block.type == "fixed":
   Show: "Current: {block.title}" (no task recommendation)
   RETURN

3. IF block.type == "horizon":

   a. CHECK for auto-scheduled tasks first (This Week / This Month):
      IF block.scheduledTasks is not empty:
        - Show scheduled tasks in order as primary recommendations
        - "Now: {scheduledTask[0].title} ({minutes}m planned)"
        - Remaining scheduled tasks shown as upcoming
        - If unscheduledMinutes > 0, also show recommendation from pool

   b. FOR unscheduled time OR long-term horizons (This Year+):
      - FILTER tasks where horizonId == block.horizonId
        AND status != "completed" AND not already auto-scheduled today
      - SORT by:
        ① dueDate ascending (nearest deadline first; null = last)
        ② status: "in_progress" before "pending"
        ③ goal.priority: "high" > "medium" > "low"
        ④ createdAt ascending (older = longer procrastinated)
      - primary = sorted[0]
      - alternatives = sorted[1..3]

   c. DISPLAY:
      "Now: {primary.title}"
      "Goal: {primary.goal.title}" (if linked)
      "Also available: {alternatives}"
```

### 6.2 Edge Cases

- **No tasks for current horizon:** Show "No tasks yet. Add one?" with quick-add button
- **All tasks completed:** Show "All done for {horizon}! Relax or pick another horizon."
- **Between blocks (buffer time):** Show the next upcoming horizon block and its top task
- **Auto-scheduled task takes longer than planned:** User can mark partial progress; remaining time carries to next available block
- **Deadline at risk:** If remaining minutes > available horizon blocks before due date, show warning badge on task

---

## 7. Screen Design

### 7.1 Visual Style

Inspired by the Time Timer app:

- **Minimal layout** — one primary element per screen
- **Generous whitespace** — Tailwind spacing scale (p-6, gap-4, etc.)
- **Single accent color strategy** — each horizon has one Tailwind color; UI chrome is neutral gray
- **Neumorphism-lite** — subtle `shadow-sm` + `bg-white` on cards and buttons
- **Smooth transitions** — Framer Motion spring animations for all screen changes
- **Large touch targets** — minimum 44px tap areas

### 7.2 Transitions

| From → To | Animation |
|-----------|-----------|
| Main → Horizon detail | Segment expands, content fades in |
| Main → Tomorrow preview | Slide left with spring easing |
| Any → Add Task modal | Fade overlay + slide up from bottom |
| Bottom sheet | Spring-based drag with snap points |
| Time block change | Color cross-fade on circular chart |
| Horizon chip selection | Scale bounce (0.95 → 1.0) |

### 7.3 Circular Chart Specification

```
- SVG-based, custom implementation (no chart library)
- 24-hour clock face (not 60-minute like Time Timer)
- Fixed tasks: neutral gray segments
- Horizon blocks: colored segments (Tailwind tokens)
- Current time: animated needle/hand rotating in real-time
- Current block: slightly elevated (filter: drop-shadow)
- Tap a segment → navigates to that horizon's task list
- Small segments (<5%): tap target extended via invisible hit area
- Center: current time display + current horizon label
```

### 7.4 Responsive Strategy

- **Mobile-first** (375px baseline)
- Circular chart scales with viewport width (max 400px diameter)
- Bottom sheet pattern for mobile; sidebar for desktop (future)

---

## 8. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Framework | Next.js 15 (App Router) | Full-stack, Vercel-native |
| Styling | Tailwind CSS | Utility-first, design token alignment |
| UI Components | shadcn/ui | Accessible, Tailwind-native |
| Animation | Framer Motion | Spring physics, layout animations |
| Circular Chart | Custom SVG | Full control over Time Timer-like visuals |
| Local Storage | IndexedDB via Dexie.js | Offline-first, structured data |
| Cloud DB | Neon Postgres **(v0.2)** | Serverless, Vercel-integrated |
| ORM | Drizzle ORM **(v0.2)** | Type-safe, lightweight |
| Deployment | Vercel | Zero-config, preview deployments |
| Language | TypeScript | End-to-end type safety |

### 8.1 Data Layer Architecture

To ensure smooth migration from local-only (MVP) to cloud sync (v0.2):

```
App Code
  ↓
DataService (abstract interface)
  ├── LocalAdapter (Dexie.js / IndexedDB)  ← MVP
  └── CloudAdapter (Drizzle / Neon)        ← v0.2
      + LocalAdapter as offline cache
```

All data access goes through `DataService`. MVP implements only `LocalAdapter`. When cloud sync is added, `CloudAdapter` wraps the API while `LocalAdapter` serves as offline cache. This avoids a full rewrite at v0.2.

### 8.2 IndexedDB Schema Versioning

Dexie.js requires explicit schema versioning for migrations. From day one:

```typescript
db.version(1).stores({
  horizonAllocations: '++id, horizonKey',
  weeklyRoutineTasks: '++id, dayOfWeek',
  dailyOverrides: '++id, date',
  dailyTimetables: '++id, date',
  goals: '++id, horizonKey',
  tasks: '++id, horizonKey, goalId, status',
});
```

When adding fields in future versions, increment the version number and add upgrade functions.

---

## 9. MVP Scope

### 9.1 In Scope (v0.1)

- [ ] Onboarding: weekly routine setup + horizon allocation
- [ ] Main screen: circular SVG chart with real-time current block indicator
- [ ] Daily timetable auto-generation from routine + allocations
- [ ] Tomorrow timetable preview and edit (daily override)
- [ ] Goal CRUD (title, horizon, priority)
- [ ] Task CRUD (title + horizon required, optional fields available)
- [ ] Auto-scheduling for This Week / This Month tasks (estimatedMinutes + dueDate)
- [ ] Rule-based task recommendation (1 primary + 2-3 alternatives)
- [ ] Visual transition on time block change
- [ ] Local storage (IndexedDB via Dexie.js)
- [ ] All UI text in simple English
- [ ] Framer Motion transitions throughout
- [ ] Mobile-first responsive design

### 9.2 Out of Scope (Future)

| Version | Features |
|---------|----------|
| v0.2 | Authentication + Cloud sync (Neon Postgres) + Push notifications + PWA |
| v0.3 | Weekly view + Per-day allocation customization |
| v1.0 | Statistics dashboard (daily/weekly/monthly) + AI recommendation engine |
| Future | React Native iOS app + WidgetKit widget |

---

## 10. Constraints & Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Chart library | Custom SVG (no D3/Recharts) | Full visual control for Time Timer aesthetic |
| Auth in MVP | None | Single user, local storage only |
| Task input | Minimal required fields | Reduce friction; expand fields later |
| Recommendation | Rule-based first | Validate logic before investing in AI |
| Data layer | Abstract interface pattern | Prevent rewrite when adding cloud sync |
| Day indexing | 0-indexed (0=Sun ... 6=Sat) | Consistent across all entities |
| Overnight tasks | Split at midnight | Avoid complex cross-day logic |
| Minimum horizon block | 10 minutes | Blocks shorter than 10m are impractical |
| Allocation unit | Percentage (must sum to 100) | Simpler than absolute minutes; auto-adapts to varying free time |

---

## 11. Open Questions

1. **Should horizon allocation vary by day of week?** Currently one global allocation. Deferred to v0.3.
2. ~~How to handle task completion mid-block?~~ Resolved: Done/Partial/Skip buttons on recommendation card (Section 3.8).
3. **Should the app suggest routine changes over time?** e.g. "You've been skipping 'Lifetime' blocks — adjust allocation?"
4. **Date navigation beyond today/tomorrow?** MVP supports only today + tomorrow. Full date browsing (swipe between days, view past) deferred to v0.3.

---

## Appendix A: Glossary

| Term | Definition |
|------|-----------|
| Time Horizon | A planning scope category (e.g. "This Year", "10 Years") |
| Weekly Routine | The base template of fixed tasks that repeats every week |
| Daily Override | A one-time change to a specific date's schedule |
| Daily Timetable | The fully resolved schedule for a date (routine + overrides + horizon blocks) |
| Fixed Task | A non-negotiable commitment (school, work, sleep) |
| Horizon Block | An auto-generated time slot allocated to a specific time horizon |
| Goal | A concrete objective within a time horizon |
| Task | An actionable item linked to a goal or horizon |
