"use client";

// /today — the coach app's home and the PWA start screen.
// One card: tonight's paper, already built, one tap to start. Under it the
// two things that matter tonight (reviews due, streak) and nothing else.

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { display } from "@/lib/displayFont";
import { loadOnboarding } from "@/lib/onboarding";
import { loadProgress } from "@/lib/storage";
import { getDueCount } from "@/lib/spacedRepetition";
import { adoptPaper, buildNextPaper, fetchNextPaper } from "@/lib/nextPaper";
import { resolveCurriculum } from "@/data/curricula";
import type { Exam } from "@/lib/types";

type Phase = "loading" | "ready" | "building" | "failed";

const BUILDING_LINES = [
  "Writing tonight's questions…",
  "Matching your exam board's style…",
  "Checking the marking scheme…",
  "Nearly there…",
];

export default function TodayPage() {
  const router = useRouter();
  const { user } = useUser();
  const [phase, setPhase] = useState<Phase>("loading");
  const [exam, setExam] = useState<Exam | null>(null);
  const [due, setDue] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lineIdx, setLineIdx] = useState(0);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const ob = loadOnboarding();
      if (!ob || ob.subjects.length === 0) {
        router.replace("/welcome");
        return;
      }
      try {
        setDue(getDueCount());
        const p = loadProgress();
        setStreak(p.streakDays ?? 0);
      } catch {}
      const waiting = await fetchNextPaper().catch(() => null);
      if (cancelled) return;
      if (waiting) { setExam(waiting); setPhase("ready"); return; }
      setPhase("building");
      const built = await buildNextPaper().catch(() => null);
      if (cancelled) return;
      if (built) { setExam(built); setPhase("ready"); } else { setPhase("failed"); }
    };
    const id = setTimeout(run, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [router]);

  useEffect(() => {
    if (phase !== "building") return;
    const iv = setInterval(() => setLineIdx((i) => (i + 1) % BUILDING_LINES.length), 3500);
    return () => clearInterval(iv);
  }, [phase]);

  function start() {
    if (!exam || starting) return;
    setStarting(true);
    try {
      adoptPaper(exam);
      router.push(`/exam/${exam.id}?mode=practice`);
    } catch {
      setStarting(false);
      setPhase("failed");
    }
  }

  async function rebuild() {
    setPhase("building");
    const built = await buildNextPaper().catch(() => null);
    if (built) { setExam(built); setPhase("ready"); } else { setPhase("failed"); }
  }

  const firstName = user?.firstName?.trim();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";
  const subjectLabel = exam
    ? resolveCurriculum(exam.curriculumId).subjects.find((s) => s.value === exam.subject)?.label ?? exam.subject
    : null;
  const minutes = exam ? Math.max(10, Math.round(exam.questions.length * 2.5)) : 0;

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 sm:pt-10 pb-10">
      <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
        {greeting}{firstName ? `, ${firstName}` : ""}
      </p>
      <h1 className={`${display.className} text-[30px] sm:text-[38px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-6`}>
        Tonight
      </h1>

      {/* The card */}
      <div className="rounded-[28px] border border-indigo-400/30 bg-gradient-to-br from-indigo-500/[0.12] to-violet-500/[0.05] p-5 sm:p-6 mb-4 min-h-[188px] flex flex-col">
        {phase === "ready" && exam && (
          <>
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-300 mb-1.5">Tonight&apos;s paper · ready</p>
            <p className={`${display.className} text-white font-bold text-[24px] leading-tight tracking-[-0.01em] mb-1`}>{subjectLabel}</p>
            <p className="text-zinc-400 text-[13.5px] mb-5">
              {exam.questions.length} questions · about {minutes} min · marked the moment you finish
            </p>
            <button
              onClick={start}
              disabled={starting}
              className="mt-auto w-full bg-white text-[#0a0a0f] font-bold text-[16px] py-4 rounded-full min-h-[52px] hover:scale-[1.01] transition-transform disabled:opacity-60"
            >
              {starting ? "Opening…" : "Start →"}
            </button>
          </>
        )}
        {(phase === "loading" || phase === "building") && (
          <>
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-indigo-300 mb-1.5">Tonight&apos;s paper</p>
            <p className={`${display.className} text-white font-bold text-[22px] leading-tight mb-2`}>
              {phase === "loading" ? "One moment…" : "Building it now"}
            </p>
            <p className="text-zinc-400 text-[13.5px] mb-4">
              {phase === "loading" ? "Checking for your paper." : BUILDING_LINES[lineIdx]}
            </p>
            <div className="mt-auto h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className={`h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 ${phase === "building" ? "animate-pulse w-2/3" : "w-1/4"}`} />
            </div>
            {phase === "building" && (
              <p className="text-zinc-600 text-[11px] mt-2">Usually under a minute. After tonight, the next one is built before you arrive.</p>
            )}
          </>
        )}
        {phase === "failed" && (
          <>
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-amber-300 mb-1.5">Tonight&apos;s paper</p>
            <p className={`${display.className} text-white font-bold text-[22px] leading-tight mb-2`}>Couldn&apos;t build it just now</p>
            <p className="text-zinc-400 text-[13.5px] mb-4">Try again, or pick a subject yourself.</p>
            <div className="mt-auto flex gap-2">
              <button onClick={rebuild} className="flex-1 bg-white text-[#0a0a0f] font-bold text-[14px] py-3 rounded-full min-h-[48px]">Try again</button>
              <Link href="/subjects" className="flex-1 text-center border border-white/[0.15] text-zinc-200 font-semibold text-[14px] py-3 rounded-full min-h-[48px] flex items-center justify-center">Pick a subject</Link>
            </div>
          </>
        )}
      </div>

      {/* Tonight's other two things */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Link href="/review" className={`rounded-2xl border p-4 min-h-[88px] flex flex-col justify-between ${due > 0 ? "border-amber-400/30 bg-amber-500/[0.06]" : "border-white/[0.07] bg-white/[0.015]"}`}>
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500">Reviews due</p>
          <p className={`${display.className} font-bold text-[26px] leading-none ${due > 0 ? "text-amber-300" : "text-zinc-400"}`}>{due}</p>
          <p className="text-[11.5px] text-zinc-500">{due > 0 ? "questions you got wrong" : "nothing waiting"}</p>
        </Link>
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.015] p-4 min-h-[88px] flex flex-col justify-between">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500">Streak</p>
          <p className={`${display.className} font-bold text-[26px] leading-none ${streak > 0 ? "text-emerald-300" : "text-zinc-400"}`}>{streak}</p>
          <p className="text-[11.5px] text-zinc-500">{streak === 1 ? "day" : "days"} in a row</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
        <Link href="/subjects" className="text-indigo-400 font-semibold hover:underline">Different subject tonight →</Link>
        <Link href="/dashboard" className="text-zinc-500 hover:text-zinc-300">Progress</Link>
      </div>
    </div>
  );
}
