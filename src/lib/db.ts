import Dexie, { type EntityTable } from "dexie";
import type {
  HorizonAllocation,
  WeeklyRoutineTask,
  DailyOverride,
  DailyTimetable,
  Goal,
  Task,
  AppSettings,
} from "@/types";

class LifeBuilderDB extends Dexie {
  horizonAllocations!: EntityTable<HorizonAllocation, "id">;
  weeklyRoutineTasks!: EntityTable<WeeklyRoutineTask, "id">;
  dailyOverrides!: EntityTable<DailyOverride, "id">;
  dailyTimetables!: EntityTable<DailyTimetable, "id">;
  goals!: EntityTable<Goal, "id">;
  tasks!: EntityTable<Task, "id">;
  appSettings!: EntityTable<AppSettings, "id">;

  constructor() {
    super("LifeBuilderDB");

    this.version(1).stores({
      horizonAllocations: "++id, horizonKey",
      weeklyRoutineTasks: "++id, dayOfWeek",
      dailyOverrides: "++id, date",
      dailyTimetables: "++id, &date",
      goals: "++id, horizonKey",
      tasks: "++id, horizonKey, goalId, status",
      appSettings: "++id",
    });
  }
}

export const db = new LifeBuilderDB();
