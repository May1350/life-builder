"use client";

import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { buildDailyTimetable } from "@/engine/timetable-builder";
import { tomorrowString, getDayOfWeek } from "@/lib/time-utils";
import { getHorizonColor } from "@/lib/constants";
import { ChevronRight } from "lucide-react";

export function TomorrowStrip() {
  const tomorrow = tomorrowString();
  const dow = getDayOfWeek(tomorrow);

  const blocks = useLiveQuery(async () => {
    const [routine, overrides, allocations] = await Promise.all([
      db.weeklyRoutineTasks.where("dayOfWeek").equals(dow).toArray(),
      db.dailyOverrides.where("date").equals(tomorrow).toArray(),
      db.horizonAllocations.toArray(),
    ]);
    if (allocations.length === 0) return [];
    return buildDailyTimetable(routine, overrides, allocations);
  }, [tomorrow, dow]);

  if (!blocks || blocks.length === 0) return null;

  // Show first 4 blocks as preview
  const preview = blocks.filter((b) => b.start >= "07:00").slice(0, 4);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="mx-4 mt-4">
      <Link
        href="/tomorrow"
        className="flex items-center justify-between mb-2"
      >
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Tomorrow · {dayNames[dow]}
        </span>
        <span className="text-xs text-gray-400 flex items-center gap-0.5">
          Edit <ChevronRight className="h-3 w-3" />
        </span>
      </Link>
      <div className="space-y-1">
        {preview.map((block, i) => (
          <div
            key={`${block.start}-${i}`}
            className="flex items-center gap-2 text-xs"
          >
            <span className="text-gray-400 font-mono w-12 shrink-0">
              {block.start.slice(0, 5)}
            </span>
            <div
              className="h-2 w-2 rounded-full shrink-0"
              style={{
                backgroundColor:
                  block.type === "fixed"
                    ? "#d1d5db"
                    : block.horizonKey
                      ? getHorizonColor(block.horizonKey)
                      : "#d1d5db",
              }}
            />
            <span className="text-gray-600 truncate">
              {block.type === "fixed" ? block.title : block.horizonName}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
