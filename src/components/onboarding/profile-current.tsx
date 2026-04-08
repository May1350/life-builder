"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ProfileCurrentData {
  currentFocus: string;
  desiredChange: string;
  neededSkills: string;
}

interface Props {
  initial?: Partial<ProfileCurrentData>;
  onNext: (data: ProfileCurrentData) => void;
  onBack: () => void;
}

export function ProfileCurrent({ initial, onNext, onBack }: Props) {
  const [currentFocus, setCurrentFocus] = useState(initial?.currentFocus ?? "");
  const [desiredChange, setDesiredChange] = useState(initial?.desiredChange ?? "");
  const [neededSkills, setNeededSkills] = useState(initial?.neededSkills ?? "");

  const fields = [
    { label: "What are you most focused on right now?", value: currentFocus, set: setCurrentFocus },
    { label: "What do you most want to change?", value: desiredChange, set: setDesiredChange },
    { label: "What skills or knowledge do you need?", value: neededSkills, set: setNeededSkills },
  ];

  const isValid = fields.every((f) => f.value.length >= 10);

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">Step 4 of 5</p>
        <h2 className="text-xl font-bold text-gray-900">Your Current State</h2>
        <p className="text-sm text-gray-500 mt-1">More detail = better goals.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5">
        {fields.map((field) => (
          <div key={field.label}>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{field.label}</label>
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
              rows={3}
              maxLength={500}
              placeholder="At least 10 characters..."
              value={field.value}
              onChange={(e) => field.set(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-0.5 text-right">{field.value.length}/500</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={onBack}>Back</Button>
        <Button
          className="flex-1"
          disabled={!isValid}
          onClick={() => onNext({ currentFocus, desiredChange, neededSkills })}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
