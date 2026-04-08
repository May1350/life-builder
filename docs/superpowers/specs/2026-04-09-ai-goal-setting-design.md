# AI Goal-Setting Feature — Design Spec

> Life Builder v0.2 feature: AI-powered goal generation during onboarding and on-demand re-setting.

## 1. Problem

Users need goals across 5 time horizons (This Month → Lifetime) to make the time design loop meaningful. Without goals, horizon blocks are empty and the recommendation engine has nothing to suggest. Manually creating 15+ goals across all horizons is tedious and requires life-planning expertise most users lack.

## 2. Solution

AI generates personalized goals (with starter tasks) based on a structured profile questionnaire. Goals are reviewable, editable, and re-settable at any time.

## 3. Onboarding Flow

```
Welcome
  "Tell us about you. We'll create personalized goals and a schedule."
    ↓
Routine Setup (existing — weekly routine editor)
    ↓
Allocation Setup (existing — horizon % sliders)
    ↓
Screen 1: Profile basics [selection-based]
  - Occupation: selection + free input
  - Life stage: selection (Student / Early Career / Mid Career / Senior / Freelancer / Entrepreneur / Career Change / Retired)
  - Age: number input
  - Interests: multi-tag (Technology / Health & Fitness / Finance / Education / Arts & Design / Business / Relationships / Science / Languages / Sports / Other)
  - Core values: pick 2-3 (Growth / Stability / Freedom / Impact / Family / Creativity / Achievement / Health / Adventure / Knowledge)
    ↓
Screen 2: Current state [natural language × 3]
  - "What are you most focused on right now?"
  - "What do you most want to change?"
  - "What skills or knowledge do you need?"
  - Min 10 chars each, max 500 chars, hint: "More detail = better goals"
    ↓
Screen 3: Vision [natural language × 2]
  - "What kind of life do you want in 3-5 years?"
  - "What's your biggest lifetime dream or goal?"
  - Min 10 chars each, max 500 chars
    ↓
Loading (~3-5 sec)
  - Progress messages: "Understanding your vision..." → "Designing your goals..." → "Almost ready..."
  - AI failure: auto-retry once → "Skip — set goals later" button
  - AI response cached to IndexedDB before proceeding (survives tab close)
    ↓
"Your day is ready" interstitial
  - Shows: goal count, task count, horizon summary
  - Auto-dismiss after 2 seconds or tap to continue
    ↓
Goal Review: Step by step (Lifetime → 10Y → 3Y → 1Y → Month)
  - Progress bar across top
  - Each goal card: title + description + priority badge
  - Actions per goal: remove/restore toggle, inline text edit
  - Below each goal: 2-3 starter tasks with estimated minutes
  - Back/Next navigation between horizons
  - Wheel of Life: opt-in at end ("I notice no health goals — want suggestions?")
  - "Remove all" allowed — warning shown, proceed with zero goals
    ↓
Main Screen (tasks already populated, immediately usable)
```

### Onboarding State Persistence
- `AppSettings.onboardingStep` tracks last completed step (0-based)
- `UserProfile` saved to Dexie after Screen 3 (before AI call)
- AI response cached in IndexedDB before review screen
- On re-entry after abandonment: resume from last completed step
- Each screen has a Back button to return to previous step

## 4. Goal Re-setting Flow

### Entry Point
Header gear icon → `/settings` page → "Reset Goals" button

### Flow
```
1. Horizon selection (multi-select checkboxes)
   - This Month / This Year / 3 Years / 10 Years / Lifetime
   - "Select All" shortcut

2. Existing goal cards per selected horizon (Step by step UI reuse)
   - Each card actions:
     - Keep (lock icon) — preserved during AI regeneration
     - Edit (pencil) — inline text modification
     - Remove (trash) — mark for deletion

3. Modification method choice
   - "Save changes" — apply manual edits only
   - "AI regenerate" — proceed to Step 4
   - Clarification text: "Manual edits are permanent. AI only changes unlocked goals."

4. Direction change input (if AI regenerate)
   - "What's changed?" — natural language, max 500 chars
   - Example placeholder: "I want to pivot from engineering to teaching"

5. AI regeneration → Step by step review
   - Kept goals shown as locked (not editable)
   - New goals shown as editable cards
   - Same review UX as onboarding

6. Save
   - Orphaned tasks: goalId set to undefined
   - User notification: "X tasks are no longer linked to a goal" with option to view
```

