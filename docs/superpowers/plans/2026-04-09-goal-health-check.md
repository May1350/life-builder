# Goal Health Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add rule-based goal health detection, review UI for flagged goals, and AI-powered task redesign based on user feedback.

**Architecture:** A pure-function detection engine evaluates goal health from completion data. The main page triggers weekly/monthly review overlays and shows real-time nudge banners. A card-stack review UI collects user responses for flagged goals. A separate `/api/health-review` endpoint sends responses to Gemini for task redesign.

**Tech Stack:** Dexie.js (v4 migration), Zod (schemas), Framer Motion (animations), Gemini API, existing locale system

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/types/index.ts` | Modify | Add review fields to AppSettings |
| `src/lib/db.ts` | Modify | Dexie v4 migration |
| `src/engine/goal-health.ts` | Create | Detection rules engine |
| `src/engine/__tests__/goal-health.test.ts` | Create | Tests for detection engine |
| `src/lib/locale.ts` | Modify | Add healthReview.* strings (en/ko/ja) |
| `src/lib/ai-schemas.ts` | Modify | Add health review request/response schemas |
| `src/lib/ai-prompt.ts` | Modify | Add health review prompt builder |
| `src/app/api/health-review/route.ts` | Create | Health review API endpoint |
| `src/components/review/health-review.tsx` | Create | Review overlay UI (card stack) |
| `src/app/page.tsx` | Modify | Add review trigger + nudge banner |
| `src/components/panel/menu-panel.tsx` | Modify | Add "Goal Review" menu item |

---

### Task 1: Dexie v4 + AppSettings fields

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/lib/db.ts`

- [ ] **Step 1: Add fields to AppSettings interface**

In `src/types/index.ts`, find the `AppSettings` interface and add:

```typescript
export interface AppSettings {
  id?: number;
  onboardingComplete: boolean;
  onboardingStep?: number;
  locale?: string;
  lastWeeklyReview?: string;   // "YYYY-MM-DD"
  lastMonthlyReview?: string;  // "YYYY-MM-DD"
  createdAt: Date;
  updatedAt: Date;
}
```

- [ ] **Step 2: Add Dexie v4**

In `src/lib/db.ts`, add after the version 3 block:

```typescript
this.version(4).stores({
  horizonAllocations: "++id, horizonKey",
  weeklyRoutineTasks: "++id, dayOfWeek",
  dailyOverrides: "++id, date",
  dailyTimetables: "++id, &date",
  goals: "++id, horizonKey, source, parentGoalId",
  tasks: "++id, horizonKey, goalId, status",
  appSettings: "++id",
  userProfiles: "++id",
});
```

- [ ] **Step 3: Verify**

Run: `npx vitest run && npx next build 2>&1 | tail -5`

---

### Task 2: Goal health detection engine + tests

**Files:**
- Create: `src/engine/goal-health.ts`
- Create: `src/engine/__tests__/goal-health.test.ts`

- [ ] **Step 1: Create `src/engine/goal-health.ts`**

