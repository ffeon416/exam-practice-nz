"use client";

// The dashboard's headline. Per subject: the grade check sets the baseline,
// the graph shows every marked paper against the grade bands, weekly
// milestones step from the baseline to the target band by exam day, and a
// dotted line shows where the current pace actually lands. Subjects without
// a grade check yet get a button to sit one. Inline SVG, no library.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { resolveCurriculum } from "@/data/curricula";
import { getCustomExam } from "@/lib/customExams";
import {
  bandAt, bandsFor, marksToTop, milestones, papersPerWeek, predictedPct, projectedPct, subjectSeries, tierBreakdown, trendPerWeek, weakSpot,
  type WeakSpot,
} from "@/lib/gradeOutlook";
import type { ExamAttempt, TopicScore } from "@/lib/types";

const TONE: Record<string, string> = { top: "text-emerald-400", high: "text-amber-400", pass: "text-sky-400", fail: "text-rose-400" };
const TONE_STROKE: Record<string, string> = { top: "#34d399", high: "#fbbf24", pass: "#38bdf8", fail: "#fb7185" };
const MS_FILL = { hit: "#34d399", missed: "#fb7185", next: "#a5b4fc", upcoming: "#3f3f46" };

export default function GradeOutlook({
  attempts, topicScores, curriculumId, examDate, subjects, busySubject, onStartCheck, onFixWeakSpot, onWeakSpotFound,
}: {
  attempts: ExamAttempt[];
  topicScores: Record<string, TopicScore>;
  curriculumId: string;
  examDate?: string | null;
  subjects: string[];
  /** Subject whose grade check is being built right now (shows a spinner). */
  busySubject?: string | null;
  onStartCheck: (subject: string) => void;
  onFixWeakSpot: (spot: WeakSpot) => void;
  onWeakSpotFound?: (spot: WeakSpot | null) => void;
}) {
  const curriculum = resolveCurriculum(curriculumId);
  const bands = bandsFor(curriculumId);
  const top = bands[0];
  const subjectLabel = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;

  // Subjects: the ones chosen at sign-up, plus any they've sat papers in.
  const seen = useMemo(() => new Set(attempts.filter((a) => a.subject).map((a) => a.subject!)), [attempts]);
  const order = useMemo(() => [...subjects, ...[...seen].filter((s) => !subjects.includes(s))], [subjects, seen]);
  const [subject, setSubject] = useState<string | null>(null);
  const active = subject && order.includes(subject) ? subject : order.find((s) => seen.has(s)) ?? order[0] ?? null;
  const [nowTs] = useState(() => Date.now());

  const points = useMemo(() => subjectSeries(attempts, active), [attempts, active]);
  const checked = points.length > 0;
  const now = predictedPct(points);
  const slope = trendPerWeek(points);
  const endT = examDate ? Math.max(new Date(examDate).getTime(), nowTs + 7 * 864e5) : (points[0]?.t ?? nowTs) + 8 * 7 * 864e5;
  const weeks = Math.max(1, Math.round((endT - nowTs) / (7 * 864e5)));
  const projected = now == null ? null : projectedPct(now, slope, weeks);
  const nowBand = now == null ? null : bandAt(bands, now);
  const projBand = projected == null ? null : bandAt(bands, projected);
  const gap = now == null ? 0 : marksToTop(now, bands);
  const pace = papersPerWeek(points);
  const tiers = useMemo(() => tierBreakdown(points, getCustomExam), [points]);
  const ms = useMemo(() => milestones(points, Math.round(top.minPct * 100), endT, nowTs), [points, top.minPct, endT, nowTs]);
  const nextMs = ms.find((m) => m.status === "next") ?? null;
  const spot = useMemo(() => (active ? weakSpot(active, tiers, Object.values(topicScores)) : null), [active, tiers, topicScores]);
  useEffect(() => { onWeakSpotFound?.(spot); }, [spot, onWeakSpotFound]);

  const endLabel = new Date(endT).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });

  if (!active) return null;

  // ── Chart geometry ──
  const W = 320, H = 156, L = 6, R = 58, T = 12, B = 22;
  const t0 = points[0]?.t ?? nowTs;
  const x = (t: number) => L + ((t - t0) / Math.max(1, endT - t0)) * (W - L - R);
  const y = (pct: number) => T + (1 - pct / 100) * (H - T - B);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.pct).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.015] p-5 sm:p-6 mb-4">
      {/* Subject switcher — every subject they chose; unchecked ones are dimmed */}
      {order.length > 1 && (
        <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-3 mb-1 [scrollbar-width:none]">
          {order.map((s) => (
            <button key={s} onClick={() => setSubject(s)}
              className={`shrink-0 px-3.5 py-2 rounded-full text-[12.5px] font-semibold min-h-[36px] border ${s === active ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : seen.has(s) ? "border-white/[0.1] text-zinc-300" : "border-dashed border-white/[0.12] text-zinc-500"}`}>
              {subjectLabel(s)}{!seen.has(s) && <span className="ml-1.5 text-[10px] text-zinc-600">check</span>}
            </button>
          ))}
        </div>
      )}

      {!checked ? (
        /* ── No baseline yet: the grade check is the first step ── */
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-1">{subjectLabel(active)}</p>
          <p className={`${display.className} text-white font-bold text-[24px] leading-tight tracking-[-0.01em] mb-2`}>Start with a grade check</p>
          <p className="text-zinc-400 text-[13.5px] mb-5">
            Eight questions, marked properly. It sets your starting point, and from there the graph shows the milestones to {top.label} by {examDate ? endLabel : "exam day"}.
          </p>
          <button
            onClick={() => onStartCheck(active)}
            disabled={busySubject === active}
            className="w-full bg-white text-[#0a0a0f] font-bold text-[15px] py-3.5 rounded-full min-h-[50px] disabled:opacity-60"
          >
            {busySubject === active ? "Building your grade check…" : `Check my grade in ${subjectLabel(active)} →`}
          </button>
        </div>
      ) : (
        <>
          {/* Headline */}
          <div className="flex items-end justify-between gap-4 mb-3">
            <div>
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-1">Predicted · {subjectLabel(active)}</p>
              <p className={`${display.className} font-bold text-[34px] leading-none tracking-[-0.02em] ${TONE[nowBand!.tone]}`}>{nowBand!.label}</p>
              <p className="text-zinc-400 text-[12.5px] mt-1">{now}% across your last {Math.min(6, points.length)} paper{Math.min(6, points.length) === 1 ? "" : "s"}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-1">Target</p>
              <p className={`${display.className} font-bold text-[22px] leading-none ${TONE[top.tone]}`}>{top.label}</p>
              <p className="text-zinc-400 text-[12.5px] mt-1">{gap === 0 ? "you're there — hold it" : `${gap} more mark${gap === 1 ? "" : "s"} a paper`}</p>
            </div>
          </div>

          {/* Chart */}
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label={`Scores and milestones for ${subjectLabel(active)}`}>
            {bands.filter((b) => b.minPct > 0).map((b) => (
              <g key={b.id}>
                <line x1={L} x2={W - R + 4} y1={y(b.minPct * 100)} y2={y(b.minPct * 100)} stroke={TONE_STROKE[b.tone]} strokeOpacity="0.3" strokeDasharray="3 4" strokeWidth="1" />
                <text x={W - R + 8} y={y(b.minPct * 100) + 3.5} fontSize="9" fill={TONE_STROKE[b.tone]} fillOpacity="0.9">{b.label}</text>
              </g>
            ))}
            {/* milestone path: baseline → target */}
            <line x1={x(points[0].t)} y1={y(points[0].pct)} x2={x(endT)} y2={y(top.minPct * 100)} stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1.5" />
            {/* current-pace projection */}
            {projected != null && (
              <line x1={x(last.t)} y1={y(last.pct)} x2={x(endT)} y2={y(projected)} stroke="#a5b4fc" strokeOpacity="0.5" strokeDasharray="2 4" strokeWidth="2" strokeLinecap="round" />
            )}
            {/* actual */}
            <path d={path} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            {points.map((p, i) => (
              <circle key={i} cx={x(p.t)} cy={y(p.pct)} r={i === points.length - 1 ? 4.5 : 3} fill="#0b0b12" stroke="#a5b4fc" strokeWidth="2" />
            ))}
            {/* milestones */}
            {ms.map((m, i) => (
              <g key={i} transform={`translate(${x(m.t).toFixed(1)} ${y(m.pct).toFixed(1)})`}>
                <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" fill={MS_FILL[m.status]} stroke="#0b0b12" strokeWidth="1.5" />
                {m.status === "next" && <text x="0" y="-9" fontSize="8.5" fill="#c7d2fe" textAnchor="middle">{m.pct}%</text>}
              </g>
            ))}
            {/* target */}
            <circle cx={x(endT)} cy={y(top.minPct * 100)} r="4" fill={TONE_STROKE[top.tone]} />
            <text x={L} y={H - 6} fontSize="9" fill="#71717a">grade check · {new Date(t0).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}</text>
            <text x={x(endT)} y={H - 6} fontSize="9" fill="#71717a" textAnchor="end">{examDate ? `exam · ${endLabel}` : endLabel}</text>
          </svg>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500 mt-1 mb-4">
            <span><span className="inline-block w-2 h-2 rotate-45 bg-emerald-400 mr-1.5 align-middle" />milestone hit</span>
            <span><span className="inline-block w-2 h-2 rotate-45 bg-indigo-300 mr-1.5 align-middle" />next</span>
            <span><span className="inline-block w-2 h-2 rotate-45 bg-rose-400 mr-1.5 align-middle" />missed</span>
            <span className="text-zinc-600">dotted: where this pace lands ({projBand?.label}, {projected}%). An estimate, not a promise.</span>
          </div>

          {/* Next milestone + the path */}
          {nextMs && (
            <div className="rounded-2xl border border-indigo-400/25 bg-indigo-500/[0.07] px-4 py-3 mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-wider text-indigo-300">Next milestone</p>
                <p className="text-white font-bold text-[15px]">{nextMs.pct}% by {nextMs.label}</p>
              </div>
              <p className="text-zinc-400 text-[12px] text-right">{Math.max(0, nextMs.pct - (now ?? 0))} point{Math.max(0, nextMs.pct - (now ?? 0)) === 1 ? "" : "s"} above where you are now</p>
            </div>
          )}

          <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-2">How you get to {top.label}</p>
          <ol className="space-y-2 mb-4">
            <li className="flex gap-3 text-[13.5px] text-zinc-300">
              <span className="font-mono text-indigo-300 w-4 shrink-0">1</span>
              <span><span className="text-white font-semibold">Three papers a week.</span> {pace >= 3 ? <>You&apos;re on {pace}. Keep it.</> : pace > 0 ? <>You&apos;re on {pace} right now; tonight&apos;s is one of them.</> : <>Tonight&apos;s paper is the first.</>}{slope > 0.5 && <> Scores are climbing about {Math.round(slope)} points a week.</>}</span>
            </li>
            <li className="flex gap-3 text-[13.5px] text-zinc-300">
              <span className="font-mono text-indigo-300 w-4 shrink-0">2</span>
              <span>
                {spot
                  ? <><span className="text-white font-semibold">Fix your weak spot: {spot.label}</span> ({spot.pct}%). That&apos;s where the marks are going.</>
                  : <><span className="text-white font-semibold">Review what you dropped marks on.</span> The Review tab brings it back until it sticks.</>}
              </span>
            </li>
            <li className="flex gap-3 text-[13.5px] text-zinc-300">
              <span className="font-mono text-indigo-300 w-4 shrink-0">3</span>
              <span><span className="text-white font-semibold">A full timed mock each fortnight</span> from your plan, so exam day feels like a Tuesday.</span>
            </li>
          </ol>

          {/* Tools */}
          <div className="grid grid-cols-3 gap-2">
            {spot ? (
              <button onClick={() => onFixWeakSpot(spot)} disabled={busySubject === active}
                className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] px-3 py-3 text-left min-h-[64px] disabled:opacity-60">
                <p className="text-amber-300 text-[12.5px] font-bold leading-tight">Fix my weak spot</p>
                <p className="text-zinc-500 text-[10.5px] mt-0.5 truncate">{busySubject === active ? "Building…" : spot.label}</p>
              </button>
            ) : (
              <Link href="/review" className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3 py-3 min-h-[64px]">
                <p className="text-white text-[12.5px] font-bold leading-tight">Review</p>
                <p className="text-zinc-500 text-[10.5px] mt-0.5">what you got wrong</p>
              </Link>
            )}
            <Link href="/plan" className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3 py-3 min-h-[64px]">
              <p className="text-white text-[12.5px] font-bold leading-tight">Mock schedule</p>
              <p className="text-zinc-500 text-[10.5px] mt-0.5">{examDate ? "week by week" : "add your exam date"}</p>
            </Link>
            <Link href="/subjects" className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3 py-3 min-h-[64px]">
              <p className="text-white text-[12.5px] font-bold leading-tight">Tutor</p>
              <p className="text-zinc-500 text-[10.5px] mt-0.5">inside every paper</p>
            </Link>
          </div>
        </>
      )}
    </section>
  );
}
