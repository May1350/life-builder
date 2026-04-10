import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  generateGoalsRequestSchema,
  generateGoalsResponseSchema,
  type GenerateGoalsResponse,
} from "@/lib/ai-schemas";
import { buildSystemPrompt, buildUserMessage } from "@/lib/ai-prompt";
import {
  withTimeout,
  sleep,
  isRetryable,
  stripMarkdownFences,
  sanitizeRequest,
  checkAuth,
  rateLimit,
} from "@/lib/ai-utils";

const TIMEOUT_MS = 60_000;
const MODEL = "gemini-2.5-flash";
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [5_000, 15_000, 30_000]; // exponential backoff

async function callGemini(
  request: ReturnType<typeof generateGoalsRequestSchema.parse>,
): Promise<GenerateGoalsResponse> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("API key not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    generationConfig: {
      temperature: 0.55,
      responseMimeType: "application/json",
    },
  });

  const systemPrompt = buildSystemPrompt(request.locale);
  const userMessage = buildUserMessage(request, request.activityStats ?? undefined);

  const result = await model.generateContent({
    systemInstruction: systemPrompt,
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as any,
  });

  const text = result.response.text();
  const cleaned = stripMarkdownFences(text);

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    console.error("[generate-goals] JSON parse failed:", e);
    console.error("[generate-goals] Raw Gemini response:", text.slice(0, 2000));
    throw new Error("Failed to parse Gemini response as JSON");
  }

  try {
    return generateGoalsResponseSchema.parse(parsed);
  } catch (e) {
    console.error("[generate-goals] Zod validation failed:", e);
    console.error("[generate-goals] Parsed response keys:", Object.keys(parsed as Record<string, unknown>));
    throw new Error("Gemini response did not match expected schema");
  }
}

export async function POST(req: NextRequest) {
  const authFail = checkAuth(req);
  if (authFail) return authFail;
  const rateFail = rateLimit(req);
  if (rateFail) return rateFail;

  try {
    const body = await req.json();
    const sanitized = sanitizeRequest(body, {
      profileNlFields: [
        "currentFocus",
        "desiredChange",
        "neededSkills",
        "midTermVision",
        "lifetimeDream",
      ],
      profileShortFields: ["occupation", "lifeStage"],
      topLevelStrings: { directionChange: 500 },
    });
    const validated = generateGoalsRequestSchema.parse(sanitized);

    // Retry loop with delay for transient errors (503/429)
    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_DELAYS_MS[attempt - 1] ?? 30_000;
        console.log(`[generate-goals] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms delay`);
        await sleep(delay);
      }
      try {
        const response = await withTimeout(callGemini(validated), TIMEOUT_MS);
        return NextResponse.json(response);
      } catch (error) {
        lastError = error;
        console.error(`[generate-goals] Attempt ${attempt + 1} failed:`, error);
        if (!isRetryable(error)) break; // Non-retryable error, stop immediately
      }
    }

    const msg = lastError instanceof Error ? lastError.message : "";
    const status = msg.includes("503") || msg.includes("429") ? 503 : 502;
    const userMsg = status === 503
      ? "AI service is temporarily busy. Please try again in a moment."
      : "Goal generation failed. Please try again.";
    return NextResponse.json({ error: userMsg }, { status });
  } catch (error) {
    console.error("[generate-goals] Request error:", error);
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
