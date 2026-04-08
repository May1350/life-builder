import { timeToMinutes } from "@/lib/time-utils";

const FULL_CIRCLE = 2 * Math.PI;

/**
 * Converts a time string ("HH:mm") to angle in radians.
 * 00:00 = top (12 o'clock), clockwise.
 */
export function timeToAngle(time: string): number {
  const minutes = timeToMinutes(time);
  // 0 minutes = -PI/2 (top), full day = -PI/2 + 2PI
  return (minutes / 1440) * FULL_CIRCLE - Math.PI / 2;
}

/**
 * Converts angle in radians to x,y coordinates on a circle.
 */
export function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angle: number
): { x: number; y: number } {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

/**
 * Generates an SVG arc path `d` attribute for a segment.
 */
export function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startTime: string,
  endTime: string,
  innerRadius: number = 0
): string {
  const startAngle = timeToAngle(startTime);
  const endAngle = timeToAngle(endTime);

  const start = polarToCartesian(cx, cy, radius, startAngle);
  const end = polarToCartesian(cx, cy, radius, endAngle);

  // Determine if arc is > 180 degrees
  let angleDiff = endAngle - startAngle;
  if (angleDiff < 0) angleDiff += FULL_CIRCLE;
  const largeArc = angleDiff > Math.PI ? 1 : 0;

  if (innerRadius > 0) {
    // Donut segment
    const innerStart = polarToCartesian(cx, cy, innerRadius, startAngle);
    const innerEnd = polarToCartesian(cx, cy, innerRadius, endAngle);
    return [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
      `L ${innerEnd.x} ${innerEnd.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${innerStart.x} ${innerStart.y}`,
      "Z",
    ].join(" ");
  }

  // Pie segment
  return [
    `M ${cx} ${cy}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

/**
 * Calculates the midpoint angle for a time range (for label placement).
 */
export function midAngle(startTime: string, endTime: string): number {
  const s = timeToAngle(startTime);
  const e = timeToAngle(endTime);
  let diff = e - s;
  if (diff < 0) diff += FULL_CIRCLE;
  return s + diff / 2;
}

/**
 * Extends tap area for small segments by adding padding.
 * Returns a larger arc path for the invisible hit area.
 */
export function describeHitArea(
  cx: number,
  cy: number,
  radius: number,
  startTime: string,
  endTime: string,
  padding: number = 15
): string {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  const duration = endMinutes - startMinutes;

  // Only extend small segments (< 30 minutes)
  if (duration >= 30) {
    return describeArc(cx, cy, radius, startTime, endTime);
  }

  // Add padding in minutes
  const paddedStart = Math.max(0, startMinutes - padding);
  const paddedEnd = Math.min(1440, endMinutes + padding);

  const padStartTime = `${Math.floor(paddedStart / 60)
    .toString()
    .padStart(2, "0")}:${(paddedStart % 60).toString().padStart(2, "0")}`;
  const padEndTime = `${Math.floor(paddedEnd / 60)
    .toString()
    .padStart(2, "0")}:${(paddedEnd % 60).toString().padStart(2, "0")}`;

  return describeArc(cx, cy, radius, padStartTime, padEndTime);
}
