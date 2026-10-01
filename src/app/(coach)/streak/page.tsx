"use client";

// /streak — Ace's arcade screen. The streak is a combo multiplier; it
// drops at midnight, your time, unless tonight's paper gets played.

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useCoachData } from "@/hooks/useCoachData";
import { localDateKey, recentDays, streakDays } from "@/lib/dailyTask";
import ArcadeStreak from "@/components/ArcadeStreak";

/** Longest run of consecutive days with a marked paper, ever. */
function bestStreak(dates: string[]): number {
  const set = [...new Set(dates)].sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const d of set) {
    if (prev) { const n = new Date(prev + "T12:00:00"); n.setDate(n.getDate() + 1); run = localDateKey(n) === d ? run + 1 : 1; } else run = 1;
    best = Math.max(best, run); prev = d;
  }
  return best;
}

export default function StreakPage() {
  const { attempts } = useCoachData();
  const { user } = useUser();
  const today = localDateKey();
  const attemptDates = useMemo(() => (attempts ?? []).map((a) => localDateKey(new Date(a.date))), [attempts]);
  const streak = streakDays(attemptDates, today);
  const best = Math.max(streak, bestStreak(attemptDates));
  const days = recentDays(attemptDates, 7, today);
  const doneToday = attemptDates.includes(today);
  const name = (user?.firstName?.trim() || user?.primaryEmailAddress?.emailAddress?.split("@")[0]?.split("+")[0] || "Player").slice(0, 10);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-16">
      {attempts ? (
        <ArcadeStreak name={name} streak={streak} best={best} days={days} doneToday={doneToday} />
      ) : (
        <div className="rounded-sm border-[3px] border-[#6b5bd2]/40 bg-[#0d0b1a] min-h-[560px] animate-pulse" />
      )}
    </div>
  );
}
