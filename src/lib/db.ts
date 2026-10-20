import Dexie, { type EntityTable } from "dexie";
import type {
  HorizonAllocation,
  WeeklyRoutineTask,
  DailyOverride,
  DailyTimetable,
  Goal,
  Task,
  AppSettings,
  UserProfile,
} from "@/types";

class LifeBuilderDB extends Dexie {
  horizonAllocations!: EntityTable<HorizonAllocation, "id">;
  weeklyRoutineTasks!: EntityTable<WeeklyRoutineTask, "id">;
  dailyOverrides!: EntityTable<DailyOverride, "id">;
  dailyTimetables!: EntityTable<DailyTimetable, "id">;
  goals!: EntityTable<Goal, "id">;
  tasks!: EntityTable<Task, "id">;
  appSettings!: EntityTable<AppSettings, "id">;
  userProfiles!: EntityTable<UserProfile, "id">;

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

    this.version(2)
      .stores({
        horizonAllocations: "++id, horizonKey",
        weeklyRoutineTasks: "++id, dayOfWeek",
        dailyOverrides: "++id, date",
        dailyTimetables: "++id, &date",
        goals: "++id, horizonKey, source",
        tasks: "++id, horizonKey, goalId, status",
        appSettings: "++id",
        userProfiles: "++id",
      })
      .upgrade((tx) => {
        return tx
          .table("goals")
          .toCollection()
          .modify((goal) => {
            goal.source = goal.source ?? "manual";
          });
      });

    this.version(3).stores({
      horizonAllocations: "++id, horizonKey",
      weeklyRoutineTasks: "++id, dayOfWeek",
      dailyOverrides: "++id, date",
      dailyTimetables: "++id, &date",
      goals: "++id, horizonKey, source, parentGoalId",
      tasks: "++id, horizonKey, goalId, status",
      appSettings: "++id",
      userProfiles: "++id",
    });

    // v4: AppSettings gets lastWeeklyReview/lastMonthlyReview (non-indexed)
    this.version(4).stores({
      horizonAllocations: "++id, horizonKey",
      weeklyRoutineTasks: "++id, dayOfWeek",
      dailyOverrides: "++id, date",
      dailyTimetables: "++id, &date",
      goals: "++id, horizonKey, source, parentGoalId",
      tasks: "++id, horizonKey, goalId, status",
      appSettings: "++id",
      userProfiles: "++id",
    });
  }
}

export const db = new LifeBuilderDB();
