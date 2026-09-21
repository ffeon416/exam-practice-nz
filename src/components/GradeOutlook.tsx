"use client";

// One big chart that explains itself: the grade bands are shaded zones, your
// papers are the line, the target sits at the right, one dashed path joins
// you to it with the next milestone marked. Nothing else on the chart.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { resolveCurriculum } from "@/data/curricula";
import { getCustomExam } from "@/lib/customExams";
import {
  bandAt, bandsFor, marksToTop, milestones, predictedPct, smoothPath, subjectSeries, tierBreakdown, weakSpot, type WeakSpot,
} from "@/lib/gradeOutlook";
import type { ExamAttempt, TopicScore } from "@/lib/types";

const TONE_TEXT: Record<string, string> = { top: "text-emerald-400", high: "text-amber-400", pass: "text-sky-400", fail: "text-rose-400" };
const TONE_HEX: Record<string, string> = { top: "#34d399", high: "#fbbf24", pass: "#38bdf8", fail: "#fb7185" };

export default function GradeOutlook({
  attempts, topicScores, curriculumId, examDate, subjects, busySubject, onStartCheck, onFixWeakSpot, onWeakSpotFound,
}: {
  attempts: ExamAttempt[];
  topicScores: Record<string, TopicScore>;
  curriculumId: string;
  examDate?: string | null;
  subjects: string[];
  busySubject?: string | null;
  onStartCheck: (subject: string) => void;
  onFixWeakSpot: (spot: WeakSpot) => void;
  onWeakSpotFound?: (spot: WeakSpot | null) => void;
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
  const endT = examDate ? Math.max(new Date(examDate).getTime(), nowTs + 7 * 864e5) : (points[0]?.t ?? nowTs) + 8 * 7 * 864e5;
  const nowBand = now == null ? null : bandAt(bands, now);
  const gap = now == null ? 0 : marksToTop(now, bands);
  const tiers = useMemo(() => tierBreakdown(points, getCustomExam), [points]);
  const ms = useMemo(() => milestones(points, targetPct, endT, nowTs), [points, targetPct, endT, nowTs]);
  const next = ms.find((m) => m.status === "next") ?? null;
  const spot = useMemo(() => (active ? weakSpot(active, tiers, Object.values(topicScores)) : null), [active, tiers, topicScores]);
  useEffect(() => { onWeakSpotFound?.(spot); }, [spot, onWeakSpotFound]);

  const fmt = (t: number) => new Date(t).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  if (!active) return null;

  // ── Chart: y runs 30–100 (nothing useful lives below), zones are the bands ──
  const W = 640, H = 300, L = 14, R = 14, T = 30, B = 30, YMIN = 30;
  const t0 = points[0]?.t ?? nowTs;
  const x = (t: number) => L + ((t - t0) / Math.max(1, endT - t0)) * (W - L - R);
  const y = (pct: number) => T + (1 - (Math.max(YMIN, pct) - YMIN) / (100 - YMIN)) * (H - T - B);
  const last = points[points.length - 1];
  const P = points.map((p) => ({ x: x(p.t), y: y(p.pct) }));
  const linePath = smoothPath(P);
  const areaPath = P.length ? `${linePath} L${P[P.length - 1].x.toFixed(1)} ${y(YMIN)} L${P[0].x.toFixed(1)} ${y(YMIN)} Z` : "";
  const tx = x(endT), ty = y(targetPct);
  const toTarget = last ? `M${x(last.t).toFixed(1)} ${y(last.pct).toFixed(1)} C${(x(last.t) + (tx - x(last.t)) * 0.5).toFixed(1)} ${y(last.pct).toFixed(1)} ${(x(last.t) + (tx - x(last.t)) * 0.5).toFixed(1)} ${ty.toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)}` : "";
  const zones = bands
    .map((b, i) => ({ b, lo: Math.max(YMIN, b.minPct * 100), hi: i === 0 ? 100 : bands[i - 1].minPct * 100 }))
    .filter((z) => z.hi > YMIN);
  const youX = last ? x(last.t) : 0;

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

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={`Your ${label(active)} scores against the grade bands`}>
            <defs>
              <linearGradient id="go-stroke" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#c4b5fd" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <linearGradient id="go-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
              </linearGradient>
              <filter id="go-glow" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation="4" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Grade bands: quiet guide lines, named on the right; the top band tinted */}
            <rect x={L} y={y(100)} width={W - L - R} height={Math.max(0, y(targetPct) - y(100))} fill={TONE_HEX[top.tone]} fillOpacity="0.06" />
            {zones.map(({ b, lo, hi }) => (
              <g key={b.id}>
                <line x1={L} x2={W - R} y1={y(lo)} y2={y(lo)} stroke="#ffffff" strokeOpacity="0.10" strokeWidth="1" />
                <text x={W - R - 8} y={(y(lo) + y(hi)) / 2 + 4} fontSize="11" fontWeight="600" fill="#a1a1aa" fillOpacity="0.9" textAnchor="end" style={{ letterSpacing: "0.06em" }}>{b.label.toUpperCase()}</text>
              </g>
            ))}

            {/* The way to the target, and the next milestone on it */}
            <path d={toTarget} fill="none" stroke="#a78bfa" strokeOpacity="0.45" strokeWidth="2.5" strokeDasharray="1 8" strokeLinecap="round" />

            {/* Your papers: smooth purple wave */}
            <path d={areaPath} fill="url(#go-fill)" />
            <path d={linePath} fill="none" stroke="url(#go-stroke)" strokeWidth="4" strokeLinecap="round" filter="url(#go-glow)" />

            {next && (
              <g>
                <circle cx={x(next.t)} cy={y(next.pct)} r="5" fill="#0f0f17" stroke="#c4b5fd" strokeWidth="2" />
                <text x={x(next.t)} y={y(next.pct) + 22} fontSize="12" fill="#d4d4d8" textAnchor="middle" fontWeight="600">Next · {next.pct}% by {next.label}</text>
              </g>
            )}

            {/* Target */}
            <circle cx={tx} cy={ty} r="8" fill={TONE_HEX[top.tone]} stroke="#0f0f17" strokeWidth="3" />
            <text x={tx - 16} y={ty + 4} fontSize="12" fill={TONE_HEX[top.tone]} textAnchor="end" fontWeight="700">TARGET · {top.label.toUpperCase()}</text>

            {/* You */}
            <circle cx={youX} cy={y(last.pct)} r="9" fill="#8b5cf6" stroke="#0f0f17" strokeWidth="3" filter="url(#go-glow)" />
            <text x={youX} y={y(last.pct) - 18} fontSize="13" fill="#ffffff" fontWeight="700" textAnchor="middle">YOU · {last.pct}%</text>

            {/* Dates */}
            <text x={L} y={H - 9} fontSize="11.5" fill="#a1a1aa">{points.length > 1 ? "Grade check · " : ""}{fmt(t0)}</text>
            <text x={W - R} y={H - 9} fontSize="11.5" fill="#a1a1aa" textAnchor="end">{examDate ? `Exam · ${fmt(endT)}` : fmt(endT)}</text>
          </svg>

          {/* Tools */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {spot ? (
              <button onClick={() => onFixWeakSpot(spot)} disabled={busySubject === active}
                className="rounded-2xl border border-amber-400/30 bg-amber-500/[0.08] px-3 py-3 text-left min-h-[64px] disabled:opacity-60">
                <p className="text-amber-300 text-[12.5px] font-bold leading-tight">Fix weak spot</p>
                <p className="text-zinc-500 text-[10.5px] mt-0.5 truncate">{busySubject === active ? "Building…" : `${spot.label} · ${spot.pct}%`}</p>
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
