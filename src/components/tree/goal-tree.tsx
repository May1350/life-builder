"use client";

import { useState, useCallback } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { buildGoalTree, type TreeNode } from "@/lib/goal-tree-utils";
import { getHorizonColor } from "@/lib/constants";
import { useLocale } from "@/providers/locale-provider";
import { dataService } from "@/services";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Circle,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react";

// ── Internal: single tree row ──────────────────────────────

function TreeNodeRow({ node }: { node: TreeNode }) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(node.depth < 2);

  const hasExpandable = node.children.length > 0 || node.tasks.length > 0;
  const paddingLeft = node.depth * 16 + 8;

  const handleComplete = useCallback(
    async (taskId: string | undefined) => {
      if (taskId === undefined) return;
      await dataService.updateTask(String(taskId), {
        status: "completed",
        completedAt: new Date(),
      });
    },
    [],
  );

  return (
    <div>
      {/* Goal row */}
      <div
        className="flex items-center gap-1.5 py-1.5 cursor-pointer select-none"
        style={{ paddingLeft }}
        onClick={() => hasExpandable && setExpanded((e) => !e)}
      >
        {/* Chevron */}
        {hasExpandable ? (
          expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          )
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        {/* Horizon color dot */}
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: getHorizonColor(node.goal.horizonKey) }}
        />

        {/* Title */}
        <span className="text-sm font-medium truncate">{node.goal.title}</span>

        {/* Horizon label — right-aligned */}
        <span className="ml-auto text-[10px] text-gray-400 shrink-0 pr-2">
          {t(`horizon.${node.goal.horizonKey}`)}
        </span>
      </div>

      {/* Expandable children + tasks */}
      <AnimatePresence initial={false}>
        {expanded && hasExpandable && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {/* Child goals */}
            {node.children.map((child) => (
              <TreeNodeRow key={String(child.goal.id)} node={child} />
            ))}

            {/* Child tasks */}
            {node.tasks.map((task) => (
              <div
                key={String(task.id)}
                className="flex items-center gap-1.5 py-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40 rounded"
                style={{ paddingLeft: (node.depth + 1) * 16 + 8 + 14 }}
                onClick={() => handleComplete(task.id)}
              >
                {task.status === "completed" ? (
                  <Check className="h-3 w-3 shrink-0 text-green-500" />
                ) : (
                  <Circle className="h-3 w-3 shrink-0 text-gray-300" />
                )}
                <span className="text-xs truncate">{task.title}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Public: GoalTree ───────────────────────────────────────

export function GoalTree() {
  const { t } = useLocale();

  const goals = useLiveQuery(() => db.goals.toArray());
  const tasks = useLiveQuery(() => db.tasks.toArray());

  // Loading state
  if (goals === undefined || tasks === undefined) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const tree = buildGoalTree(goals, tasks);

  // Empty state
  if (tree.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-gray-400">
        {t("tree.noGoals")}
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {tree.map((root) => (
        <TreeNodeRow key={String(root.goal.id)} node={root} />
      ))}
    </div>
  );
}
