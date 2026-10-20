# Loading Experience Improvement Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce Gemini response time by disabling thinking, and replace the generic spinner with a creative "life insights" loading experience that previews the user's profile analysis.

**Architecture:** Two changes — (1) server-side: disable Gemini thinking to cut response from ~30s to ~10s, (2) client-side: replace the spinner with animated insight cards that reflect the user's profile data (interests, values, time budget), giving the feeling that the AI is actively analyzing their life while they wait.

**Tech Stack:** Framer Motion (existing), @google/generative-ai thinkingConfig, locale system (existing)

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/app/api/generate-goals/route.ts` | Modify | Add `thinkingConfig: { thinkingBudget: 0 }` to disable thinking |
| `src/lib/locale.ts` | Modify | Add loading insight strings (en/ko/ja) |
| `src/components/onboarding/goal-loading.tsx` | Rewrite | New insight-card loading experience |
| `src/app/onboarding/page.tsx` | Modify | Pass profile data to GoalLoading |

---

### Task 1: Disable Gemini thinking to reduce response time

**Files:**
- Modify: `src/app/api/generate-goals/route.ts:76-82`

- [ ] **Step 1: Add thinkingConfig to Gemini model config**

In `src/app/api/generate-goals/route.ts`, change the `getGenerativeModel` call:

```typescript
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.55,
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
```

This disables the "thinking" phase of Gemini 2.5 Flash, reducing response time from ~30s to ~10s without significant quality loss for structured JSON output.

- [ ] **Step 2: Verify the change compiles**

Run: `npx next build 2>&1 | tail -5`
Expected: "Compiled successfully"

- [ ] **Step 3: Test API response time**

```bash
time curl -s -X POST http://localhost:3000/api/generate-goals \
  -H "Content-Type: application/json" \
  -d '{"profile":{"age":28,"occupation":"Engineer","lifeStage":"Early Career","interests":["Tech"],"values":["Growth","Impact"],"currentFocus":"Building products and improving skills daily","desiredChange":"Better work-life balance and consistent exercise","neededSkills":"Leadership communication and people management","midTermVision":"Lead a team building impactful products at a company","lifetimeDream":"Create technology that meaningfully improves millions of lives"},"routineSummary":{"freeHoursWeekday":4,"freeHoursWeekend":8},"allocations":{"this-week":30,"this-month":25,"this-year":20,"3-years":10,"10-years":10,"lifetime":5},"mode":"initial","locale":"ko"}' \
  -o /dev/null -w "HTTP %{http_code} in %{time_total}s"
```
Expected: Response in ~10-15s instead of ~30-40s

---

### Task 2: Add loading insight strings to locale

**Files:**
- Modify: `src/lib/locale.ts`

- [ ] **Step 1: Add insight strings to English dictionary**

Add these keys to the `en` dict in `src/lib/locale.ts`, right after the existing `"loading.retry"` key:

```typescript
  // Loading insights — shown as animated cards during AI generation
  "loading.insight.time": "You have {weekday}h on weekdays and {weekend}h on weekends",
  "loading.insight.interests": "Focusing on {list}",
  "loading.insight.values": "Guided by {list}",
  "loading.insight.vision": "Working toward your vision",
  "loading.insight.analyzing": "Analyzing your profile...",
  "loading.insight.designing": "Designing personalized goals...",
  "loading.insight.optimizing": "Optimizing your schedule...",
  "loading.insight.finalizing": "Finalizing your plan...",
```

- [ ] **Step 2: Add Korean translations**

Add to the `ko` dict:

```typescript
  "loading.insight.time": "평일 {weekday}시간, 주말 {weekend}시간의 여유",
  "loading.insight.interests": "{list}에 집중",
  "loading.insight.values": "{list}을(를) 핵심 가치로",
  "loading.insight.vision": "비전을 향해 나아가는 중",
  "loading.insight.analyzing": "프로필을 분석하고 있어요...",
  "loading.insight.designing": "맞춤형 목표를 설계하고 있어요...",
  "loading.insight.optimizing": "일정을 최적화하고 있어요...",
  "loading.insight.finalizing": "계획을 마무리하고 있어요...",
```

- [ ] **Step 3: Add Japanese translations**

Add to the `ja` dict:

```typescript
  "loading.insight.time": "平日{weekday}時間、週末{weekend}時間の余裕",
  "loading.insight.interests": "{list}にフォーカス",
  "loading.insight.values": "{list}をコアバリューに",
  "loading.insight.vision": "ビジョンに向かって進行中",
  "loading.insight.analyzing": "プロフィールを分析中...",
  "loading.insight.designing": "パーソナライズされた目標を設計中...",
  "loading.insight.optimizing": "スケジュールを最適化中...",
  "loading.insight.finalizing": "プランを仕上げ中...",