```typescript
import type { Goal, Task, HorizonKey } from "@/types";

export type HealthStatus = "healthy" | "stale" | "needs-next" | "struggling";

export interface GoalHealth {
  goalId: string;
  status: HealthStatus;
  reasonKey: string;
  daysSinceActivity: number;
  completionRate: number;
}

const SHORT_HORIZONS: HorizonKey[] = ["this-week", "this-month", "this-year"];

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getLastActivity(tasks: Task[], goalCreatedAt: Date): Date {
  let latest = goalCreatedAt;
  for (const t of tasks) {
    if (t.completedAt && t.completedAt > latest) latest = t.completedAt;
    if (t.updatedAt && t.updatedAt > latest) latest = t.updatedAt;
  }
  return latest;
}

export function detectGoalHealth(
  goals: Goal[],
  tasks: Task[],
  now: Date = new Date(),
): GoalHealth[] {
  const tasksByGoal = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.goalId) continue;
    const gid = String(t.goalId);
    if (!tasksByGoal.has(gid)) tasksByGoal.set(gid, []);
    tasksByGoal.get(gid)!.push(t);
  }

  const results: GoalHealth[] = [];

  for (const goal of goals) {
    const gid = String(goal.id);
    const goalTasks = tasksByGoal.get(gid) ?? [];

    if (goalTasks.length === 0) continue; // new goal with no tasks — skip

    const completed = goalTasks.filter((t) => t.status === "completed");
    const pending = goalTasks.filter((t) => t.status !== "completed");
    const completionRate = completed.length / goalTasks.length;
    const lastActivity = getLastActivity(goalTasks, goal.createdAt);
    const daysSince = daysBetween(lastActivity, now);

    // Rule: needs-next — all tasks done
    if (pending.length === 0 && completed.length > 0) {
      results.push({
        goalId: gid,
        status: "needs-next",
        reasonKey: "healthReview.needsNext.reason",
        daysSinceActivity: daysSince,
        completionRate,
      });
      continue;
    }

    // Rule: stale — no activity in 7+ days
    if (daysSince >= 7) {
      results.push({
        goalId: gid,
        status: "stale",
        reasonKey: "healthReview.stale.reason",
        daysSinceActivity: daysSince,
        completionRate,
      });
      continue;
    }

    // Rule: struggling — started but stuck (short horizons only)
    if (SHORT_HORIZONS.includes(goal.horizonKey)) {
      const startedButStuck = pending.filter(
        (t) => (t.completedMinutes ?? 0) > 0
      );
      const goalAge = daysBetween(goal.createdAt, now);

      if (startedButStuck.length >= 3 || (goalAge >= 14 && completed.length === 0)) {
        results.push({
          goalId: gid,
          status: "struggling",
          reasonKey: "healthReview.struggling.reason",
          daysSinceActivity: daysSince,
          completionRate,
        });
        continue;
      }
    }

    // healthy — not added to results
  }

  return results;
}
```

- [ ] **Step 2: Create test file `src/engine/__tests__/goal-health.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import { detectGoalHealth } from "../goal-health";
import type { Goal, Task } from "@/types";

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: "g1",
  horizonKey: "this-month",
  title: "Test Goal",
  priority: "medium",
  createdAt: new Date("2026-03-01"),
  updatedAt: new Date("2026-03-01"),
  ...overrides,
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  horizonKey: "this-month",
  goalId: "g1",
  title: "Test Task",
  completedMinutes: 0,
  status: "pending",
  createdAt: new Date("2026-03-01"),
  updatedAt: new Date("2026-03-01"),
  ...overrides,
});

const now = new Date("2026-04-09");

describe("detectGoalHealth", () => {
  it("returns empty for goals with no tasks", () => {
    const result = detectGoalHealth([makeGoal()], [], now);
    expect(result).toHaveLength(0);
  });

  it("detects stale: no activity in 7+ days", () => {
    const goal = makeGoal();
    const task = makeTask({ updatedAt: new Date("2026-03-25") });
    const result = detectGoalHealth([goal], [task], now);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("stale");
    expect(result[0].daysSinceActivity).toBeGreaterThanOrEqual(7);
  });

  it("detects needs-next: all tasks completed", () => {
    const goal = makeGoal();
    const task = makeTask({
      status: "completed",
      completedAt: new Date("2026-04-08"),
      updatedAt: new Date("2026-04-08"),
    });
    const result = detectGoalHealth([goal], [task], now);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("needs-next");
  });

  it("detects struggling: 3+ started-but-stuck tasks", () => {
    const goal = makeGoal();
    const tasks = [1, 2, 3].map((i) =>
      makeTask({
        id: `t${i}`,
        completedMinutes: 10,
        status: "pending",
        updatedAt: new Date("2026-04-08"),
      })
    );
    const result = detectGoalHealth([goal], tasks, now);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("struggling");
  });

  it("detects struggling: 14+ days old with 0 completions (short horizon)", () => {
    const goal = makeGoal({ createdAt: new Date("2026-03-01") });
    const task = makeTask({ updatedAt: new Date("2026-04-08") });
    const result = detectGoalHealth([goal], [task], now);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("struggling");
  });

  it("does NOT flag struggling for long-horizon goals", () => {
    const goal = makeGoal({
      horizonKey: "lifetime",
      createdAt: new Date("2026-03-01"),
    });
    const task = makeTask({
      horizonKey: "lifetime",
      updatedAt: new Date("2026-04-08"),
    });
    const result = detectGoalHealth([goal], [task], now);
    expect(result).toHaveLength(0); // healthy
  });

  it("returns healthy (empty) for active goals", () => {
    const goal = makeGoal();
    const task = makeTask({ updatedAt: new Date("2026-04-08") });
    const result = detectGoalHealth([goal], [task], now);
    expect(result).toHaveLength(0);
  });

  it("calculates completionRate correctly", () => {
    const goal = makeGoal();
    const tasks = [
      makeTask({ id: "t1", status: "completed", completedAt: new Date("2026-04-08"), updatedAt: new Date("2026-04-08") }),
      makeTask({ id: "t2", status: "pending", updatedAt: new Date("2026-04-08") }),
    ];
    const result = detectGoalHealth([goal], tasks, now);
    // needs-next won't trigger (1 pending), stale won't (recent activity), struggling won't (< 3 stuck)
    expect(result).toHaveLength(0); // healthy
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run src/engine/__tests__/goal-health.test.ts`
Expected: 7 tests pass

