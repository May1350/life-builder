"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { HORIZONS, getHorizonColor } from "@/lib/constants";
import { Check, Circle, Loader2 } from "lucide-react";
import { dataService } from "@/services";
import type { HorizonKey } from "@/types";
import { useLocale } from "@/providers/locale-provider";

interface TaskListProps {
  filterHorizon?: HorizonKey;
}

export function TaskList({ filterHorizon }: TaskListProps) {
  const { t } = useLocale();
  const tasks = useLiveQuery(() => db.tasks.toArray(), []);
  const goals = useLiveQuery(() => db.goals.toArray(), []);

  if (!tasks || !goals) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  const filtered = filterHorizon
    ? tasks.filter((t) => t.horizonKey === filterHorizon)
    : tasks;

  const grouped = HORIZONS.map((h) => ({
    horizon: h,
    tasks: filtered
      .filter((t) => t.horizonKey === h.key && t.status !== "completed")
      .sort((a, b) => {
        if (a.status === "in_progress" && b.status !== "in_progress") return -1;
        if (a.status !== "in_progress" && b.status === "in_progress") return 1;
        return 0;
      }),
  })).filter((g) => g.tasks.length > 0);

  if (grouped.length === 0) {
    return (
      <p className="text-sm text-gray-400 text-center py-8">
        {t("tasks.empty")}
      </p>
    );
  }

  const handleToggle = async (taskId: string, currentStatus: string) => {
    if (currentStatus === "completed") return;
    await dataService.updateTask(taskId, {
      status: "completed",
      completedAt: new Date(),
    });
  };

  return (
    <div className="space-y-4">
      {grouped.map(({ horizon, tasks: hTasks }) => (
        <div key={horizon.key}>
          <div className="flex items-center gap-2 mb-2">
            <div
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: getHorizonColor(horizon.key) }}
            />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {horizon.name}
            </span>
          </div>
          <div className="space-y-1">
            {hTasks.map((task) => (
              <button
                key={task.id}
                onClick={() => task.id && handleToggle(task.id, task.status)}
                className="flex items-center gap-3 w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {task.status === "in_progress" ? (
                  <Loader2 className="h-4 w-4 text-blue-500 shrink-0" />
                ) : task.status === "completed" ? (
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-gray-300 shrink-0" />
                )}
                <span
                  className={`text-sm flex-1 truncate ${
                    task.status === "completed"
                      ? "line-through text-gray-400"
                      : "text-gray-700"
                  }`}
                >
                  {task.title}
                </span>
                {task.dueDate && (
                  <span className="text-xs text-gray-400 shrink-0">
                    {task.dueDate.slice(5)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
