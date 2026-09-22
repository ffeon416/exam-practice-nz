"use client";

// One big chart that explains itself: the grade bands are shaded zones, your
// papers are the line, the target sits at the right, one dashed path joins
// you to it with the next milestone marked. Nothing else on the chart.

import { useMemo, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { resolveCurriculum } from "@/data/curricula";
import { getCustomExam } from "@/lib/customExams";
import {
  bandAt, bandsFor, marksToTop, predictedPct, subjectSeries, tierBreakdown, weakSpot, type WeakSpot,
} from "@/lib/gradeOutlook";
import type { ExamAttempt, TopicScore } from "@/lib/types";
import JourneyPath from "@/components/JourneyPath";
import type { Step } from "@/lib/journey";

const TONE_TEXT: Record<string, string> = { top: "text-emerald-400", high: "text-amber-400", pass: "text-sky-400", fail: "text-rose-400" };
const TONE_HEX: Record<string, string> = { top: "#34d399", high: "#fbbf24", pass: "#38bdf8", fail: "#fb7185" };

export default function GradeOutlook({
  attempts, topicScores, curriculumId, examDate, subjects, busySubject, onStartCheck, onFixWeakSpot, onStartPaper, onStartMock,
}: {
  attempts: ExamAttempt[];
  topicScores: Record<string, TopicScore>;
  curriculumId: string;
  examDate?: string | null;
  subjects: string[];
  busySubject?: string | null;
  onStartCheck: (subject: string) => void;
  onFixWeakSpot: (spot: WeakSpot) => void;
  onStartPaper: (subject: string) => void;
  onStartMock: (subject: string) => void;
}) {
  const curriculum = resolveCurriculum(curriculumId);
  const bands = bandsFor(curriculumId); // highest first
  const top = bands[0];
  const label = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;

  const seen = useMemo(() => new Set(attempts.filter((a) => a.subject).map((a) => a.subject!)), [attempts]);
  const order = useMemo(() => [...subjects, ...[...seen].filter((s) => !subjects.includes(s))], [subjects, seen]);
  const [subject, setSubject] = useState<string | null>(null);
  const active = subject && order.includes(subject) ? subject : order.find((s) => seen.has(s)) ?? order[0] ?? null;
  const [nowTs] = useState(() => Date.now());

  const points = useMemo(() => subjectSeries(attempts, active), [attempts, active]);
  const checked = points.length > 0;
  const now = predictedPct(points);
  const targetPct = Math.round(top.minPct * 100);
  const endT = examDate ? Math.max(new Date(examDate).getTime(), nowTs + 7 * 864e5) : nowTs + 8 * 7 * 864e5;
  // Show the last six weeks of papers (older ones would squash the future).
  const visible = useMemo(() => {
    const recent = points.filter((p) => p.t >= nowTs - 42 * 864e5);
    return recent.length ? recent : points.slice(-1);
  }, [points, nowTs]);
  const nowBand = now == null ? null : bandAt(bands, now);
  const gap = now == null ? 0 : marksToTop(now, bands);
  const tiers = useMemo(() => tierBreakdown(points, getCustomExam), [points]);
  const spot = useMemo(() => (active ? weakSpot(active, tiers, Object.values(topicScores)) : null), [active, tiers, topicScores]);

  if (!active) return null;

  // ── Chart: y runs 30–100 (nothing useful lives below), zones are the bands ──

  return (
    <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.015] p-4 sm:p-6 lg:p-8 mb-4 lg:mb-0">
      {order.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-3 [scrollbar-width:none]">
          {order.map((s) => (
            <button key={s} onClick={() => setSubject(s)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-[12.5px] font-semibold min-h-[36px] border ${s === active ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : seen.has(s) ? "border-white/[0.1] text-zinc-300" : "border-dashed border-white/[0.12] text-zinc-500"}`}>
              {label(s)}
            </button>
          ))}
        </div>
      )}

      {!checked ? (
        <div className="py-2">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-1">{label(active)}</p>
          <p className={`${display.className} text-white font-bold text-[24px] leading-tight tracking-[-0.01em] mb-2`}>Start with a grade check</p>
          <p className="text-zinc-400 text-[13.5px] mb-5">Eight questions, marked properly. It sets your starting point on the graph.</p>
          <button onClick={() => onStartCheck(active)} disabled={busySubject === active}
            className="w-full bg-white text-[#0a0a0f] font-bold text-[15px] py-3.5 rounded-full min-h-[50px] disabled:opacity-60">
            {busySubject === active ? "Building your grade check…" : `Check my grade in ${label(active)} →`}
          </button>
        </div>
      ) : (
        <>
          {/* One line of numbers above the chart */}
          <div className="flex items-baseline justify-between gap-3 mb-2">
            <p className={`${display.className} font-bold text-[26px] sm:text-[30px] lg:text-[36px] leading-none tracking-[-0.02em] ${TONE_TEXT[nowBand!.tone]}`}>
              {nowBand!.label} <span className="text-zinc-500 text-[15px] font-semibold">{now}%</span>
            </p>
            <p className="text-zinc-400 text-[13px] text-right">
              {gap === 0 ? <>at <span className={`font-bold ${TONE_TEXT[top.tone]}`}>{top.label}</span>, hold it</> : <><span className="text-white font-bold">{gap} mark{gap === 1 ? "" : "s"}</span> a paper from <span className={`font-bold ${TONE_TEXT[top.tone]}`}>{top.label}</span></>}
            </p>
          </div>

          <JourneyPath
            completed={Math.max(0, points.length - 1)}
            now={nowTs}
            exam={endT}
            hasWeakSpot={!!spot}
            destinationLabel={top.label}
            busy={busySubject === active}
            onStep={(step: Step) => {
              if (step.kind === "fix" && spot) onFixWeakSpot(spot);
              else if (step.kind === "mock") onStartMock(active);
              else onStartPaper(active);
            }}
          />
          <p className="text-zinc-500 text-[12.5px] mt-2">
            {spot ? <>Weak spot right now: <span className="text-zinc-300">{spot.label}</span> ({spot.pct}%). It&apos;s on the line.</> : <>Every finished task moves you along the line.</>}
            {!examDate && <> <Link href="/plan" className="text-indigo-400 hover:underline">Add your exam date</Link> so the line ends on the real day.</>}
          </p>
        </>
      )}
    </section>
  );
}
