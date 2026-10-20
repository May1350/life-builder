import type { Goal, Task, HorizonKey } from "@/types";

export type HealthStatus = "healthy" | "stale" | "needs-next" | "struggling";

export interface GoalHealth {
  goalId: string;
  status: HealthStatus;
  reasonKey: string;
  daysSinceActivity: number;
  completionRate: number;
}

const SHORT_HORIZONS: HorizonKey[] = ["this-week", "this-month", "this-year"];

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getLastActivity(tasks: Task[], goalCreatedAt: Date): Date {
  let latest = goalCreatedAt;
  for (const t of tasks) {
    if (t.completedAt && t.completedAt > latest) latest = t.completedAt;
    if (t.updatedAt && t.updatedAt > latest) latest = t.updatedAt;
  }
  return latest;
}

export function detectGoalHealth(
  goals: Goal[],
  tasks: Task[],
  now: Date = new Date(),
): GoalHealth[] {
  const tasksByGoal = new Map<string, Task[]>();
  for (const t of tasks) {
    if (!t.goalId) continue;
    const gid = String(t.goalId);
    if (!tasksByGoal.has(gid)) tasksByGoal.set(gid, []);
    tasksByGoal.get(gid)!.push(t);
  }

  const results: GoalHealth[] = [];

  for (const goal of goals) {
    const gid = String(goal.id);
    const goalTasks = tasksByGoal.get(gid) ?? [];

    if (goalTasks.length === 0) continue; // new goal with no tasks — skip

    const completed = goalTasks.filter((t) => t.status === "completed");
    const pending = goalTasks.filter((t) => t.status !== "completed");
    const completionRate = completed.length / goalTasks.length;
    const lastActivity = getLastActivity(goalTasks, goal.createdAt);
    const daysSince = daysBetween(lastActivity, now);

    // Rule: needs-next — all tasks done
    if (pending.length === 0 && completed.length > 0) {
      results.push({
        goalId: gid,
        status: "needs-next",
        reasonKey: "healthReview.needsNext.reason",
        daysSinceActivity: daysSince,
        completionRate,
      });
      continue;
    }

    // Rule: stale — no activity in 7+ days
    if (daysSince >= 7) {
      results.push({
        goalId: gid,
        status: "stale",
        reasonKey: "healthReview.stale.reason",
        daysSinceActivity: daysSince,
        completionRate,
      });
      continue;
    }

    // Rule: struggling — started but stuck (short horizons only)
    if (SHORT_HORIZONS.includes(goal.horizonKey)) {
      const startedButStuck = pending.filter(
        (t) => (t.completedMinutes ?? 0) > 0
      );
      const goalAge = daysBetween(goal.createdAt, now);

      if (startedButStuck.length >= 3 || (goalAge >= 14 && completed.length === 0)) {
        results.push({
          goalId: gid,
          status: "struggling",
          reasonKey: "healthReview.struggling.reason",
          daysSinceActivity: daysSince,
          completionRate,
        });
        continue;
      }
    }

    // healthy — not added to results
  }

  return results;
}
