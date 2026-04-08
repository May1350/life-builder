"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RoutineEditor } from "@/components/routine/routine-editor";
import { AllocationEditor } from "@/components/horizons/allocation-editor";
import { ProfileBasics } from "@/components/onboarding/profile-basics";
import { ProfileCurrent } from "@/components/onboarding/profile-current";
import { ProfileVision } from "@/components/onboarding/profile-vision";
import { GoalLoading } from "@/components/onboarding/goal-loading";
import { GoalReview } from "@/components/onboarding/goal-review";
import { DayReady } from "@/components/onboarding/day-ready";
import { useOnboardingStep } from "@/hooks/use-onboarding";
import { dataService } from "@/services";
import { calculateFreeHours } from "@/lib/time-utils";
import type { GenerateGoalsResponse } from "@/lib/ai-schemas";
import type { GeneratableHorizonKey, HorizonKey } from "@/types";

const VALID_HORIZON_KEYS: HorizonKey[] = [
  "this-week", "this-month", "this-year", "3-years", "10-years", "lifetime",
];

type Step =
  | "welcome"
  | "routine"
  | "allocation"
  | "profile-basics"
  | "profile-current"
  | "profile-vision"
  | "loading"
  | "review"
  | "day-ready";

const STEPS: Step[] = [
  "welcome", "routine", "allocation", "profile-basics", "profile-current",
  "profile-vision", "loading", "review", "day-ready",
];

