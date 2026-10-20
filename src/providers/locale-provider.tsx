"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { type Locale, createT } from "@/lib/locale";
import { db } from "@/lib/db";

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const Context = createContext<LocaleCtx>({
  locale: "en",
  setLocale: () => {},
  t: (key) => key,
});

export function useLocale() {
  return useContext(Context);
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [loaded, setLoaded] = useState(false);

  // Load saved locale on mount
  useEffect(() => {
    db.appSettings
      .toCollection()
      .first()
      .then((settings) => {
        const saved = (settings as Record<string, unknown> | undefined)?.locale;
        if (saved === "ko" || saved === "ja" || saved === "en") {
          setLocaleState(saved);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    // Persist to Dexie (best-effort, fire-and-forget)
    (async () => {
      try {
        const existing = await db.appSettings.toCollection().first();
        const now = new Date();
        if (existing?.id) {
          await db.appSettings.update(existing.id, {
            locale: l,
            updatedAt: now,
          });
        } else {
          await db.appSettings.add({
            onboardingComplete: false,
            locale: l,
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch {
        // best-effort persist
      }
    })();
  }, []);

  const t = createT(locale);

  // Don't flash English before saved locale loads
  if (!loaded) return null;

  return (
    <Context.Provider value={{ locale, setLocale, t }}>
      {children}
    </Context.Provider>
  );
}
