"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoalLoading } from "@/components/onboarding/goal-loading";
import { GoalReview } from "@/components/onboarding/goal-review";
import { dataService } from "@/services";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { calculateFreeHours } from "@/lib/time-utils";
import { useLocale } from "@/providers/locale-provider";
import { type Locale, LOCALE_LABELS } from "@/lib/locale";
import { computeActivityStats } from "@/lib/activity-stats";
import { usePanel } from "./panel-host";
import type { GenerateGoalsResponse } from "@/lib/ai-schemas";
import type { GeneratableHorizonKey, HorizonKey } from "@/types";
import { apiUrl } from "@/lib/api";

const VALID_HORIZON_KEYS: HorizonKey[] = [
  "this-week", "this-month", "this-year", "3-years", "10-years", "lifetime",
];

const HORIZON_KEYS: GeneratableHorizonKey[] = [
  "this-month", "this-year", "3-years", "10-years", "lifetime",
];

type View = "main" | "select-horizons" | "review-goals" | "direction-input" | "loading" | "ai-review";

export function SettingsPanel() {
  const { closePanel } = usePanel();
  const { locale, setLocale, t } = useLocale();
  const [view, setView] = useState<View>("main");
  const [selectedHorizons, setSelectedHorizons] = useState<Set<GeneratableHorizonKey>>(new Set());
  const [goalActions, setGoalActions] = useState<Map<string, "keep" | "remove">>(new Map());
  const [directionChange, setDirectionChange] = useState("");
  const [aiResponse, setAiResponse] = useState<GenerateGoalsResponse | null>(null);
  const [aiError, setAiError] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const goals = useLiveQuery(() => db.goals.toArray(), []);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 2000);
    return () => clearTimeout(timer);
  }, [notification]);

  const toggleHorizon = (key: GeneratableHorizonKey) => {
    setSelectedHorizons((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const selectedGoals = (goals ?? []).filter((g) =>
    selectedHorizons.has(g.horizonKey as GeneratableHorizonKey)
  );

  const regenerate = useCallback(async () => {
    setAiError(false);
    setView("loading");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const profile = await dataService.getUserProfile();
      const allocations = await dataService.getAllocations();
      const routineTasks = await dataService.getAllRoutineTasks();

      if (!profile) throw new Error("No profile");

      const allocationMap: Record<string, number> = {};
      for (const a of allocations) allocationMap[a.horizonKey] = a.percentage;

      const weekdayRoutines = routineTasks.filter(
        (rt) => rt.dayOfWeek >= 1 && rt.dayOfWeek <= 5
      );
      const weekendRoutines = routineTasks.filter(
        (rt) => rt.dayOfWeek === 0 || rt.dayOfWeek === 6
      );
      const freeHoursWeekday = calculateFreeHours(weekdayRoutines);
      const freeHoursWeekend = calculateFreeHours(weekendRoutines);

      const existingGoals = selectedGoals.map((g) => ({
        horizonKey: g.horizonKey as GeneratableHorizonKey,
        title: g.title,
        priority: g.priority,
        keep: goalActions.get(g.id!) === "keep",
      }));

      // Compute activity stats from local DB (no API call)
      const allGoals = await db.goals.toArray();
      const allTasks = await db.tasks.toArray();
      const activityStats = computeActivityStats(allGoals, allTasks);

      const res = await fetch(apiUrl("/api/generate-goals"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-app-secret": process.env.NEXT_PUBLIC_APP_SHARED_SECRET ?? "",
        },
        signal: controller.signal,
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
          routineSummary: { freeHoursWeekday, freeHoursWeekend },
          allocations: allocationMap,
          existingGoals,
          directionChange: directionChange || undefined,
          previousCoherenceThread: profile.coherenceThread,
          mode: "regenerate" as const,
          locale,
          activityStats,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data: GenerateGoalsResponse = await res.json();
      setAiResponse(data);
      setView("ai-review");
    } catch (err) {
      if ((err as Error).name !== "AbortError") setAiError(true);
    }
  }, [selectedGoals, goalActions, directionChange, locale]);

  const handleCancelRegen = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setAiError(false);
    setView("direction-input");
  }, []);

  const saveRegenerated = useCallback(async (data: GenerateGoalsResponse) => {
    try {
      const removedIds = selectedGoals
        .filter((g) => goalActions.get(g.id!) === "remove")
        .map((g) => g.id!)
        .filter(Boolean);

      let unlinkCount = 0;
      if (removedIds.length > 0) {
        unlinkCount = await dataService.unlinkTasksForGoals(removedIds);
        for (const id of removedIds) await dataService.deleteGoal(id);
      }

      // Save top-down so parent IDs are available for children
      const horizonKeys: GeneratableHorizonKey[] = [
        "lifetime", "10-years", "3-years", "this-year", "this-month",
      ];

      const parentHorizon: Record<string, GeneratableHorizonKey> = {
        "10-years": "lifetime",
        "3-years": "10-years",
        "this-year": "3-years",
        "this-month": "this-year",
      };

      const savedIds: Record<string, Record<number, string>> = {};

      for (const hk of horizonKeys) {
        if (!selectedHorizons.has(hk)) continue;
        savedIds[hk] = {};
        const goals = data.goals[hk] ?? [];
        for (let i = 0; i < goals.length; i++) {
          const goal = goals[i];

          let parentGoalId: number | undefined;
          if (goal.parentIndex !== undefined && parentHorizon[hk]) {
            const pid = savedIds[parentHorizon[hk]]?.[goal.parentIndex];
            if (pid) parentGoalId = Number(pid);
          }

          const goalId = await dataService.addGoal({
            horizonKey: hk,
            title: goal.title,
            description: goal.description,
            priority: goal.priority,
            source: "ai-generated",
            parentGoalId,
          });
          savedIds[hk][i] = String(goalId);

          for (const task of goal.starterTasks) {
            const taskHorizonKey = VALID_HORIZON_KEYS.includes(task.horizonKey as HorizonKey)
              ? (task.horizonKey as HorizonKey)
              : hk;
            await dataService.addTask({
              horizonKey: taskHorizonKey,
              goalId,
              title: task.title,
              estimatedMinutes: task.estimatedMinutes,
              dueDate: task.dueDate,
            });
          }
        }
      }

      await dataService.updateUserProfile({
        coherenceThread: data.coherenceThread,
        wheelOfLifeBalance: data.wheelOfLifeBalance,
      });

      if (unlinkCount > 0) {
        setNotification(t("settings.unlinkedTasks", { n: unlinkCount }));
        setTimeout(() => closePanel(), 2000);
      } else {
        closePanel();
      }
    } catch {
      setAiError(true);
      setView("loading");
    }
  }, [selectedGoals, goalActions, selectedHorizons, closePanel, t]);

  return (
    <div className="flex flex-col h-full min-h-dvh overflow-y-auto">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h2 className="text-lg font-bold">{t("settings.title")}</h2>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-5 mb-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === "main" && (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-5 pb-5 space-y-6">
            {/* Language */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{t("settings.language")}</h3>
              <div className="flex gap-1 rounded-full bg-gray-100 p-1">
                {(Object.keys(LOCALE_LABELS) as Locale[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={`flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      locale === l
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    {LOCALE_LABELS[l]}
                  </button>
                ))}
              </div>
            </div>

            <Button className="w-full" onClick={() => setView("select-horizons")}>
              {t("settings.adjustGoals")}
            </Button>

            <div className="border-t border-gray-100 pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t("settings.developer")}</h3>
              <Button
                variant="destructive"
                className="w-full"
                onClick={async () => {
                  if (!confirm(t("settings.resetConfirm"))) return;
                  const { db: dexieDb } = await import("@/lib/db");
                  await dexieDb.delete();
                  window.location.href = "/";
                }}
              >
                {t("settings.reset")}
              </Button>
              <p className="text-xs text-gray-400 mt-1">{t("settings.resetDesc")}</p>
            </div>
          </motion.div>
        )}

        {view === "select-horizons" && (
          <motion.div key="select" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="px-5 pb-5">
            <h2 className="text-lg font-bold mb-4">{t("settings.selectHorizons")}</h2>
            <div className="space-y-2 mb-6">
              {HORIZON_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => toggleHorizon(key)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    selectedHorizons.has(key) ? "border-gray-900 bg-gray-50 font-medium" : "border-gray-200"
                  }`}
                >
                  {t(`horizon.${key}`)}
                  <span className="text-gray-400 ml-2">
                    ({(goals ?? []).filter((g) => g.horizonKey === key).length} goals)
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setView("main")}>{t("common.cancel")}</Button>
              <Button className="flex-1" disabled={selectedHorizons.size === 0} onClick={() => setView("review-goals")}>
                {t("common.next")}
              </Button>
            </div>
          </motion.div>
        )}

        {view === "review-goals" && (
          <motion.div key="review" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="px-5 pb-5">
            <h2 className="text-lg font-bold mb-1">{t("settings.reviewGoals")}</h2>
            <p className="text-sm text-gray-500 mb-4">{t("settings.reviewGoalsDesc")}</p>
            <div className="space-y-2 mb-6 max-h-[50vh] overflow-y-auto">
              {selectedGoals.map((goal) => {
                const action = goalActions.get(goal.id!) ?? "keep";
                return (
                  <div key={goal.id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200">
                    <span className="flex-1 text-sm">{goal.title}</span>
                    <Badge
                      variant={action === "keep" ? "default" : "outline"}
                      className="cursor-pointer text-xs"
                      onClick={() => {
                        setGoalActions((prev) => {
                          const next = new Map(prev);
                          next.set(goal.id!, action === "keep" ? "remove" : "keep");
                          return next;
                        });
                      }}
                    >
                      {action === "keep" ? t("common.keep") : t("common.replace")}
                    </Badge>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setView("select-horizons")}>{t("common.back")}</Button>
              <Button variant="outline" className="flex-1" onClick={closePanel}>{t("settings.saveManually")}</Button>
              <Button className="flex-1" onClick={() => setView("direction-input")}>{t("settings.aiRegenerate")}</Button>
            </div>
          </motion.div>
        )}

        {view === "direction-input" && (
          <motion.div key="direction" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="px-5 pb-5">
            <h2 className="text-lg font-bold mb-1">{t("settings.whatsChanged")}</h2>
            <p className="text-sm text-gray-500 mb-4">{t("settings.directionDesc")}</p>
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none mb-4"
              rows={4}
              maxLength={500}
              placeholder={t("settings.directionPlaceholder")}
              value={directionChange}
              onChange={(e) => setDirectionChange(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setView("review-goals")}>{t("common.back")}</Button>
              <Button className="flex-1" onClick={regenerate}>{t("settings.generateNew")}</Button>
            </div>
          </motion.div>
        )}

        {view === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
            <GoalLoading
              error={aiError}
              onRetry={regenerate}
              onSkip={closePanel}
              onCancel={handleCancelRegen}
            />
          </motion.div>
        )}

        {view === "ai-review" && aiResponse && (
          <motion.div key="ai-review" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="flex-1 flex flex-col">
            <GoalReview
              data={aiResponse}
              onConfirm={saveRegenerated}
              onBack={() => setView("direction-input")}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
