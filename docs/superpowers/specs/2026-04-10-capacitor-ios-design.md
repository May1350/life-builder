# Capacitor iOS Integration

**Date:** 2026-04-10
**Status:** Approved

## Problem

Need to run the app on a physical iPhone for testing native features (haptic feedback, etc). Currently web-only.

## Design

### 1. Static Export

Add `output: "export"` to `next.config.ts` for Capacitor builds. This generates a static `out/` directory that Capacitor serves via WKWebView.

### 2. API Base URL

3 files make `fetch("/api/...")` calls. Create a utility to prefix with a configurable base URL:

```typescript
// src/lib/api.ts
export function apiUrl(path: string): string {
  return process.env.NEXT_PUBLIC_API_BASE
    ? `${process.env.NEXT_PUBLIC_API_BASE}${path}`
    : path;
}
```

- Web (Vercel): `NEXT_PUBLIC_API_BASE` unset → relative paths (no change)
- Capacitor: `NEXT_PUBLIC_API_BASE=https://life-builder.vercel.app` → absolute URL to Vercel-hosted API

Files to update:
- `src/app/onboarding/page.tsx:115` — `fetch("/api/generate-goals"...)`
- `src/components/review/health-review.tsx:124` — `fetch("/api/health-review"...)`
- `src/components/panel/settings-panel.tsx:101` — `fetch("/api/generate-goals"...)`

### 3. Capacitor Setup

Install:
- `@capacitor/core` + `@capacitor/cli` + `@capacitor/ios`
- `@capacitor/haptics`

Config (`capacitor.config.ts`):
- `appId`: `app.lifebuilder`
- `appName`: `Life Builder`
- `webDir`: `out`

### 4. Haptic Feedback

Add haptic impact on "했어요" button in `recommendation-card.tsx`:

```typescript
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Inside handleDidIt, before the data update:
Haptics.impact({ style: ImpactStyle.Medium });
```

`@capacitor/haptics` is a no-op on web — no platform checks needed.

### 5. Build & Run

```bash
npm run build              # static export → out/
npx cap sync               # copy out/ → ios project
npx cap open ios           # open in Xcode → build to iPhone
```

### 6. .gitignore

Add `ios/` to `.gitignore` — generated native project, not source code.

### 7. Files Changed

| File | Change |
|------|--------|
| `next.config.ts` | Add `output: "export"` |
| `src/lib/api.ts` | New — `apiUrl()` utility |
| `src/app/onboarding/page.tsx` | Wrap fetch URL with `apiUrl()` |
| `src/components/review/health-review.tsx` | Wrap fetch URL with `apiUrl()` |
| `src/components/panel/settings-panel.tsx` | Wrap fetch URL with `apiUrl()` |
| `capacitor.config.ts` | New — Capacitor config |
| `src/components/recommendation/recommendation-card.tsx` | Add haptic on "했어요" |
| `.gitignore` | Add `ios/` |
| `package.json` | New dependencies + `build:ios` script |
