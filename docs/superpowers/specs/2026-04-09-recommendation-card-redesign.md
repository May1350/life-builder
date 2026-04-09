# Recommendation Card UX Redesign

**Date:** 2026-04-09
**Status:** Approved

## Problem

The current recommendation card has 3 action buttons (Done / Partial / Skip) with these issues:

1. **"Partial" uses `prompt()`** — browser native dialog, terrible mobile UX (no numeric keypad, ugly UI)
2. **3 buttons create decision fatigue** — user must choose between 3 options every time
3. **No next-task preview** — user can't prepare for what comes after current task

## Design

### 1. Two-Button Layout

Replace 3 buttons with 2:

| Button | Label (en/ko/ja) | Action |
|--------|-------------------|--------|
| Primary | "Did it" / "했어요" / "やった" | Auto-track time + advance to next |
| Secondary | "Next time" / "다음에" / "次へ" | Skip, show next recommendation |

Remove `prompt()` entirely.

### 2. Auto Time Tracking

When user taps "Did it":

1. **Scheduled task** (has `ScheduledTask.minutes`): add allocated minutes to `completedMinutes`
2. **Pool task with `estimatedMinutes`**: add `min(blockRemainingMinutes, taskRemainingMinutes)` to `completedMinutes`
   - `blockRemainingMinutes` = `timeToMinutes(block.end) - timeToMinutes(nowTime())`
   - `taskRemainingMinutes` = `estimatedMinutes - completedMinutes`
3. **Pool task without `estimatedMinutes`**: mark directly as `completed`

After accumulation:
- `completedMinutes >= estimatedMinutes` → `status: "completed"`, `completedAt: new Date()`
- Otherwise → `status: "in_progress"`

Then call `onRefresh()` to show next recommendation.

### 3. Next Task Preview

Display `alternatives[0]` as a one-line preview below the action buttons:

```
┌─────────────────────────────────┐
│  ● 기술 윤리 관련 책 2권 읽기     │
│    목표: 기술 리더십               │
│    45m 남음                       │
│                                   │
│   [ ✓ 했어요 ]    [ 다음에 → ]    │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┤
│  다음 ▸ 운동 30분                 │
└─────────────────────────────────┘
```

- Hidden when `alternatives` is empty
- Read-only (not tappable)
- Shows task title only, single line, truncated

### 4. Changes Required

| File | Change |
|------|--------|
| `src/components/recommendation/recommendation-card.tsx` | Replace 3 buttons with 2, add next-task preview, new `handleDidIt` replacing `handleComplete` + `handlePartial` |
| `src/lib/locale.ts` | Remove `rec.minutesPrompt` and `common.partial`, add `rec.didIt` (en/ko/ja), `rec.nextTime` (en/ko/ja), `rec.upNext` (en/ko/ja) |
| `src/lib/time-utils.ts` | No changes needed — `nowTime()` and `timeToMinutes()` already exist |
| `src/engine/recommender.ts` | No changes — already returns `alternatives` |

### 5. i18n Keys

New keys:

| Key | en | ko | ja |
|-----|----|----|-----|
| `rec.didIt` | "Did it" | "했어요" | "やった" |
| `rec.nextTime` | "Next time" | "다음에" | "次へ" |
| `rec.upNext` | "Up next" | "다음" | "次" |

Remove keys:
- `rec.minutesPrompt` (all 3 locales)
- `common.partial` (all 3 locales)

### 6. handleDidIt Logic (pseudo)

```typescript
const handleDidIt = async () => {
  if (!primary?.id) return;

  // Determine minutes to add
  let minutesToAdd = 0;

  const scheduled = currentBlock.scheduledTasks?.find(
    (s) => s.taskId === primary.id
  );

  if (scheduled) {
    minutesToAdd = scheduled.minutes;
  } else if (primary.estimatedMinutes) {
    const blockRemaining = timeToMinutes(currentBlock.end) - timeToMinutes(nowTime());
    const taskRemaining = primary.estimatedMinutes - (primary.completedMinutes ?? 0);
    minutesToAdd = Math.max(1, Math.min(blockRemaining, taskRemaining));
  }

  const newCompleted = (primary.completedMinutes ?? 0) + minutesToAdd;
  const isFullyDone = !primary.estimatedMinutes
    || newCompleted >= primary.estimatedMinutes;

  await dataService.updateTask(primary.id, {
    completedMinutes: newCompleted,
    status: isFullyDone ? "completed" : "in_progress",
    ...(isFullyDone ? { completedAt: new Date() } : {}),
  });

  onRefresh();
};
```
