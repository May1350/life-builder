import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  healthReviewRequestSchema,
  healthReviewResponseSchema,
} from "@/lib/ai-schemas";
import { buildHealthReviewPrompt, buildHealthReviewMessage } from "@/lib/ai-prompt";
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
const MAX_RETRIES = 2;
const RETRY_DELAYS = [5_000, 15_000];

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
      arrayFields: {
        flaggedGoals: { title: 200, userResponse: 500 },
      },
    });
    const validated = healthReviewRequestSchema.parse(sanitized);

    const apiKey = process.env.GOOGLE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL,
      generationConfig: {
        temperature: 0.5,
        responseMimeType: "application/json",
      },
    });

    const systemPrompt = buildHealthReviewPrompt(validated.locale);
    const userMessage = buildHealthReviewMessage(validated, validated.activityStats ?? undefined);

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = RETRY_DELAYS[attempt - 1] ?? 15_000;
        console.log(`[health-review] Retry ${attempt}/${MAX_RETRIES} after ${delay}ms`);
        await sleep(delay);
      }
      try {
        const result = await withTimeout(
          model.generateContent({
            systemInstruction: systemPrompt,
            contents: [{ role: "user", parts: [{ text: userMessage }] }],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            generationConfig: { thinkingConfig: { thinkingBudget: 0 } } as any,
          }),
          TIMEOUT_MS,
        );

        const text = result.response.text();
        const cleaned = stripMarkdownFences(text);
        const parsed = JSON.parse(cleaned);
        const response = healthReviewResponseSchema.parse(parsed);
        return NextResponse.json(response);
      } catch (error) {
        lastError = error;
        console.error(`[health-review] Attempt ${attempt + 1} failed:`, error);
        if (!isRetryable(error)) break;
      }
    }

    return NextResponse.json(
      { error: "Health review failed. Please try again." },
      { status: 502 },
    );
  } catch (error) {
    console.error("[health-review] Request error:", error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request data." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
