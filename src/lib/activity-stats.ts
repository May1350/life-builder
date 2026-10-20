import type { Task, Goal } from "@/types";

export interface ActivityStats {
  totalCompleted: number;
  totalPending: number;
  avgCompletedMinutes: number;
  completionRate: number; // 0-1
  mostActiveHorizon: string;
  leastActiveHorizon: string;
  recentCompletions: string[]; // last 10 completed task titles
  horizonBreakdown: { horizon: string; completed: number; pending: number }[];
}

export function computeActivityStats(goals: Goal[], tasks: Task[]): ActivityStats {
  const completed = tasks.filter((t) => t.status === "completed");
  const pending = tasks.filter((t) => t.status !== "completed");

  // Average completed task duration
  const completedWithMinutes = completed.filter((t) => t.estimatedMinutes && t.estimatedMinutes > 0);
  const avgMinutes = completedWithMinutes.length > 0
    ? Math.round(completedWithMinutes.reduce((sum, t) => sum + (t.estimatedMinutes ?? 0), 0) / completedWithMinutes.length)
    : 0;

  // Per-horizon breakdown
  const horizonMap = new Map<string, { completed: number; pending: number }>();
  for (const t of tasks) {
    const h = t.horizonKey;
    if (!horizonMap.has(h)) horizonMap.set(h, { completed: 0, pending: 0 });
    const entry = horizonMap.get(h)!;
    if (t.status === "completed") entry.completed++;
    else entry.pending++;
  }

  const breakdown = Array.from(horizonMap.entries()).map(([horizon, counts]) => ({
    horizon,
    ...counts,
  }));

  // Most/least active
  const sorted = [...breakdown].sort((a, b) => b.completed - a.completed);
  const mostActive = sorted[0]?.horizon ?? "none";
  const leastActive = sorted.length > 1
    ? sorted[sorted.length - 1]?.horizon ?? "none"
    : mostActive;

  // Recent completions (last 10, newest first)
  const recent = completed
    .filter((t) => t.completedAt)
    .sort((a, b) => (b.completedAt!.getTime() - a.completedAt!.getTime()))
    .slice(0, 10)
    .map((t) => t.title);

  return {
    totalCompleted: completed.length,
    totalPending: pending.length,
    avgCompletedMinutes: avgMinutes,
    completionRate: tasks.length > 0 ? completed.length / tasks.length : 0,
    mostActiveHorizon: mostActive,
    leastActiveHorizon: leastActive,
    recentCompletions: recent,
    horizonBreakdown: breakdown,
  };
}

/**
 * Format stats as a string block for AI prompt injection.
 */
export function formatStatsForPrompt(stats: ActivityStats): string {
  if (stats.totalCompleted === 0 && stats.totalPending === 0) return "";

  let msg = `\n\n## User Activity History`;
  msg += `\n- Completed ${stats.totalCompleted} tasks, ${stats.totalPending} pending (${Math.round(stats.completionRate * 100)}% completion rate)`;
  msg += `\n- Average completed task size: ${stats.avgCompletedMinutes} minutes`;
  msg += `\n- Most active area: ${stats.mostActiveHorizon}`;
  msg += `\n- Least active area: ${stats.leastActiveHorizon}`;

  if (stats.horizonBreakdown.length > 0) {
    msg += `\n- Per horizon: ${stats.horizonBreakdown.map((h) => `${h.horizon}(${h.completed}/${h.completed + h.pending})`).join(", ")}`;
  }

  if (stats.recentCompletions.length > 0) {
    msg += `\n- Recently completed: ${stats.recentCompletions.join(", ")}`;
  }

  msg += `\n\nUse this data to calibrate difficulty: if avg task is ${stats.avgCompletedMinutes}min, generate tasks near that size. If a horizon has low completion, make its tasks easier. If high completion, increase challenge slightly.`;

  return msg;
}
