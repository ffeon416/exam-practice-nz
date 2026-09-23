"use client";

// The daily paper as a ticket. Left: what it is and one button. Right, past
// the perforation: the stub with the numbers (questions, minutes, days to
// exam) and a stamp for the state. Same template for every task kind; only
// the accent, the words and the numbers change. Tomorrow is never shown.

import { useEffect, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { msUntilLocalMidnight, TASK_BLURB, TASK_CTA, TASK_META, TASK_TITLE, type TaskKind } from "@/lib/dailyTask";

const ACCENT: Record<TaskKind, string> = { check: "#3ee6a0", mock: "#a78bfa", paper: "#7dd3fc", fix: "#fbbf24" };
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

function Stat({ value, label, tone }: { value: string; label: string; tone?: string }) {
  return (
    <div>
      <p className={`${display.className} font-bold text-[40px] sm:text-[44px] leading-none tracking-[-0.03em] tabular-nums`} style={{ color: tone ?? "#f4f4f5" }}>{value}</p>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500 mt-1.5">{label}</p>
    </div>
  );
}

export default function TodayCard({
  day, dateLabel, subjectLabel, kind, status, scoreLabel, busy, onStart, examInDays, sinceLine, whyLine, celebrate, questionCount, minutes,
}: {
  day: number;
  dateLabel: string;
  subjectLabel: string;
  kind: TaskKind;
  status: "loading" | "building" | "ready" | "done" | "failed";
  scoreLabel?: string | null;
  busy?: boolean;
  onStart: () => void;
  /** Days until this subject's exam, if a date is set. */
  examInDays?: number | null;
  /** "Day 1: 20% → now 34%" — the number that moves. */
  sinceLine?: string | null;
  /** Why today's task is today's task. */
  whyLine?: string | null;
  /** Just came back from marking: play the stamp. */
  celebrate?: boolean;
  /** Real counts from the built paper, when known. */
  questionCount?: number | null;
  minutes?: number | null;
}) {
  const done = status === "done", ready = status === "ready", building = status === "building" || status === "loading";
  const accent = done ? "#3ee6a0" : ACCENT[kind];
  const meta = TASK_META[kind];
  const qs = questionCount ?? meta.questions;
  const mins = minutes ?? meta.minutes;
  const examTone = examInDays == null ? undefined : examInDays <= 7 ? "#ff6b6b" : examInDays <= 21 ? "#fbbf24" : undefined;
  const stamp = done ? { text: "Done", color: "#3ee6a0" } : status === "failed" ? { text: "Failed", color: "#ff6b6b" } : building ? { text: "Building", color: "#fbbf24" } : { text: "Ready", color: accent };
  const title = TASK_TITLE[kind].split("\n");

  return (
    <div className={`sa-gold home-rise ${celebrate ? "sa-stamp" : ""}`}>
    <div className="relative bg-[#0e0f13] overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_190px] md:grid-cols-[1fr_220px]">
        {/* Main */}
        <div className="p-6 sm:p-9 lg:p-11 flex flex-col min-h-[440px] sm:min-h-[520px]">
          <p className="font-mono text-[12px] uppercase tracking-[0.22em]" style={{ color: accent }}>{subjectLabel} · Day {String(day).padStart(2, "0")}</p>
          <p className="text-zinc-400 text-[14px] mt-1.5">{dateLabel}</p>

          <div className="flex-1 flex flex-col justify-center py-10">
            <h2 className={`${display.className} text-white font-bold text-[64px] sm:text-[84px] lg:text-[96px] leading-[0.88] tracking-[-0.05em]`}>
              {title.map((line, i) => <span key={i} className="block">{line}</span>)}
            </h2>
            {!done ? (
              <p className="text-zinc-300 text-[16px] sm:text-[17px] leading-relaxed max-w-md mt-6">{whyLine ?? TASK_BLURB[kind]}</p>
            ) : (
              <>
                <p className="text-zinc-300 text-[16px] leading-relaxed max-w-md mt-6">
                  That&apos;s today done{scoreLabel ? <>: <span className="text-white font-semibold">{scoreLabel}</span></> : "."}
                </p>
                {sinceLine && <p className={`${display.className} font-bold text-[22px] sm:text-[26px] tracking-[-0.01em] mt-2 ${celebrate ? "home-rise" : ""}`} style={{ color: accent, animationDelay: "250ms" }}>{sinceLine}</p>}
              </>
            )}
            {!done && sinceLine && <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-zinc-500 mt-3">{sinceLine}</p>}
          </div>

          {done ? (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-500">Next drop in</p>
                <p className={`${display.className} text-white font-bold text-[30px] leading-none mt-1`}><Countdown /></p>
              </div>
              <Link href="/subjects" className="text-[14px] text-zinc-400 hover:text-white underline-offset-4 hover:underline">Sit an extra paper →</Link>
            </div>
          ) : status === "failed" ? (
            <button onClick={onStart} className="self-start bg-white text-[#0a0a0f] font-bold text-[16px] px-9 py-4 rounded-full min-h-[58px]">Try building it again →</button>
          ) : ready ? (
            <button onClick={onStart} disabled={busy}
              className="self-start font-bold text-[17px] px-9 py-4 rounded-full min-h-[60px] text-[#07120d] transition-transform hover:scale-[1.02] disabled:opacity-60"
              style={{ background: accent, boxShadow: `0 0 36px ${accent}45` }}>
              {busy ? "Opening…" : TASK_CTA[kind]}
            </button>
          ) : (
            <div className="max-w-md">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/70 animate-spin" aria-hidden />
                <p className="text-white font-semibold text-[15px]"><BuildLine /></p>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full w-2/3 rounded-full animate-pulse" style={{ background: `linear-gradient(90deg, ${accent}, #6366f1)` }} /></div>
              <p className="text-zinc-500 text-[12px] mt-2">Usually under a minute. From tomorrow it&apos;s built overnight and waiting.</p>
            </div>
          )}
        </div>

        {/* Stub, past the perforation */}
        <div className="relative border-t sm:border-t-0 sm:border-l border-dashed border-white/[0.16] p-6 sm:p-7 sm:pt-9 sm:pb-8 flex sm:flex-col items-center sm:items-start justify-between gap-6">
          {/* Notches: the ticket's punched edges. */}
          <span className="absolute w-6 h-6 rounded-full bg-[#0a0a0f] border border-[#e8c46a]/40 -top-3 -left-3 sm:top-auto sm:-bottom-3 sm:-left-3 sm:-translate-x-1/2" aria-hidden />
          <span className="absolute w-6 h-6 rounded-full bg-[#0a0a0f] border border-[#e8c46a]/40 -top-3 -right-3 sm:right-auto sm:-top-3 sm:-left-3 sm:-translate-x-1/2" aria-hidden />

          <div className="flex sm:flex-col gap-6 sm:gap-10 lg:gap-14">
            <Stat value={String(qs).padStart(2, "0")} label="Questions" />
            <Stat value={String(mins)} label={kind === "mock" ? "Min · timed" : "Minutes"} />
            {examInDays != null && examInDays >= 0
              ? <Stat value={String(examInDays)} label={examInDays === 1 ? "Day to exam" : "Days to exam"} tone={examTone} />
              : <Stat value="—" label="Exam date" />}
          </div>

          <span className={`shrink-0 self-center sm:self-start rotate-[-6deg] font-mono text-[12px] font-bold uppercase tracking-[0.26em] px-4 py-2.5 rounded-lg border-2 ${done && celebrate ? "sa-stamp-in" : ""} ${building ? "animate-pulse" : ""}`}
            style={{ color: stamp.color, borderColor: stamp.color }}>
            {stamp.text}
          </span>
        </div>
      </div>
    </div>
    </div>
  );
}