## 5. AI Architecture

### API Route
`POST /api/generate-goals`

### Request Schema
```typescript
interface GenerateGoalsRequest {
  profile: {
    age: number;
    occupation: string;
    lifeStage: string;
    interests: string[];        // max 5 tags
    values: string[];            // 2-3 tags
    currentFocus: string;        // max 500 chars
    desiredChange: string;       // max 500 chars
    neededSkills: string;        // max 500 chars
    midTermVision: string;       // max 500 chars
    lifetimeDream: string;       // max 500 chars
  };
  routineSummary: {
    freeHoursWeekday: number;    // avg free hours Mon-Fri
    freeHoursWeekend: number;    // avg free hours Sat-Sun
  };
  allocations: Record<HorizonKey, number>;  // percentage per horizon

  // Re-generation only (omitted for initial)
  existingGoals?: {
    horizonKey: GeneratableHorizonKey;
    title: string;
    priority: Priority;
    keep?: boolean;              // true = preserve, false = regenerate
  }[];
  directionChange?: string;      // max 500 chars
  previousCoherenceThread?: string;
  mode?: "initial" | "regenerate";
}
```

### Response Schema
```typescript
interface GenerateGoalsResponse {
  goals: Record<GeneratableHorizonKey, GeneratedGoal[]>;
  wheelOfLifeBalance: Record<WheelOfLifeCategory, number>;  // 1-5 score
  coherenceThread: string;  // last in schema — generated after structured data
}

interface GeneratedGoal {
  title: string;
  description: string;
  priority: Priority;
  starterTasks: {
    title: string;
    estimatedMinutes: number;
    horizonKey: HorizonKey;       // this-week or this-month for schedulable tasks
    dueDate?: string;             // "YYYY-MM-DD", auto-set for this-week/month tasks
  }[];  // max 3 per goal
}

type GeneratableHorizonKey = Exclude<HorizonKey, "this-week">;
type WheelOfLifeCategory = "career" | "health" | "relationships" | "finance" | "growth" | "recreation";
```

### Goal Counts Per Horizon
| Horizon | Count | Framework |
|---------|-------|-----------|
| Lifetime | 2-3 | Vision-based (direction, identity) |
| 10 Years | 3-4 | Vision-based (concrete achievements) |
| 3 Years | 3-4 | Milestone (backward decomposition) |
| This Year | 4-5 | SMART |
| This Month | 3-5 | SMART |

### Starter Task Rules
- This-month tasks: `dueDate` = end of current month, `horizonKey` = "this-month"
- This-week tasks: `dueDate` = end of current week (Sunday), `horizonKey` = "this-week"
- Longer-horizon tasks: no dueDate, `horizonKey` matches parent goal's horizon
- All tasks get `estimatedMinutes` (enables auto-scheduling for this-week/month)

### Gemini Configuration
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| Model | `gemini-2.5-flash` | Speed/cost, free tier sufficient |
| Temperature | 0.5-0.6 | Structured output needs consistency |
| responseMimeType | `application/json` | Structured output mode |
| responseSchema | Full JSON Schema matching response type | Schema-constrained generation |
| API Key | `GOOGLE_AI_API_KEY` in `.env.local` | Server-only, never exposed to client |

