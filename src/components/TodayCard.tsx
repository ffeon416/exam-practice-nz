"use client";

// The daily paper. One card, one task, already built and waiting. When it's
// done, the card turns into "done for today" with a countdown to the next
// drop at midnight. Tomorrow is never shown.

import { useEffect, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { msUntilLocalMidnight, TASK_BLURB, TASK_LENGTH, TASK_TITLE, type TaskKind } from "@/lib/dailyTask";

const ICON: Record<TaskKind, React.ReactNode> = {
  check: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor"><path strokeLinecap="round" d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="4" /></svg>,
  mock: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><circle cx="12" cy="13" r="8" /><path strokeLinecap="round" d="M12 9v4l3 2M9.5 3h5" /></svg>,
  paper: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13H7z" /><path strokeLinecap="round" d="M9.5 12h5M9.5 16h5" /></svg>,
  fix: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13 3L4 14h7l-1 7 9-11h-7z" /></svg>,
};

function Countdown() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilLocalMidnight());
    const id = setTimeout(tick, 0);
    const iv = setInterval(tick, 1000);
    return () => { clearTimeout(id); clearInterval(iv); };
  }, []);
  if (ms == null) return <span className="tabular-nums">--:--:--</span>;
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1000);
  return <span className="tabular-nums">{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}</span>;
}

export default function TodayCard({
  day, dateLabel, subjectLabel, kind, status, scoreLabel, busy, onStart,
}: {
  day: number;
  dateLabel: string;
  subjectLabel: string;
  kind: TaskKind;
  /** building = paper being written · ready = waiting · done = sat today · failed */
  status: "loading" | "building" | "ready" | "done" | "failed";
  scoreLabel?: string | null;
  busy?: boolean;
  onStart: () => void;
}) {
  const isCheck = kind === "check", done = status === "done";
  const accent = done ? "#34d399" : isCheck ? "#34d399" : "#a78bfa";

  return (
    <div className="relative rounded-[30px] p-[1.5px] overflow-hidden">
      {/* slowly turning gradient border */}
      <span className="absolute inset-[-60%] sa-spin-slow" style={{ background: `conic-gradient(from 0deg, transparent 0deg, ${accent} 70deg, transparent 130deg, transparent 230deg, ${accent}99 300deg, transparent 360deg)` }} aria-hidden />
      <div className="relative rounded-[28.5px] bg-[#0b0b12] overflow-hidden">
        {/* corner glow */}
        <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: `radial-gradient(50% 50% at 50% 50%, ${accent}33 0%, transparent 70%)` }} aria-hidden />

        <div className="relative p-6 sm:p-9">
          {/* ticket header */}
          <div className="flex items-center justify-between gap-3 mb-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-400">Day {day} · {dateLabel}</p>
            {status === "ready" && (
              <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.14em] px-3 py-1.5 rounded-full border" style={{ color: accent, borderColor: `${accent}55`, background: `${accent}14` }}>
                <span className="relative flex w-2 h-2"><span className="absolute inset-0 rounded-full animate-ping" style={{ background: accent, opacity: 0.6 }} /><span className="relative rounded-full w-2 h-2" style={{ background: accent }} /></span>
                Ready
              </span>
            )}
            {status === "building" && <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500">Writing your paper…</span>}
            {done && <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-emerald-300">Done ✓</span>}
          </div>

          {!done ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <span className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: `${accent}1f`, color: accent }}>{ICON[kind]}</span>
                <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-zinc-300">{subjectLabel}</p>
              </div>
              <h2 className={`${display.className} text-white font-bold text-[38px] sm:text-[52px] leading-[0.98] tracking-[-0.03em] mb-4`}>{TASK_TITLE[kind]}</h2>
              <p className="text-zinc-300 text-[15px] leading-relaxed max-w-md mb-1.5">{TASK_BLURB[kind]}</p>
              <p className="text-zinc-500 text-[12.5px] mb-8">{TASK_LENGTH[kind]}</p>

              {status === "failed" ? (
                <button onClick={onStart} className="w-full sm:w-auto bg-white text-[#0a0a0f] font-bold text-[16px] px-10 py-4 rounded-full min-h-[56px]">Try building it again →</button>
              ) : (
                <button onClick={onStart} disabled={busy || status !== "ready"}
                  className={`w-full sm:w-auto font-bold text-[16px] px-12 py-4 rounded-full min-h-[56px] transition-transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ${isCheck ? "bg-emerald-400 text-[#06120d]" : "bg-white text-[#0a0a0f]"}`}>
                  {busy ? "Opening…" : status === "ready" ? (isCheck ? "Check my grade →" : "Start →") : "Building…"}
                </button>
              )}
              {status === "building" && (
                <div className="mt-6 h-1.5 rounded-full bg-white/[0.06] overflow-hidden max-w-md"><div className="h-full w-2/3 rounded-full animate-pulse" style={{ background: `linear-gradient(90deg, ${accent}, #6366f1)` }} /></div>
              )}
            </>
          ) : (
            <>
              <h2 className={`${display.className} text-white font-bold text-[38px] sm:text-[52px] leading-[0.98] tracking-[-0.03em] mb-3`}>That&apos;s today done.</h2>
              <p className="text-zinc-300 text-[15px] leading-relaxed max-w-md mb-1.5">
                {subjectLabel} · {TASK_TITLE[kind]}{scoreLabel ? <> · <span className="text-white font-semibold">{scoreLabel}</span></> : null}
              </p>
              <p className="text-zinc-500 text-[13px] mb-8">Tomorrow&apos;s task drops at midnight, built for you overnight.</p>
              <div className="flex flex-wrap items-center gap-4">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-5 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">Next drop in</p>
                  <p className={`${display.className} text-white font-bold text-[26px] leading-none mt-1`}><Countdown /></p>
                </div>
                <Link href="/subjects" className="text-[13.5px] text-zinc-400 hover:text-white underline-offset-4 hover:underline">Want more tonight? Sit an extra paper →</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