---

### Task 3: Locale strings (en/ko/ja)

**Files:**
- Modify: `src/lib/locale.ts`

- [ ] **Step 1: Add healthReview strings to English dict**

Add after the `"tree.tasks"` line:

```typescript
  // Health Review
  "healthReview.healthy": "{n} goals on track",
  "healthReview.stale.reason": "No progress for {days} days",
  "healthReview.needsNext.reason": "All tasks completed — what's next?",
  "healthReview.struggling.reason": "Progress has been slow",
  "healthReview.response.busy": "Been busy",
  "healthReview.response.unmotivated": "Lost motivation",
  "healthReview.response.changeDirection": "Change direction",
  "healthReview.response.aiSuggest": "AI suggests next",
  "healthReview.response.addManual": "Add manually",
  "healthReview.response.pause": "Pause",
  "healthReview.response.tooLarge": "Tasks too large",
  "healthReview.response.doesntFit": "Doesn't fit anymore",
  "healthReview.response.moreTime": "Need more time",
  "healthReview.nudge": "{n} goal needs attention",
  "healthReview.weekly": "Weekly Review",
  "healthReview.monthly": "Monthly Review",
  "healthReview.complete": "Review complete",
  "healthReview.menuItem": "Goal Review",
```

- [ ] **Step 2: Add Korean translations**

```typescript
  "healthReview.healthy": "{n}개 목표 순조롭게 진행 중",
  "healthReview.stale.reason": "{days}일간 진행 없음",
  "healthReview.needsNext.reason": "모든 과제 완료 — 다음은?",
  "healthReview.struggling.reason": "진행이 느려지고 있어요",
  "healthReview.response.busy": "바빴어요",
  "healthReview.response.unmotivated": "의욕이 안 나요",
  "healthReview.response.changeDirection": "방향을 바꾸고 싶어요",
  "healthReview.response.aiSuggest": "AI가 다음 단계 제안",
  "healthReview.response.addManual": "직접 추가",
  "healthReview.response.pause": "잠시 보류",
  "healthReview.response.tooLarge": "과제가 너무 커요",
  "healthReview.response.doesntFit": "목표가 안 맞아요",
  "healthReview.response.moreTime": "시간이 더 필요해요",
  "healthReview.nudge": "{n}개 목표에 관심이 필요해요",
  "healthReview.weekly": "주간 리뷰",
  "healthReview.monthly": "월간 리뷰",
  "healthReview.complete": "리뷰 완료",
  "healthReview.menuItem": "목표 리뷰",
```

- [ ] **Step 3: Add Japanese translations**

```typescript
  "healthReview.healthy": "{n}件の目標が順調です",
  "healthReview.stale.reason": "{days}日間進捗なし",
  "healthReview.needsNext.reason": "全タスク完了 — 次は？",
  "healthReview.struggling.reason": "進捗が遅くなっています",
  "healthReview.response.busy": "忙しかった",
  "healthReview.response.unmotivated": "やる気が出ない",
  "healthReview.response.changeDirection": "方向を変えたい",
  "healthReview.response.aiSuggest": "AIが次を提案",
  "healthReview.response.addManual": "手動で追加",
  "healthReview.response.pause": "一時停止",
  "healthReview.response.tooLarge": "タスクが大きすぎる",
  "healthReview.response.doesntFit": "目標が合わない",
  "healthReview.response.moreTime": "もっと時間が必要",
  "healthReview.nudge": "{n}件の目標に注意が必要です",
  "healthReview.weekly": "週間レビュー",
  "healthReview.monthly": "月間レビュー",
  "healthReview.complete": "レビュー完了",
  "healthReview.menuItem": "目標レビュー",
```

- [ ] **Step 4: Verify build**

