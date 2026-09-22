"use client";

// The daily paper. The day is the hero: a huge day number, the date, then
// the task in big type with one Start button. Already built and waiting.
// When it's done, the card becomes "that's today done" with a countdown to
// the next drop at midnight. Tomorrow is never shown.

import { useEffect, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { msUntilLocalMidnight, TASK_BLURB, TASK_LENGTH, TASK_TITLE, type TaskKind } from "@/lib/dailyTask";

const ICON: Record<TaskKind, React.ReactNode> = {
  check: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor"><path strokeLinecap="round" d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="4" /></svg>,
  mock: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><circle cx="12" cy="13" r="8" /><path strokeLinecap="round" d="M12 9v4l3 2M9.5 3h5" /></svg>,
  paper: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13H7z" /><path strokeLinecap="round" d="M9.5 12h5M9.5 16h5" /></svg>,
  fix: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13 3L4 14h7l-1 7 9-11h-7z" /></svg>,
};

const BUILD_LINES = ["Writing your questions…", "Matching your exam's style…", "Checking the marking scheme…", "Nearly there…"];

function Countdown() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilLocalMidnight());
    const id = setTimeout(tick, 0); const iv = setInterval(tick, 1000);
    return () => { clearTimeout(id); clearInterval(iv); };
  }, []);
  if (ms == null) return <span className="tabular-nums">--:--:--</span>;
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1000);
  return <span className="tabular-nums">{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>;
}

function BuildLine() {
  const [i, setI] = useState(0);
  useEffect(() => { const iv = setInterval(() => setI((x) => (x + 1) % BUILD_LINES.length), 3000); return () => clearInterval(iv); }, []);
  return <>{BUILD_LINES[i]}</>;
}

