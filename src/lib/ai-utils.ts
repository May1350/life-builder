import { NextRequest, NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// Async helpers
// ---------------------------------------------------------------------------

export async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("Request timeout")), ms)
  );
  return Promise.race([promise, timeout]);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isRetryable(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message;
    return msg.includes("503") || msg.includes("429") || msg.includes("timeout");
  }
  return false;
}

// ---------------------------------------------------------------------------
// Response text helpers
// ---------------------------------------------------------------------------

export function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/m, "").replace(/\n?```\s*$/m, "");
}

// ---------------------------------------------------------------------------
// Input sanitization
// ---------------------------------------------------------------------------

/**
 * Trim a string to `maxLen` and strip ASCII control characters (except tab,
 * LF, CR). Used as a cheap defense against prompt-injection payloads that
 * rely on exotic control chars or unbounded length.
 */
export function sanitizeString(value: string, maxLen: number): string {
  return value.slice(0, maxLen).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

export interface SanitizeConfig {
  /** Fields under `body.profile` clamped to 500 chars (natural-language). */
  profileNlFields?: string[];
  /** Fields under `body.profile` clamped to 200 chars (short labels). */
  profileShortFields?: string[];
  /** Top-level string fields on `body`, mapped to their max length. */
  topLevelStrings?: Record<string, number>;
  /**
   * Top-level array fields on `body`. For each entry, the inner record maps
   * nested string field names to their max length. Non-matching entries are
   * left untouched.
   */
  arrayFields?: Record<string, Record<string, number>>;
}

/**
 * Mutates and returns `body` with string fields sanitized per `config`.
 * Non-object inputs are returned unchanged — validation (Zod) is expected to
 * reject them downstream.
 */
export function sanitizeRequest(body: unknown, config: SanitizeConfig): unknown {
  if (typeof body !== "object" || body === null) return body;
  const obj = body as Record<string, unknown>;

  // profile.* fields
  if (obj.profile && typeof obj.profile === "object") {
    const profile = obj.profile as Record<string, unknown>;
    for (const field of config.profileNlFields ?? []) {
      if (typeof profile[field] === "string") {
        profile[field] = sanitizeString(profile[field] as string, 500);
      }
    }
    for (const field of config.profileShortFields ?? []) {
      if (typeof profile[field] === "string") {
        profile[field] = sanitizeString(profile[field] as string, 200);
      }
    }
  }

  // Top-level string fields
  if (config.topLevelStrings) {
    for (const [field, maxLen] of Object.entries(config.topLevelStrings)) {
      if (typeof obj[field] === "string") {
        obj[field] = sanitizeString(obj[field] as string, maxLen);
      }
    }
  }

  // Top-level array fields with nested string fields
  if (config.arrayFields) {
    for (const [arrayField, fieldMap] of Object.entries(config.arrayFields)) {
      const arr = obj[arrayField];
      if (Array.isArray(arr)) {
        for (const entry of arr) {
          if (typeof entry === "object" && entry !== null) {
            const rec = entry as Record<string, unknown>;
            for (const [field, maxLen] of Object.entries(fieldMap)) {
              if (typeof rec[field] === "string") {
                rec[field] = sanitizeString(rec[field] as string, maxLen);
              }
            }
          }
        }
      }
    }
  }

  return obj;
}

// ---------------------------------------------------------------------------
// Authentication (pseudo-secret + origin allowlist)
// ---------------------------------------------------------------------------

/**
 * Validates the shared secret header and Origin/Referer allowlist.
 * Returns a 401 response on failure, or `null` when the request should
 * proceed. If `APP_SHARED_SECRET` is unset, logs a warning and allows the
 * request through (dev mode).
 */
export function checkAuth(req: NextRequest): NextResponse | null {
  const expectedSecret = process.env.APP_SHARED_SECRET;

  if (!expectedSecret) {
    console.warn(
      "[ai-utils] APP_SHARED_SECRET not set — allowing request (dev mode). " +
        "Set APP_SHARED_SECRET and ALLOWED_ORIGINS for production."
    );
    return null;
  }

  // 1) Shared secret header
  const providedSecret = req.headers.get("x-app-secret");
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2) Origin / Referer allowlist
  const allowed = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowed.length > 0) {
    const origin = req.headers.get("origin") ?? "";
    const referer = req.headers.get("referer") ?? "";
    const originOk = allowed.some((prefix) => origin.startsWith(prefix));
    const refererOk = allowed.some((prefix) => referer.startsWith(prefix));
    if (!originOk && !refererOk) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory, per-IP)
// ---------------------------------------------------------------------------

// NOTE: in-memory — doesn't share state across serverless instances;
// acceptable for MVP. Upgrade to Vercel KV / Upstash for production-grade.
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export interface RateLimitOptions {
  max?: number;
  windowMs?: number;
}

/**
 * Simple fixed-window IP rate limiter. Returns a 429 response when the IP
 * has exceeded `max` requests in the current window, or `null` otherwise.
 * Default: 10 requests per 60 seconds.
 */
export function rateLimit(
  req: NextRequest,
  opts: RateLimitOptions = {}
): NextResponse | null {
  const max = opts.max ?? 10;
  const windowMs = opts.windowMs ?? 60_000;
  const ip = getClientIp(req);
  const now = Date.now();

  const bucket = rateLimitBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(ip, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (bucket.count >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  bucket.count += 1;
  return null;
}
