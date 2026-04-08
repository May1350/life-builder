"use client";

import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { dataService } from "@/services";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const PRESETS: { label: string; days: number[] }[] = [
  { label: "Everyday", days: [0, 1, 2, 3, 4, 5, 6] },
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Weekends", days: [0, 6] },
];

export function RoutineEditor() {
  const [selectedDay, setSelectedDay] = useState(1); // Mon
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newStart, setNewStart] = useState("09:00");
  const [newEnd, setNewEnd] = useState("17:00");
  const [selectedDays, setSelectedDays] = useState<number[]>([1]); // days to add to

  const tasks = useLiveQuery(
    () =>
      db.weeklyRoutineTasks
        .where("dayOfWeek")
        .equals(selectedDay)
        .toArray(),
    [selectedDay]
  );

  const allTasks = useLiveQuery(() => db.weeklyRoutineTasks.toArray(), []);

  // Count tasks per day for the dot indicators
  const dayCounts = DAYS.map((_, i) =>
    allTasks?.filter((t) => t.dayOfWeek === i).length ?? 0
  );

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const applyPreset = (days: number[]) => {
    setSelectedDays(days);
  };

  const openForm = () => {
    setSelectedDays([selectedDay]);
    setShowForm(true);
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || selectedDays.length === 0) return;

    for (const day of selectedDays) {
      await dataService.addRoutineTask({
        title: newTitle.trim(),
        dayOfWeek: day,
        startTime: newStart,
        endTime: newEnd,
      });
    }

    setNewTitle("");
    setNewStart("09:00");
    setNewEnd("17:00");
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await dataService.deleteRoutineTask(id);
  };

  // Delete this task from ALL days (by matching title + time)
  const handleDeleteAll = async (task: {
    title: string;
    startTime: string;
    endTime: string;
  }) => {
    const matching = allTasks?.filter(
      (t) =>
        t.title === task.title &&
        t.startTime === task.startTime &&
        t.endTime === task.endTime
    );
    if (!matching) return;
    for (const t of matching) {
      if (t.id) await dataService.deleteRoutineTask(t.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Day tabs with dot indicators */}
      <div className="flex gap-1">
        {DAYS.map((day, i) => (
          <button
            key={day}
            onClick={() => setSelectedDay(i)}
            className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-colors ${
              selectedDay === i
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <span className="text-xs font-medium">{day}</span>
            {dayCounts[i] > 0 && (
              <div
                className={`h-1 w-1 rounded-full ${
                  selectedDay === i ? "bg-white/60" : "bg-gray-400"
                }`}
              />
            )}
          </button>
        ))}
      </div>

      {/* Task list for selected day */}
      <div className="space-y-1">
        <AnimatePresence mode="popLayout">
          {tasks
            ?.sort((a, b) => a.startTime.localeCompare(b.startTime))
            .map((task) => {
              // Find which other days have the same task
              const otherDays =
                allTasks
                  ?.filter(
                    (t) =>
                      t.title === task.title &&
                      t.startTime === task.startTime &&
                      t.endTime === task.endTime &&
                      t.dayOfWeek !== selectedDay
                  )
                  .map((t) => t.dayOfWeek)
                  .sort() ?? [];

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono shrink-0">
                        {task.startTime}–{task.endTime}
                      </span>
                      <span className="text-sm text-gray-700 font-medium truncate">
                        {task.title}
                      </span>
                    </div>
                    {otherDays.length > 0 && (
                      <div className="flex gap-0.5 mt-1">
                        {otherDays.map((d) => (
                          <span
                            key={d}
                            className="text-[9px] text-gray-400 bg-gray-100 px-1 rounded"
                          >
                            {DAYS[d]}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {otherDays.length > 0 && (
                      <button
                        onClick={() => handleDeleteAll(task)}
                        className="text-gray-300 hover:text-red-400 transition-colors px-1"
                        title="Remove from all days"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="text-[8px] block -mt-0.5">All</span>
                      </button>
                    )}
                    <button
                      onClick={() => task.id && handleDelete(task.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors px-1"
                      title={`Remove from ${DAYS[selectedDay]}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
        {tasks?.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4">
            No tasks for {DAYS[selectedDay]}.
          </p>
        )}
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
              {/* Task name */}
              <Input
                placeholder="Task name (e.g. School, Gym)"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />

              {/* Time range */}
              <div className="flex gap-2 items-center">
                <Input
                  type="time"
                  value={newStart}
                  onChange={(e) => setNewStart(e.target.value)}
                  className="flex-1"
                />
                <span className="text-gray-400 text-sm">→</span>
                <Input
                  type="time"
                  value={newEnd}
                  onChange={(e) => setNewEnd(e.target.value)}
                  className="flex-1"
                />
              </div>

              {/* Day selector: presets */}
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Repeat on</p>
                <div className="flex gap-1.5 mb-2">
                  {PRESETS.map((preset) => {
                    const isActive =
                      preset.days.length === selectedDays.length &&
                      preset.days.every((d) => selectedDays.includes(d));
                    return (
                      <button
                        key={preset.label}
                        onClick={() => applyPreset(preset.days)}
                        className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                          isActive
                            ? "bg-gray-900 text-white"
                            : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>

                {/* Day selector: individual toggles */}
                <div className="flex gap-1">
                  {DAYS.map((day, i) => (
                    <button
                      key={day}
                      onClick={() => toggleDay(i)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
                        selectedDays.includes(i)
                          ? "bg-gray-900 text-white shadow-sm"
                          : "bg-white text-gray-400 border border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                {selectedDays.length > 0 && (
                  <p className="text-[10px] text-gray-400 mt-1.5">
                    Adding to {selectedDays.length} day
                    {selectedDays.length > 1 ? "s" : ""}:{" "}
                    {selectedDays
                      .sort((a, b) => a - b)
                      .map((d) => DAYS[d])
                      .join(", ")}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  size="sm"
                  onClick={handleAdd}
                  disabled={!newTitle.trim() || selectedDays.length === 0}
                  className="flex-1"
                >
                  Add{selectedDays.length > 1 ? ` to ${selectedDays.length} days` : ""}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div layout>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={openForm}
            >
              <Plus className="h-4 w-4 mr-1" /> Add fixed task
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
