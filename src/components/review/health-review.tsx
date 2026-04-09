"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getHorizonColor } from "@/lib/constants";
import { dataService } from "@/services";
import { useLocale } from "@/providers/locale-provider";
import type { GoalHealth, HealthStatus } from "@/engine/goal-health";
import type { Goal, Task, HorizonKey } from "@/types";
import type { HealthReviewResponse } from "@/lib/ai-schemas";
import { computeActivityStats } from "@/lib/activity-stats";
import { apiUrl } from "@/lib/api";

// ── Response options per health status ──

const RESPONSE_OPTIONS: Record<
  Exclude<HealthStatus, "healthy">,
  string[]
> = {
  stale: ["busy", "unmotivated", "changeDirection"],
  "needs-next": ["aiSuggest", "addManual", "pause"],
  struggling: ["tooLarge", "doesntFit", "moreTime"],
};

// Responses that trigger an AI redesign call
const AI_RESPONSES = new Set([
  "busy",
  "unmotivated",
  "changeDirection",
  "aiSuggest",
  "tooLarge",
  "doesntFit",
]);

// ── Props ──

interface Props {
  flaggedGoals: GoalHealth[];
  allGoals: Goal[];
  allTasks: Task[];
  healthyCount: number;
  onComplete: () => void;
}

type Phase = "review" | "loading" | "complete";

