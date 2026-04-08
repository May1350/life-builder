import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  generateGoalsRequestSchema,
  generateGoalsResponseSchema,
  type GenerateGoalsResponse,
} from "@/lib/ai-schemas";
import { buildSystemPrompt, buildUserMessage } from "@/lib/ai-prompt";

const TIMEOUT_MS = 45_000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
}

function sanitizeString(value: string, maxLen: number): string {
  return value.slice(0, maxLen).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

function sanitizeRequest(body: unknown): unknown {
  if (typeof body !== "object" || body === null) return body;
  const obj = body as Record<string, unknown>;
  if (obj.profile && typeof obj.profile === "object") {
    const profile = obj.profile as Record<string, unknown>;
    const nlFields = ["currentFocus", "desiredChange", "neededSkills", "midTermVision", "lifetimeDream"];
    for (const field of nlFields) {
      if (typeof profile[field] === "string") {
        profile[field] = sanitizeString(profile[field] as string, 500);
      }
    }
    const shortFields = ["occupation", "lifeStage"];
    for (const field of shortFields) {
      if (typeof profile[field] === "string") {
        profile[field] = sanitizeString(profile[field] as string, 200);
      }
    }
  }
  if (typeof obj.directionChange === "string") {
    obj.directionChange = sanitizeString(obj.directionChange as string, 500);
  }
  return obj;
}

async function callGemini(
  request: ReturnType<typeof generateGoalsRequestSchema.parse>
): Promise<GenerateGoalsResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("API key not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.55,
      responseMimeType: "application/json",
    },
  });

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(request);

  const result = await model.generateContent({
    systemInstruction: systemPrompt,
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
  });

  const text = result.response.text();
  const cleaned = stripMarkdownFences(text);
  const parsed = JSON.parse(cleaned);
  return generateGoalsResponseSchema.parse(parsed);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const sanitized = sanitizeRequest(body);
    const validated = generateGoalsRequestSchema.parse(sanitized);

    // Attempt with timeout using Promise.race
    try {
      const response = await withTimeout(callGemini(validated), TIMEOUT_MS);
      return NextResponse.json(response);
    } catch {
      // Auto-retry once
      try {
        const response = await withTimeout(callGemini(validated), TIMEOUT_MS);
        return NextResponse.json(response);
      } catch {
        return NextResponse.json(
          { error: "Goal generation failed. Please try again." },
          { status: 502 }
        );
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
