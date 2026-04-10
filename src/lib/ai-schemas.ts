import { z } from "zod";

const nlField = z.string().min(10).max(500);

const profileSchema = z.object({
  age: z.number().int().min(10).max(120),
  occupation: z.string().min(1).max(200),
  lifeStage: z.string().min(1).max(200),
  interests: z.array(z.string().max(200)).min(1).max(11),
  values: z.array(z.string().max(200)).min(2).max(3),
  currentFocus: nlField,
  desiredChange: nlField,
  neededSkills: nlField,
  midTermVision: nlField,
  lifetimeDream: nlField,
});

const routineSummarySchema = z.object({
  freeHoursWeekday: z.number().min(0).max(24),
  freeHoursWeekend: z.number().min(0).max(24),
});

const horizonKeySchema = z.enum([
  "this-week", "this-month", "this-year", "3-years", "10-years", "lifetime",
]);

const allocationsSchema = z.record(horizonKeySchema, z.number().min(0).max(100));

const existingGoalSchema = z.object({
  horizonKey: z.enum(["this-month", "this-year", "3-years", "10-years", "lifetime"]),
  title: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  keep: z.boolean().optional(),
});

// Activity stats — computed client-side, passed through to prompt builder
const activityStatsSchema = z.object({
  totalCompleted: z.number(),
  totalPending: z.number(),
  avgCompletedMinutes: z.number(),
  completionRate: z.number(),
  mostActiveHorizon: z.string(),
  leastActiveHorizon: z.string(),
  recentCompletions: z.array(z.string()),
  horizonBreakdown: z.array(z.object({
    horizon: z.string(),
    completed: z.number(),
    pending: z.number(),
  })),
}).optional();

export const generateGoalsRequestSchema = z.object({
  profile: profileSchema,
  routineSummary: routineSummarySchema,
  allocations: allocationsSchema,
  existingGoals: z.array(existingGoalSchema).optional(),
  directionChange: z.string().max(500).optional(),
  previousCoherenceThread: z.string().max(1000).optional(),
  mode: z.enum(["initial", "regenerate"]).optional(),
  locale: z.enum(["en", "ko", "ja"]).optional().default("en"),
  activityStats: activityStatsSchema,
});

const starterTaskSchema = z.object({
  title: z.string(),
  estimatedMinutes: z.number().min(5).transform((v) => Math.round(v)),
  horizonKey: horizonKeySchema,
  dueDate: z.string().optional(),
});

const generatedGoalSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  parentIndex: z.number().int().min(0).optional(),
  starterTasks: z.array(starterTaskSchema),
});

const generatableHorizonKey = z.enum([
  "this-month", "this-year", "3-years", "10-years", "lifetime",
]);

const wheelOfLifeCategory = z.enum([
  "career", "health", "relationships", "finance", "growth", "recreation",
]);

export const generateGoalsResponseSchema = z.object({
  goals: z.object({
    "this-month": z.array(generatedGoalSchema).optional().default([]),
    "this-year": z.array(generatedGoalSchema).optional().default([]),
    "3-years": z.array(generatedGoalSchema).optional().default([]),
    "10-years": z.array(generatedGoalSchema).optional().default([]),
    "lifetime": z.array(generatedGoalSchema).optional().default([]),
  }),
  wheelOfLifeBalance: z.record(wheelOfLifeCategory, z.number().min(1).max(5)),
  coherenceThread: z.string(),
});

export type GenerateGoalsRequest = z.infer<typeof generateGoalsRequestSchema>;
export type GenerateGoalsResponse = z.infer<typeof generateGoalsResponseSchema>;

// ── Health Review ──

const flaggedGoalSchema = z.object({
  goalId: z.string(),
  title: z.string(),
  horizonKey: generatableHorizonKey,
  parentGoalTitle: z.string().optional(),
  status: z.enum(["stale", "needs-next", "struggling"]),
  userResponse: z.string(),
  completedTasks: z.array(z.string()),
  pendingTasks: z.array(z.string()),
});

export const healthReviewRequestSchema = z.object({
  profile: profileSchema,
  locale: z.enum(["en", "ko", "ja"]).optional().default("en"),
  flaggedGoals: z.array(flaggedGoalSchema),
  activityStats: activityStatsSchema,
});

const goalUpdateSchema = z.object({
  goalId: z.string(),
  action: z.enum(["new-tasks", "replace-goal", "break-down"]),
  newGoal: z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(["low", "medium", "high"]),
  }).optional(),
  newTasks: z.array(z.object({
    title: z.string(),
    estimatedMinutes: z.number().min(5).transform((v) => Math.round(v)),
    horizonKey: horizonKeySchema,
    dueDate: z.string().optional(),
  })),
});

export const healthReviewResponseSchema = z.object({
  updates: z.array(goalUpdateSchema),
});

export type HealthReviewRequest = z.infer<typeof healthReviewRequestSchema>;
export type HealthReviewResponse = z.infer<typeof healthReviewResponseSchema>;
