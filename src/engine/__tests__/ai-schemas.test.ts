import { describe, it, expect } from "vitest";
import {
  generateGoalsRequestSchema,
  generateGoalsResponseSchema,
} from "@/lib/ai-schemas";

describe("generateGoalsRequestSchema", () => {
  it("should accept a valid initial request", () => {
    const input = {
      profile: {
        age: 28,
        occupation: "Software Engineer",
        lifeStage: "Early Career",
        interests: ["Technology", "Finance"],
        values: ["Growth", "Freedom"],
        currentFocus: "Building coding skills and side projects",
        desiredChange: "Want more autonomy in my career",
        neededSkills: "System design and leadership",
        midTermVision: "Lead a small engineering team at a startup",
        lifetimeDream: "Build a company that helps people learn to code",
      },
      routineSummary: { freeHoursWeekday: 5, freeHoursWeekend: 10 },
      allocations: {
        "this-week": 30,
        "this-month": 20,
        "this-year": 20,
        "3-years": 15,
        "10-years": 10,
        lifetime: 5,
      },
      mode: "initial" as const,
    };
    const result = generateGoalsRequestSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it("should reject natural language fields over 500 chars", () => {
    const input = {
      profile: {
        age: 28,
        occupation: "Engineer",
        lifeStage: "Early Career",
        interests: ["Tech"],
        values: ["Growth"],
        currentFocus: "x".repeat(501),
        desiredChange: "Valid",
        neededSkills: "Valid",
        midTermVision: "Valid",
        lifetimeDream: "Valid",
      },
      routineSummary: { freeHoursWeekday: 5, freeHoursWeekend: 10 },
      allocations: {
        "this-week": 30, "this-month": 20, "this-year": 20,
        "3-years": 15, "10-years": 10, lifetime: 5,
      },
    };
    const result = generateGoalsRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });

  it("should reject fields under 10 chars", () => {
    const input = {
      profile: {
        age: 28,
        occupation: "Engineer",
        lifeStage: "Early Career",
        interests: ["Tech"],
        values: ["Growth"],
        currentFocus: "short",
        desiredChange: "Valid input here",
        neededSkills: "Valid input here",
        midTermVision: "Valid input here",
        lifetimeDream: "Valid input here",
      },
      routineSummary: { freeHoursWeekday: 5, freeHoursWeekend: 10 },
      allocations: {
        "this-week": 30, "this-month": 20, "this-year": 20,
        "3-years": 15, "10-years": 10, lifetime: 5,
      },
    };
    const result = generateGoalsRequestSchema.safeParse(input);
    expect(result.success).toBe(false);
  });
});

describe("generateGoalsResponseSchema", () => {
  it("should accept a valid response", () => {
    const response = {
      goals: {
        "this-month": [
          {
            title: "Complete React patterns course",
            description: "Master advanced React patterns for production apps",
            priority: "high",
            starterTasks: [
              { title: "Enroll in course", estimatedMinutes: 15, horizonKey: "this-week", dueDate: "2026-04-13" },
              { title: "Complete module 1", estimatedMinutes: 120, horizonKey: "this-month", dueDate: "2026-04-30" },
            ],
          },
        ],
        "this-year": [
          {
            title: "Get promoted to senior",
            description: "Demonstrate technical leadership",
            priority: "high",
            starterTasks: [
              { title: "Schedule 1:1 with manager", estimatedMinutes: 30, horizonKey: "this-week", dueDate: "2026-04-13" },
            ],
          },
        ],
        "3-years": [
          {
            title: "Transition to tech lead",
            description: "Lead a team of 3-5 engineers",
            priority: "medium",
            starterTasks: [],
          },
        ],
        "10-years": [
          {
            title: "Launch a tech education startup",
            description: "Help 100k people learn to code",
            priority: "medium",
            starterTasks: [],
          },
        ],
        lifetime: [
          {
            title: "Democratize technical education globally",
            description: "Make quality tech education accessible to everyone",
            priority: "high",
            starterTasks: [],
          },
        ],
      },
      wheelOfLifeBalance: { career: 4, health: 2, relationships: 2, finance: 3, growth: 5, recreation: 1 },
      coherenceThread: "Career growth through education, building toward entrepreneurship in ed-tech.",
    };
    const result = generateGoalsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("should reject more than 5 goals per horizon", () => {
    const goals = Array.from({ length: 6 }, (_, i) => ({
      title: `Goal ${i}`,
      description: `Description ${i}`,
      priority: "medium" as const,
      starterTasks: [],
    }));
    const response = {
      goals: {
        "this-month": goals,
        "this-year": [], "3-years": [], "10-years": [], lifetime: [],
      },
      wheelOfLifeBalance: { career: 3, health: 3, relationships: 3, finance: 3, growth: 3, recreation: 3 },
      coherenceThread: "Thread",
    };
    const result = generateGoalsResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });

  it("should reject more than 3 starter tasks per goal", () => {
    const tasks = Array.from({ length: 4 }, (_, i) => ({
      title: `Task ${i}`, estimatedMinutes: 30, horizonKey: "this-month" as const,
    }));
    const response = {
      goals: {
        "this-month": [{ title: "G", description: "D", priority: "medium" as const, starterTasks: tasks }],
        "this-year": [], "3-years": [], "10-years": [], lifetime: [],
      },
      wheelOfLifeBalance: { career: 3, health: 3, relationships: 3, finance: 3, growth: 3, recreation: 3 },
      coherenceThread: "Thread",
    };
    const result = generateGoalsResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });
});
