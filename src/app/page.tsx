"use client";

import { useEffect, useMemo, useRef, useState as useReactState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/shared/header";
import { CircularChart } from "@/components/chart/circular-chart";
import { RecommendationCard } from "@/components/recommendation/recommendation-card";
import { TomorrowStrip } from "@/components/tomorrow/tomorrow-strip";
import { PanelHost, usePanel } from "@/components/panel/panel-host";
import { ManagePanel } from "@/components/panel/manage-panel";
import { SettingsPanel } from "@/components/panel/settings-panel";
import { MenuPanel } from "@/components/panel/menu-panel";
import { useTodayTimetable } from "@/hooks/use-today-timetable";
import { useCurrentRecommendation } from "@/hooks/use-current-recommendation";
import { useOnboardingComplete } from "@/hooks/use-onboarding";
import { useDbReady } from "@/hooks/use-db";
import { detectGoalHealth } from "@/engine/goal-health";
import { HealthReview } from "@/components/review/health-review";
import { Loader2 } from "lucide-react";
import { MobileShell } from "@/components/shared/mobile-shell";
import { useLocale } from "@/providers/locale-provider";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import type { TimetableBlock } from "@/types";
import type { Recommendation } from "@/engine/recommender";

function BottomTrigger({ atBottom }: { atBottom?: boolean }) {
  const { openPanel } = usePanel();
  const { t } = useLocale();
  const remainingCount = useLiveQuery(
    () => db.tasks.filter((task) => task.status !== "completed").count(),
    [],
  );

  const preview =
    remainingCount === undefined
      ? ""
      : remainingCount === 0
        ? t("sheet.preview.none")
        : t("sheet.preview.count", { n: remainingCount });

  return (
    <button
      className="w-full bg-gray-50 rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.06)] hover:bg-gray-100 transition-colors px-6"
      style={{ padding: atBottom ? "8px 24px" : "6px 24px" }}
      onClick={() => openPanel("manage")}
    >
      <div className="flex justify-center">
        <div className="w-8 h-1 rounded-full bg-gray-300" />
      </div>
      {atBottom && (
        <div className="flex items-center justify-center mt-1.5">
          <span className="text-xs text-gray-400">{preview}</span>
        </div>
      )}
    </button>
  );
}

function PanelRouter() {
  const { activePanel } = usePanel();
  if (activePanel === "manage") return <ManagePanel />;
  if (activePanel === "settings") return <SettingsPanel />;
  if (activePanel === "menu") return <MenuPanel />;
  return null;
}

function MainContent({
  blocks,
  recommendation,
  subtitle,
}: {
  blocks: TimetableBlock[];
  recommendation: Recommendation | null;
  subtitle: string;
}) {
  const { activePanel, openPanel, closePanel } = usePanel();
  const { t } = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [atBottom, setAtBottom] = useReactState(false);

  const [skipCount, setSkipCount] = useReactState(0);

  const allGoals = useLiveQuery(() => db.goals.toArray(), []);
  const allTasks = useLiveQuery(() => db.tasks.toArray(), []);

  // Reset skip count when the underlying recommendation changes
  const basePrimaryId = recommendation?.primary?.id;
  useEffect(() => { setSkipCount(0); }, [basePrimaryId]);

  // Offset into [primary, ...alternatives] when user skips
  const displayRec = useMemo(() => {
    if (!recommendation || skipCount === 0) return recommendation;
    const all = [recommendation.primary, ...recommendation.alternatives].filter(
      (t): t is NonNullable<typeof t> => t !== null,
    );
    const primary = all[skipCount] ?? null;
    const alternatives = all.slice(skipCount + 1);
    return { ...recommendation, primary, alternatives };
  }, [recommendation, skipCount]);

  const handleSkip = () => {
    const max = recommendation?.alternatives.length ?? 0;
    if (skipCount < max) setSkipCount((c) => c + 1);
  };

  const handleDidItRefresh = () => {
    setSkipCount(0);
  };

  const flagged = useMemo(() => {
    if (!allGoals || !allTasks) return [];
    return detectGoalHealth(allGoals, allTasks);
  }, [allGoals, allTasks]);
  const healthyCount = (allGoals?.length ?? 0) - flagged.length;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 20;
      setAtBottom(isBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="h-dvh bg-white flex flex-col">
      {/* Fixed header */}
      <div className="sticky top-0 z-30 bg-white">
        <Header
          subtitle={subtitle}
          onSettingsClick={() => openPanel("settings")}
          onMenuClick={() => openPanel("menu")}
        />
      </div>

      {/* Scrollable content */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Circular chart */}
        <div className="flex-shrink-0 py-4">
          <CircularChart blocks={blocks} />
        </div>

        {/* Recommendation */}
        {displayRec && (
          <RecommendationCard
            recommendation={displayRec}
            onRefresh={handleSkip}
            onDidIt={handleDidItRefresh}
          />
        )}

        {/* Nudge banner for stale goals */}
        {flagged.length > 0 && activePanel !== "review" && (
          <button
            onClick={() => openPanel("review")}
            className="mx-4 my-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-800 text-left"
          >
            {t("healthReview.nudge", { n: flagged.length })}
          </button>
        )}

        {/* Tomorrow preview */}
        <TomorrowStrip />

        {/* Spacer */}
        <div className="pt-8" />
      </div>

      {/* Health review overlay */}
      {activePanel === "review" && allGoals && allTasks && (
        <div className="absolute inset-0 z-40 bg-white overflow-y-auto">
          <HealthReview
            flaggedGoals={flagged}
            allGoals={allGoals}
            allTasks={allTasks}
            healthyCount={healthyCount}
            onComplete={closePanel}
          />
        </div>
      )}

      {/* Fixed bottom trigger — handle always, preview only at bottom */}
      <BottomTrigger atBottom={atBottom} />
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { t } = useLocale();
  const dbReady = useDbReady();
  const onboardingComplete = useOnboardingComplete();
  const { blocks, isLoading } = useTodayTimetable();
  const recommendation = useCurrentRecommendation(blocks);

  useEffect(() => {
    if (dbReady && onboardingComplete === false) {
      router.push("/onboarding");
    }
  }, [dbReady, onboardingComplete, router]);

  if (!dbReady || onboardingComplete === undefined || isLoading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (onboardingComplete === false) return null;

  const today = new Date();
  const dayNames = [t("day.Sun"), t("day.Mon"), t("day.Tue"), t("day.Wed"), t("day.Thu"), t("day.Fri"), t("day.Sat")];
  const monthNames = [
    t("month.0"), t("month.1"), t("month.2"), t("month.3"), t("month.4"), t("month.5"),
    t("month.6"), t("month.7"), t("month.8"), t("month.9"), t("month.10"), t("month.11"),
  ];
  const subtitle = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}`;

  return (
    <MobileShell>
      <PanelHost panelContent={<PanelRouter />}>
        <MainContent blocks={blocks} recommendation={recommendation} subtitle={subtitle} />
      </PanelHost>
    </MobileShell>
  );
}
