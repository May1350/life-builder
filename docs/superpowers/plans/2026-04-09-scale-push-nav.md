# Scale Push Navigation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace overlay sheet/route navigation with a scale-push pattern where the main content shrinks and shifts up when panels open, and tapping the shrunk main dismisses the panel.

**Architecture:** A `PanelHost` component wraps the main page content. It manages panel state (none/manage/settings/menu) and applies Framer Motion transforms to the main wrapper. Panel content slides up from below. Settings moves from a separate route into the main page as a panel. Clicking the shrunk main area closes the active panel.

**Tech Stack:** Framer Motion (existing), React state, existing components

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/panel/panel-host.tsx` | Create | Scale-push container: transforms main, renders panel content |
| `src/components/panel/manage-panel.tsx` | Create | Manage panel content (extracted from bottom-sheet.tsx) |
| `src/components/panel/settings-panel.tsx` | Create | Settings panel content (extracted from settings/page.tsx) |
| `src/components/panel/menu-panel.tsx` | Create | Menu panel (navigation links) |
| `src/app/page.tsx` | Modify | Wrap content in PanelHost, remove BottomSheet, handle panel state |
| `src/components/shared/header.tsx` | Modify | Wire menu + settings to panel open callbacks |
| `src/components/bottom-sheet/bottom-sheet.tsx` | Delete | Replaced by manage-panel.tsx |

---

### Task 1: Create PanelHost component

**Files:**
- Create: `src/components/panel/panel-host.tsx`

- [ ] **Step 1: Create the PanelHost component**

Create `src/components/panel/panel-host.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type PanelType = "manage" | "settings" | "menu" | null;

interface PanelCtx {
  activePanel: PanelType;
  openPanel: (p: PanelType) => void;
  closePanel: () => void;
}

const Ctx = createContext<PanelCtx>({
  activePanel: null,
  openPanel: () => {},
  closePanel: () => {},
});

export function usePanel() {
  return useContext(Ctx);
}

interface Props {
  children: React.ReactNode;
  panelContent?: React.ReactNode;
}

export function PanelHost({ children, panelContent }: Props) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const isOpen = activePanel !== null;

  const openPanel = useCallback((p: PanelType) => setActivePanel(p), []);
  const closePanel = useCallback(() => setActivePanel(null), []);

  return (
    <Ctx.Provider value={{ activePanel, openPanel, closePanel }}>
      <div className="relative h-screen overflow-hidden">
        {/* Main content — scales down when panel is open */}
        <motion.div
          className="h-full overflow-y-auto"
          animate={
            isOpen
              ? { scale: 0.92, y: -40, borderRadius: 16, opacity: 0.6 }
              : { scale: 1, y: 0, borderRadius: 0, opacity: 1 }
          }
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{ originY: 0 }}
        >
          {children}
        </motion.div>

        {/* Tap shrunk main to close */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="absolute inset-x-0 top-0 h-[12%] z-10 cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closePanel}
            />
          )}
        </AnimatePresence>

        {/* Panel slides up from bottom */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              className="absolute inset-x-0 bottom-0 top-[12%] z-20 bg-white rounded-t-2xl shadow-[0_-4px_30px_rgba(0,0,0,0.1)] overflow-hidden"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {panelContent}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx next build 2>&1 | tail -5`

---

### Task 2: Create ManagePanel (extract from BottomSheet)

**Files:**
- Create: `src/components/panel/manage-panel.tsx`

- [ ] **Step 1: Create ManagePanel**

Create `src/components/panel/manage-panel.tsx`:

```tsx
"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TaskList } from "@/components/tasks/task-list";
import { AddTaskModal } from "@/components/tasks/add-task-modal";
import { useLocale } from "@/providers/locale-provider";

export function ManagePanel() {
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const { t } = useLocale();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h2 className="text-lg font-bold">{t("sheet.manage")}</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAddTaskOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" /> {t("sheet.task")}
        </Button>
      </div>
      <Tabs defaultValue="tasks" className="flex-1 flex flex-col px-5">
        <TabsList className="w-full">
          <TabsTrigger value="tasks" className="flex-1">{t("sheet.tab.tasks")}</TabsTrigger>
          <TabsTrigger value="routine" className="flex-1">{t("sheet.tab.routine")}</TabsTrigger>
          <TabsTrigger value="horizons" className="flex-1">{t("sheet.tab.horizons")}</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-4 overflow-y-auto flex-1">
          <TaskList />
        </TabsContent>
        <TabsContent value="routine" className="mt-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-400 text-center py-8">{t("sheet.routine.hint")}</p>
        </TabsContent>
        <TabsContent value="horizons" className="mt-4 overflow-y-auto flex-1">
          <p className="text-sm text-gray-400 text-center py-8">{t("sheet.horizons.hint")}</p>
        </TabsContent>
      </Tabs>
      <AddTaskModal open={addTaskOpen} onClose={() => setAddTaskOpen(false)} />
    </div>
  );
}
```

---

### Task 3: Create MenuPanel

**Files:**
- Create: `src/components/panel/menu-panel.tsx`

- [ ] **Step 1: Create MenuPanel**

Create `src/components/panel/menu-panel.tsx`. A simple navigation menu with links:

```tsx
"use client";

