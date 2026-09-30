"use client";

// Today's task, big and plain: eyebrow, the task name as the headline, one
// line on what it is, one button. Content sits at the bottom of a tall
// card, like a poster. Done → a green "Done for today." with tomorrow named.

import { useEffect, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { TASK_CTA, TASK_META, TASK_TITLE, type TaskKind } from "@/lib/dailyTask";
import { KIND_ACCENT } from "@/components/WeekStrip";

const BUILD_LINES = ["Writing your questions…", "Matching your exam's style…", "Checking the marking scheme…", "Nearly there…"];
function BuildLine() {
  const [i, setI] = useState(0);
  useEffect(() => { const iv = setInterval(() => setI((x) => (x + 1) % BUILD_LINES.length), 3000); return () => clearInterval(iv); }, []);
  return <>{BUILD_LINES[i]}</>;
}

export default function TodayHero({
  subjectLabel, kind, status, line, scoreLabel, sinceLine, tomorrow, busy, onStart, celebrate, questionCount,
}: {
  subjectLabel: string;
  kind: TaskKind;
  status: "loading" | "building" | "ready" | "done" | "failed";
  /** One sentence on what today is. */
  line: string;
  scoreLabel?: string | null;
  sinceLine?: string | null;
  tomorrow?: { title: string; subject: string } | null;
  busy?: boolean;
  onStart: () => void;
  celebrate?: boolean;
  questionCount?: number | null;
}) {
  const done = status === "done", building = status === "building" || status === "loading";
  const accent = done ? "#3ee6a0" : KIND_ACCENT[kind];
  const title = done ? "Done for today." : TASK_TITLE[kind].replace("\n", " ");
  void questionCount; void TASK_META;

  return (
    <div className={`relative rounded-[28px] border overflow-hidden flex flex-col justify-end min-h-[420px] lg:min-h-0 ${done ? "bg-[#0a1712] border-emerald-400/25" : "bg-[#0e0f13] border-indigo-400/20"}`}>
      {done && <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(62,230,160,0.18) 0%, transparent 65%)" }} aria-hidden />}
      <div className="relative p-6 sm:p-9 lg:p-10">
        <p className="font-mono text-[11px] sm:text-[12px] uppercase tracking-[0.22em]" style={{ color: accent }}>{done ? "Done" : "Today"} · {subjectLabel}</p>
        <h2 className={`${display.className} text-white font-bold text-[52px] sm:text-[72px] lg:text-[88px] leading-[0.95] tracking-[-0.045em] mt-3 ${celebrate ? "home-rise" : ""}`}>
          {done ? <><span style={{ color: accent }}>Done</span> for today.</> : title}
        </h2>
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5 mt-5">
          <div className="max-w-md">
            {done ? (
              <>
                <p className="text-zinc-300 text-[17px] sm:text-[19px] leading-relaxed">
                  {TASK_TITLE[kind].replace("\n", " ")} · {subjectLabel}{scoreLabel ? <> · <span className="text-white font-semibold">{scoreLabel}</span></> : null}
                  {sinceLine ? <><br /><span style={{ color: accent }} className="font-semibold">{sinceLine}</span></> : null}
                </p>
                <p className="text-zinc-500 text-[14px] mt-3">
                  {tomorrow ? <>Tomorrow: <span className="text-zinc-300">{tomorrow.title} · {tomorrow.subject}</span>, drops at midnight your time.</> : "Tomorrow's task drops at midnight, your time."}
                  {" "}<Link href="/subjects" className="text-zinc-400 underline underline-offset-4 hover:text-white">Sit an extra paper →</Link>
                </p>
              </>
            ) : building ? (
              <>
                <p className="text-white font-semibold text-[17px] sm:text-[19px] flex items-center gap-3"><span className="w-6 h-6 rounded-full border-2 border-white/10 border-t-white/70 animate-spin" aria-hidden /><BuildLine /></p>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mt-4 max-w-sm"><div className="h-full w-2/3 rounded-full animate-pulse" style={{ background: `linear-gradient(90deg, ${accent}, #6366f1)` }} /></div>
                <p className="text-zinc-500 text-[13px] mt-2">Usually under a minute. From tomorrow it&apos;s built overnight and waiting.</p>
              </>
            ) : (
              <p className="text-zinc-300 text-[17px] sm:text-[19px] leading-relaxed">{line}</p>
            )}
          </div>
          {!done && !building && (
            <button onClick={onStart} disabled={busy}
              className="shrink-0 font-bold text-[18px] sm:text-[20px] px-9 sm:px-11 py-5 rounded-full min-h-[64px] text-[#0a0a0f] transition-transform hover:scale-[1.02] disabled:opacity-60"
              style={{ background: status === "failed" ? "#ffffff" : accent, boxShadow: status === "failed" ? undefined : `0 0 40px ${accent}40` }}>
              {busy ? "Opening…" : status === "failed" ? "Try building it again →" : TASK_CTA[kind]}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
