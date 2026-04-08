/**
 * Converts "HH:mm" to total minutes from midnight.
 */
export function timeToMinutes(time: string): number {
  if (time === "24:00") return 1440;
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Converts total minutes from midnight to "HH:mm".
 */
export function minutesToTime(minutes: number): string {
  // Special case: 1440 = end of day "24:00"
  if (minutes === 1440) return "24:00";
  const clamped = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

/**
 * Calculates duration in minutes between two "HH:mm" times.
 * Handles overnight (startTime > endTime) by assuming next day.
 */
export function durationMinutes(start: string, end: string): number {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (e > s) return e - s;
  if (e === s) return 0;
  // overnight: e.g. 23:00 -> 02:00 = 180m
  return 1440 - s + e;
}

/**
 * Returns today's date as "YYYY-MM-DD".
 */
export function todayString(): string {
  return formatDate(new Date());
}

/**
 * Returns tomorrow's date as "YYYY-MM-DD".
 */
export function tomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return formatDate(d);
}

/**
 * Formats a Date to "YYYY-MM-DD".
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Gets day of week (0=Sun ... 6=Sat) from "YYYY-MM-DD".
 */
export function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr + "T00:00:00").getDay();
}

/**
 * Calculates days between two "YYYY-MM-DD" dates.
 */
export function daysBetween(from: string, to: string): number {
  const a = new Date(from + "T00:00:00");
  const b = new Date(to + "T00:00:00");
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Returns current time as "HH:mm".
 */
export function nowTime(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

/**
 * Calculates free hours from a list of routine tasks for a given day.
 * Free hours = 24 - total hours occupied by routine tasks.
 * Used by both onboarding (profile summary) and settings (goal reset).
 */
export function calculateFreeHours(
  routineTasks: { startTime: string; endTime: string }[]
): number {
  const totalRoutineMinutes = routineTasks.reduce(
    (sum, task) => sum + durationMinutes(task.startTime, task.endTime),
    0
  );
  const freeMinutes = Math.max(0, 1440 - totalRoutineMinutes);
  return Math.round((freeMinutes / 60) * 10) / 10; // 1 decimal place
}
