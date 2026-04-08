"use client";

import { motion } from "framer-motion";
import { Check, SkipForward, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/engine/recommender";
import { getHorizonColor } from "@/lib/constants";
import { dataService } from "@/services";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onRefresh: () => void;
}

export function RecommendationCard({
  recommendation,
  onRefresh,
}: RecommendationCardProps) {
  const { currentBlock, primary, alternatives, primaryGoal, emptyMessage } =
    recommendation;

  const accentColor =
    currentBlock.horizonKey
      ? getHorizonColor(currentBlock.horizonKey)
      : "#6b7280";

  const handleComplete = async () => {
    if (!primary?.id) return;
    await dataService.updateTask(primary.id, {
      status: "completed",
      completedAt: new Date(),
    });
    onRefresh();
  };

  const handlePartial = async () => {
    if (!primary?.id) return;
    const minutesStr = prompt("How many minutes did you work?");
    if (!minutesStr) return;
    const minutes = parseInt(minutesStr, 10);
    if (isNaN(minutes) || minutes <= 0) return;

    await dataService.updateTask(primary.id, {
      completedMinutes: (primary.completedMinutes ?? 0) + minutes,
      status: "in_progress",
    });
    onRefresh();
  };

  if (!primary) {
    return (
      <div className="mx-4 rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
        <p className="text-sm text-gray-500 text-center">
          {emptyMessage ?? "No recommendations right now."}
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
              Goal: {primaryGoal.title}
            </p>
          )}
          {primary.estimatedMinutes && (
            <p className="text-xs text-gray-400 mt-0.5">
              {primary.estimatedMinutes - (primary.completedMinutes ?? 0)}m
              remaining
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
          onClick={handleComplete}
        >
          <Check className="h-3.5 w-3.5 mr-1" /> Done
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 text-xs"
          onClick={handlePartial}
        >
          <Clock className="h-3.5 w-3.5 mr-1" /> Partial
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-xs text-gray-400"
          onClick={onRefresh}
        >
          <SkipForward className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <p className="text-xs text-gray-400 mb-1">Also available:</p>
          {alternatives.map((alt) => (
            <p key={alt.id} className="text-xs text-gray-500 truncate">
              · {alt.title}
            </p>
          ))}
        </div>
      )}
    </motion.div>
  );
}
