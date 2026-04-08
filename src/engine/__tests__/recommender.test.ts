import { describe, it, expect } from "vitest";
import { getRecommendation } from "../recommender";
import type { Task, TimetableBlock, Goal } from "@/types";

const now = new Date();

function makeTask(overrides: Partial<Task> & { title: string }): Task {
  return {
    id: overrides.id ?? Math.random().toString(36).slice(2),
    horizonKey: "this-year",
    completedMinutes: 0,
    status: "pending",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

const sampleBlocks: TimetableBlock[] = [
  { start: "00:00", end: "07:00", type: "fixed", title: "Sleep" },
  {
    start: "07:00",
    end: "10:00",
    type: "horizon",
    horizonKey: "this-week",
    horizonName: "This Week",
    scheduledTasks: [
      { taskId: "hw-1", title: "Finish homework", minutes: 60 },
    ],
    unscheduledMinutes: 120,
  },
  { start: "10:00", end: "15:00", type: "fixed", title: "School" },
  {
    start: "15:00",
    end: "18:00",
    type: "horizon",
    horizonKey: "this-year",
    horizonName: "This Year",
    scheduledTasks: [],
    unscheduledMinutes: 180,
  },
];

describe("getRecommendation", () => {
  it("should return emptyMessage for fixed blocks", () => {
    const rec = getRecommendation("03:00", sampleBlocks, [], []);
    expect(rec.emptyMessage).toBe("Current: Sleep");
    expect(rec.primary).toBeNull();
  });

  it("should return auto-scheduled task when available", () => {
    const tasks: Task[] = [
      makeTask({
        id: "hw-1",
        title: "Finish homework",
        horizonKey: "this-week",
      }),
    ];

    const rec = getRecommendation("08:00", sampleBlocks, tasks, []);
    expect(rec.primary?.title).toBe("Finish homework");
  });

  it("should recommend from pool for horizon blocks without scheduled tasks", () => {
    const tasks: Task[] = [
      makeTask({
        id: "t1",
        title: "Study JLPT",
        horizonKey: "this-year",
        dueDate: "2026-12-31",
      }),
      makeTask({
        id: "t2",
        title: "Read textbook",
        horizonKey: "this-year",
      }),
    ];

    const rec = getRecommendation("16:00", sampleBlocks, tasks, []);
    expect(rec.primary?.title).toBe("Study JLPT"); // has dueDate, comes first
    expect(rec.alternatives.length).toBe(1);
    expect(rec.alternatives[0].title).toBe("Read textbook");
  });

  it("should prioritize in_progress tasks", () => {
    const tasks: Task[] = [
      makeTask({ id: "t1", title: "Pending", horizonKey: "this-year" }),
      makeTask({
        id: "t2",
        title: "In progress",
        horizonKey: "this-year",
        status: "in_progress",
      }),
    ];

    const rec = getRecommendation("16:00", sampleBlocks, tasks, []);
    expect(rec.primary?.title).toBe("In progress");
  });

  it("should include goal context", () => {
    const goals: Goal[] = [
      {
        id: "g1",
        horizonKey: "this-year",
        title: "Learn Japanese",
        priority: "high",
        createdAt: now,
        updatedAt: now,
      },
    ];

    const tasks: Task[] = [
      makeTask({
        id: "t1",
        title: "Study JLPT",
        horizonKey: "this-year",
        goalId: "g1",
      }),
    ];

    const rec = getRecommendation("16:00", sampleBlocks, tasks, goals);
    expect(rec.primaryGoal?.title).toBe("Learn Japanese");
  });

  it("should show empty message when no tasks exist for horizon", () => {
    const rec = getRecommendation("16:00", sampleBlocks, [], []);
    expect(rec.emptyMessage).toContain("All done");
  });

  it("should exclude completed tasks", () => {
    const tasks: Task[] = [
      makeTask({
        id: "t1",
        title: "Done task",
        horizonKey: "this-year",
        status: "completed",
      }),
    ];

    const rec = getRecommendation("16:00", sampleBlocks, tasks, []);
    expect(rec.primary).toBeNull();
  });
});
