"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";

export function useOnboardingComplete(): boolean | undefined {
  return useLiveQuery(async () => {
    const settings = await db.appSettings.toCollection().first();
    return settings?.onboardingComplete ?? false;
  }, []);
}

export function useOnboardingStep(): number | undefined {
  return useLiveQuery(async () => {
    const settings = await db.appSettings.toCollection().first();
    return settings?.onboardingStep ?? 0;
  }, []);
}
