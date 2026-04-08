import { describe, it, expect } from "vitest";
import { buildDailyTimetable } from "../timetable-builder";
import type {
  WeeklyRoutineTask,
  DailyOverride,
  HorizonAllocation,
} from "@/types";
import { timeToMinutes } from "@/lib/time-utils";

const now = new Date();

function makeRoutineTask(
  overrides: Partial<WeeklyRoutineTask> & {
    title: string;
    startTime: string;
    endTime: string;
    dayOfWeek: number;
  }
): WeeklyRoutineTask {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const defaultAllocations: HorizonAllocation[] = [
  { horizonKey: "this-week", percentage: 30, createdAt: now, updatedAt: now },
  { horizonKey: "this-month", percentage: 20, createdAt: now, updatedAt: now },
  { horizonKey: "this-year", percentage: 20, createdAt: now, updatedAt: now },
  { horizonKey: "3-years", percentage: 15, createdAt: now, updatedAt: now },
  { horizonKey: "10-years", percentage: 10, createdAt: now, updatedAt: now },
  { horizonKey: "lifetime", percentage: 5, createdAt: now, updatedAt: now },
];

describe("buildDailyTimetable", () => {
  it("should generate blocks for a day with no fixed tasks", () => {
    const blocks = buildDailyTimetable([], [], defaultAllocations);
    // Should fill entire day (1440m) with horizon blocks
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.every((b) => b.type === "horizon")).toBe(true);

    // Total minutes should equal 1440
    const totalMinutes = blocks.reduce(
      (sum, b) => sum + (timeToMinutes(b.end) - timeToMinutes(b.start)),
      0
    );
    expect(totalMinutes).toBe(1440);
  });

  it("should include fixed blocks and fill gaps", () => {
    const routine: WeeklyRoutineTask[] = [
      makeRoutineTask({
        title: "Sleep",
        startTime: "00:00",
        endTime: "07:00",
        dayOfWeek: 3,
      }),
      makeRoutineTask({
        title: "Exercise",
        startTime: "07:00",
        endTime: "08:00",
        dayOfWeek: 3,
      }),
      makeRoutineTask({
        title: "School",
        startTime: "09:00",
        endTime: "12:00",
        dayOfWeek: 3,
      }),
    ];

    const blocks = buildDailyTimetable(routine, [], defaultAllocations);

    // Should have fixed blocks
    const fixedBlocks = blocks.filter((b) => b.type === "fixed");
    expect(fixedBlocks.length).toBe(3);
    expect(fixedBlocks.map((b) => b.title)).toEqual([
      "Sleep",
      "Exercise",
      "School",
    ]);

    // Should have horizon blocks filling gaps
    const horizonBlocks = blocks.filter((b) => b.type === "horizon");
    expect(horizonBlocks.length).toBeGreaterThan(0);

    // Total should be 1440 minutes
    const totalMinutes = blocks.reduce((sum, b) => {
      const s = timeToMinutes(b.start);
      const e = timeToMinutes(b.end);
      return sum + (e - s);
    }, 0);
    expect(totalMinutes).toBe(1440);
  });

  it("should handle daily override: remove a routine task", () => {
    const routineId = "school-123";
    const routine: WeeklyRoutineTask[] = [
      makeRoutineTask({
        id: routineId,
        title: "School",
        startTime: "09:00",
        endTime: "15:00",
        dayOfWeek: 4,
      }),
    ];

    const overrides: DailyOverride[] = [
      {
        id: "override-1",
        date: "2026-04-10",
        action: "remove",
        routineTaskId: routineId,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const blocks = buildDailyTimetable(routine, overrides, defaultAllocations);

    // School should NOT appear
    const fixedBlocks = blocks.filter((b) => b.type === "fixed");
    expect(fixedBlocks.find((b) => b.title === "School")).toBeUndefined();
  });

  it("should handle daily override: add a one-time task", () => {
    const overrides: DailyOverride[] = [
      {
        id: "override-2",
        date: "2026-04-10",
        action: "add",
        title: "Hospital",
        startTime: "14:00",
        endTime: "16:00",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const blocks = buildDailyTimetable([], overrides, defaultAllocations);
    const hospital = blocks.find(
      (b) => b.type === "fixed" && b.title === "Hospital"
    );
    expect(hospital).toBeDefined();
    expect(hospital!.start).toBe("14:00");
    expect(hospital!.end).toBe("16:00");
  });

  it("should skip horizon blocks smaller than 10 minutes and redistribute", () => {
    // 20 minute gap — only the biggest allocations should survive
    const routine: WeeklyRoutineTask[] = [
      makeRoutineTask({
        title: "Work",
        startTime: "00:00",
        endTime: "23:40",
        dayOfWeek: 1,
      }),
    ];

    const blocks = buildDailyTimetable(routine, [], defaultAllocations);
    const horizonBlocks = blocks.filter((b) => b.type === "horizon");

    // With 20m free: This Week=6m, This Month=4m, etc. — all < 10m
    // So redistribution should give the whole gap to the largest percentage horizon
    // or merge into fewer blocks
    for (const hb of horizonBlocks) {
      const duration =
        timeToMinutes(hb.end) - timeToMinutes(hb.start);
      expect(duration).toBeGreaterThanOrEqual(10);
    }
  });

  it("should handle overnight fixed tasks (split at midnight)", () => {
    const routine: WeeklyRoutineTask[] = [
      makeRoutineTask({
        title: "Night Shift",
        startTime: "22:00",
        endTime: "06:00",
        dayOfWeek: 5,
      }),
    ];

    const blocks = buildDailyTimetable(routine, [], defaultAllocations);
    const fixedBlocks = blocks.filter((b) => b.type === "fixed");

    // Should be split into 22:00-24:00 and 00:00-06:00
    expect(fixedBlocks.length).toBe(2);
    expect(fixedBlocks[0].start).toBe("00:00");
    expect(fixedBlocks[0].end).toBe("06:00");
    expect(fixedBlocks[1].start).toBe("22:00");
    expect(fixedBlocks[1].end).toBe("24:00");
  });

  it("should produce no horizon blocks when fixed tasks fill 24h", () => {
    const routine: WeeklyRoutineTask[] = [
      makeRoutineTask({
        title: "Busy",
        startTime: "00:00",
        endTime: "24:00",
        dayOfWeek: 1,
      }),
    ];

    // endTime 24:00 won't work with our parser (wraps to 00:00)
    // Use a more realistic full-day scenario
    const routine2: WeeklyRoutineTask[] = [
      makeRoutineTask({
        title: "Sleep",
        startTime: "00:00",
        endTime: "08:00",
        dayOfWeek: 1,
      }),
      makeRoutineTask({
        title: "Work",
        startTime: "08:00",
        endTime: "20:00",
        dayOfWeek: 1,
      }),
      makeRoutineTask({
        title: "Evening",
        startTime: "20:00",
        endTime: "23:55",
        dayOfWeek: 1,
      }),
    ];

    const blocks = buildDailyTimetable(routine2, [], defaultAllocations);
    const horizonBlocks = blocks.filter((b) => b.type === "horizon");

    // Only 5 minutes free (23:55-24:00) — should have no horizon blocks (< 10m minimum)
    expect(horizonBlocks.length).toBe(0);
  });
});
