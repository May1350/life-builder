"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface ProfileVisionData {
  midTermVision: string;
  lifetimeDream: string;
}

interface Props {
  initial?: Partial<ProfileVisionData>;
  onNext: (data: ProfileVisionData) => void;
  onBack: () => void;
}

export function ProfileVision({ initial, onNext, onBack }: Props) {
  const [midTermVision, setMidTermVision] = useState(initial?.midTermVision ?? "");
  const [lifetimeDream, setLifetimeDream] = useState(initial?.lifetimeDream ?? "");

  const fields = [
    { label: "What kind of life do you want in 3-5 years?", value: midTermVision, set: setMidTermVision },
    { label: "What's your biggest lifetime dream or goal?", value: lifetimeDream, set: setLifetimeDream },
  ];

  const isValid = fields.every((f) => f.value.length >= 10);

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">Step 5 of 7</p>
        <h2 className="text-xl font-bold text-gray-900">Your Vision</h2>
        <p className="text-sm text-gray-500 mt-1">Dream big. We'll work backwards from here.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5">
        {fields.map((field) => (
          <div key={field.label}>
            <label className="text-sm font-medium text-gray-700 mb-1 block">{field.label}</label>
            <textarea
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-gray-400 resize-none"
              rows={4}
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
          onClick={() => onNext({ midTermVision, lifetimeDream })}
        >
          Generate Goals
        </Button>
      </div>
    </div>
  );
}
