// ============================================================
// Time Horizon (constant, not stored in DB)
// ============================================================

export type HorizonKey =
  | "this-week"
  | "this-month"
  | "this-year"
  | "3-years"
  | "10-years"
  | "lifetime";

export interface TimeHorizon {
  key: HorizonKey;
  name: string;
  color: string; // Tailwind color token
  order: number; // 1-6
}

// ============================================================
// Generatable Horizons (excludes this-week from AI generation)
// ============================================================

export type GeneratableHorizonKey = Exclude<HorizonKey, "this-week">;

// ============================================================
// Wheel of Life Categories
// ============================================================

export type WheelOfLifeCategory =
  | "career"
  | "health"
  | "relationships"
  | "finance"
  | "growth"
  | "recreation";

// ============================================================
// Horizon Allocation
// ============================================================

export interface HorizonAllocation {
  id?: string;
  horizonKey: HorizonKey;
  percentage: number; // 0-100, all must sum to 100
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Weekly Routine Task
// ============================================================

export interface WeeklyRoutineTask {
  id?: string;
  title: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ... 6=Sat
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  color?: string; // optional Tailwind color token for chart
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Daily Override
// ============================================================

export type OverrideAction = "add" | "remove";

export interface DailyOverride {
  id?: string;
  date: string; // "YYYY-MM-DD"
  action: OverrideAction;
  routineTaskId?: string; // for "remove" action
  title?: string; // for "add" action
  startTime?: string; // for "add" action
  endTime?: string; // for "add" action
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Daily Timetable (auto-generated, cached)
// ============================================================

export type BlockType = "fixed" | "horizon";

export interface ScheduledTask {
  taskId: string;
  title: string;
  minutes: number;
}

export interface TimetableBlock {
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  type: BlockType;
  // fixed block fields
  title?: string;
  sourceId?: string; // routineTaskId or overrideId
  color?: string;
  // horizon block fields
  horizonKey?: HorizonKey;
  horizonName?: string;
  scheduledTasks?: ScheduledTask[];
  unscheduledMinutes?: number;
}

export interface DailyTimetable {
  id?: string;
  date: string; // "YYYY-MM-DD"
  blocks: TimetableBlock[];
  isConfirmed: boolean;
  generatedAt: Date;
  modifiedAt: Date;
}

// ============================================================
// Goal
// ============================================================

export type Priority = "low" | "medium" | "high";

export interface Goal {
  id?: string;
  horizonKey: HorizonKey;
  title: string;
  description?: string;
  priority: Priority;
  source?: "manual" | "ai-generated";
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// Task
// ============================================================

export type TaskStatus = "pending" | "in_progress" | "completed";
export type EnergyLevel = "high" | "medium" | "low";
export type RepeatCycle = "daily" | "weekly" | "monthly";

export interface Task {
  id?: string;
  horizonKey: HorizonKey;
  goalId?: string;
  title: string;
  dueDate?: string; // "YYYY-MM-DD"
  estimatedMinutes?: number;
  completedMinutes: number; // logged progress (default 0)
  energyLevel?: EnergyLevel;
  repeatCycle?: RepeatCycle;
  location?: string;
  status: TaskStatus;
  createdAt: Date;
  completedAt?: Date;
  updatedAt: Date;
}

// ============================================================
// App State
// ============================================================

export interface AppSettings {
  id?: string;
  onboardingComplete: boolean;
  onboardingStep?: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================
// User Profile (AI goal generation input)
// ============================================================

export interface UserProfile {
  id?: string;
  age: number;
  occupation: string;
  lifeStage: string;
  interests: string[];
  values: string[];
  currentFocus: string;
  desiredChange: string;
  neededSkills: string;
  midTermVision: string;
  lifetimeDream: string;
  coherenceThread?: string;
  wheelOfLifeBalance?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}
