"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RoutineEditor } from "@/components/routine/routine-editor";
import { AllocationEditor } from "@/components/horizons/allocation-editor";
import { dataService } from "@/services";

type Step = "welcome" | "routine" | "allocation";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("welcome");
  const router = useRouter();

  const handleFinish = async () => {
    await dataService.setOnboardingComplete();
    router.push("/");
  };

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
              Welcome to
              <br />
              Life <span className="font-black">Builder</span>
            </h1>
            <p className="text-gray-500 mt-4 text-center text-sm max-w-xs">
              Design your day with intention. Allocate time across what matters
              — from this week to your lifetime goals.
            </p>
            <Button
              className="mt-8 px-8"
              onClick={() => setStep("routine")}
            >
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
              <p className="text-xs text-gray-400 mb-1">Step 1 of 2</p>
              <h2 className="text-xl font-bold text-gray-900">
                Your Weekly Routine
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Add your regular commitments for each day.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <RoutineEditor />
            </div>

            <Button
              className="mt-4 w-full"
              onClick={() => setStep("allocation")}
            >
              Next
            </Button>
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
              <p className="text-xs text-gray-400 mb-1">Step 2 of 2</p>
              <h2 className="text-xl font-bold text-gray-900">
                Time Allocation
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                How should your free time be split across horizons?
              </p>
            </div>

            <div className="flex-1 overflow-y-auto">
              <AllocationEditor onSave={handleFinish} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
