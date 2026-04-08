import type { Task, TimetableBlock, ScheduledTask } from "@/types";
import { daysBetween } from "@/lib/time-utils";

export interface AutoScheduleResult {
  /** Updated blocks with scheduledTasks populated */
  blocks: TimetableBlock[];
  /** Tasks that couldn't fit before their deadline */
  warnings: AutoScheduleWarning[];
}

export interface AutoScheduleWarning {
  taskId: string;
  taskTitle: string;
  remainingMinutes: number;
  availableMinutes: number;
}

/**
 * Distributes auto-schedulable tasks into horizon blocks for a given date.
 * Mutates the blocks' scheduledTasks and unscheduledMinutes fields.
 */
export function autoScheduleTasks(
  blocks: TimetableBlock[],
  tasks: Task[],
  date: string
): AutoScheduleResult {
  const warnings: AutoScheduleWarning[] = [];

  // Sort tasks by deadline (tightest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate.localeCompare(b.dueDate);
  });

  // Build a map of horizon capacity
  const horizonCapacity = new Map<string, number>();
  for (const block of blocks) {
    if (block.type !== "horizon" || !block.horizonKey) continue;
    const current = horizonCapacity.get(block.horizonKey) ?? 0;
    horizonCapacity.set(
      block.horizonKey,
      current + (block.unscheduledMinutes ?? 0)
    );
  }

  for (const task of sortedTasks) {
    if (!task.dueDate || !task.estimatedMinutes || !task.id) continue;

    const remaining = task.estimatedMinutes - (task.completedMinutes ?? 0);
    if (remaining <= 0) continue;

    const daysUntilDue = daysBetween(date, task.dueDate);

    // Calculate how much to schedule today
    let dailyAllocation: number;
    if (daysUntilDue <= 0) {
      // Due today or overdue: front-load everything
      dailyAllocation = remaining;
    } else {
      dailyAllocation = Math.ceil(remaining / daysUntilDue);
    }

    // Distribute into matching horizon blocks
    let assigned = 0;
    for (const block of blocks) {
      if (
        block.type !== "horizon" ||
        block.horizonKey !== task.horizonKey ||
        !block.unscheduledMinutes ||
        block.unscheduledMinutes <= 0
      ) {
        continue;
      }

      const toAssign = Math.min(
        dailyAllocation - assigned,
        block.unscheduledMinutes
      );

      if (toAssign <= 0) continue;

      if (!block.scheduledTasks) block.scheduledTasks = [];
      block.scheduledTasks.push({
        taskId: task.id,
        title: task.title,
        minutes: toAssign,
      });
      block.unscheduledMinutes -= toAssign;
      assigned += toAssign;

      if (assigned >= dailyAllocation) break;
    }

    // Check if task is at risk
    if (assigned < dailyAllocation) {
      const totalAvailable = horizonCapacity.get(task.horizonKey) ?? 0;
      if (remaining > totalAvailable) {
        warnings.push({
          taskId: task.id,
          taskTitle: task.title,
          remainingMinutes: remaining,
          availableMinutes: totalAvailable,
        });
      }
    }
  }

  return { blocks, warnings };
}