import { useLocale } from "@/providers/locale-provider";
import { usePanel } from "./panel-host";
import { Settings, ListTodo, Clock, Target } from "lucide-react";

export function MenuPanel() {
  const { t, locale } = useLocale();
  const { openPanel } = usePanel();

  const items = [
    { icon: ListTodo, label: t("sheet.tab.tasks"), action: () => openPanel("manage") },
    { icon: Target, label: t("settings.adjustGoals"), action: () => openPanel("settings") },
    { icon: Settings, label: t("settings.title"), action: () => openPanel("settings") },
  ];

  return (
    <div className="px-5 pt-5">
      <h2 className="text-lg font-bold mb-4">Menu</h2>
      <nav className="space-y-1">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <item.icon className="h-5 w-5 text-gray-400" />
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
```

---

### Task 4: Extract SettingsPanel from settings/page.tsx

**Files:**
- Create: `src/components/panel/settings-panel.tsx`
- Modify: `src/app/settings/page.tsx`

- [ ] **Step 1: Create SettingsPanel wrapper**

The settings page has complex state (multiple views, AI regeneration). Rather than rewriting, create a thin wrapper that renders the existing settings content in panel form.

Create `src/components/panel/settings-panel.tsx`:

```tsx
"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GoalLoading } from "@/components/onboarding/goal-loading";
import { GoalReview } from "@/components/onboarding/goal-review";
import { dataService } from "@/services";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { calculateFreeHours } from "@/lib/time-utils";
import { useLocale } from "@/providers/locale-provider";
import { type Locale, LOCALE_LABELS } from "@/lib/locale";
import { usePanel } from "./panel-host";
import type { GenerateGoalsResponse } from "@/lib/ai-schemas";
import type { GeneratableHorizonKey, HorizonKey } from "@/types";

// NOTE: Read the full current settings/page.tsx content and copy the component body here,
// replacing `router.push("/")` with `closePanel()`, and removing the page-level wrapper.
// The key change is: this is a panel component, not a page. Use `usePanel()` for navigation.
```

This task requires reading the FULL current `src/app/settings/page.tsx` and copying its component body into `settings-panel.tsx`, with these changes:
1. Replace `const router = useRouter()` with `const { closePanel } = usePanel()`
2. Replace all `router.push("/")` and `router.back()` with `closePanel()`
3. Remove the outer page wrapper div — the panel host provides the container
4. Keep ALL existing state, views, and logic intact

- [ ] **Step 2: Simplify settings/page.tsx to redirect**

Replace `src/app/settings/page.tsx` with a simple redirect to main page (for direct URL access):

```tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/");
  }, [router]);
  return null;
}
```

---

### Task 5: Wire everything in page.tsx

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace page.tsx with PanelHost integration**

Update `src/app/page.tsx` to:
1. Import `PanelHost` and `usePanel` and all panels
2. Remove `BottomSheet` import
3. Wrap content in `PanelHost`
4. Replace the bottom sheet trigger with a simple button that opens manage panel
5. Wire header callbacks to panel open

The key structure:

```tsx
import { PanelHost, usePanel } from "@/components/panel/panel-host";
import { ManagePanel } from "@/components/panel/manage-panel";
import { SettingsPanel } from "@/components/panel/settings-panel";
import { MenuPanel } from "@/components/panel/menu-panel";
// Remove: import { BottomSheet } from "@/components/bottom-sheet/bottom-sheet";

// Inside HomePage, create a MainContent inner component that uses usePanel:
function MainContent({ blocks, recommendation, subtitle }: { ... }) {
  const { openPanel } = usePanel();
  const { t } = useLocale();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header
        subtitle={subtitle}
        onSettingsClick={() => openPanel("settings")}
        onMenuClick={() => openPanel("menu")}
      />
      {/* chart, recommendation, tomorrow strip */}
      <div className="flex-1" />
      {/* Bottom trigger — replaces BottomSheet */}
      <button
        className="w-full py-3 text-sm text-gray-400 border-t border-gray-100 hover:bg-gray-50 transition-colors"
        onClick={() => openPanel("manage")}
      >
        {t("sheet.trigger")}
      </button>
    </div>
  );
}

// In HomePage return:
function PanelContentRouter() {
  const { activePanel } = usePanel();
  if (activePanel === "manage") return <ManagePanel />;
  if (activePanel === "settings") return <SettingsPanel />;
  if (activePanel === "menu") return <MenuPanel />;
  return null;
}

return (
  <PanelHost panelContent={<PanelContentRouter />}>
    <MainContent blocks={blocks} recommendation={recommendation} subtitle={subtitle} />
  </PanelHost>
);
```

- [ ] **Step 2: Delete old bottom-sheet.tsx**

Delete `src/components/bottom-sheet/bottom-sheet.tsx` — no longer used.

- [ ] **Step 3: Verify build**

Run: `npx next build 2>&1 | tail -10`
Expected: Compiled successfully

- [ ] **Step 4: Verify tests**

Run: `npx vitest run`
Expected: All tests pass
