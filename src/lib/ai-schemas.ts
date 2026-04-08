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

export const generateGoalsRequestSchema = z.object({
  profile: profileSchema,
  routineSummary: routineSummarySchema,
  allocations: allocationsSchema,
  existingGoals: z.array(existingGoalSchema).optional(),
  directionChange: z.string().max(500).optional(),
  previousCoherenceThread: z.string().optional(),
  mode: z.enum(["initial", "regenerate"]).optional(),
});

const starterTaskSchema = z.object({
  title: z.string(),
  estimatedMinutes: z.number().int().min(5),
  horizonKey: horizonKeySchema,
  dueDate: z.string().optional(),
});

const generatedGoalSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  starterTasks: z.array(starterTaskSchema).max(3),
});

const generatableHorizonKey = z.enum([
  "this-month", "this-year", "3-years", "10-years", "lifetime",
]);

const wheelOfLifeCategory = z.enum([
  "career", "health", "relationships", "finance", "growth", "recreation",
]);

export const generateGoalsResponseSchema = z.object({
  goals: z.record(generatableHorizonKey, z.array(generatedGoalSchema).max(5)),
  wheelOfLifeBalance: z.record(wheelOfLifeCategory, z.number().min(1).max(5)),
  coherenceThread: z.string().max(500),
});

export type GenerateGoalsRequest = z.infer<typeof generateGoalsRequestSchema>;
export type GenerateGoalsResponse = z.infer<typeof generateGoalsResponseSchema>;
