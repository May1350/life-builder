import type {
  HorizonAllocation,
  HorizonKey,
  WeeklyRoutineTask,
  DailyOverride,
  DailyTimetable,
  Goal,
  Task,
} from "@/types";

export interface DataService {
  // Horizon Allocations
  getAllocations(): Promise<HorizonAllocation[]>;
  setAllocations(allocations: HorizonAllocation[]): Promise<void>;

  // Weekly Routine Tasks
  getRoutineForDay(dayOfWeek: number): Promise<WeeklyRoutineTask[]>;
  getAllRoutineTasks(): Promise<WeeklyRoutineTask[]>;
  addRoutineTask(task: Omit<WeeklyRoutineTask, "id" | "createdAt" | "updatedAt">): Promise<string>;
  updateRoutineTask(id: string, updates: Partial<WeeklyRoutineTask>): Promise<void>;
  deleteRoutineTask(id: string): Promise<void>;

  // Daily Overrides
  getOverridesForDate(date: string): Promise<DailyOverride[]>;
  addOverride(override: Omit<DailyOverride, "id" | "createdAt" | "updatedAt">): Promise<string>;
  deleteOverride(id: string): Promise<void>;
  deleteOverridesForDate(date: string): Promise<void>;

  // Daily Timetables
  getTimetable(date: string): Promise<DailyTimetable | undefined>;
  saveTimetable(timetable: DailyTimetable): Promise<void>;

  // Goals
  getGoals(): Promise<Goal[]>;
  getGoalsForHorizon(horizonKey: HorizonKey): Promise<Goal[]>;
  addGoal(goal: Omit<Goal, "id" | "createdAt" | "updatedAt">): Promise<string>;
  updateGoal(id: string, updates: Partial<Goal>): Promise<void>;
  deleteGoal(id: string): Promise<void>;

  // Tasks
  getTasks(): Promise<Task[]>;
  getTasksForHorizon(horizonKey: HorizonKey): Promise<Task[]>;
  getAutoSchedulableTasks(): Promise<Task[]>;
  addTask(task: Omit<Task, "id" | "createdAt" | "updatedAt" | "completedMinutes" | "status">): Promise<string>;
  updateTask(id: string, updates: Partial<Task>): Promise<void>;
  deleteTask(id: string): Promise<void>;

  // App Settings
  isOnboardingComplete(): Promise<boolean>;
  setOnboardingComplete(): Promise<void>;
}
