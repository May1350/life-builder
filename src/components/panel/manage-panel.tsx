"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { TaskList } from "@/components/tasks/task-list";
import { GoalTree } from "@/components/tree/goal-tree";
import { AddTaskModal } from "@/components/tasks/add-task-modal";
import { useLocale } from "@/providers/locale-provider";
import { HORIZONS } from "@/lib/constants";
import type { HorizonKey } from "@/types";

export function ManagePanel() {
  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [selectedHorizon, setSelectedHorizon] = useState<HorizonKey | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "tree">("list");
  const { t } = useLocale();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 pt-3 pb-2">
        <h2 className="text-lg font-bold">{t("sheet.manage")}</h2>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setAddTaskOpen(true)}
        >
          <Plus className="h-4 w-4 mr-1" /> {t("sheet.task")}
        </Button>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 px-5 pb-2">
        <div className="flex gap-1 rounded-full bg-gray-100 p-0.5">
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              viewMode === "list"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400"
            }`}
          >
            {t("tree.list")}
          </button>
          <button
            onClick={() => setViewMode("tree")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              viewMode === "tree"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400"
            }`}
          >
            {t("tree.tree")}
          </button>
        </div>
      </div>

      {/* Horizon chips */}
      {viewMode === "list" && (
        <div className="flex gap-1.5 px-5 pb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => setSelectedHorizon(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              selectedHorizon === null
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {t("common.all") || "All"}
          </button>
          {HORIZONS.map((h) => (
            <button
              key={h.key}
              onClick={() => setSelectedHorizon(h.key)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedHorizon === h.key
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {t(`horizon.${h.key}`)}
            </button>
          ))}
        </div>
      )}

      {/* Task list / Goal tree */}
      <div className="flex-1 overflow-y-auto px-5">
        {viewMode === "list" ? (
          <TaskList filterHorizon={selectedHorizon ?? undefined} />
        ) : (
          <GoalTree />
        )}
      </div>

      <AddTaskModal open={addTaskOpen} onClose={() => setAddTaskOpen(false)} />
    </div>
  );
}
