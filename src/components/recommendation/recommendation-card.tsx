"use client";

import { motion } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/engine/recommender";
import { getHorizonColor } from "@/lib/constants";
import { dataService } from "@/services";
import { useLocale } from "@/providers/locale-provider";
import { timeToMinutes, nowTime } from "@/lib/time-utils";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onRefresh: () => void;
}

export function RecommendationCard({
  recommendation,
  onRefresh,
}: RecommendationCardProps) {
  const { t } = useLocale();
  const { currentBlock, primary, alternatives, primaryGoal, emptyMessage } =
    recommendation;

  const accentColor =
    currentBlock.horizonKey
      ? getHorizonColor(currentBlock.horizonKey)
      : "#6b7280";

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

  if (!primary) {
    return (
      <div className="mx-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 text-center">
          {emptyMessage ?? t("rec.empty")}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100"
    >
      {/* Primary task */}
      <div className="flex items-start gap-3">
        <div
          className="mt-1 h-3 w-3 rounded-full shrink-0"
          style={{ backgroundColor: accentColor }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {primary.title}
          </p>
          {primaryGoal && (
            <p className="text-xs text-gray-500 mt-0.5">
              {t("rec.goal")} {primaryGoal.title}
            </p>
          )}
          {primary.estimatedMinutes && (
            <p className="text-xs text-gray-400 mt-0.5">
              {primary.estimatedMinutes - (primary.completedMinutes ?? 0)}m
              {" "}{t("rec.remaining")}
            </p>
          )}
        </div>
      </div>

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

      {/* Next task preview */}
      {alternatives.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 truncate">
            {t("rec.upNext")} ▸ {alternatives[0].title}
          </p>
        </div>
      )}
    </motion.div>
  );
}