export default function TodayCard({
  firstName, day, dateLabel, subjectLabel, kind, status, scoreLabel, busy, onStart, examInDays,
}: {
  firstName?: string | null;
  /** Days until this subject's exam, if a date is set. */
  examInDays?: number | null;
  day: number;
  dateLabel: string;
  subjectLabel: string;
  kind: TaskKind;
  status: "loading" | "building" | "ready" | "done" | "failed";
  scoreLabel?: string | null;
  busy?: boolean;
  onStart: () => void;
}) {
  const isCheck = kind === "check", done = status === "done", ready = status === "ready";
  const accent = done || isCheck ? "#34d399" : "#a78bfa";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Morning" : hour < 17 ? "Afternoon" : "Evening";

  return (
    <div className="relative rounded-[32px] p-[1.5px] overflow-hidden">
      <span className="absolute inset-[-60%] sa-spin-slow" style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${accent} 70deg, transparent 130deg, transparent 230deg, ${accent}99 300deg, transparent 360deg)` }} aria-hidden />
      <div className="relative rounded-[30.5px] bg-[#0b0b12] overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[560px] h-[560px] rounded-full pointer-events-none" style={{ background: `radial-gradient(50% 50% at 50% 50%, ${accent}3a 0%, transparent 70%)` }} aria-hidden />
        <div className="absolute -bottom-40 -right-24 w-[480px] h-[480px] rounded-full pointer-events-none hidden sm:block" style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(99,102,241,0.18) 0%, transparent 70%)" }} aria-hidden />

        <div className="relative p-6 sm:p-10 lg:p-12">
          {/* Greeting + state */}
          <div className="flex items-center justify-between gap-3 mb-8 sm:mb-10">
            <p className="text-zinc-300 text-[15px]">{greet}{firstName ? `, ${firstName}` : ""}. {done ? "Nice work." : ready ? "Today's paper is ready for you." : status === "building" ? "Your paper is being written." : "Here's today."}</p>
            {ready && (
              <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] px-3 py-1.5 rounded-full border shrink-0" style={{ color: accent, borderColor: `${accent}55`, background: `${accent}14` }}>
                <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full animate-ping" style={{ background: accent, opacity: 0.6 }} /><span className="relative rounded-full w-2 h-2" style={{ background: accent }} /></span>
                Ready
              </span>
            )}
            {done && <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-emerald-300 shrink-0">Done ✓</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-[auto,1fr] gap-8 md:gap-12 items-center">
            {/* The day — the hero */}
            <div className="md:pr-10 md:border-r md:border-white/[0.07]">
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">Day</p>
              <p className={`${display.className} font-bold leading-[0.85] tracking-[-0.06em] text-[112px] sm:text-[150px] md:text-[168px] bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400`}>{day}</p>
              <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-zinc-400 mt-3">{dateLabel}</p>
              {examInDays != null && examInDays >= 0 && (
                <p className={`font-mono text-[11.5px] uppercase tracking-[0.14em] mt-2 ${examInDays <= 7 ? "text-rose-300" : examInDays <= 21 ? "text-amber-300" : "text-zinc-500"}`}>
                  {examInDays === 0 ? "Exam day" : `${examInDays} ${examInDays === 1 ? "day" : "days"} to your ${subjectLabel} exam`}
                </p>
              )}
            </div>

            {/* The task */}
            <div>
              {!done ? (
                <>
                  <div className="inline-flex items-center gap-2.5 mb-4 px-3 py-1.5 rounded-full border" style={{ borderColor: `${accent}40`, background: `${accent}12`, color: accent }}>
                    {ICON[kind]}<span className="font-mono text-[11px] uppercase tracking-[0.14em]">{subjectLabel}</span>
                  </div>
                  <h2 className={`${display.className} text-white font-bold text-[44px] sm:text-[60px] lg:text-[68px] leading-[0.95] tracking-[-0.035em] mb-5`}>{TASK_TITLE[kind]}</h2>
                  <p className="text-zinc-300 text-[16px] leading-relaxed max-w-md mb-1.5">{TASK_BLURB[kind]}</p>
                  <p className="text-zinc-500 text-[13px] mb-8">{TASK_LENGTH[kind]}</p>

                  {status === "failed" ? (
                    <button onClick={onStart} className="w-full sm:w-auto bg-white text-[#0a0a0f] font-bold text-[17px] px-12 py-5 rounded-full min-h-[60px]">Try building it again →</button>
                  ) : ready ? (
                    <button onClick={onStart} disabled={busy}
                      className={`w-full sm:w-auto font-bold text-[17px] px-14 py-5 rounded-full min-h-[60px] transition-transform hover:scale-[1.02] disabled:opacity-60 ${isCheck ? "bg-emerald-400 text-[#06120d] shadow-[0_0_40px_rgba(52,211,153,0.35)]" : "bg-white text-[#0a0a0f] shadow-[0_0_40px_rgba(167,139,250,0.35)]"}`}>
                      {busy ? "Opening…" : isCheck ? "Check my grade →" : "Start →"}
                    </button>
                  ) : (
                    <div className="max-w-md">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="w-9 h-9 rounded-full border-2 border-white/10 border-t-white/70 animate-spin" aria-hidden />
                        <p className="text-white font-semibold text-[15px]"><BuildLine /></p>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full w-2/3 rounded-full animate-pulse" style={{ background: `linear-gradient(90deg, ${accent}, #6366f1)` }} /></div>
                      <p className="text-zinc-500 text-[12px] mt-2">Usually under a minute. After today, it&apos;s built overnight and waiting.</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h2 className={`${display.className} text-white font-bold text-[44px] sm:text-[60px] leading-[0.95] tracking-[-0.035em] mb-4`}>That&apos;s today done.</h2>
                  <p className="text-zinc-300 text-[16px] leading-relaxed max-w-md mb-1.5">
                    {subjectLabel} · {TASK_TITLE[kind]}{scoreLabel ? <> · <span className="text-white font-semibold">{scoreLabel}</span></> : null}
                  </p>
                  <p className="text-zinc-500 text-[13px] mb-8">Tomorrow&apos;s task drops at midnight, built for you overnight.</p>
                  <div className="flex flex-wrap items-center gap-5">
                    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-4">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">Next drop in</p>
                      <p className={`${display.className} text-white font-bold text-[32px] leading-none mt-1`}><Countdown /></p>
                    </div>
                    <Link href="/subjects" className="text-[14px] text-zinc-400 hover:text-white underline-offset-4 hover:underline">Want more tonight? Sit an extra paper →</Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
