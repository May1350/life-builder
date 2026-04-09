# Recommendation Card UX Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 3-button recommendation card (Done/Partial/Skip) with a 2-button layout (Did it/Next time), auto time tracking, and a next-task preview.

**Architecture:** Modify only the recommendation card component and locale dictionary. The recommender engine and data layer stay untouched — `alternatives[0]` already provides the "next" preview, and `dataService.updateTask()` handles all persistence.

**Tech Stack:** React 19, TypeScript, Framer Motion, Lucide icons, Dexie (IndexedDB)

---

### Task 1: Update i18n keys in locale.ts

**Files:**
- Modify: `src/lib/locale.ts:25` (en `common.partial`), `src/lib/locale.ts:202` (en `rec.minutesPrompt`), and equivalent ko/ja entries

- [ ] **Step 1: Add new keys and remove old keys in the `en` dictionary**

In `src/lib/locale.ts`, in the `en` dict:

Remove these two lines:
```typescript
  "common.partial": "Partial",
  "rec.minutesPrompt": "How many minutes did you work?",
```

Add these three lines (in the `// Recommendation` section, after `"rec.also"`):
```typescript
  "rec.didIt": "Did it",
  "rec.nextTime": "Next time",
  "rec.upNext": "Up next",
```

- [ ] **Step 2: Update the `ko` dictionary**

Remove:
```typescript
  "common.partial": "일부",
  "rec.minutesPrompt": "몇 분 동안 작업했나요?",
```

Add (in the `// Recommendation` section equivalent area):
```typescript
  "rec.didIt": "했어요",
  "rec.nextTime": "다음에",
  "rec.upNext": "다음",
```

- [ ] **Step 3: Update the `ja` dictionary**

Remove:
```typescript
  "common.partial": "一部",
  "rec.minutesPrompt": "何分間作業しましたか？",
```

Add:
```typescript
  "rec.didIt": "やった",
  "rec.nextTime": "次へ",
  "rec.upNext": "次",
```

- [ ] **Step 4: Verify the app compiles**

Run: `npx next build 2>&1 | head -30` (or `npx tsc --noEmit`)
Expected: No TypeScript errors related to missing locale keys.

- [ ] **Step 5: Commit**

```bash
git add src/lib/locale.ts
git commit -m "feat: update i18n keys for recommendation card redesign

Remove common.partial and rec.minutesPrompt.
Add rec.didIt, rec.nextTime, rec.upNext in en/ko/ja."
```

---

### Task 2: Rewrite recommendation-card.tsx

**Files:**
- Modify: `src/components/recommendation/recommendation-card.tsx`

- [ ] **Step 1: Replace imports — swap Clock for ChevronRight, add time utils**

Replace the current imports at the top of the file:

```typescript
"use client";

import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/engine/recommender";
import { getHorizonColor } from "@/lib/constants";
import { dataService } from "@/services";
import { useLocale } from "@/providers/locale-provider";
import { timeToMinutes, nowTime } from "@/lib/time-utils";
```

Note: `Clock` and `SkipForward` are removed. `ChevronRight` is added for the "Next time" button. `timeToMinutes` and `nowTime` are added for auto time tracking.

- [ ] **Step 2: Replace handleComplete + handlePartial with handleDidIt**

Remove both `handleComplete` and `handlePartial` functions. Replace with:

```typescript
  const handleDidIt = async () => {
    if (!primary?.id) return;

    let minutesToAdd = 0;

    const scheduled = currentBlock.scheduledTasks?.find(
      (s) => s.taskId === primary.id
    );

    if (scheduled) {
      minutesToAdd = scheduled.minutes;
    } else if (primary.estimatedMinutes) {
      const blockRemaining =
        timeToMinutes(currentBlock.end) - timeToMinutes(nowTime());
      const taskRemaining =
        primary.estimatedMinutes - (primary.completedMinutes ?? 0);
      minutesToAdd = Math.max(1, Math.min(blockRemaining, taskRemaining));
    }

    const newCompleted = (primary.completedMinutes ?? 0) + minutesToAdd;
    const isFullyDone =
      !primary.estimatedMinutes || newCompleted >= primary.estimatedMinutes;

    await dataService.updateTask(primary.id, {
      completedMinutes: newCompleted,
      status: isFullyDone ? "completed" : "in_progress",
      ...(isFullyDone ? { completedAt: new Date() } : {}),
    });

    onRefresh();
  };
```

- [ ] **Step 3: Replace the Actions section with 2-button layout**

Replace the entire `{/* Actions */}` section (the `<div className="flex gap-2 mt-3">` block with 3 buttons) with:

```tsx
      {/* Actions */}
      <div className="flex gap-2 mt-3">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs"
          onClick={handleDidIt}
        >
          <Check className="h-3.5 w-3.5 mr-1" /> {t("rec.didIt")}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="flex-1 text-xs text-gray-400"
          onClick={onRefresh}
        >
          {t("rec.nextTime")} <ChevronRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
```

- [ ] **Step 4: Replace the Alternatives section with next-task preview**

Replace the entire `{/* Alternatives */}` section with:

```tsx
      {/* Next task preview */}
      {alternatives.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 truncate">
            {t("rec.upNext")} ▸ {alternatives[0].title}
          </p>
        </div>
      )}
```

- [ ] **Step 5: Verify the full file compiles and looks correct**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/recommendation/recommendation-card.tsx
git commit -m "feat: redesign recommendation card with 2-button layout

- Replace Done/Partial/Skip with Did-it/Next-time
- Auto time tracking (scheduled minutes or block remaining)
- Add next-task preview from alternatives[0]
- Remove prompt() for mobile UX"
```

---

### Task 3: Manual verification

- [ ] **Step 1: Start dev server and visually verify**

Run: `npm run dev`

Open the app in browser. Navigate to the main screen where the recommendation card is displayed. Verify:

1. Card shows only 2 buttons: "했어요" (or locale equivalent) and "다음에"
2. Below the buttons, a "다음 ▸ [task title]" preview appears (if alternatives exist)
3. Clicking "했어요" advances to the next task without any `prompt()` dialog
4. Clicking "다음에" skips to next recommendation
5. No console errors

- [ ] **Step 2: Commit any fixes if needed**
