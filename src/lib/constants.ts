import type { HorizonKey, TimeHorizon } from "@/types";

export const HORIZONS: TimeHorizon[] = [
  { key: "this-week", name: "This Week", color: "blue-500", order: 1 },
  { key: "this-month", name: "This Month", color: "cyan-500", order: 2 },
  { key: "this-year", name: "This Year", color: "green-500", order: 3 },
  { key: "3-years", name: "3 Years", color: "amber-500", order: 4 },
  { key: "10-years", name: "10 Years", color: "orange-500", order: 5 },
  { key: "lifetime", name: "Lifetime", color: "purple-500", order: 6 },
];

export const DEFAULT_ALLOCATIONS: Record<HorizonKey, number> = {
  "this-week": 30,
  "this-month": 20,
  "this-year": 20,
  "3-years": 15,
  "10-years": 10,
  lifetime: 5,
};

export const MIN_HORIZON_BLOCK_MINUTES = 10;

export const HORIZON_COLOR_MAP: Record<string, string> = {
  "blue-500": "#3b82f6",
  "cyan-500": "#06b6d4",
  "green-500": "#22c55e",
  "amber-500": "#f59e0b",
  "orange-500": "#f97316",
  "purple-500": "#a855f7",
};

export function getHorizon(key: HorizonKey): TimeHorizon {
  const h = HORIZONS.find((h) => h.key === key);
  if (!h) throw new Error(`Unknown horizon: ${key}`);
  return h;
}

export function getHorizonColor(key: HorizonKey): string {
  const h = getHorizon(key);
  return HORIZON_COLOR_MAP[h.color] ?? "#6b7280";
}