Run: `npx next build 2>&1 | tail -5`

---

### Task 4: Health review API schemas + prompt

**Files:**
- Modify: `src/lib/ai-schemas.ts`
- Modify: `src/lib/ai-prompt.ts`

- [ ] **Step 1: Add health review schemas to `ai-schemas.ts`**

Add at the end of the file, before the type exports:

```typescript
// ── Health Review ──

const flaggedGoalSchema = z.object({
  goalId: z.string(),
  title: z.string(),
  horizonKey: generatableHorizonKey,
  parentGoalTitle: z.string().optional(),
  status: z.enum(["stale", "needs-next", "struggling"]),
  userResponse: z.string(),
  completedTasks: z.array(z.string()),
  pendingTasks: z.array(z.string()),
});

export const healthReviewRequestSchema = z.object({
  profile: profileSchema,
  locale: z.enum(["en", "ko", "ja"]).optional().default("en"),
  flaggedGoals: z.array(flaggedGoalSchema),
});

const goalUpdateSchema = z.object({
  goalId: z.string(),
  action: z.enum(["new-tasks", "replace-goal", "break-down"]),
  newGoal: z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(["low", "medium", "high"]),
  }).optional(),
  newTasks: z.array(z.object({
    title: z.string(),
    estimatedMinutes: z.number().min(5).transform((v) => Math.round(v)),
    horizonKey: horizonKeySchema,
    dueDate: z.string().optional(),
  })),
});

export const healthReviewResponseSchema = z.object({
  updates: z.array(goalUpdateSchema),
});

export type HealthReviewRequest = z.infer<typeof healthReviewRequestSchema>;
export type HealthReviewResponse = z.infer<typeof healthReviewResponseSchema>;
```

- [ ] **Step 2: Add health review prompt builder to `ai-prompt.ts`**

Add at the end of the file:

```typescript
export function buildHealthReviewPrompt(locale: string = "en"): string {
  const langInstruction = LOCALE_INSTRUCTIONS[locale] ?? "";
  return `You are a life planning AI helping a user review and improve their goals.${langInstruction}

## Context
The user has reviewed their goals and flagged ones that need attention. For each flagged goal, the user provided feedback about why it's stuck.

## Output Schema
Return JSON: { "updates": [...] }
Each update: { goalId, action, newGoal?, newTasks }
- action: "new-tasks" (add tasks to existing goal), "replace-goal" (suggest new goal + tasks), "break-down" (split existing tasks smaller)
- newGoal: only when action is "replace-goal". Object with title, description, priority.
- newTasks: always present. Array of { title, estimatedMinutes, horizonKey, dueDate? }

## Rules per user response
- "busy" → action: "break-down". Split pending tasks into 10-15 minute micro-tasks.
- "unmotivated" → action: "new-tasks". Suggest a more engaging, concrete first step.
- "changeDirection" → action: "replace-goal". Suggest an alternative goal that serves the same parent vision.
- "aiSuggest" (needs-next) → action: "new-tasks". Generate 2-3 logical next tasks based on completed work.
- "tooLarge" → action: "break-down". Split each pending task into 2-3 smaller concrete steps.
- "doesntFit" → action: "replace-goal". Suggest a better-fitting goal.

## Task quality
- Every task must be specific enough to start immediately (not "research X" but "spend 15 min searching Y on Z platform")
- estimatedMinutes: 10-30 for micro-tasks, 30-60 for regular tasks
- Include dueDate for this-month and this-week tasks`;
}

export function buildHealthReviewMessage(request: HealthReviewRequest): string {
  const { profile, flaggedGoals } = request;

  let msg = `## User Profile
- Age: ${profile.age}, ${profile.occupation}, ${profile.lifeStage}
- Values: ${profile.values.join(", ")}

## Flagged Goals\n`;

  for (const fg of flaggedGoals) {
    msg += `\n### [${fg.horizonKey}] ${fg.title} (goalId: ${fg.goalId})
- Status: ${fg.status}
- User feedback: ${fg.userResponse}
- Completed: ${fg.completedTasks.length > 0 ? fg.completedTasks.join(", ") : "none"}
- Pending: ${fg.pendingTasks.length > 0 ? fg.pendingTasks.join(", ") : "none"}`;
    if (fg.parentGoalTitle) msg += `\n- Parent goal: ${fg.parentGoalTitle}`;
    msg += "\n";
  }

  return msg;
}
```

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -5`

---

