"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { buildDailyTimetable } from "@/engine/timetable-builder";
import { tomorrowString, getDayOfWeek } from "@/lib/time-utils";
import { getHorizonColor } from "@/lib/constants";
import { CircularChart } from "@/components/chart/circular-chart";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, RotateCcw, Lock } from "lucide-react";
import Link from "next/link";
import { dataService } from "@/services";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function TomorrowPage() {
  const tomorrow = tomorrowString();
  const dow = getDayOfWeek(tomorrow);
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("10:00");
  const [newEnd, setNewEnd] = useState("12:00");

  const data = useLiveQuery(async () => {
    const [routine, overrides, allocations] = await Promise.all([
      db.weeklyRoutineTasks.where("dayOfWeek").equals(dow).toArray(),
      db.dailyOverrides.where("date").equals(tomorrow).toArray(),
      db.horizonAllocations.toArray(),
    ]);
    if (allocations.length === 0) return { blocks: [], overrides, routine };
    const blocks = buildDailyTimetable(routine, overrides, allocations);
    return { blocks, overrides, routine };
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

  return (
    <div className="min-h-dvh bg-white" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header */}
      <div className="flex items-center px-4 py-3">
        <Link href="/">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <h1 className="flex-1 text-center text-sm font-semibold text-gray-900">
          Tomorrow · {dayNames[dow]}
        </h1>
        <div className="w-5" />
      </div>

      {/* Mini chart */}
      <div className="flex justify-center py-4">
        <CircularChart blocks={data.blocks} size={180} showHand={false} />
      </div>

      {/* Timeline */}
      <div className="px-4 space-y-1">
        {data.blocks
          .filter((b) => b.start >= "06:00")
          .map((block, i) => {
            const isFixed = block.type === "fixed";
            const isFromRoutine = isFixed && block.sourceId && data.routine.some(r => r.id === block.sourceId);
            const color = isFixed
              ? "#d1d5db"
              : block.horizonKey
                ? getHorizonColor(block.horizonKey)
                : "#d1d5db";

            return (
              <button
                key={`${block.start}-${i}`}
                onClick={() => {
                  if (isFromRoutine && block.sourceId) {
                    if (confirm(`Remove "${block.title}" for tomorrow?`)) {
                      handleRemoveRoutineTask(block.sourceId);
                    }
                  }
                }}
                className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs text-gray-400 font-mono w-14 shrink-0">
                  {block.start}-{block.end}
                </span>
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm text-gray-700 flex-1 truncate">
                  {isFixed ? block.title : block.horizonName}
                </span>
                {isFromRoutine && (
                  <Lock className="h-3 w-3 text-gray-300" />
                )}
              </button>
            );
          })}
      </div>

      {/* Actions */}
      <div className="px-4 mt-4 space-y-2">
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