export function HealthReview({
  flaggedGoals,
  allGoals,
  allTasks,
  healthyCount,
  onComplete,
}: Props) {
  const { t, locale } = useLocale();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses] = useState<Map<string, string>>(() => new Map());
  const [phase, setPhase] = useState<Phase>("review");
  const [error, setError] = useState(false);

  // ── Helpers ──

  const findGoal = useCallback(
    (goalId: string) => allGoals.find((g) => String(g.id) === goalId),
    [allGoals],
  );

  const findTasksForGoal = useCallback(
    (goalId: string) => allTasks.filter((t) => String(t.goalId) === goalId),
    [allTasks],
  );

  // ── Handle response selection ──

  const handleResponse = useCallback(
    async (goalId: string, response: string) => {
      responses.set(goalId, response);

      const nextIndex = currentIndex + 1;
      if (nextIndex < flaggedGoals.length) {
        setCurrentIndex(nextIndex);
        return;
      }

      // All cards answered — check if AI is needed
      const needsAI = Array.from(responses.values()).some((r) =>
        AI_RESPONSES.has(r),
      );

      if (!needsAI) {
        setPhase("complete");
        return;
      }

      // Build AI request and call the endpoint
      setPhase("loading");
      setError(false);

      try {
        const profile = await dataService.getUserProfile();
        if (!profile) throw new Error("No user profile");

        const flagged = flaggedGoals
          .filter((gh) => AI_RESPONSES.has(responses.get(gh.goalId) ?? ""))
          .map((gh) => {
            const goal = findGoal(gh.goalId);
            const tasks = findTasksForGoal(gh.goalId);
            return {
              goalId: gh.goalId,
              title: goal?.title ?? "",
              horizonKey: goal?.horizonKey as Exclude<HorizonKey, "this-week">,
              status: gh.status as "stale" | "needs-next" | "struggling",
              userResponse: responses.get(gh.goalId) ?? "",
              completedTasks: tasks
                .filter((t) => t.status === "completed")
                .map((t) => t.title),
              pendingTasks: tasks
                .filter((t) => t.status !== "completed")
                .map((t) => t.title),
            };
          });

        const res = await fetch(apiUrl("/api/health-review"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: {
              age: profile.age,
              occupation: profile.occupation,
              lifeStage: profile.lifeStage,
              interests: profile.interests,
              values: profile.values,
              currentFocus: profile.currentFocus,
              desiredChange: profile.desiredChange,
              neededSkills: profile.neededSkills,
              midTermVision: profile.midTermVision,
              lifetimeDream: profile.lifetimeDream,
            },
            locale,
            flaggedGoals: flagged,
            activityStats: computeActivityStats(allGoals, allTasks),
          }),
        });

        if (!res.ok) throw new Error(`API ${res.status}`);

        const data: HealthReviewResponse = await res.json();

        // Apply updates
        for (const update of data.updates) {
          if (update.action === "replace-goal") {
            // Delete old goal, create replacement + tasks
            await dataService.deleteGoal(update.goalId);
            if (update.newGoal) {
              const goal = findGoal(update.goalId);
              const newId = await dataService.addGoal({
                horizonKey: goal?.horizonKey ?? "this-month",
                title: update.newGoal.title,
                description: update.newGoal.description,
                priority: update.newGoal.priority,
                source: "ai-generated",
              });
              for (const task of update.newTasks) {
                await dataService.addTask({
                  horizonKey: task.horizonKey as HorizonKey,
                  goalId: newId,
                  title: task.title,
                  estimatedMinutes: task.estimatedMinutes,
                  dueDate: task.dueDate,
                });
              }
            }
          } else {
            // "new-tasks" or "break-down" — just add tasks to existing goal
            for (const task of update.newTasks) {
              await dataService.addTask({
                horizonKey: task.horizonKey as HorizonKey,
                goalId: update.goalId,
                title: task.title,
                estimatedMinutes: task.estimatedMinutes,
                dueDate: task.dueDate,
              });
            }
          }
        }

        setPhase("complete");
      } catch (err) {
        console.error("[health-review] Error:", err);
        setError(true);
        setPhase("complete");
      }
    },
    [currentIndex, flaggedGoals, responses, locale, findGoal, findTasksForGoal],
  );

  // ── Render: Loading phase ──

  if (phase === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6">
        <Loader2 className="size-8 animate-spin text-gray-400 mb-4" />
        <p className="text-sm text-gray-500">{t("loading.msg2")}</p>
      </div>
    );
  }

  // ── Render: Complete phase ──

  if (phase === "complete") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white px-6">
        {error ? (
          <>
            <p className="text-sm text-red-600 mb-4">
              {t("loading.error.title")}
            </p>
            <Button onClick={onComplete}>{t("common.done")}</Button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center size-12 rounded-full bg-green-100 mb-4">
              <Check className="size-6 text-green-600" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-6">
              {t("healthReview.complete")}
            </p>
            <Button onClick={onComplete}>{t("common.done")}</Button>
          </>
        )}
      </div>
    );
  }

  // ── Render: Review phase ──

  const currentGoalHealth = flaggedGoals[currentIndex];
  const goal = findGoal(currentGoalHealth.goalId);
  const horizonKey = goal?.horizonKey ?? "this-month";
  const horizonColor = getHorizonColor(horizonKey);
  const options =
    RESPONSE_OPTIONS[
      currentGoalHealth.status as Exclude<HealthStatus, "healthy">
    ] ?? [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-gray-900">
          {t("healthReview.weekly")}
        </h1>
        <button
          onClick={onComplete}
          className="flex items-center justify-center size-8 rounded-full hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="size-5 text-gray-500" />
        </button>
      </div>

      {/* Healthy summary */}
      {healthyCount > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center justify-center size-5 rounded-full bg-green-100">
            <Check className="size-3 text-green-600" />
          </div>
          <span className="text-sm text-gray-600">
            {t("healthReview.healthy", { n: healthyCount })}
          </span>
        </div>
      )}

      {/* Progress indicator */}
      <div className="flex gap-1 mb-6">
        {flaggedGoals.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= currentIndex ? "bg-gray-900" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Card stack */}
      <div className="flex-1 flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            {/* Goal card */}
            <div className="rounded-xl bg-gray-50 p-5 mb-4">
              {/* Horizon label */}
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: horizonColor }}
                />
                <span className="text-xs font-medium text-gray-400">
                  {t(`horizon.${horizonKey}`)}
                </span>
              </div>

              {/* Goal title */}
              <h2 className="text-base font-semibold text-gray-900 mb-2">
                {goal?.title ?? ""}
              </h2>

              {/* Reason */}
              <p className="text-sm text-gray-500">
                {t(currentGoalHealth.reasonKey, {
                  days: currentGoalHealth.daysSinceActivity,
                })}
              </p>
            </div>

            {/* Response buttons */}
            <div className="flex flex-col gap-2 mt-auto mb-4">
              {options.map((option) => (
                <Button
                  key={option}
                  variant="outline"
                  className="w-full justify-start h-11 text-sm"
                  onClick={() =>
                    handleResponse(currentGoalHealth.goalId, option)
                  }
                >
                  {t(`healthReview.response.${option}`)}
                </Button>
              ))}
            </div>

            {/* Card counter */}
            <p className="text-xs text-center text-gray-400">
              {currentIndex + 1} / {flaggedGoals.length}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
