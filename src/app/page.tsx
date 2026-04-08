"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/shared/header";
import { CircularChart } from "@/components/chart/circular-chart";
import { RecommendationCard } from "@/components/recommendation/recommendation-card";
import { TomorrowStrip } from "@/components/tomorrow/tomorrow-strip";
import { BottomSheet } from "@/components/bottom-sheet/bottom-sheet";
import { useTodayTimetable } from "@/hooks/use-today-timetable";
import { useCurrentRecommendation } from "@/hooks/use-current-recommendation";
import { useOnboardingComplete } from "@/hooks/use-onboarding";
import { useDbReady } from "@/hooks/use-db";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (onboardingComplete === false) return null;

  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const subtitle = `${dayNames[today.getDay()]}, ${monthNames[today.getMonth()]} ${today.getDate()}`;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header subtitle={subtitle} />

      {/* Circular chart */}
      <div className="flex-shrink-0 py-4">
        <CircularChart blocks={blocks} />
      </div>

      {/* Recommendation */}
      {recommendation && (
        <RecommendationCard
          recommendation={recommendation}
          onRefresh={() => {
            // triggers re-render via live queries
          }}
        />
      )}

      {/* Tomorrow preview */}
      <TomorrowStrip />

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom sheet trigger */}
      <BottomSheet />
    </div>
  );
}
