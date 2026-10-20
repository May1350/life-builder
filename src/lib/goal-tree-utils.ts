import type { Goal, Task, HorizonKey } from "@/types";

export interface TreeNode {
  goal: Goal;
  children: TreeNode[];
  tasks: Task[];
  depth: number;
}

const HORIZON_ORDER: Record<HorizonKey, number> = {
  "lifetime": 0,
  "10-years": 1,
  "3-years": 2,
  "this-year": 3,
  "this-month": 4,
  "this-week": 5,
};

/**
 * Build a forest (array of root trees) from flat goal + task arrays.
 * Goals without parentGoalId are roots.
 * Tasks attach to their goalId.
 */
export function buildGoalTree(goals: Goal[], tasks: Task[]): TreeNode[] {
  // Index tasks by goalId
  const tasksByGoal = new Map<string, Task[]>();
  for (const t of tasks) {
    if (t.goalId === undefined) continue;
    const gid = String(t.goalId);
    if (!tasksByGoal.has(gid)) tasksByGoal.set(gid, []);
    tasksByGoal.get(gid)!.push(t);
  }

  // Index goals by id
  const goalMap = new Map<string, Goal>();
  for (const g of goals) {
    if (g.id !== undefined) goalMap.set(String(g.id), g);
  }

  // Build children map
  const childrenMap = new Map<string, Goal[]>();
  const roots: Goal[] = [];

  for (const g of goals) {
    if (g.parentGoalId !== undefined && goalMap.has(String(g.parentGoalId))) {
      const pid = String(g.parentGoalId);
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(g);
    } else {
      roots.push(g);
    }
  }

  // Sort by horizon order
  const sortByHorizon = (a: Goal, b: Goal) =>
    (HORIZON_ORDER[a.horizonKey] ?? 99) - (HORIZON_ORDER[b.horizonKey] ?? 99);

  roots.sort(sortByHorizon);
  for (const children of childrenMap.values()) {
    children.sort(sortByHorizon);
  }

  // Recursively build tree nodes
  function buildNode(goal: Goal, depth: number): TreeNode {
    const gid = String(goal.id);
    const children = (childrenMap.get(gid) ?? []).map((c) =>
      buildNode(c, depth + 1)
    );
    const goalTasks = tasksByGoal.get(gid) ?? [];
    return {
      goal,
      children,
      tasks: goalTasks.filter((t) => t.status !== "completed"),
      depth,
    };
  }

  return roots.map((r) => buildNode(r, 0));
}
