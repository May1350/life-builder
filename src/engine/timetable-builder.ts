import type {
  WeeklyRoutineTask,
  DailyOverride,
  HorizonAllocation,
  TimetableBlock,
  HorizonKey,
} from "@/types";
import { HORIZONS, MIN_HORIZON_BLOCK_MINUTES } from "@/lib/constants";
import { timeToMinutes, minutesToTime } from "@/lib/time-utils";

interface FixedBlock {
  start: number; // minutes from midnight
  end: number;
  title: string;
  sourceId?: string;
  color?: string;
}

interface FreeGap {
  start: number;
  end: number;
  duration: number;
}

/**
 * Builds a daily timetable from routine tasks, overrides, and allocations.
 * Pure function — no side effects.
 */
export function buildDailyTimetable(
  routineTasks: WeeklyRoutineTask[],
  overrides: DailyOverride[],
  allocations: HorizonAllocation[]
): TimetableBlock[] {
  // Step 1-2: Build fixed blocks from routine + overrides
  const fixedBlocks = resolveFixedBlocks(routineTasks, overrides);

  // Step 3: Sort by start time
  fixedBlocks.sort((a, b) => a.start - b.start);

  // Step 4: Validate no overlaps (merge if found)
  const merged = mergeOverlappingBlocks(fixedBlocks);

  // Step 5-6: Find free gaps
  const gaps = findFreeGaps(merged);

  // Step 7: Fill gaps with horizon blocks
  const horizonBlocks = fillGapsWithHorizons(gaps, allocations);

  // Combine and sort all blocks
  const allBlocks: TimetableBlock[] = [
    ...merged.map(blockToTimetableBlock),
    ...horizonBlocks,
  ];

  allBlocks.sort(
    (a, b) => timeToMinutes(a.start) - timeToMinutes(b.start)
  );

  return allBlocks;
}

function resolveFixedBlocks(
  routineTasks: WeeklyRoutineTask[],
  overrides: DailyOverride[]
): FixedBlock[] {
  // Start with routine tasks
  const removedIds = new Set(
    overrides
      .filter((o) => o.action === "remove" && o.routineTaskId)
      .map((o) => o.routineTaskId!)
  );

  const blocks: FixedBlock[] = [];

  // Add routine tasks (excluding removed ones)
  for (const task of routineTasks) {
    if (task.id && removedIds.has(task.id)) continue;

    const start = timeToMinutes(task.startTime);
    const end = timeToMinutes(task.endTime);

    if (end > start) {
      blocks.push({
        start,
        end,
        title: task.title,
        sourceId: task.id,
        color: task.color,
      });
    } else if (end < start) {
      // Overnight: split at midnight
      blocks.push({
        start,
        end: 1440,
        title: task.title,
        sourceId: task.id,
        color: task.color,
      });
      blocks.push({
        start: 0,
        end,
        title: task.title,
        sourceId: task.id,
        color: task.color,
      });
    }
  }

  // Add override "add" blocks
  for (const override of overrides) {
    if (override.action !== "add" || !override.startTime || !override.endTime)
      continue;

    const start = timeToMinutes(override.startTime);
    const end = timeToMinutes(override.endTime);

    if (end > start) {
      blocks.push({
        start,
        end,
        title: override.title ?? "Event",
        sourceId: override.id,
      });
    } else if (end < start) {
      blocks.push({
        start,
        end: 1440,
        title: override.title ?? "Event",
        sourceId: override.id,
      });
      blocks.push({
        start: 0,
        end,
        title: override.title ?? "Event",
        sourceId: override.id,
      });
    }
  }

  return blocks;
}

function mergeOverlappingBlocks(blocks: FixedBlock[]): FixedBlock[] {
  if (blocks.length === 0) return [];

  const result: FixedBlock[] = [{ ...blocks[0] }];

  for (let i = 1; i < blocks.length; i++) {
    const prev = result[result.length - 1];
    const curr = blocks[i];

    if (curr.start < prev.end) {
      // Overlap: extend the previous block
      prev.end = Math.max(prev.end, curr.end);
      // Keep the title of the longer block
      if (curr.end - curr.start > prev.end - prev.start) {
        prev.title = curr.title;
        prev.sourceId = curr.sourceId;
        prev.color = curr.color;
      }
    } else {
      result.push({ ...curr });
    }
  }

  return result;
}

