"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GenerateGoalsResponse } from "@/lib/ai-schemas";
import type { GeneratableHorizonKey } from "@/types";
import { getHorizonColor } from "@/lib/constants";

const REVIEW_ORDER: GeneratableHorizonKey[] = [
  "lifetime", "10-years", "3-years", "this-year", "this-month",
];

const HORIZON_LABELS: Record<GeneratableHorizonKey, string> = {
  lifetime: "Lifetime",
  "10-years": "10 Years",
  "3-years": "3 Years",
  "this-year": "This Year",
  "this-month": "This Month",
};

interface ReviewGoal {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  starterTasks: { title: string; estimatedMinutes: number; horizonKey: string; dueDate?: string }[];
  removed: boolean;
}

interface Props {
  data: GenerateGoalsResponse;
  onConfirm: (goals: GenerateGoalsResponse) => void;
  onBack: () => void;
}

export function GoalReview({ data, onConfirm, onBack }: Props) {
  const [step, setStep] = useState(0);
  const [goalMap, setGoalMap] = useState<Record<string, ReviewGoal[]>>(() => {
    const map: Record<string, ReviewGoal[]> = {};
    for (const key of REVIEW_ORDER) {
      map[key] = (data.goals[key] ?? []).map((g) => ({ ...g, removed: false }));
    }
    return map;
  });

  const horizon = REVIEW_ORDER[step];
  const goals = goalMap[horizon] ?? [];
  const color = getHorizonColor(horizon);

  const toggleGoal = (index: number) => {
    setGoalMap((prev) => {
      const updated = { ...prev };
      updated[horizon] = [...updated[horizon]];
      updated[horizon][index] = {
        ...updated[horizon][index],
        removed: !updated[horizon][index].removed,
      };
      return updated;
    });
  };

  const updateTitle = (index: number, title: string) => {
    setGoalMap((prev) => {
      const updated = { ...prev };
      updated[horizon] = [...updated[horizon]];
      updated[horizon][index] = { ...updated[horizon][index], title };
      return updated;
    });
  };

  const handleConfirm = () => {
    const filtered: GenerateGoalsResponse = {
      ...data,
      goals: {} as GenerateGoalsResponse["goals"],
    };
    for (const key of REVIEW_ORDER) {
      const kept = (goalMap[key] ?? [])
        .filter((g) => !g.removed)
        .map(({ removed, ...g }) => g);
      (filtered.goals as Record<string, typeof kept>)[key] = kept;
    }
    onConfirm(filtered);
  };

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      {/* Progress bar */}
      <div className="flex gap-1 mb-6">
        {REVIEW_ORDER.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-gray-900" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.2 }}
          className="flex-1 flex flex-col"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-xs text-gray-400 font-medium">
              {step + 1} / {REVIEW_ORDER.length}
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {HORIZON_LABELS[horizon]}
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Review your goals. Tap to remove, edit titles inline.
          </p>

          <div className="flex-1 overflow-y-auto space-y-3">
            {goals.length === 0 && (
              <p className="text-sm text-gray-400 italic">No goals for this horizon.</p>
            )}
            {goals.length > 0 && goals.every((g) => g.removed) && (
              <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                No goals for this horizon. You can add them manually anytime.
              </p>
            )}
            {goals.map((goal, i) => (
              <div
                key={i}
                className={`rounded-xl border p-3 transition-all ${
                  goal.removed
                    ? "border-gray-200 bg-gray-50 opacity-50"
                    : "border-gray-200 bg-white shadow-sm"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <input
                    className={`flex-1 text-sm font-medium bg-transparent outline-none ${
                      goal.removed ? "line-through text-gray-400" : "text-gray-900"
                    }`}
                    value={goal.title}
                    onChange={(e) => updateTitle(i, e.target.value)}
                    disabled={goal.removed}
                  />
                  <button
                    onClick={() => toggleGoal(i)}
                    className="text-xs text-gray-400 hover:text-gray-600 shrink-0"
                  >
                    {goal.removed ? "Restore" : "Remove"}
                  </button>
                </div>
                {!goal.removed && (
                  <>
                    <p className="text-xs text-gray-500 mt-1">{goal.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="text-[10px]">{goal.priority}</Badge>
                      {goal.starterTasks.length > 0 && (
                        <span className="text-[10px] text-gray-400">
                          {goal.starterTasks.length} starter task{goal.starterTasks.length > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    {goal.starterTasks.length > 0 && (
                      <div className="mt-2 pl-2 border-l-2 border-gray-100 space-y-1">
                        {goal.starterTasks.map((task, j) => (
                          <p key={j} className="text-[11px] text-gray-500">
                            {task.title} <span className="text-gray-400">({task.estimatedMinutes}min)</span>
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => (step > 0 ? setStep(step - 1) : onBack())}
            >
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={() => (step < REVIEW_ORDER.length - 1 ? setStep(step + 1) : handleConfirm())}
            >
              {step < REVIEW_ORDER.length - 1 ? "Next" : "Confirm Goals"}
            </Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
