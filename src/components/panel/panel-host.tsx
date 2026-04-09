"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export type PanelType = "manage" | "settings" | "menu" | "review" | null;

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

// ── Side-push transforms (menu, settings) ──
const mainVariants = {
  closed: { scale: 1, x: 0, y: 0, borderRadius: 0 },
  menu: { scale: 0.75, x: 260, y: 0, borderRadius: 20 },
  settings: { scale: 0.75, x: -260, y: 0, borderRadius: 20 },
  // Manage: main stays as-is, panel overlays from bottom
  manage: { scale: 1, x: 0, y: 0, borderRadius: 0 },
  // Review: full-screen overlay, main content stays as-is
  review: { scale: 1, x: 0, y: 0, borderRadius: 0 },
};

const panelVariants = {
  menu: {
    initial: { x: -300, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -300, opacity: 0 },
  },
  settings: {
    initial: { x: 400, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 400, opacity: 0 },
  },
};

const panelLayout: Record<string, string> = {
  menu: "pr-[35%]",
  settings: "pl-[35%]",
};

const springTransition = { type: "spring" as const, stiffness: 260, damping: 28 };

export function PanelHost({ children, panelContent }: Props) {
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const isOpen = activePanel !== null;
  const isManage = activePanel === "manage";
  const isSide = activePanel === "menu" || activePanel === "settings";

  const openPanel = useCallback((p: PanelType) => setActivePanel(p), []);
  const closePanel = useCallback(() => setActivePanel(null), []);

  const mainState = activePanel ?? "closed";

  return (
    <Ctx.Provider value={{ activePanel, openPanel, closePanel }}>
      <div className="relative h-full overflow-hidden bg-neutral-100">

        {/* ── Side panels (menu / settings) — full screen behind main ── */}
        <AnimatePresence>
          {isSide && (
            <motion.div
              key={activePanel}
              className={`absolute inset-0 z-10 bg-neutral-100 overflow-y-auto ${panelLayout[activePanel!] ?? ""}`}
              initial={panelVariants[activePanel as "menu" | "settings"].initial}
              animate={panelVariants[activePanel as "menu" | "settings"].animate}
              exit={panelVariants[activePanel as "menu" | "settings"].exit}
              transition={springTransition}
            >
              {panelContent}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Main content card ── */}
        <motion.div
          className="absolute inset-0 z-20 bg-white overflow-hidden rounded-b-2xl"
          variants={mainVariants}
          animate={mainState}
          transition={springTransition}
          style={{
            boxShadow: isOpen
              ? "0 20px 50px rgba(0,0,0,0.12), 0 8px 20px rgba(0,0,0,0.08)"
              : "none",
          }}
        >
          <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {children}
          </div>
          {isOpen && (
            <div
              className="absolute inset-0 z-50 cursor-pointer"
              onClick={closePanel}
            />
          )}
        </motion.div>

        {/* ── Manage panel — slides up FROM BOTTOM, ABOVE the main card ── */}
        <AnimatePresence>
          {isManage && (
            <motion.div
              key="manage"
              className="absolute inset-x-0 bottom-0 z-30 bg-white rounded-t-2xl shadow-[0_-8px_30px_rgba(0,0,0,0.1)] overflow-y-auto"
              style={{ height: "78%" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={springTransition}
            >
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>
              {panelContent}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  );
}