### Prompt Strategy
1. **System message** — all instructions:
   - Goal framework rules (vision/milestone/SMART per horizon)
   - Coherence thread: "Write a 2-3 sentence narrative connecting lifetime vision to monthly actions"
   - Top-down derivation: Lifetime → 10Y → 3Y → 1Y → Month
   - Anti-generic: "Do NOT restate user's stated aspirations. Generate non-obvious prerequisites, parallel skills, risk mitigation goals."
   - Differentiation: "Each horizon adds specificity — Lifetime=identity, 10Y=achievement, 3Y=milestone, 1Y=project, Month=action"
   - Priority distribution: max 2 high per horizon
   - Wheel of Life balance awareness (inform, don't force-fill)
   - Starter task rules: 2-3 per goal, include estimatedMinutes
   - Time context: "User has X free hours/weekday, Y free hours/weekend"
   - Coherence thread limited to 200 chars

2. **User message** — profile data only (prompt injection isolation)

3. **Re-generation mode** — additional context:
   - Previous coherence thread (wrapped in XML delimiters, treated as untrusted)
   - Existing goals with keep flags
   - Direction change description

### Error Handling
1. Parse response, strip markdown fences if present
2. Zod schema validation (maxItems: 5 goals/horizon, 3 tasks/goal)
3. Validation failure → auto-retry once with stricter prompt
4. Network/API failure → auto-retry once
5. Second failure → "Skip — set goals later" button
6. Client-side: 45-second timeout via AbortController
7. Double-tap prevention: disable button during loading, cancel in-flight on new request
8. Cost: ~$0.00/call (free tier: 15 RPM, 1500 RPD — more than sufficient)

### Security
- Field-level max lengths enforced server-side (500 chars NL, 200 chars selection)
- Input sanitization: strip control characters
- System/user message separation (instructions never in user message)
- Generic error responses (no API key or model name in errors)
- Free tier rate limits serve as natural rate limiting

## 6. Data Model Changes

### Goal Type Extension
```typescript
export interface Goal {
  id?: string;
  horizonKey: HorizonKey;
  title: string;
  description?: string;                    // NEW: vision/milestone context
  priority: Priority;
  source?: "manual" | "ai-generated";      // NEW: provenance tracking
  createdAt: Date;
  updatedAt: Date;
}
```

### New: UserProfile Table
```typescript
export interface UserProfile {
  id?: string;
  age: number;
  occupation: string;
  lifeStage: string;
  interests: string[];
  values: string[];
  currentFocus: string;
  desiredChange: string;
  neededSkills: string;
  midTermVision: string;
  lifetimeDream: string;
  coherenceThread?: string;
  wheelOfLifeBalance?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}
```

### AppSettings Extension
```typescript
export interface AppSettings {
  id?: string;
  onboardingComplete: boolean;
  onboardingStep?: number;                 // NEW: resume point (0-based)
  createdAt: Date;
  updatedAt: Date;
}
```

### Dexie Migration: v1 → v2
```typescript
db.version(2).stores({
  weeklyRoutineTasks: "++id, dayOfWeek",
  dailyOverrides: "++id, date",
  dailyTimetables: "++id, date",
  horizonAllocations: "++id, horizonKey",
  goals: "++id, horizonKey, source",        // added source index
  tasks: "++id, horizonKey, goalId, status",
  appSettings: "++id",
  userProfiles: "++id",                      // NEW table
}).upgrade(tx => {
  return tx.table("goals").toCollection().modify(goal => {
    goal.source = goal.source ?? "manual";
  });
});
```

### DataService Interface Additions
```typescript
// UserProfile
getUserProfile(): Promise<UserProfile | undefined>;
saveUserProfile(profile: Omit<UserProfile, "id" | "createdAt" | "updatedAt">): Promise<string>;
updateUserProfile(updates: Partial<UserProfile>): Promise<void>;

// Bulk operations
bulkAddGoals(goals: Omit<Goal, "id" | "createdAt" | "updatedAt">[]): Promise<string[]>;

// Orphan handling
unlinkTasksForGoals(goalIds: string[]): Promise<number>;  // returns count of affected tasks
```

### Bulk Insert Transaction
Goals and starter tasks must be inserted sequentially within a transaction:
1. Insert goals via `bulkAddGoals` → receive generated IDs
2. Map starter tasks to their parent goal IDs
3. Insert tasks with correct `goalId` references
4. If any step fails, entire transaction rolls back (no orphaned data)

## 7. Technology Additions

| Package | Purpose |
|---------|---------|
| `@google/generative-ai` | Gemini 2.5 Flash SDK |
| `zod` | API request/response schema validation |

## 8. UI Language

All UI text remains in simple English (consistent with existing app). The Korean text in this spec is for spec-language only.

## 9. Out of Scope

- Standalone Goal CRUD UI (editing outside re-setting flow)
- Quick Start / skip-AI onboarding path
- Progressive goal generation after usage data collection
- Goal parent-child relationships (parentGoalId)
- Multi-language support
- User-provided API key in settings
- Offline AI fallback
