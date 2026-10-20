"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/locale-provider";

interface InsightCard {
  label: string;
  value: string;
}

interface Props {
  error: boolean;
  onRetry: () => void;
  onSkip: () => void;
  onCancel?: () => void;
  profile?: Record<string, unknown>;
}

const PHASE_KEYS = [
  "loading.insight.analyzing",
  "loading.insight.designing",
  "loading.insight.optimizing",
  "loading.insight.finalizing",
] as const;

const PHASE_INTERVAL = 3000;
const CARD_STAGGER = 1500;

export function GoalLoading({ error, onRetry, onSkip, onCancel, profile }: Props) {
  const { t } = useLocale();
  const [phase, setPhase] = useState(0);
  const [visibleCards, setVisibleCards] = useState(0);

  useEffect(() => {
    if (error) return;
    const interval = setInterval(() => {
      setPhase((prev) => (prev < PHASE_KEYS.length - 1 ? prev + 1 : prev));
    }, PHASE_INTERVAL);
    return () => clearInterval(interval);
  }, [error]);

  // Build 7 insight cards from profile data
  const insights = useMemo<InsightCard[]>(() => {
    if (!profile) return [];
    const cards: InsightCard[] = [];

    // 1. Profile (age + life stage)
    const age = profile.age;
    const lifeStage = profile.lifeStage;
    if (age && lifeStage) {
      cards.push({
        label: t("loading.insight.profile"),
        value: t("loading.insight.profileValue", {
          age: String(age),
          stage: t(`tag.${lifeStage}`) || String(lifeStage),
        }),
      });
    }

    // 2. Occupation
    const occupation = profile.occupation;
    if (typeof occupation === "string" && occupation) {
      cards.push({
        label: t("loading.insight.occupation"),
        value: occupation,
      });
    }

    // 3. Interests (translated tags)
    const interests = profile.interests;
    if (Array.isArray(interests) && interests.length > 0) {
      cards.push({
        label: t("loading.insight.interests"),
        value: interests.slice(0, 4).map((i: string) => t(`tag.${i}`) || i).join(", "),
      });
    }

    // 4. Values (translated tags)
    const values = profile.values;
    if (Array.isArray(values) && values.length > 0) {
      cards.push({
        label: t("loading.insight.values"),
        value: values.map((v: string) => t(`tag.${v}`) || v).join(" · "),
      });
    }

    // 5. Current focus
    const focus = profile.currentFocus;
    if (typeof focus === "string" && focus.length > 0) {
      cards.push({
        label: t("loading.insight.focus"),
        value: focus.length > 50 ? focus.slice(0, 47) + "..." : focus,
      });
    }

    // 6. Desired change
    const change = profile.desiredChange;
    if (typeof change === "string" && change.length > 0) {
      cards.push({
        label: t("loading.insight.change"),
        value: change.length > 50 ? change.slice(0, 47) + "..." : change,
      });
    }

    // 7. Vision
    const vision = profile.midTermVision;
    if (typeof vision === "string" && vision.length > 0) {
      cards.push({
        label: t("loading.insight.vision"),
        value: vision.length > 50 ? vision.slice(0, 47) + "..." : vision,
      });
    }

    return cards;
  }, [profile, t]);

  // Stagger cards
  useEffect(() => {
    if (error || insights.length === 0) return;
    if (visibleCards >= insights.length) return;

    const timeout = setTimeout(() => {
      setVisibleCards((prev) => prev + 1);
    }, CARD_STAGGER);
    return () => clearTimeout(timeout);
  }, [error, visibleCards, insights.length]);

  const progress = Math.min(((phase + 1) / PHASE_KEYS.length) * 95, 95);

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
    <div className="flex-1 flex flex-col px-6 pt-12">
      {/* Phase text */}
      <div className="text-center mb-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={phase}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-sm font-medium text-gray-900"
          >
            {t(PHASE_KEYS[phase])}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full bg-gray-900 rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
      </div>

      {/* Insight cards — staggered, scrollable */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pb-4">
        <AnimatePresence>
          {insights.slice(0, visibleCards).map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="rounded-xl bg-gray-50 px-4 py-3"
            >
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-0.5">
                {card.label}
              </p>
              <p className="text-sm font-medium text-gray-700">{card.value}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Cancel button */}
      {onCancel && (
        <div className="text-center py-4">
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