interface ProfileData {
  occupation: string;
  lifeStage: string;
  age: number;
  interests: string[];
  values: string[];
  currentFocus: string;
  desiredChange: string;
  neededSkills: string;
  midTermVision: string;
  lifetimeDream: string;
}

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const [profile, setProfile] = useState<Partial<ProfileData>>({});
  const [aiResponse, setAiResponse] = useState<GenerateGoalsResponse | null>(null);
  const [aiError, setAiError] = useState(false);
  const [savedCounts, setSavedCounts] = useState({ goals: 0, tasks: 0 });
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  // Fix 1: Resume onboarding on re-entry
  const savedStep = useOnboardingStep();
  useEffect(() => {
    if (savedStep !== undefined && savedStep > 0) {
      if (savedStep < STEPS.length) {
        setStep(STEPS[savedStep]);
      }
    }
  }, [savedStep]);

  const goTo = useCallback((s: Step) => {
    setStep(s);
    dataService.setOnboardingStep(STEPS.indexOf(s));
  }, []);

  // Accept optional override to avoid stale closure on profile state
  const generateGoals = useCallback(async (profileOverride?: ProfileData) => {
    setAiError(false);
    goTo("loading");

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const allocations = await dataService.getAllocations();
      const routineTasks = await dataService.getAllRoutineTasks();

      const weekdayTasks = routineTasks.filter((t) => t.dayOfWeek >= 1 && t.dayOfWeek <= 5);
      const weekendTasks = routineTasks.filter((t) => t.dayOfWeek === 0 || t.dayOfWeek === 6);

      const freeHoursWeekday = calculateFreeHours(weekdayTasks);
      const freeHoursWeekend = calculateFreeHours(weekendTasks);

      const allocationMap: Record<string, number> = {};
      for (const a of allocations) {
        allocationMap[a.horizonKey] = a.percentage;
      }

      const fullProfile = profileOverride ?? (profile as ProfileData);

      // Save profile to Dexie before API call
      await dataService.saveUserProfile({
        ...fullProfile,
        coherenceThread: undefined,
        wheelOfLifeBalance: undefined,
      });

      const res = await fetch("/api/generate-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          profile: fullProfile,
          routineSummary: {
            freeHoursWeekday,
            freeHoursWeekend,
          },
          allocations: allocationMap,
          mode: "initial",
        }),
      });

      if (!res.ok) throw new Error("API error");
      const data: GenerateGoalsResponse = await res.json();
      setAiResponse(data);
      goTo("review");
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setAiError(true);
      }
    }
  }, [profile, goTo]);

  const saveGoalsAndFinish = useCallback(async (data: GenerateGoalsResponse) => {
    try {
    const horizonKeys: GeneratableHorizonKey[] = [
      "this-month", "this-year", "3-years", "10-years", "lifetime",
    ];

    let totalGoals = 0;
    let totalTasks = 0;

    for (const hk of horizonKeys) {
      const goals = data.goals[hk] ?? [];
      for (const goal of goals) {
        const goalId = await dataService.addGoal({
          horizonKey: hk,
          title: goal.title,
          description: goal.description,
          priority: goal.priority,
          source: "ai-generated",
        });
        totalGoals++;

        for (const task of goal.starterTasks) {
          // Fix 4: Validate horizonKey instead of using `as any`
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
          totalTasks++;
        }
      }
    }

    // Save coherence thread to profile
    await dataService.updateUserProfile({
      coherenceThread: data.coherenceThread,
      wheelOfLifeBalance: data.wheelOfLifeBalance,
    });

    setSavedCounts({ goals: totalGoals, tasks: totalTasks });
    goTo("day-ready");
    } catch {
      setAiError(true);
      goTo("loading");
    }
  }, [goTo]);

  const handleFinish = useCallback(async () => {
    await dataService.setOnboardingComplete();
    router.push("/");
  }, [router]);

  const handleSkip = useCallback(async () => {
    await dataService.setOnboardingComplete();
    router.push("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <AnimatePresence mode="wait">
        {step === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col items-center justify-center px-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 text-center">
              Welcome to<br />Life <span className="font-black">Builder</span>
            </h1>
            <p className="text-gray-500 mt-4 text-center text-sm max-w-xs">
              Tell us about you. We'll create personalized goals and a schedule for your entire future.
            </p>
            <Button className="mt-8 px-8" onClick={() => goTo("routine")}>
              Get Started
            </Button>
          </motion.div>
        )}

        {step === "routine" && (
          <motion.div
            key="routine"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col px-6 py-8"
          >
            <div className="mb-6">
              <p className="text-xs text-gray-400 mb-1">Step 1 of 5</p>
              <h2 className="text-xl font-bold text-gray-900">Your Weekly Routine</h2>
              <p className="text-sm text-gray-500 mt-1">Add your regular commitments for each day.</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <RoutineEditor />
            </div>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => goTo("welcome")}>Back</Button>
              <Button className="flex-1" onClick={() => goTo("allocation")}>Next</Button>
            </div>
          </motion.div>
        )}

        {step === "allocation" && (
          <motion.div
            key="allocation"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            className="flex-1 flex flex-col px-6 py-8"
          >
            <div className="mb-6">
              <p className="text-xs text-gray-400 mb-1">Step 2 of 5</p>
              <h2 className="text-xl font-bold text-gray-900">Time Allocation</h2>
              <p className="text-sm text-gray-500 mt-1">How should your free time be split across horizons?</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {/* Fix 6: AllocationEditor onSave advances to profile-basics */}
              <AllocationEditor onSave={() => goTo("profile-basics")} />
            </div>
          </motion.div>
        )}

        {step === "profile-basics" && (
          <motion.div key="profile-basics" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex-1 flex flex-col">
            <ProfileBasics
              initial={profile}
              onNext={(data) => { setProfile((p) => ({ ...p, ...data })); goTo("profile-current"); }}
              onBack={() => goTo("allocation")}
            />
          </motion.div>
        )}

        {step === "profile-current" && (
          <motion.div key="profile-current" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex-1 flex flex-col">
            <ProfileCurrent
              initial={profile}
              onNext={(data) => { setProfile((p) => ({ ...p, ...data })); goTo("profile-vision"); }}
              onBack={() => goTo("profile-basics")}
            />
          </motion.div>
        )}

        {step === "profile-vision" && (
          <motion.div key="profile-vision" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex-1 flex flex-col">
            <ProfileVision
              initial={profile}
              onNext={(data) => {
                const complete = { ...profile, ...data } as ProfileData;
                setProfile(complete);
                generateGoals(complete);
              }}
              onBack={() => goTo("profile-current")}
            />
          </motion.div>
        )}

        {step === "loading" && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            <GoalLoading error={aiError} onRetry={generateGoals} onSkip={handleSkip} />
          </motion.div>
        )}

        {step === "review" && aiResponse && (
          <motion.div key="review" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="flex-1 flex flex-col">
            <GoalReview
              data={aiResponse}
              onConfirm={saveGoalsAndFinish}
              onBack={() => goTo("profile-vision")}
            />
          </motion.div>
        )}

        {step === "day-ready" && (
          <motion.div key="day-ready" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 flex flex-col">
            {/* Fix 3: Read from savedCounts state instead of aiResponse._counts */}
            <DayReady goalCount={savedCounts.goals} taskCount={savedCounts.tasks} onContinue={handleFinish} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
