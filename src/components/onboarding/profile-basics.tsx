"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const LIFE_STAGES = [
  "Student", "Early Career", "Mid Career", "Senior", "Freelancer",
  "Entrepreneur", "Career Change", "Retired",
];

const INTEREST_TAGS = [
  "Technology", "Health & Fitness", "Finance", "Education", "Arts & Design",
  "Business", "Relationships", "Science", "Languages", "Sports", "Other",
];

const VALUE_TAGS = [
  "Growth", "Stability", "Freedom", "Impact", "Family",
  "Creativity", "Achievement", "Health", "Adventure", "Knowledge",
];

interface ProfileBasicsData {
  occupation: string;
  lifeStage: string;
  age: number;
  interests: string[];
  values: string[];
}

interface Props {
  initial?: Partial<ProfileBasicsData>;
  onNext: (data: ProfileBasicsData) => void;
  onBack: () => void;
}

export function ProfileBasics({ initial, onNext, onBack }: Props) {
  const [occupation, setOccupation] = useState(initial?.occupation ?? "");
  const [lifeStage, setLifeStage] = useState(initial?.lifeStage ?? "");
  const [age, setAge] = useState(initial?.age ?? 25);
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  const [values, setValues] = useState<string[]>(initial?.values ?? []);

  const toggleTag = (tag: string, list: string[], set: (v: string[]) => void, max: number) => {
    if (list.includes(tag)) {
      set(list.filter((t) => t !== tag));
    } else if (list.length < max) {
      set([...list, tag]);
    }
  };

  const isValid =
    occupation.length > 0 &&
    lifeStage.length > 0 &&
    age >= 10 && age <= 120 &&
    interests.length >= 1 &&
    values.length >= 2 && values.length <= 3;

  return (
    <div className="flex-1 flex flex-col px-6 py-8">
      <div className="mb-6">
        <p className="text-xs text-gray-400 mb-1">Step 3 of 5</p>
        <h2 className="text-xl font-bold text-gray-900">About You</h2>
        <p className="text-sm text-gray-500 mt-1">Help us understand your background.</p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-5">
        {/* Occupation */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Occupation</label>
          <Input
            placeholder="e.g. Software Engineer"
            value={occupation}
            onChange={(e) => setOccupation((e.target as HTMLInputElement).value)}
          />
        </div>

        {/* Age */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Age</label>
          <Input
            type="number"
            min={10}
            max={120}
            value={age}
            onChange={(e) => setAge(Number((e.target as HTMLInputElement).value))}
          />
        </div>

        {/* Life Stage */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Life Stage</label>
          <div className="flex flex-wrap gap-2">
            {LIFE_STAGES.map((stage) => (
              <Badge
                key={stage}
                variant={lifeStage === stage ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => setLifeStage(stage)}
              >
                {stage}
              </Badge>
            ))}
          </div>
        </div>

        {/* Interests */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Interests <span className="text-gray-400">(pick up to 5)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {INTEREST_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={interests.includes(tag) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleTag(tag, interests, setInterests, 5)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Values */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Core Values <span className="text-gray-400">(pick 2-3)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {VALUE_TAGS.map((tag) => (
              <Badge
                key={tag}
                variant={values.includes(tag) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleTag(tag, values, setValues, 3)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <Button variant="outline" className="flex-1" onClick={onBack}>Back</Button>
        <Button
          className="flex-1"
          disabled={!isValid}
          onClick={() => onNext({ occupation, lifeStage, age, interests, values })}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
