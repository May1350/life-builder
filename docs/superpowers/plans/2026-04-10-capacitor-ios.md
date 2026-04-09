# Capacitor iOS Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap the Next.js app in Capacitor so it can run on a physical iPhone with haptic feedback.

**Architecture:** Static export the Next.js frontend, serve it inside Capacitor's WKWebView. API routes remain on Vercel — Capacitor app calls them via absolute URL. Haptic feedback added to the "Did it" button using `@capacitor/haptics`.

**Tech Stack:** Capacitor 7, @capacitor/ios, @capacitor/haptics, Next.js static export

---

### Task 1: Create apiUrl utility

**Files:**
- Create: `src/lib/api.ts`

- [ ] **Step 1: Create the utility file**

```typescript
// src/lib/api.ts
export function apiUrl(path: string): string {
  return process.env.NEXT_PUBLIC_API_BASE
    ? `${process.env.NEXT_PUBLIC_API_BASE}${path}`
    : path;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep api.ts`
Expected: No output (no errors)

- [ ] **Step 3: Commit**

```bash
git add src/lib/api.ts
git commit -m "feat: add apiUrl utility for Capacitor API routing"
```

---

### Task 2: Update fetch calls to use apiUrl

**Files:**
- Modify: `src/app/onboarding/page.tsx:115`
- Modify: `src/components/review/health-review.tsx:124`
- Modify: `src/components/panel/settings-panel.tsx:101`

- [ ] **Step 1: Update onboarding/page.tsx**

Add import at top of file:
```typescript
import { apiUrl } from "@/lib/api";
```

Change line 115 from:
```typescript
      const res = await fetch("/api/generate-goals", {
```
to:
```typescript
      const res = await fetch(apiUrl("/api/generate-goals"), {
```

- [ ] **Step 2: Update health-review.tsx**

Add import at top of file:
```typescript
import { apiUrl } from "@/lib/api";
```

Change line 124 from:
```typescript
        const res = await fetch("/api/health-review", {
```
to:
```typescript
        const res = await fetch(apiUrl("/api/health-review"), {
```

- [ ] **Step 3: Update settings-panel.tsx**

Add import at top of file:
```typescript
import { apiUrl } from "@/lib/api";
```

Change line 101 from:
```typescript
      const res = await fetch("/api/generate-goals", {
```
to:
```typescript
      const res = await fetch(apiUrl("/api/generate-goals"), {
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v ai-prompt.test`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/app/onboarding/page.tsx src/components/review/health-review.tsx src/components/panel/settings-panel.tsx
git commit -m "feat: use apiUrl for all API fetch calls

Enables Capacitor builds to call Vercel-hosted API via NEXT_PUBLIC_API_BASE."
```

---

### Task 3: Add static export to next.config.ts

**Files:**
- Modify: `next.config.ts`

- [ ] **Step 1: Add output export**

Replace the contents of `next.config.ts` with:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;
```

- [ ] **Step 2: Test the static build**

Run: `npm run build 2>&1 | tail -20`
Expected: Build succeeds and generates `out/` directory. If there are errors about dynamic routes or server-side features, they will need to be addressed.

Note: API routes (`/api/generate-goals`, `/api/health-review`) will be excluded from static export — this is expected. They run on Vercel only.

- [ ] **Step 3: Commit**

```bash
git add next.config.ts
git commit -m "feat: enable static export for Capacitor builds"
```

---

### Task 4: Install Capacitor and create iOS project

**Files:**
- Modify: `package.json` (via npm install)
- Create: `capacitor.config.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Install Capacitor packages**

Run:
```bash
npm install @capacitor/core @capacitor/haptics
npm install -D @capacitor/cli @capacitor/ios
```

- [ ] **Step 2: Create capacitor.config.ts**

```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lifebuilder",
  appName: "Life Builder",
  webDir: "out",
};

export default config;
```

- [ ] **Step 3: Add ios/ to .gitignore**

Append to `.gitignore`:
```
# capacitor
/ios/
```

- [ ] **Step 4: Add build:ios script to package.json**

Add to the `"scripts"` section:
```json
"build:ios": "next build && cap sync"
```

- [ ] **Step 5: Initialize iOS project**

Run:
```bash
npx cap add ios
```

Expected: Creates `ios/` directory with an Xcode project.

- [ ] **Step 6: Sync web assets to iOS project**

Run:
```bash
npx cap sync
```

Expected: Copies `out/` contents into `ios/App/App/public/`.

- [ ] **Step 7: Commit**

```bash
git add capacitor.config.ts .gitignore package.json package-lock.json
git commit -m "feat: add Capacitor iOS project

Install @capacitor/core, @capacitor/cli, @capacitor/ios, @capacitor/haptics.
Add capacitor.config.ts, build:ios script, ios/ to gitignore."
```

---

### Task 5: Add haptic feedback to recommendation card

**Files:**
- Modify: `src/components/recommendation/recommendation-card.tsx`

- [ ] **Step 1: Add haptics import**

Add at top of `recommendation-card.tsx`, after the existing imports:

```typescript
import { Haptics, ImpactStyle } from "@capacitor/haptics";
```

- [ ] **Step 2: Add haptic call in handleDidIt**

Inside `handleDidIt`, add this line right after `if (!primary?.id) return;`:

```typescript
    Haptics.impact({ style: ImpactStyle.Medium });
```

The full function start should look like:
```typescript
  const handleDidIt = async () => {
    if (!primary?.id) return;

    Haptics.impact({ style: ImpactStyle.Medium });

    let minutesToAdd = 0;
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit 2>&1 | grep -v ai-prompt.test`
Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/recommendation/recommendation-card.tsx
git commit -m "feat: add haptic feedback on task completion

Medium impact haptic fires when user taps 'Did it'.
No-op on web — @capacitor/haptics gracefully degrades."
```

---

### Task 6: Build and open in Xcode

- [ ] **Step 1: Build and sync**

Run:
```bash
npm run build:ios
```

Expected: Static export completes, cap sync copies to iOS project.

- [ ] **Step 2: Open in Xcode**

Run:
```bash
npx cap open ios
```

Expected: Xcode opens with the Life Builder project.

- [ ] **Step 3: Configure signing in Xcode**

In Xcode:
1. Select the "App" target
2. Go to "Signing & Capabilities"
3. Select your Apple ID team
4. Connect iPhone via USB
5. Select it as the build target
6. Click Run (Cmd+R)

- [ ] **Step 4: Verify on device**

Test on iPhone:
1. App loads and shows the recommendation card
2. "했어요" button triggers haptic feedback
3. "다음에" button skips to next task
4. Card transition animation works
5. Onboarding flow works (if API base is configured)
