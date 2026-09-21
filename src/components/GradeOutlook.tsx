"use client";

// The dashboard's headline: predicted grade, the graph of every marked paper
// against the grade bands, a dotted projection to exam day, and the three
// things that close the gap to the top band. Inline SVG, no library.

import { useMemo, useState } from "react";

import Link from "next/link";
import { display } from "@/lib/displayFont";
import { resolveCurriculum } from "@/data/curricula";
import { getCustomExam } from "@/lib/customExams";
import {
  bandAt, bandsFor, marksToTop, papersPerWeek, predictedPct, projectedPct, subjectSeries, tierBreakdown, trendPerWeek,
} from "@/lib/gradeOutlook";
import type { ExamAttempt } from "@/lib/types";

const TONE: Record<string, string> = { top: "text-emerald-400", high: "text-amber-400", pass: "text-sky-400", fail: "text-rose-400" };
const TONE_STROKE: Record<string, string> = { top: "#34d399", high: "#fbbf24", pass: "#38bdf8", fail: "#fb7185" };
const TIER_LABEL = { achieved: "Achieved-level", merit: "Merit-level", excellence: "Excellence-level" };

export default function GradeOutlook({
  attempts, curriculumId, examDate, subjects,
}: {
  attempts: ExamAttempt[];
  curriculumId: string;
  /** ISO date of the real exam, if the student has set one. */
  examDate?: string | null;
  /** Subjects they chose at onboarding (for the switcher order). */
  subjects: string[];
}) {
  const curriculum = resolveCurriculum(curriculumId);
  const bands = bandsFor(curriculumId);
  const top = bands[0];

  // Subjects with at least one paper, most recent first, onboarding order as tiebreak.
  const seen = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of attempts) if (a.subject) m.set(a.subject, Math.max(m.get(a.subject) ?? 0, new Date(a.date).getTime()));
    return [...m.entries()].sort((x, y) => y[1] - x[1]).map(([s]) => s);
  }, [attempts]);
  const order = [...seen, ...subjects.filter((s) => !seen.includes(s))];
  const [subject, setSubject] = useState<string | null>(seen[0] ?? null);
  const [nowTs] = useState(() => Date.now()); // fixed at mount: render stays pure
  const active = subject && seen.includes(subject) ? subject : seen[0] ?? null;

  const points = useMemo(() => subjectSeries(attempts, active), [attempts, active]);
  const now = predictedPct(points);
  const slope = trendPerWeek(points);
  const weeks = examDate ? Math.max(1, Math.round((new Date(examDate).getTime() - nowTs) / (7 * 864e5))) : 6;
  const projected = now == null ? null : projectedPct(now, slope, weeks);
  const nowBand = now == null ? null : bandAt(bands, now);
  const projBand = projected == null ? null : bandAt(bands, projected);
  const gap = now == null ? 0 : marksToTop(now, bands);
  const pace = papersPerWeek(points);
  const tiers = useMemo(() => tierBreakdown(points, getCustomExam), [points]);
  const focusTier = tiers?.filter((t) => t.questions >= 3).sort((a, b) => a.pct - b.pct)[0] ?? null;

  const subjectLabel = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;
  const endLabel = examDate
    ? new Date(examDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })
    : `${weeks} weeks`;

  if (now == null || nowBand == null || projected == null || projBand == null) return null;

  // ── Chart geometry ──
  const W = 320, H = 150, L = 6, R = 58, T = 10, B = 22;
  const t0 = points[0].t;
  const tEnd = examDate ? Math.max(new Date(examDate).getTime(), points[points.length - 1].t + 864e5) : points[points.length - 1].t + weeks * 7 * 864e5;
  const x = (t: number) => L + ((t - t0) / Math.max(1, tEnd - t0)) * (W - L - R);
  const y = (pct: number) => T + (1 - pct / 100) * (H - T - B);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.pct).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.015] p-5 sm:p-6 mb-4">
      {/* Subject switcher */}
      {order.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-3 mb-1 [scrollbar-width:none]">
          {order.map((s) => {
            const has = seen.includes(s);
            return (
              <button key={s} onClick={() => has && setSubject(s)} disabled={!has}
                className={`shrink-0 px-3.5 py-2 rounded-full text-[12.5px] font-semibold min-h-[36px] border ${s === active ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : has ? "border-white/[0.1] text-zinc-300" : "border-white/[0.06] text-zinc-600"}`}>
                {subjectLabel(s)}
              </button>
            );
          })}
        </div>
      )}

      {/* Headline */}
      <div className="flex items-end justify-between gap-4 mb-3">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-1">Predicted grade · {subjectLabel(active!)}</p>
          <p className={`${display.className} font-bold text-[34px] leading-none tracking-[-0.02em] ${TONE[nowBand.tone]}`}>{nowBand.label}</p>
          <p className="text-zinc-400 text-[12.5px] mt-1">{now}% across your last {Math.min(6, points.length)} paper{Math.min(6, points.length) === 1 ? "" : "s"}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-1">Target</p>
          <p className={`${display.className} font-bold text-[22px] leading-none ${TONE[top.tone]}`}>{top.label}</p>
          <p className="text-zinc-400 text-[12.5px] mt-1">{gap === 0 ? "you're there — hold it" : `${gap} more mark${gap === 1 ? "" : "s"} a paper`}</p>
        </div>
      </div>

      {/* Chart */}
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Scores over time for ${subjectLabel(active!)}`}>
        {bands.filter((b) => b.minPct > 0).map((b) => (
          <g key={b.id}>
            <line x1={L} x2={W - R + 4} y1={y(b.minPct * 100)} y2={y(b.minPct * 100)} stroke={TONE_STROKE[b.tone]} strokeOpacity="0.35" strokeDasharray="3 4" strokeWidth="1" />
            <text x={W - R + 8} y={y(b.minPct * 100) + 3.5} fontSize="9" fill={TONE_STROKE[b.tone]} fillOpacity="0.9">{b.label}</text>
          </g>
        ))}
        {/* projection */}
        <line x1={x(last.t)} y1={y(last.pct)} x2={x(tEnd)} y2={y(projected)} stroke="#a5b4fc" strokeOpacity="0.55" strokeDasharray="2 4" strokeWidth="2" strokeLinecap="round" />
        <circle cx={x(tEnd)} cy={y(projected)} r="4" fill="#0b0b12" stroke="#a5b4fc" strokeWidth="2" strokeOpacity="0.8" />
        <text x={x(tEnd)} y={H - 6} fontSize="9" fill="#71717a" textAnchor="end">{endLabel}</text>
        {/* target marker */}
        <circle cx={x(tEnd)} cy={y(top.minPct * 100)} r="3" fill={TONE_STROKE[top.tone]} />
        {/* actual */}
        <path d={path} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(p.t)} cy={y(p.pct)} r={i === points.length - 1 ? 4.5 : 3} fill="#0b0b12" stroke="#a5b4fc" strokeWidth="2" />
        ))}
        <text x={L} y={H - 6} fontSize="9" fill="#71717a">{new Date(t0).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}</text>
      </svg>

      <p className="text-[11px] text-zinc-500 mt-1 mb-4">
        Dotted line: where this pace lands by {endLabel} ({projBand.label}, {projected}%). An estimate from your practice papers, not a promise.
      </p>

      {/* The path */}
      <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-2">How you get to {top.label}</p>
      <ol className="space-y-2">
        <li className="flex gap-3 text-[13.5px] text-zinc-300">
          <span className="font-mono text-indigo-300 w-4 shrink-0">1</span>
          <span>
            {gap === 0
              ? <>You&apos;re scoring at {top.label} level. The job now is to keep sitting papers so it holds on the day.</>
              : <><span className="text-white font-semibold">Close {gap} mark{gap === 1 ? "" : "s"} on every paper.</span> That&apos;s the whole distance between {nowBand.label} and {top.label} on a 16-mark paper.</>}
          </span>
        </li>
        <li className="flex gap-3 text-[13.5px] text-zinc-300">
          <span className="font-mono text-indigo-300 w-4 shrink-0">2</span>
          <span>
            {focusTier
              ? <><span className="text-white font-semibold">Fix the {TIER_LABEL[focusTier.tier]} questions.</span> You&apos;re getting {focusTier.pct}% of them ({focusTier.awarded}/{focusTier.max} marks). That&apos;s where the marks are.</>
              : <><span className="text-white font-semibold">Review every question you dropped marks on.</span> The Review tab brings them back until they stick.</>}
          </span>
        </li>
        <li className="flex gap-3 text-[13.5px] text-zinc-300">
          <span className="font-mono text-indigo-300 w-4 shrink-0">3</span>
          <span>
            <span className="text-white font-semibold">Three papers a week.</span>{" "}
            {pace >= 3 ? <>You&apos;re on {pace} a week. Keep that.</> : pace > 0 ? <>You&apos;re on {pace} a week right now. Tonight&apos;s paper is one of them.</> : <>Tonight&apos;s paper is the first.</>}
            {slope > 0.5 && <> Your scores are climbing about {Math.round(slope)} points a week.</>}
          </span>
        </li>
      </ol>
      {!examDate && (
        <p className="text-[11.5px] text-zinc-500 mt-3">
          <Link href="/plan" className="text-indigo-400 hover:underline">Add your exam date</Link> and the projection runs to the real day.
        </p>
      )}
    </section>
  );
}
