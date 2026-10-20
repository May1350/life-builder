# Goal Health Check Design Spec (v2 — post-review)

## Summary

Rule-based detection flags unhealthy goals, a minimal review UI surfaces only flagged goals to the user, and AI redesigns tasks based on user feedback.

## Scope

1. Health detection engine (pure rules, no AI)
2. Weekly/monthly review trigger + real-time nudge
3. Review UI — only flagged goals shown, accessed as full-screen overlay
4. AI task redesign via separate `/api/health-review` endpoint
5. Locale strings (en/ko/ja) with `healthReview.*` prefix
6. Dexie v4 migration for AppSettings fields

## Out of scope (future)
- Tree-aware detection (parent-child health propagation)
- Desktop visual tree map

---

## 1. Health Detection Engine

### `src/engine/goal-health.ts`

Pure function. No AI, no network calls.

```typescript
export type HealthStatus = "healthy" | "stale" | "needs-next" | "struggling";

export interface GoalHealth {
  goalId: string;
  status: HealthStatus;
  reasonKey: string;     // locale key (e.g., "healthReview.stale.reason")
  daysSinceActivity: number;
  completionRate: number; // 0-1, completedTasks / totalTasks
}
```

### Detection Rules

| Status | Condition | Notes |
|--------|-----------|-------|
| `stale` | Goal has 1+ tasks AND no task has `updatedAt` within the last 7 days | `updatedAt` is the activity signal — covers completions and partial progress |
| `needs-next` | Goal has 1+ tasks AND every task has `status === "completed"` | Zero-task goals are NOT flagged (they're new, not done) |
| `struggling` | Goal has 3+ tasks with `status === "pending"` AND `completedMinutes > 0` (started but not finished), OR goal is 14+ days old with 0 completions. Only applies to short horizons: this-week, this-month, this-year | Long-horizon goals (3Y/10Y/lifetime) are excluded from the age-based check |
| `healthy` | None of the above | Not included in output |

### `daysSinceActivity` computation
Days since the most recent `updatedAt` or `completedAt` (whichever is later) among all tasks belonging to this goal. If the goal has no tasks, use the goal's own `createdAt`.

### `completionRate` computation
`completedTasks.length / totalTasks.length`. If `totalTasks.length === 0`, rate is 0.

### Detection is flat (v1)
Each goal is evaluated independently. Parent-child relationships are NOT considered in detection rules. Tree-aware detection (e.g., "parent healthy but child struggling") is a future enhancement.

---

## 2. Trigger Timing

### Weekly Review
- Every Sunday (or first app open after Saturday)
- Check: `appSettings.lastWeeklyReview` date
- If last review was 6+ days ago → show review overlay
- Content: flagged goals only + healthy summary line

### Monthly Review
- Every 1st of month (or first app open that month)
- Check: `appSettings.lastMonthlyReview` date
- Deeper: all horizons progress overview + flagged goals + AI regenerate option

### Real-time Nudge
- On main screen load, run detection
- If any goal is `stale` → show dismissable banner
- Banner: "healthReview.nudge" text — tap opens review overlay
- Not blocking, closable with X

### AppSettings changes

Add to `AppSettings` interface in `types/index.ts`:
```typescript
lastWeeklyReview?: string;  // "YYYY-MM-DD"
lastMonthlyReview?: string; // "YYYY-MM-DD"
```

Dexie v4 migration in `db.ts` — no new indexes needed (these are non-indexed fields), but version bump is required:
```typescript
this.version(4).stores({
  // Same stores as v3 — no index changes
});
```

---

## 3. Review UI

### Access
- **Auto-trigger**: full-screen overlay on main page (same pattern as onboarding loading screen)
- **Manual**: hamburger menu item "목표 리뷰" opens the same overlay
- **Navigation**: NOT a panel or route. It's a state-driven overlay in `page.tsx` (`showReview: boolean`)

### `src/components/review/health-review.tsx`

**Layout:**

Top: healthy summary
```
"5개 목표 순조롭게 진행 중"
```

Below: flagged goals as cards, one at a time (card stack with AnimatePresence)

**Per flagged goal card:**
```
[horizon color dot] [horizon label]
Goal Title
"7일간 진행 없음"

[Option A] [Option B] [Option C]
```

**Response options per status:**

| Status | Options (locale key → action) |
|--------|------|
| `stale` | "바빴어요" → AI splits tasks smaller / "의욕이 안 나요" → AI reevaluates goal / "방향을 바꾸고 싶어요" → AI redesigns |
| `needs-next` | "AI가 다음 단계 제안" → AI generates / "직접 추가" → open add-task modal / "잠시 보류" → skip, no AI |
| `struggling` | "태스크가 너무 큼" → AI breaks down / "목표가 안 맞음" → AI replaces / "더 시간 필요" → extend, no AI |

**Flow:**
1. Show card 1, user taps response
2. Slide to card 2, repeat
3. After all cards: if any responses need AI → loading screen → AI call → show results → confirm
4. If no AI needed → "리뷰 완료" → close overlay
5. Update `lastWeeklyReview` or `lastMonthlyReview` timestamp

---

## 4. AI Task Redesign

### Separate endpoint: `/api/health-review`

NOT reusing `/api/generate-goals` — different request/response shape.

### Request schema (`healthReviewRequestSchema`)
```typescript
{
  profile: profileSchema,       // existing user profile
  locale: z.enum(["en","ko","ja"]).optional(),
  flaggedGoals: z.array(z.object({
    goalId: z.string(),
    title: z.string(),
    horizonKey: generatableHorizonKey,
    parentGoalTitle: z.string().optional(),
    status: z.enum(["stale", "needs-next", "struggling"]),
    userResponse: z.string(),   // e.g., "busy", "unmotivated", "too-large"
    completedTasks: z.array(z.string()),  // titles of completed tasks
    pendingTasks: z.array(z.string()),    // titles of pending tasks
  })),
}
```

### Response schema (`healthReviewResponseSchema`)
```typescript
{
  updates: z.array(z.object({
    goalId: z.string(),
    action: z.enum(["new-tasks", "replace-goal", "break-down"]),
    newGoal: z.object({ title, description, priority }).optional(),
    newTasks: z.array(z.object({ title, estimatedMinutes, horizonKey, dueDate? })),
  })),
}
```

No `wheelOfLifeBalance` or `coherenceThread` — this is a focused task redesign.

### System prompt for health-review
New function `buildHealthReviewPrompt(locale)` in `ai-prompt.ts`:
- Context: "The user reviewed their goals and provided feedback on flagged items"
- Per response type:
  - `busy` → "Break existing tasks into 10-15 minute micro-tasks"
  - `unmotivated` → "Suggest a more engaging approach to the same goal"
  - `too-large` → "Split each pending task into 2-3 smaller concrete steps"
  - `needs-next` → "Generate the logical next 2-3 tasks based on what was completed"
  - `doesnt-fit` → "Suggest an alternative goal under the same parent horizon goal"

---

## 5. Locale Strings

Prefix: `healthReview.*` (avoids collision with existing `review.*` keys)

```
healthReview.healthy: "{n} goals on track"
healthReview.stale.reason: "No progress for {days} days"
healthReview.needsNext.reason: "All tasks completed — what's next?"
healthReview.struggling.reason: "Progress has been slow"

healthReview.response.busy: "Been busy"
healthReview.response.unmotivated: "Lost motivation"
healthReview.response.changeDirection: "Want to change direction"
healthReview.response.aiSuggest: "AI suggests next steps"
healthReview.response.addManual: "Add manually"
healthReview.response.pause: "Pause for now"
healthReview.response.tooLarge: "Tasks are too large"
healthReview.response.doesntFit: "Goal doesn't fit anymore"
healthReview.response.moreTime: "Need more time"

healthReview.nudge: "{n} goal needs attention"
healthReview.weekly: "Weekly Review"
healthReview.monthly: "Monthly Review"
healthReview.complete: "Review complete"
healthReview.menuItem: "Goal Review"
```

Plus ko/ja translations for all keys.
