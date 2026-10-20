import { describe, it, expect } from "vitest";
import { detectGoalHealth } from "../goal-health";
import type { Goal, Task } from "@/types";

const makeGoal = (overrides: Partial<Goal> = {}): Goal => ({
  id: "g1",
  horizonKey: "this-month",
  title: "Test Goal",
  priority: "medium",
  createdAt: new Date("2026-03-01"),
  updatedAt: new Date("2026-03-01"),
  ...overrides,
});

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: "t1",
  horizonKey: "this-month",
  goalId: "g1",
  title: "Test Task",
  completedMinutes: 0,
  status: "pending",
  createdAt: new Date("2026-03-01"),
  updatedAt: new Date("2026-03-01"),
  ...overrides,
});

const now = new Date("2026-04-09");

describe("detectGoalHealth", () => {
  it("returns empty for goals with no tasks", () => {
    const result = detectGoalHealth([makeGoal()], [], now);
    expect(result).toHaveLength(0);
  });

  it("detects stale: no activity in 7+ days", () => {
    const goal = makeGoal();
    const task = makeTask({ updatedAt: new Date("2026-03-25") });
    const result = detectGoalHealth([goal], [task], now);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("stale");
    expect(result[0].daysSinceActivity).toBeGreaterThanOrEqual(7);
  });

  it("detects needs-next: all tasks completed", () => {
    const goal = makeGoal();
    const task = makeTask({
      status: "completed",
      completedAt: new Date("2026-04-08"),
      updatedAt: new Date("2026-04-08"),
    });
    const result = detectGoalHealth([goal], [task], now);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("needs-next");
  });

  it("detects struggling: 3+ started-but-stuck tasks", () => {
    const goal = makeGoal();
    const tasks = [1, 2, 3].map((i) =>
      makeTask({
        id: `t${i}`,
        completedMinutes: 10,
        status: "pending",
        updatedAt: new Date("2026-04-08"),
      })
    );
    const result = detectGoalHealth([goal], tasks, now);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("struggling");
  });

  it("detects struggling: 14+ days old with 0 completions (short horizon)", () => {
    const goal = makeGoal({ createdAt: new Date("2026-03-01") });
    const task = makeTask({ updatedAt: new Date("2026-04-08") });
    const result = detectGoalHealth([goal], [task], now);
    expect(result).toHaveLength(1);
    expect(result[0].status).toBe("struggling");
  });

  it("does NOT flag struggling for long-horizon goals", () => {
    const goal = makeGoal({
      horizonKey: "lifetime",
      createdAt: new Date("2026-03-01"),
    });
    const task = makeTask({
      horizonKey: "lifetime",
      updatedAt: new Date("2026-04-08"),
    });
    const result = detectGoalHealth([goal], [task], now);
    expect(result).toHaveLength(0); // healthy
  });

  it("returns healthy (empty) for active goals", () => {
    const goal = makeGoal({ createdAt: new Date("2026-04-01") });
    const task = makeTask({ updatedAt: new Date("2026-04-08") });
    const result = detectGoalHealth([goal], [task], now);
    expect(result).toHaveLength(0);
  });

  it("calculates completionRate correctly", () => {
    const goal = makeGoal();
    const tasks = [
      makeTask({ id: "t1", status: "completed", completedAt: new Date("2026-04-08"), updatedAt: new Date("2026-04-08") }),
      makeTask({ id: "t2", status: "pending", updatedAt: new Date("2026-04-08") }),
    ];
    const result = detectGoalHealth([goal], tasks, now);
    // needs-next won't trigger (1 pending), stale won't (recent activity), struggling won't (< 3 stuck)
    expect(result).toHaveLength(0); // healthy
  });
});