### Task 5: Health review API endpoint

**Files:**
- Create: `src/app/api/health-review/route.ts`

- [ ] **Step 1: Create the endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  healthReviewRequestSchema,
  healthReviewResponseSchema,
} from "@/lib/ai-schemas";
import { buildHealthReviewPrompt, buildHealthReviewMessage } from "@/lib/ai-prompt";

const TIMEOUT_MS = 60_000;
const MODEL = "gemini-2.5-flash";
const MAX_RETRIES = 2;
const RETRY_DELAYS = [5_000, 15_000];

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message;
    return msg.includes("503") || msg.includes("429") || msg.includes("timeout");
  }
  return false;
}

function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = healthReviewRequestSchema.parse(body);

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0.5,
        responseMimeType: "application/json",
      },
    });

    const systemPrompt = buildHealthReviewPrompt(validated.locale);
    const userMessage = buildHealthReviewMessage(validated);

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] ?? 15_000;
        console.log(`[health-review] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms`);
        await sleep(delay);
      }
      try {
        const result = await withTimeout(
          model.generateContent({
            systemInstruction: systemPrompt,
            contents: [{ role: "user", parts: [{ text: userMessage }] }],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as any,
          }),
          TIMEOUT_MS,
        );

        const text = result.response.text();
        const cleaned = stripMarkdownFences(text);
        const parsed = JSON.parse(cleaned);
        const response = healthReviewResponseSchema.parse(parsed);
        return NextResponse.json(response);
      } catch (error) {
        lastError = error;
        console.error(`[health-review] Attempt ${attempt + 1} failed:`, error);
        if (!isRetryable(error)) break;
      }
    }

    return NextResponse.json(
      { error: "Health review failed. Please try again." },
      { status: 502 },
    );
  } catch (error) {
    console.error("[health-review] Request error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -5`

---

### Task 6: Health review UI component

**Files:**
- Create: `src/components/review/health-review.tsx`

- [ ] **Step 1: Create the review overlay component**

This is the main UI component. It:
1. Receives flagged `GoalHealth[]` items
2. Shows healthy summary at top
3. Presents flagged goals one at a time as cards
4. Collects user responses
5. Calls `/api/health-review` for AI-needing responses
6. Shows results and saves

The component is complex — dispatch to a subagent with the full spec from `docs/superpowers/specs/2026-04-09-goal-health-check-design.md` Section 3 (Review UI) as the implementation guide.

Key props:
```typescript
interface Props {
  flaggedGoals: GoalHealth[];
  allGoals: Goal[];
  allTasks: Task[];
  healthyCount: number;
  onComplete: () => void;
}
```

The component must:
- Use AnimatePresence for card transitions
- Track `currentIndex` for card stack navigation
- Collect responses in a `Map<string, string>`
- On finish, filter AI-needing responses, call `/api/health-review`, apply results via `dataService`
- Call `onComplete()` when done

- [ ] **Step 2: Verify build**

Run: `mkdir -p src/components/review && npx next build 2>&1 | tail -5`

---

### Task 7: Wire review into main page + menu

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/panel/menu-panel.tsx`

- [ ] **Step 1: Add review overlay state + trigger logic to page.tsx**

In `MainContent` component:
1. Import `detectGoalHealth` from `@/engine/goal-health`
2. Import `HealthReview` from `@/components/review/health-review`
3. Add state: `const [showReview, setShowReview] = useState(false)`
4. Run detection on mount: `useMemo(() => detectGoalHealth(goals, tasks, new Date()), [goals, tasks])`
5. Check trigger: compare `lastWeeklyReview`/`lastMonthlyReview` from appSettings with current date
6. If due → set `showReview = true`
7. Show nudge banner if any goal is stale but review not due
8. Render `<HealthReview>` overlay when `showReview === true`

- [ ] **Step 2: Add "Goal Review" to menu-panel.tsx**

Add a new menu item:
```typescript
{ icon: Heart, label: t("healthReview.menuItem"), action: () => { closePanel(); /* trigger review */ } }
```

Note: the menu needs to communicate with the main page to open the review. Use a simple approach: `openPanel("review")` as a new PanelType, or use a callback. The simplest: add `"review"` to PanelType in panel-host.tsx, and handle it in page.tsx by showing the overlay instead of a panel.

- [ ] **Step 3: Verify build + tests**

Run: `npx vitest run && npx next build 2>&1 | tail -5`
