"use client";

// /streak — the night sky. Every night with a marked paper lights the next
// star in Ace's spade; a missed night resets the streak and the sky.

import { useMemo } from "react";
import { useCoachData } from "@/hooks/useCoachData";
import { localDateKey, streakDays } from "@/lib/dailyTask";
import SpadeSky from "@/components/SpadeSky";

export default function StreakPage() {
  const { attempts } = useCoachData();
  const today = localDateKey();
  const attemptDates = useMemo(() => (attempts ?? []).map((a) => localDateKey(new Date(a.date))), [attempts]);
  const streak = streakDays(attemptDates, today);
  const doneToday = attemptDates.includes(today);

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 lg:pt-10 pb-16">
      {attempts ? (
        <SpadeSky streak={streak} doneToday={doneToday} />
      ) : (
        <div className="rounded-[28px] border border-white/[0.08] bg-[#05050b] min-h-[560px] animate-pulse" />
      )}
    </div>
  );
}