function findFreeGaps(fixedBlocks: FixedBlock[]): FreeGap[] {
  const gaps: FreeGap[] = [];

  if (fixedBlocks.length === 0) {
    return [{ start: 0, end: 1440, duration: 1440 }];
  }

  // Gap before first block
  if (fixedBlocks[0].start > 0) {
    gaps.push({
      start: 0,
      end: fixedBlocks[0].start,
      duration: fixedBlocks[0].start,
    });
  }

  // Gaps between blocks
  for (let i = 0; i < fixedBlocks.length - 1; i++) {
    const gapStart = fixedBlocks[i].end;
    const gapEnd = fixedBlocks[i + 1].start;
    if (gapEnd > gapStart) {
      gaps.push({
        start: gapStart,
        end: gapEnd,
        duration: gapEnd - gapStart,
      });
    }
  }

  // Gap after last block
  const lastEnd = fixedBlocks[fixedBlocks.length - 1].end;
  if (lastEnd < 1440) {
    gaps.push({
      start: lastEnd,
      end: 1440,
      duration: 1440 - lastEnd,
    });
  }

  return gaps;
}

function fillGapsWithHorizons(
  gaps: FreeGap[],
  allocations: HorizonAllocation[]
): TimetableBlock[] {
  const blocks: TimetableBlock[] = [];

  // Sort allocations by horizon order
  const sorted = [...allocations]
    .filter((a) => a.percentage > 0)
    .sort((a, b) => {
      const ha = HORIZONS.find((h) => h.key === a.horizonKey);
      const hb = HORIZONS.find((h) => h.key === b.horizonKey);
      return (ha?.order ?? 0) - (hb?.order ?? 0);
    });

  for (const gap of gaps) {
    const gapBlocks = distributeHorizonsInGap(gap, sorted);
    blocks.push(...gapBlocks);
  }

  return blocks;
}

function distributeHorizonsInGap(
  gap: FreeGap,
  allocations: HorizonAllocation[]
): TimetableBlock[] {
  const blocks: TimetableBlock[] = [];
  const totalPercentage = allocations.reduce((s, a) => s + a.percentage, 0);

  if (totalPercentage === 0 || gap.duration === 0) return blocks;

  // First pass: calculate raw minutes
  const raw = allocations.map((a) => ({
    horizonKey: a.horizonKey,
    minutes: Math.round((gap.duration * a.percentage) / totalPercentage),
    percentage: a.percentage,
  }));

  // Second pass: filter out blocks below minimum, redistribute
  const surviving = raw.filter((r) => r.minutes >= MIN_HORIZON_BLOCK_MINUTES);
  const skippedMinutes = raw
    .filter((r) => r.minutes < MIN_HORIZON_BLOCK_MINUTES)
    .reduce((s, r) => s + r.minutes, 0);

  if (surviving.length === 0) {
    // All blocks too small — give entire gap to the highest-percentage horizon
    if (allocations.length > 0 && gap.duration >= MIN_HORIZON_BLOCK_MINUTES) {
      const horizon = HORIZONS.find(
        (h) => h.key === allocations[0].horizonKey
      );
      blocks.push({
        start: minutesToTime(gap.start),
        end: minutesToTime(gap.end),
        type: "horizon",
        horizonKey: allocations[0].horizonKey,
        horizonName: horizon?.name,
        scheduledTasks: [],
        unscheduledMinutes: gap.duration,
      });
    }
    return blocks;
  }

  // Redistribute skipped time proportionally
  if (skippedMinutes > 0) {
    const survivingTotal = surviving.reduce((s, r) => s + r.percentage, 0);
    for (const s of surviving) {
      s.minutes += Math.round(
        (skippedMinutes * s.percentage) / survivingTotal
      );
    }
  }

  // Adjust rounding errors to match gap duration exactly
  const assignedTotal = surviving.reduce((s, r) => s + r.minutes, 0);
  const diff = gap.duration - assignedTotal;
  if (diff !== 0 && surviving.length > 0) {
    // Add/subtract difference from the largest block
    surviving[0].minutes += diff;
  }

  // Build blocks
  let cursor = gap.start;
  for (const s of surviving) {
    if (s.minutes <= 0) continue;
    const horizon = HORIZONS.find((h) => h.key === s.horizonKey);
    const end = Math.min(cursor + s.minutes, gap.end);
    blocks.push({
      start: minutesToTime(cursor),
      end: minutesToTime(end),
      type: "horizon",
      horizonKey: s.horizonKey as HorizonKey,
      horizonName: horizon?.name,
      scheduledTasks: [],
      unscheduledMinutes: end - cursor,
    });
    cursor = end;
  }

  return blocks;
}

function blockToTimetableBlock(block: FixedBlock): TimetableBlock {
  return {
    start: minutesToTime(block.start),
    end: minutesToTime(block.end),
    type: "fixed",
    title: block.title,
    sourceId: block.sourceId,
    color: block.color,
  };
}
