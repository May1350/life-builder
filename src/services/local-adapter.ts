import { db } from "@/lib/db";
import type { DataService } from "./data-service";
import type {
  HorizonAllocation,
  HorizonKey,
  WeeklyRoutineTask,
  DailyOverride,
  DailyTimetable,
  Goal,
  Task,
} from "@/types";

export class LocalAdapter implements DataService {
  // ── Horizon Allocations ──

  async getAllocations(): Promise<HorizonAllocation[]> {
    return db.horizonAllocations.toArray();
  }

  async setAllocations(allocations: HorizonAllocation[]): Promise<void> {
    await db.transaction("rw", db.horizonAllocations, async () => {
      await db.horizonAllocations.clear();
      const now = new Date();
      await db.horizonAllocations.bulkAdd(
        allocations.map((a) => ({
          ...a,
          createdAt: a.createdAt ?? now,
          updatedAt: now,
        }))
      );
    });
  }

  // ── Weekly Routine Tasks ──

  async getRoutineForDay(dayOfWeek: number): Promise<WeeklyRoutineTask[]> {
    return db.weeklyRoutineTasks.where("dayOfWeek").equals(dayOfWeek).toArray();
  }

  async getAllRoutineTasks(): Promise<WeeklyRoutineTask[]> {
    return db.weeklyRoutineTasks.toArray();
  }

  async addRoutineTask(
    task: Omit<WeeklyRoutineTask, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const now = new Date();
    const id = await db.weeklyRoutineTasks.add({
      ...task,
      createdAt: now,
      updatedAt: now,
    } as WeeklyRoutineTask);
    return String(id);
  }

  async updateRoutineTask(
    id: string,
    updates: Partial<WeeklyRoutineTask>
  ): Promise<void> {
    await db.weeklyRoutineTasks.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
  }

  async deleteRoutineTask(id: string): Promise<void> {
    await db.weeklyRoutineTasks.delete(id);
  }

  // ── Daily Overrides ──

  async getOverridesForDate(date: string): Promise<DailyOverride[]> {
    return db.dailyOverrides.where("date").equals(date).toArray();
  }

  async addOverride(
    override: Omit<DailyOverride, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const now = new Date();
    const id = await db.dailyOverrides.add({
      ...override,
      createdAt: now,
      updatedAt: now,
    } as DailyOverride);
    return String(id);
  }

  async deleteOverride(id: string): Promise<void> {
    await db.dailyOverrides.delete(id);
  }

  async deleteOverridesForDate(date: string): Promise<void> {
    await db.dailyOverrides.where("date").equals(date).delete();
  }

  // ── Daily Timetables ──

  async getTimetable(date: string): Promise<DailyTimetable | undefined> {
    return db.dailyTimetables.where("date").equals(date).first();
  }

  async saveTimetable(timetable: DailyTimetable): Promise<void> {
    const existing = await this.getTimetable(timetable.date);
    if (existing?.id) {
      await db.dailyTimetables.update(existing.id, {
        ...timetable,
        modifiedAt: new Date(),
      });
    } else {
      await db.dailyTimetables.add(timetable);
    }
  }

  // ── Goals ──

  async getGoals(): Promise<Goal[]> {
    return db.goals.toArray();
  }

  async getGoalsForHorizon(horizonKey: HorizonKey): Promise<Goal[]> {
    return db.goals.where("horizonKey").equals(horizonKey).toArray();
  }

  async addGoal(
    goal: Omit<Goal, "id" | "createdAt" | "updatedAt">
  ): Promise<string> {
    const now = new Date();
    const id = await db.goals.add({
      ...goal,
      createdAt: now,
      updatedAt: now,
    } as Goal);
    return String(id);
  }

  async updateGoal(id: string, updates: Partial<Goal>): Promise<void> {
    await db.goals.update(id, { ...updates, updatedAt: new Date() });
  }

  async deleteGoal(id: string): Promise<void> {
    await db.goals.delete(id);
  }

  // ── Tasks ──

  async getTasks(): Promise<Task[]> {
    return db.tasks.toArray();
  }

  async getTasksForHorizon(horizonKey: HorizonKey): Promise<Task[]> {
    return db.tasks.where("horizonKey").equals(horizonKey).toArray();
  }

  async getAutoSchedulableTasks(): Promise<Task[]> {
    const tasks = await db.tasks
      .where("status")
      .noneOf(["completed"])
      .toArray();
    return tasks.filter(
      (t) =>
        (t.horizonKey === "this-week" || t.horizonKey === "this-month") &&
        t.estimatedMinutes != null &&
        t.estimatedMinutes > 0 &&
        t.dueDate != null
    );
  }

  async addTask(
    task: Omit<
      Task,
      "id" | "createdAt" | "updatedAt" | "completedMinutes" | "status"
    >
  ): Promise<string> {
    const now = new Date();
    const id = await db.tasks.add({
      ...task,
      completedMinutes: 0,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    } as Task);
    return String(id);
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    await db.tasks.update(id, { ...updates, updatedAt: new Date() });
  }

  async deleteTask(id: string): Promise<void> {
    await db.tasks.delete(id);
  }

  // ── App Settings ──

  async isOnboardingComplete(): Promise<boolean> {
    const settings = await db.appSettings.toCollection().first();
    return settings?.onboardingComplete ?? false;
  }

  async setOnboardingComplete(): Promise<void> {
    const now = new Date();
    const existing = await db.appSettings.toCollection().first();
    if (existing?.id) {
      await db.appSettings.update(existing.id, {
        onboardingComplete: true,
        updatedAt: now,
      });
    } else {
      await db.appSettings.add({
        onboardingComplete: true,
        createdAt: now,
        updatedAt: now,
      });
    }
  }
}
