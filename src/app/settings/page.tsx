"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoalLoading } from "@/components/onboarding/goal-loading";
import { GoalReview } from "@/components/onboarding/goal-review";
import { dataService } from "@/services";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { calculateFreeHours } from "@/lib/time-utils";
import type { GenerateGoalsResponse } from "@/lib/ai-schemas";
import type { GeneratableHorizonKey, HorizonKey } from "@/types";

const VALID_HORIZON_KEYS: HorizonKey[] = [
  "this-week", "this-month", "this-year", "3-years", "10-years", "lifetime",
];

const HORIZONS: { key: GeneratableHorizonKey; label: string }[] = [
  { key: "this-month", label: "This Month" },
  { key: "this-year", label: "This Year" },
  { key: "3-years", label: "3 Years" },
  { key: "10-years", label: "10 Years" },
  { key: "lifetime", label: "Lifetime" },
];

type View = "main" | "select-horizons" | "review-goals" | "direction-input" | "loading" | "ai-review";

export default function SettingsPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("main");
  const [selectedHorizons, setSelectedHorizons] = useState<Set<GeneratableHorizonKey>>(new Set());
  const [goalActions, setGoalActions] = useState<Map<string, "keep" | "remove">>(new Map());
  const [directionChange, setDirectionChange] = useState("");
  const [aiResponse, setAiResponse] = useState<GenerateGoalsResponse | null>(null);
  const [aiError, setAiError] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const goals = useLiveQuery(() => db.goals.toArray(), []);

  // Auto-dismiss notification after 2 seconds
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

      // Use shared utility for free hours calculation
      const weekdayRoutines = routineTasks.filter(
        (t) => t.dayOfWeek >= 1 && t.dayOfWeek <= 5
      );
      const weekendRoutines = routineTasks.filter(
        (t) => t.dayOfWeek === 0 || t.dayOfWeek === 6
      );
      const freeHoursWeekday = calculateFreeHours(weekdayRoutines);
      const freeHoursWeekend = calculateFreeHours(weekendRoutines);

      const existingGoals = selectedGoals.map((g) => ({
        horizonKey: g.horizonKey as GeneratableHorizonKey,
        title: g.title,
        priority: g.priority,
        keep: goalActions.get(g.id!) === "keep",
      }));

      const res = await fetch("/api/generate-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          routineSummary: {
            freeHoursWeekday,
            freeHoursWeekend,
          },
          allocations: allocationMap,
          existingGoals,
          directionChange: directionChange || undefined,
          previousCoherenceThread: profile.coherenceThread,
          mode: "regenerate" as const,
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data: GenerateGoalsResponse = await res.json();
      setAiResponse(data);
      setView("ai-review");
    } catch (err) {
      if ((err as Error).name !== "AbortError") setAiError(true);
    }
  }, [selectedGoals, goalActions, directionChange]);

  const saveRegenerated = useCallback(async (data: GenerateGoalsResponse) => {
    try {
    // Delete removed goals and unlink their tasks
    const removedIds = selectedGoals
      .filter((g) => goalActions.get(g.id!) === "remove")
      .map((g) => g.id!)
      .filter(Boolean);

    let unlinkCount = 0;
    if (removedIds.length > 0) {
      unlinkCount = await dataService.unlinkTasksForGoals(removedIds);
      for (const id of removedIds) await dataService.deleteGoal(id);
    }

    // Add new AI-generated goals
    const horizonKeys: GeneratableHorizonKey[] = [...selectedHorizons];
    for (const hk of horizonKeys) {
      for (const goal of data.goals[hk] ?? []) {
        const goalId = await dataService.addGoal({
          horizonKey: hk,
          title: goal.title,
          description: goal.description,
          priority: goal.priority,
          source: "ai-generated",
        });
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

    // Show brief notification for unlinked tasks, then navigate
    if (unlinkCount > 0) {
      setNotification(`${unlinkCount} task(s) are no longer linked to a goal.`);
      setTimeout(() => router.push("/"), 2000);
    } else {
      router.push("/");
    }
    } catch {
      setAiError(true);
      setView("loading");
    }
  }, [selectedGoals, goalActions, selectedHorizons, router]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center px-4 py-3 border-b border-gray-100">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold ml-2">Settings</h1>
      </header>

      {/* Orphan task notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-2 px-4 py-2 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800"
          >
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {view === "main" && (
          <motion.div key="main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-4">
            <Button className="w-full" onClick={() => setView("select-horizons")}>
              Adjust Goals
            </Button>
          </motion.div>
        )}

        {view === "select-horizons" && (
          <motion.div key="select" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="p-6">
            <h2 className="text-lg font-bold mb-4">Select Horizons to Reset</h2>
            <div className="space-y-2 mb-6">
              {HORIZONS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => toggleHorizon(key)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                    selectedHorizons.has(key) ? "border-gray-900 bg-gray-50 font-medium" : "border-gray-200"
                  }`}
                >
                  {label}
                  <span className="text-gray-400 ml-2">
                    ({(goals ?? []).filter((g) => g.horizonKey === key).length} goals)
                  </span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setView("main")}>Cancel</Button>
              <Button className="flex-1" disabled={selectedHorizons.size === 0} onClick={() => setView("review-goals")}>
                Next
              </Button>
            </div>
          </motion.div>
        )}

        {view === "review-goals" && (
          <motion.div key="review" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="p-6">
            <h2 className="text-lg font-bold mb-1">Review Existing Goals</h2>
            <p className="text-sm text-gray-500 mb-4">
              Mark goals to keep or remove. AI only changes unlocked goals.
            </p>
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
                      {action === "keep" ? "Keep" : "Replace"}
                    </Badge>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setView("select-horizons")}>Back</Button>
              <Button variant="outline" className="flex-1" onClick={() => router.push("/")}>Save manually</Button>
              <Button className="flex-1" onClick={() => setView("direction-input")}>AI regenerate</Button>
            </div>
          </motion.div>
        )}

        {view === "direction-input" && (
          <motion.div key="direction" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="p-6">
            <h2 className="text-lg font-bold mb-1">What&apos;s changed?</h2>
            <p className="text-sm text-gray-500 mb-4">Describe your new direction (optional).</p>
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none mb-4"
              rows={4}
              maxLength={500}
              placeholder="e.g. I want to pivot from engineering to teaching"
              value={directionChange}
              onChange={(e) => setDirectionChange(e.target.value)}
            />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setView("review-goals")}>Back</Button>
              <Button className="flex-1" onClick={regenerate}>Generate new goals</Button>
            </div>
          </motion.div>
        )}

        {view === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col">
            <GoalLoading error={aiError} onRetry={regenerate} onSkip={() => router.push("/")} />
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
