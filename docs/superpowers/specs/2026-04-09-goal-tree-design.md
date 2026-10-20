# Goal Tree Design Spec

## Summary

Add parent-child relationships between goals across horizons, enabling a collapsible tree view in the manage panel. AI generates linked goal chains (Lifetime → 10Y → 3Y → 1Y → Month), and users can browse/edit via an indented tree UI.

## Scope (this spec)

1. DB schema: add `parentGoalId` to Goal (Dexie v3 migration)
2. AI prompt: generate `parentIndex` per goal for automatic linking
3. Save logic: convert `parentIndex` to real `parentGoalId` during save
4. Mobile tree view component in manage panel
5. Manage panel: two-mode toggle (List / Tree)

## Out of scope (future)

- Desktop visual tree map (horizontal node graph)
- Capacitor native app wrapper + push notifications
- Drag-and-drop tree reordering

---

## 1. DB Schema Change

### Goal interface

```typescript
export interface Goal {
  id?: number;
  horizonKey: HorizonKey;
  parentGoalId?: number;  // NEW — references parent goal's id
  title: string;
  description?: string;
  priority: Priority;
  source?: "manual" | "ai-generated";
  createdAt: Date;
  updatedAt: Date;
}
```

### Dexie v3 migration

```typescript
this.version(3)
  .stores({
    // Add parentGoalId index to goals
    goals: "++id, horizonKey, source, parentGoalId",
    // All other tables unchanged
  });
```

No data migration needed — existing goals get `parentGoalId: undefined` (root nodes).

---

## 2. AI Prompt Changes

### Response schema update

Each generated goal gets an optional `parentIndex`:

```typescript
const generatedGoalSchema = z.object({
  title: z.string(),
  description: z.string(),
  priority: z.enum(["low", "medium", "high"]),
  parentIndex: z.number().int().min(0).optional(),
  starterTasks: z.array(starterTaskSchema),
});
```

`parentIndex` refers to the index of the parent goal in the **immediately higher** horizon array. Example:
- `lifetime[0]` = "Tech for good"
- `10-years[0]` = { title: "Lead product launch", parentIndex: 0 } → child of lifetime[0]
- `3-years[0]` = { title: "Become tech lead", parentIndex: 0 } → child of 10-years[0]

### System prompt addition

Add to `ai-prompt.ts` buildSystemPrompt():

```
## Goal Linking
Each goal (except lifetime) MUST include a parentIndex field — the 0-based index of its parent goal in the immediately higher horizon.
- 10-years goals: parentIndex refers to lifetime goals array
- 3-years goals: parentIndex refers to 10-years goals array
- this-year goals: parentIndex refers to 3-years goals array
- this-month goals: parentIndex refers to this-year goals array
This creates a top-down tree: lifetime → 10-years → 3-years → this-year → this-month.
```

---

## 3. Save Logic (parentIndex → parentGoalId)

During goal save (both onboarding and settings regenerate):

1. Save goals top-down: lifetime first, then 10-years, etc.
2. Keep a map: `{ horizonKey: { index: goalId } }`
3. When saving a goal with `parentIndex`, look up the parent's actual DB id from the map of the higher horizon.

```
savedIds = {}
for horizon in [lifetime, 10-years, 3-years, this-year, this-month]:
  for (index, goal) in horizon.goals:
    parentId = savedIds[parentHorizon]?.[goal.parentIndex]
    dbId = await addGoal({ ...goal, parentGoalId: parentId })
    savedIds[horizon][index] = dbId
```

---

## 4. Tree View Component

### `src/components/tree/goal-tree.tsx`

Renders goals as an indented collapsible tree.

**Data flow:**
1. Load all goals from Dexie
2. Build tree structure: find roots (parentGoalId undefined), recursively attach children
3. Render with indent levels

**UI per node:**
- Horizon color dot (from existing `getHorizonColor`)
- `▼` / `▸` toggle for expand/collapse
- Goal title (tappable for inline edit)
- Leaf nodes show child tasks with checkboxes

**Visual:**
```
● 기술로 삶을 개선하는 사람이 되기          [Lifetime]
  ● 대규모 제품 출시 리드                   [10 Years]
    ● 테크 리드 전환                        [3 Years]
      ▸ 리더십 프로그램 수료                [This Year] (collapsed)
    ● 건강한 습관 확립                      [3 Years]
      ● 피트니스 벤치마크 달성              [This Year]
        ● 트레이닝 스케줄 수립              [This Month]
          □ 온라인 코스 조사
          □ 피트니스 앱 비교
```

Indent: 16px per level. Max depth: 5 (Lifetime → Month).

---

## 5. Manage Panel Toggle

Two modes in manage panel header:

```
[관리]                    [+ 태스크]
  [리스트]  [트리]    ← toggle between views
```

- **리스트**: current horizon chip filter + flat task list (existing)
- **트리**: goal tree view (new)

Default: 리스트 (familiar). Toggle persists in component state only.

---

## 6. Future: App Store Readiness

Not in this implementation, but the architecture should support:
- Capacitor wrapper (IndexedDB works in WKWebView)
- Local notifications for task reminders (Capacitor plugin)
- PWA manifest already compatible

No code changes needed now, but avoid browser-only APIs that don't work in WKWebView.
