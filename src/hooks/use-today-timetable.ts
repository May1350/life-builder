"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { buildDailyTimetable } from "@/engine/timetable-builder";
import { autoScheduleTasks } from "@/engine/auto-scheduler";
import { todayString, getDayOfWeek } from "@/lib/time-utils";
import type { TimetableBlock } from "@/types";
import type { AutoScheduleWarning } from "@/engine/auto-scheduler";

interface TodayTimetable {
  blocks: TimetableBlock[];
  warnings: AutoScheduleWarning[];
  isLoading: boolean;
}

export function useTodayTimetable(): TodayTimetable {
  const today = todayString();
  const dow = getDayOfWeek(today);

  const result = useLiveQuery(async () => {
    const [routine, overrides, allocations, tasks] = await Promise.all([
      db.weeklyRoutineTasks.where("dayOfWeek").equals(dow).toArray(),
      db.dailyOverrides.where("date").equals(today).toArray(),
      db.horizonAllocations.toArray(),
      db.tasks
        .where("status")
        .noneOf(["completed"])
        .toArray()
        .then((all) =>
          all.filter(
            (t) =>
              (t.horizonKey === "this-week" || t.horizonKey === "this-month") &&
              t.estimatedMinutes != null &&
              t.estimatedMinutes > 0 &&
              t.dueDate != null
          )
        ),
    ]);

    if (allocations.length === 0) {
      return { blocks: [], warnings: [] };
    }

    const blocks = buildDailyTimetable(routine, overrides, allocations);
    const { blocks: scheduled, warnings } = autoScheduleTasks(
      blocks,
      tasks,
      today
    );

    return { blocks: scheduled, warnings };
  }, [today, dow]);

  return {
    blocks: result?.blocks ?? [],
    warnings: result?.warnings ?? [],
    isLoading: result === undefined,
  };
}
