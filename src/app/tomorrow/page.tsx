"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { buildDailyTimetable } from "@/engine/timetable-builder";
import { tomorrowString, getDayOfWeek } from "@/lib/time-utils";
import { getHorizonColor } from "@/lib/constants";
import { CircularChart } from "@/components/chart/circular-chart";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, RotateCcw, Lock, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import { dataService } from "@/services";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/providers/locale-provider";
import type { TimetableBlock, Task } from "@/types";

export default function TomorrowPage() {
  const { t } = useLocale();
  const tomorrow = tomorrowString();
  const dow = getDayOfWeek(tomorrow);
  const dayNames = [t("day.Sun"), t("day.Mon"), t("day.Tue"), t("day.Wed"), t("day.Thu"), t("day.Fri"), t("day.Sat")];

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("10:00");
  const [newEnd, setNewEnd] = useState("12:00");
  const [expandedBlock, setExpandedBlock] = useState<number | null>(null);

  const data = useLiveQuery(async () => {
    const [routine, overrides, allocations, tasks] = await Promise.all([
      db.weeklyRoutineTasks.where("dayOfWeek").equals(dow).toArray(),
      db.dailyOverrides.where("date").equals(tomorrow).toArray(),
      db.horizonAllocations.toArray(),
      db.tasks.toArray(),
    ]);
    if (allocations.length === 0) return { blocks: [], overrides, routine, tasks };
    const blocks = buildDailyTimetable(routine, overrides, allocations);
    return { blocks, overrides, routine, tasks };
  }, [tomorrow, dow]);

  const handleRemoveRoutineTask = async (routineTaskId: string) => {
    await dataService.addOverride({
      date: tomorrow,
      action: "remove",
      routineTaskId,
    });
  };

  const handleAddOneTime = async () => {
    if (!newTitle.trim()) return;
    await dataService.addOverride({
      date: tomorrow,
      action: "add",
      title: newTitle.trim(),
      startTime: newStart,
      endTime: newEnd,
    });
    setNewTitle("");
    setShowAddForm(false);
  };

  const handleReset = async () => {
    await dataService.deleteOverridesForDate(tomorrow);
  };

  if (!data) return null;

  const getTasksForBlock = (block: TimetableBlock): Task[] => {
    if (!block.horizonKey || !data.tasks) return [];
    return data.tasks.filter(
      (task) => task.horizonKey === block.horizonKey && task.status !== "completed",
    );
  };

  return (
    <div className="min-h-dvh bg-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header */}
      <div className="flex items-center px-4 py-3">
        <Link href="/" className="p-2 -ml-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <h1 className="flex-1 text-center text-sm font-semibold text-gray-900">
          {t("tomorrow.prefix")} {dayNames[dow]}
        </h1>
        <div className="w-[44px]" />
      </div>

      {/* Mini chart */}
      <div className="flex justify-center py-4">
        <CircularChart blocks={data.blocks} size={180} showHand={false} />
      </div>

      {/* Timeline */}
      <div className="px-4 space-y-0.5">
        {data.blocks
          .filter((b) => b.start >= "06:00")
          .map((block, i) => {
            const isFixed = block.type === "fixed";
            const isFromRoutine = isFixed && block.sourceId && data.routine.some(r => r.id === block.sourceId);
            const isHorizon = block.type === "horizon";
            const color = isFixed
              ? "#d1d5db"
              : block.horizonKey
                ? getHorizonColor(block.horizonKey)
                : "#d1d5db";
            const tasks = isHorizon ? getTasksForBlock(block) : [];
            const isExpanded = expandedBlock === i;

            return (
              <div key={`${block.start}-${i}`}>
                <button
                  onClick={() => {
                    if (isHorizon && tasks.length > 0) {
                      setExpandedBlock(isExpanded ? null : i);
                    } else if (isFromRoutine && block.sourceId) {
                      if (confirm(`Remove "${block.title}" for tomorrow?`)) {
                        handleRemoveRoutineTask(block.sourceId);
                      }
                    }
                  }}
                  className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <span className="text-xs text-gray-400 font-mono w-[90px] shrink-0">
                    {block.start}–{block.end}
                  </span>
                  <div
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-sm text-gray-700 flex-1 truncate">
                    {isFixed ? block.title : block.horizonName}
                  </span>
                  {isHorizon && tasks.length > 0 && (
                    isExpanded
                      ? <ChevronDown className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                      : <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                  )}
                  {isFromRoutine && (
                    <Lock className="h-3 w-3 text-gray-300 shrink-0" />
                  )}
                </button>

                {/* Expanded tasks for horizon block */}
                {isExpanded && tasks.length > 0 && (
                  <div className="ml-[114px] mb-1 space-y-0.5">
                    {tasks.slice(0, 5).map((task) => (
                      <div key={task.id} className="flex items-center gap-2 py-1">
                        <div className="h-1.5 w-1.5 rounded-full bg-gray-300 shrink-0" />
                        <span className="text-xs text-gray-500 truncate">{task.title}</span>
                        {task.estimatedMinutes && (
                          <span className="text-xs text-gray-300 shrink-0">
                            {task.estimatedMinutes - (task.completedMinutes ?? 0)}m
                          </span>
                        )}
                      </div>
                    ))}
                    {tasks.length > 5 && (
                      <p className="text-xs text-gray-300">+{tasks.length - 5} more</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Actions */}
      <div className="px-4 mt-4 pb-8 space-y-2">
        {showAddForm ? (
          <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
            <Input
              placeholder="Event name"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              autoFocus
            />
            <div className="flex gap-2">
              <Input
                type="time"
                value={newStart}
                onChange={(e) => setNewStart(e.target.value)}
              />
              <Input
                type="time"
                value={newEnd}
                onChange={(e) => setNewEnd(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddOneTime} className="flex-1">
                Add
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-1" /> Add one-time task
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-gray-400"
          onClick={handleReset}
        >
          <RotateCcw className="h-4 w-4 mr-1" /> Reset to routine
        </Button>
      </div>
    </div>
  );
}
