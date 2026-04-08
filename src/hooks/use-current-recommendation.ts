"use client";

import { useState, useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getRecommendation, type Recommendation } from "@/engine/recommender";
import { nowTime } from "@/lib/time-utils";
import type { TimetableBlock } from "@/types";

export function useCurrentRecommendation(
  blocks: TimetableBlock[]
): Recommendation | null {
  const [currentTime, setCurrentTime] = useState(nowTime);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(nowTime());
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const data = useLiveQuery(async () => {
    const [tasks, goals] = await Promise.all([
      db.tasks.toArray(),
      db.goals.toArray(),
    ]);
    return { tasks, goals };
  }, []);

  if (!data || blocks.length === 0) return null;

  return getRecommendation(currentTime, blocks, data.tasks, data.goals);
}
