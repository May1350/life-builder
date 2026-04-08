import { describe, it, expect } from "vitest";
import { autoScheduleTasks } from "../auto-scheduler";
import type { Task, TimetableBlock } from "@/types";

const now = new Date();

function makeTask(overrides: Partial<Task> & { title: string }): Task {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    horizonKey: "this-week",
    completedMinutes: 0,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeHorizonBlock(
  start: string,
  end: string,
  horizonKey: string,
  minutes: number
): TimetableBlock {
  return {
    start,
    end,
    type: "horizon",
    horizonKey: horizonKey as TimetableBlock["horizonKey"],
    horizonName: horizonKey,
    scheduledTasks: [],
    unscheduledMinutes: minutes,
  };
}

describe("autoScheduleTasks", () => {
  it("should distribute a task evenly across days until deadline", () => {
    const blocks: TimetableBlock[] = [
      makeHorizonBlock("08:00", "12:00", "this-week", 240),
    ];

    const tasks: Task[] = [
      makeTask({
        title: "Homework",
        horizonKey: "this-week",
        estimatedMinutes: 180,
        dueDate: "2026-04-11", // 3 days away
      }),
    ];

    const result = autoScheduleTasks(blocks, tasks, "2026-04-08");

    // 180m / 3 days = 60m per day
    const scheduled = result.blocks[0].scheduledTasks!;
    expect(scheduled.length).toBe(1);
    expect(scheduled[0].minutes).toBe(60);
    expect(scheduled[0].title).toBe("Homework");
  });

  it("should front-load all time when due today", () => {
    const blocks: TimetableBlock[] = [
      makeHorizonBlock("08:00", "12:00", "this-week", 240),
    ];

    const tasks: Task[] = [
      makeTask({
        title: "Urgent",
        horizonKey: "this-week",
        estimatedMinutes: 120,
        dueDate: "2026-04-08",
      }),
    ];

    const result = autoScheduleTasks(blocks, tasks, "2026-04-08");
    const scheduled = result.blocks[0].scheduledTasks!;
    expect(scheduled[0].minutes).toBe(120); // all remaining
  });

  it("should respect block capacity limits", () => {
    const blocks: TimetableBlock[] = [
      makeHorizonBlock("08:00", "08:30", "this-week", 30),
    ];

    const tasks: Task[] = [
      makeTask({
        title: "Big Task",
        horizonKey: "this-week",
        estimatedMinutes: 300,
        dueDate: "2026-04-08",
      }),
    ];

    const result = autoScheduleTasks(blocks, tasks, "2026-04-08");
    const scheduled = result.blocks[0].scheduledTasks!;
    expect(scheduled[0].minutes).toBe(30); // capped at capacity
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0].taskTitle).toBe("Big Task");
  });

  it("should account for completedMinutes", () => {
    const blocks: TimetableBlock[] = [
      makeHorizonBlock("08:00", "12:00", "this-week", 240),
    ];

    const tasks: Task[] = [
      makeTask({
        title: "Partially done",
        horizonKey: "this-week",
        estimatedMinutes: 180,
        completedMinutes: 120,
        dueDate: "2026-04-10", // 2 days
      }),
    ];

    const result = autoScheduleTasks(blocks, tasks, "2026-04-08");
    const scheduled = result.blocks[0].scheduledTasks!;
    // remaining = 180 - 120 = 60, 60 / 2 days = 30m
    expect(scheduled[0].minutes).toBe(30);
  });

  it("should sort tasks by deadline (tightest first)", () => {
    const blocks: TimetableBlock[] = [
      makeHorizonBlock("08:00", "12:00", "this-week", 240),
    ];

    const tasks: Task[] = [
      makeTask({
        id: "later",
        title: "Later task",
        horizonKey: "this-week",
        estimatedMinutes: 60,
        dueDate: "2026-04-15",
      }),
      makeTask({
        id: "urgent",
        title: "Urgent task",
        horizonKey: "this-week",
        estimatedMinutes: 60,
        dueDate: "2026-04-09",
      }),
    ];

    const result = autoScheduleTasks(blocks, tasks, "2026-04-08");
    const scheduled = result.blocks[0].scheduledTasks!;
    expect(scheduled[0].title).toBe("Urgent task");
  });

  it("should only schedule tasks matching the horizon", () => {
    const blocks: TimetableBlock[] = [
      makeHorizonBlock("08:00", "12:00", "this-week", 240),
      makeHorizonBlock("13:00", "15:00", "this-month", 120),
    ];

    const tasks: Task[] = [
      makeTask({
        title: "Weekly",
        horizonKey: "this-week",
        estimatedMinutes: 60,
        dueDate: "2026-04-10",
      }),
      makeTask({
        title: "Monthly",
        horizonKey: "this-month",
        estimatedMinutes: 60,
        dueDate: "2026-04-20",
      }),
    ];

    const result = autoScheduleTasks(blocks, tasks, "2026-04-08");
    expect(result.blocks[0].scheduledTasks![0].title).toBe("Weekly");
    expect(result.blocks[1].scheduledTasks![0].title).toBe("Monthly");
  });
});
