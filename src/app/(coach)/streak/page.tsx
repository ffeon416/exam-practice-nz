"use client";

// /streak — Ace. One paper a day keeps him healthy; miss days and he goes
// downhill. The streak, his mood, and the last fortnight.

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { display } from "@/lib/displayFont";
import { useCoachData } from "@/hooks/useCoachData";
import { localDateKey, recentDays, streakDays } from "@/lib/dailyTask";
import StreakCard from "@/components/StreakCard";

function StreakInner() {
  const { attempts } = useCoachData();
  const celebrate = useSearchParams().get("done") === "1";
  const today = localDateKey();
  const attemptDates = useMemo(() => (attempts ?? []).map((a) => localDateKey(new Date(a.date))), [attempts]);
  const streak = streakDays(attemptDates, today);
  const days = recentDays(attemptDates, 14, today);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-16">
      <div className="mb-5 sm:mb-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-zinc-500">Streak</p>
        <h1 className={`${display.className} font-bold text-white text-[28px] sm:text-[34px] leading-none tracking-[-0.03em] mt-1`}>How&apos;s Ace doing?</h1>
      </div>
      {attempts ? (
        <StreakCard streak={streak} days={days} celebrate={celebrate} size={240} />
      ) : (
        <div className="rounded-[30px] border border-white/[0.08] bg-white/[0.015] min-h-[420px] animate-pulse" />
      )}
    </div>
  );
}

export default function StreakPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-hidden />}>
      <StreakInner />
    </Suspense>
  );
}
