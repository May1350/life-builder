"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { HORIZONS, DEFAULT_ALLOCATIONS, getHorizonColor } from "@/lib/constants";
import { Slider } from "@/components/ui/slider";
import { dataService } from "@/services";
import type { HorizonKey, HorizonAllocation } from "@/types";

interface AllocationEditorProps {
  onSave?: () => void;
}

export function AllocationEditor({ onSave }: AllocationEditorProps) {
  const existing = useLiveQuery(() => db.horizonAllocations.toArray(), []);
  const [allocations, setAllocations] = useState<Record<HorizonKey, number>>(
    DEFAULT_ALLOCATIONS
  );

  useEffect(() => {
    if (existing && existing.length > 0) {
      const map: Record<string, number> = {};
      for (const a of existing) {
        map[a.horizonKey] = a.percentage;
      }
      setAllocations(map as Record<HorizonKey, number>);
    }
  }, [existing]);

  const total = Object.values(allocations).reduce((s, v) => s + v, 0);

  const handleChange = (key: HorizonKey, value: number) => {
    const diff = value - allocations[key];
    const otherKeys = HORIZONS.map((h) => h.key).filter((k) => k !== key);
    const otherTotal = otherKeys.reduce((s, k) => s + allocations[k], 0);

    const updated = { ...allocations, [key]: value };

    // Redistribute diff among other keys proportionally
    if (otherTotal > 0) {
      for (const k of otherKeys) {
        const share = allocations[k] / otherTotal;
        updated[k] = Math.max(0, Math.round(allocations[k] - diff * share));
      }
    }

    // Fix rounding to sum to 100
    const newTotal = Object.values(updated).reduce((s, v) => s + v, 0);
    if (newTotal !== 100 && otherKeys.length > 0) {
      updated[otherKeys[0]] += 100 - newTotal;
    }

    setAllocations(updated);
  };

  const handleSave = async () => {
    const now = new Date();
    const allocs: HorizonAllocation[] = HORIZONS.map((h) => ({
      horizonKey: h.key,
      percentage: allocations[h.key],
      createdAt: now,
      updatedAt: now,
    }));
    await dataService.setAllocations(allocs);
    onSave?.();
  };

  return (
    <div className="space-y-4">
      {HORIZONS.map((h) => (
        <div key={h.key} className="space-y-1">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: getHorizonColor(h.key) }}
              />
              <span className="text-sm text-gray-700">{h.name}</span>
            </div>
            <span className="text-sm font-semibold text-gray-900 tabular-nums">
              {allocations[h.key]}%
            </span>
          </div>
          <Slider
            value={[allocations[h.key]]}
            onValueChange={(val) => handleChange(h.key, Array.isArray(val) ? val[0] : val)}
            min={0}
            max={100}
            step={5}
            className="w-full"
          />
        </div>
      ))}

      <div className="flex justify-between items-center pt-2 border-t border-gray-100">
        <span className="text-xs text-gray-400">
          Total: {total}%{" "}
          {total !== 100 && (
            <span className="text-red-400">(must be 100%)</span>
          )}
        </span>
        <button
          onClick={handleSave}
          disabled={total !== 100}
          className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg disabled:opacity-40 hover:bg-gray-800 transition-colors"
        >
          Save
        </button>
      </div>
    </div>
  );
}