```

- [ ] **Step 4: Verify tests still pass**

Run: `npx vitest run`
Expected: 39 tests pass

---

### Task 3: Pass profile data to GoalLoading component

**Files:**
- Modify: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Update GoalLoading usage to pass profile and allocation data**

Find the GoalLoading component usage (around line 305-312) and update to pass profile data:

```tsx
            <GoalLoading
              error={aiError}
              onRetry={generateGoals}
              onSkip={handleSkip}
              onCancel={() => {
                abortRef.current?.abort();
                setAiError(true);
              }}
              profile={profile as Record<string, unknown>}
            />
```

---

### Task 4: Rewrite GoalLoading with insight cards

**Files:**
- Rewrite: `src/components/onboarding/goal-loading.tsx`

- [ ] **Step 1: Replace GoalLoading with insight-card experience**

Replace the entire content of `src/components/onboarding/goal-loading.tsx` with:

```tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

interface Props {
  error: boolean;
  onRetry: () => void;
  onSkip: () => void;
  onCancel?: () => void;
  profile?: Record<string, unknown>;
}

interface Insight {
  label: string;
  value: string;
}

export function GoalLoading({ error, onRetry, onSkip, onCancel, profile }: Props) {
  const { t } = useLocale();
  const [phase, setPhase] = useState(0);

  // Build insight cards from profile data
  const insights = useMemo<Insight[]>(() => {
    if (!profile) return [];
    const cards: Insight[] = [];

    const interests = profile.interests as string[] | undefined;
    if (interests?.length) {
      cards.push({
        label: t("loading.insight.interests"),
        value: interests.slice(0, 3).join(", "),
      });
    }

    const values = profile.values as string[] | undefined;
    if (values?.length) {
      cards.push({
        label: t("loading.insight.values"),
        value: values.join(" · "),
      });
    }

    const vision = profile.midTermVision as string | undefined;
    if (vision) {
      cards.push({
        label: t("loading.insight.vision"),
        value: vision.length > 60 ? vision.slice(0, 57) + "..." : vision,
      });
    }

    return cards;
  }, [profile, t]);

  const PHASES = [
    t("loading.insight.analyzing"),
    t("loading.insight.designing"),
    t("loading.insight.optimizing"),
    t("loading.insight.finalizing"),
  ];

  // Cycle through phases
  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setPhase((p) => (p < PHASES.length - 1 ? p + 1 : p));
    }, 3000);
    return () => clearInterval(interval);
  }, [error, PHASES.length]);

  // Progress bar width
  const progress = error ? 0 : Math.min(((phase + 1) / PHASES.length) * 100, 95);

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-gray-900 font-medium mb-2">{t("loading.error.title")}</p>
          <p className="text-sm text-gray-500 mb-6">{t("loading.error.subtitle")}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={onSkip}>{t("loading.skip")}</Button>
            <Button onClick={onRetry}>{t("loading.retry")}</Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      {/* Phase text */}
      <div className="mt-12 mb-6 text-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-sm font-medium text-gray-900"
          >
            {PHASES[phase]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-100 rounded-full mb-8 overflow-hidden">
        <motion.div
          className="h-full bg-gray-900 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      {/* Insight cards — staggered entrance */}
      <div className="space-y-3 flex-1">
        {insights.map((insight, i) => (
          <motion.div
            key={insight.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 + i * 1.2, duration: 0.4 }}
            className="rounded-xl bg-gray-50 px-4 py-3"
          >
            <p className="text-xs text-gray-400 mb-0.5">
              {insight.label.replace("{list}", "").replace(/,$/, "").trim() || insight.label}
            </p>
            <p className="text-sm font-medium text-gray-700">
              {insight.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Cancel button */}
      {onCancel && (
        <div className="text-center mt-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-gray-400"
            onClick={onCancel}
          >
            {t("common.cancel")}
          </Button>
        </div>
      )}
    </div>
  );
}
```

Key design decisions:
- **Phase text** replaces the spinner — shows what the AI is actually doing (analyzing → designing → optimizing → finalizing)
- **Progress bar** gives a sense of advancement (fills to 95% over ~12s, never hits 100 until done)
- **Insight cards** stagger in one by one, reflecting the user's own data back — interests, values, vision — creating the feeling that the AI is processing their unique profile
- **No spinner** — the progress bar and card animations provide enough visual activity

- [ ] **Step 2: Verify build passes**

Run: `npx next build 2>&1 | tail -5`
Expected: "Compiled successfully"

- [ ] **Step 3: Verify tests pass**

Run: `npx vitest run`
Expected: 39 tests pass
