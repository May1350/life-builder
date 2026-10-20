"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { HorizonChip } from "@/components/shared/horizon-chip";
import { HORIZONS } from "@/lib/constants";
import { dataService } from "@/services";
import type { HorizonKey } from "@/types";
import { useLocale } from "@/providers/locale-provider";

interface AddTaskModalProps {
  open: boolean;
  onClose: () => void;
}

export function AddTaskModal({ open, onClose }: AddTaskModalProps) {
  const { t } = useLocale();
  const [title, setTitle] = useState("");
  const [horizonKey, setHorizonKey] = useState<HorizonKey>("this-week");
  const [dueDate, setDueDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");

  const isShortTerm = horizonKey === "this-week" || horizonKey === "this-month";

  const handleSave = async () => {
    if (!title.trim()) return;

    await dataService.addTask({
      title: title.trim(),
      horizonKey,
      dueDate: dueDate || undefined,
      estimatedMinutes: estimatedMinutes
        ? parseInt(estimatedMinutes, 10)
        : undefined,
    });

    setTitle("");
    setDueDate("");
    setEstimatedMinutes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>{t("tasks.addTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">{t("tasks.title")}</label>
            <Input
              placeholder={t("tasks.titlePlaceholder")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>

          {/* Horizon */}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">
              {t("tasks.horizon")}
            </label>
            <div className="flex flex-wrap gap-1.5">
              {HORIZONS.map((h) => (
                <HorizonChip
                  key={h.key}
                  horizonKey={h.key}
                  selected={horizonKey === h.key}
                  onClick={setHorizonKey}
                  size="sm"
                />
              ))}
            </div>
          </div>

          {/* Auto-schedule fields (shown for short-term horizons) */}
          {isShortTerm && (
            <>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {t("tasks.dueDate")}
                </label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">
                  {t("tasks.estimated")}
                </label>
                <Input
                  type="number"
                  placeholder={t("tasks.estimatedPlaceholder")}
                  value={estimatedMinutes}
                  onChange={(e) => setEstimatedMinutes(e.target.value)}
                />
              </div>
            </>
          )}

          {/* Save */}
          <Button onClick={handleSave} className="w-full" disabled={!title.trim()}>
            {t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
