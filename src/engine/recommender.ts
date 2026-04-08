import type { Task, TimetableBlock, Goal } from "@/types";
import { timeToMinutes } from "@/lib/time-utils";

export interface Recommendation {
  currentBlock: TimetableBlock;
  primary: Task | null;
  alternatives: Task[];
  /** Goal associated with the primary task */
  primaryGoal?: Goal;
  /** Message when no tasks are available */
  emptyMessage?: string;
}

/**
 * Given the current time and today's timetable, recommends what to work on.
 */
export function getRecommendation(
  currentTime: string,
  blocks: TimetableBlock[],
  tasks: Task[],
  goals: Goal[]
): Recommendation {
  const now = timeToMinutes(currentTime);

  // Find current block
  const currentBlock = blocks.find((b) => {
    const start = timeToMinutes(b.start);
    const end = timeToMinutes(b.end);
    return now >= start && now < end;
  });

  if (!currentBlock) {
    // Between blocks or outside schedule
    const nextHorizonBlock = blocks.find(
      (b) => b.type === "horizon" && timeToMinutes(b.start) > now
    );
    return {
      currentBlock: nextHorizonBlock ?? blocks[0] ?? createEmptyBlock(),
      primary: null,
      alternatives: [],
      emptyMessage: nextHorizonBlock
        ? `Next: ${nextHorizonBlock.horizonName} at ${nextHorizonBlock.start}`
        : "No scheduled blocks remaining today.",
    };
  }

  // Fixed block: no recommendation
  if (currentBlock.type === "fixed") {
    return {
      currentBlock,
      primary: null,
      alternatives: [],
      emptyMessage: `Current: ${currentBlock.title}`,
    };
  }

  // Horizon block: check auto-scheduled tasks first
  if (
    currentBlock.scheduledTasks &&
    currentBlock.scheduledTasks.length > 0
  ) {
    const scheduledIds = new Set(
      currentBlock.scheduledTasks.map((s) => s.taskId)
    );
    const scheduledTaskObjects = tasks.filter(
      (t) => t.id && scheduledIds.has(t.id) && t.status !== "completed"
    );

    if (scheduledTaskObjects.length > 0) {
      const primary = scheduledTaskObjects[0];
      const goal = primary.goalId
        ? goals.find((g) => g.id === primary.goalId)
        : undefined;

      return {
        currentBlock,
        primary,
        alternatives: scheduledTaskObjects.slice(1, 4),
        primaryGoal: goal,
      };
    }
  }

  // Recommendation from pool
  const horizonKey = currentBlock.horizonKey;
  if (!horizonKey) {
    return {
      currentBlock,
      primary: null,
      alternatives: [],
      emptyMessage: "No tasks for this block.",
    };
  }

  // Filter eligible tasks
  const eligible = tasks.filter(
    (t) => t.horizonKey === horizonKey && t.status !== "completed"
  );

  if (eligible.length === 0) {
    return {
      currentBlock,
      primary: null,
      alternatives: [],
      emptyMessage: `All done for ${currentBlock.horizonName}! Add a new task?`,
    };
  }

  // Sort by priority rules
  const sorted = sortByPriority(eligible, goals);

  const primary = sorted[0];
  const goal = primary.goalId
    ? goals.find((g) => g.id === primary.goalId)
    : undefined;

  return {
    currentBlock,
    primary,
    alternatives: sorted.slice(1, 4),
    primaryGoal: goal,
  };
}

function sortByPriority(tasks: Task[], goals: Goal[]): Task[] {
  const goalMap = new Map(goals.map((g) => [g.id, g]));
  const priorityOrder = { high: 0, medium: 1, low: 2 };

  return [...tasks].sort((a, b) => {
    // 1. Due date ascending (null = last)
    if (a.dueDate && b.dueDate) {
      const cmp = a.dueDate.localeCompare(b.dueDate);
      if (cmp !== 0) return cmp;
    } else if (a.dueDate && !b.dueDate) return -1;
    else if (!a.dueDate && b.dueDate) return 1;

    // 2. Status: in_progress before pending
    if (a.status === "in_progress" && b.status !== "in_progress") return -1;
    if (a.status !== "in_progress" && b.status === "in_progress") return 1;

    // 3. Goal priority
    const ga = a.goalId ? goalMap.get(a.goalId) : undefined;
    const gb = b.goalId ? goalMap.get(b.goalId) : undefined;
    const pa = ga ? priorityOrder[ga.priority] : 2;
    const pb = gb ? priorityOrder[gb.priority] : 2;
    if (pa !== pb) return pa - pb;

    // 4. Created date ascending (older first)
    return (
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  });
}

function createEmptyBlock(): TimetableBlock {
  return {
    start: "00:00",
    end: "00:00",
    type: "fixed",
    title: "No schedule",
  };
}
