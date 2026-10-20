import { describe, it, expect } from "vitest";
import { buildSystemPrompt, buildUserMessage } from "@/lib/ai-prompt";
import type { GenerateGoalsRequest } from "@/lib/ai-schemas";

const baseRequest: GenerateGoalsRequest = {
  profile: {
    age: 28,
    occupation: "Software Engineer",
    lifeStage: "Early Career",
    interests: ["Technology", "Finance"],
    values: ["Growth", "Freedom"],
    currentFocus: "Building my coding skills",
    desiredChange: "Want more career autonomy",
    neededSkills: "System design and leadership",
    midTermVision: "Lead a small engineering team",
    lifetimeDream: "Build a company that helps people learn",
  },
  routineSummary: { freeHoursWeekday: 5, freeHoursWeekend: 10 },
  allocations: {
    "this-week": 30, "this-month": 20, "this-year": 20,
    "3-years": 15, "10-years": 10, lifetime: 5,
  },
  mode: "initial",
};

describe("buildSystemPrompt", () => {
  it("should include goal framework instructions", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("vision");
    expect(prompt).toContain("milestone");
    expect(prompt).toContain("deliverable");
    expect(prompt).toContain("coherenceThread");
  });

  it("should include anti-generic instructions", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("Do NOT restate");
    expect(prompt).toContain("non-obvious");
  });

  it("should include priority distribution rule", () => {
    const prompt = buildSystemPrompt();
    expect(prompt).toContain("max 2 high");
  });
});

describe("buildUserMessage", () => {
  it("should include profile data", () => {
    const msg = buildUserMessage(baseRequest);
    expect(msg).toContain("Software Engineer");
    expect(msg).toContain("28");
    expect(msg).toContain("5 free hours on weekdays");
  });

  it("should include regeneration context when mode is regenerate", () => {
    const regen: GenerateGoalsRequest = {
      ...baseRequest,
      mode: "regenerate",
      directionChange: "I want to become a teacher",
      previousCoherenceThread: "Previous career in tech...",
      existingGoals: [
        { horizonKey: "lifetime", title: "Build a company", priority: "high", keep: true },
      ],
    };
    const msg = buildUserMessage(regen);
    expect(msg).toContain("I want to become a teacher");
    expect(msg).toContain("KEEP");
    expect(msg).toContain("<previous-thread>");
  });
});
