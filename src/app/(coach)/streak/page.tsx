"use client";

// /streak — the galaxy. Every night with a marked paper lights a star; the
// rules are in src/lib/galaxy.ts and the page is StarSky.
//
// Preview: /streak?demo=6 shows what 6 nights in a row looks like (today
// included); add &miss=1 for "last night was missed". Display only: it never
// touches the student's real streak or anything saved.

import { useEffect, useMemo, useState } from "react";
import { useCoachData } from "@/hooks/useCoachData";
import { localDateKey } from "@/lib/dailyTask";
import StarSky from "@/components/StarSky";

export default function StreakPage() {
  const { attempts } = useCoachData();
  const [demo, setDemo] = useState<string[] | null>(null);
  useEffect(() => {
    const id = setTimeout(() => {
      const q = new URLSearchParams(window.location.search);
      const n = Math.min(120, Math.max(0, parseInt(q.get("demo") ?? "", 10)));
      if (!Number.isFinite(n) || !q.has("demo")) return;
      const back = q.get("miss") ? 2 : q.get("today") === "0" ? 1 : 0; // last lit night: 2 days ago / yesterday / today
      setDemo(Array.from({ length: n }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - back - i); return localDateKey(d); }));
    }, 0);
    return () => clearTimeout(id);
  }, []);
  const attemptDates = useMemo(() => (attempts ?? []).map((a) => localDateKey(new Date(a.date))), [attempts]);

  return (
    <div className="w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 lg:pt-10 pb-16">
      {attempts ? <StarSky key={demo ? "demo" : "real"} attemptDates={demo ?? attemptDates} preview={!!demo} /> : <div className="rounded-[28px] border border-white/[0.08] bg-[#05050b] min-h-[560px] animate-pulse" />}
    </div>
  );
}
