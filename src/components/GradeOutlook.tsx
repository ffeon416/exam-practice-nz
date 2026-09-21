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
  bandAt, bandsFor, marksToTop, milestones, predictedPct, subjectSeries, tierBreakdown, weakSpot, type WeakSpot,
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

  // ── Chart ──
  const W = 640, H = 320, L = 14, R = 22, T = 34, B = 34;
  const t0 = points[0]?.t ?? nowTs;
  const x = (t: number) => L + ((t - t0) / Math.max(1, endT - t0)) * (W - L - R);
  const y = (pct: number) => T + (1 - pct / 100) * (H - T - B);
  const last = points[points.length - 1];
  const linePath = points.map((p, i) => `${i ? "L" : "M"}${x(p.t).toFixed(1)} ${y(p.pct).toFixed(1)}`).join(" ");
  const areaPath = points.length ? `${linePath} L${x(last.t).toFixed(1)} ${y(0)} L${x(points[0].t).toFixed(1)} ${y(0)} Z` : "";
  // zones: from each band's floor up to the next band's floor (top band → 100)
  const zones = bands.map((b, i) => ({ b, lo: b.minPct * 100, hi: i === 0 ? 100 : bands[i - 1].minPct * 100 }));
  const youX = last ? x(last.t) : 0;
  const youLabelRight = youX > W * 0.6;

  return (
    <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.015] p-4 sm:p-6 mb-4">
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
            <p className={`${display.className} font-bold text-[26px] sm:text-[30px] leading-none tracking-[-0.02em] ${TONE_TEXT[nowBand!.tone]}`}>
              {nowBand!.label} <span className="text-zinc-500 text-[15px] font-semibold">{now}%</span>
            </p>
            <p className="text-zinc-400 text-[13px] text-right">
              {gap === 0 ? <>at <span className={`font-bold ${TONE_TEXT[top.tone]}`}>{top.label}</span>, hold it</> : <><span className="text-white font-bold">{gap} mark{gap === 1 ? "" : "s"}</span> a paper from <span className={`font-bold ${TONE_TEXT[top.tone]}`}>{top.label}</span></>}
            </p>
          </div>

          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label={`Your ${label(active)} scores against the grade bands`}>
            <defs>
              <linearGradient id="go-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#818cf8" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grade zones with their names */}
            {zones.map(({ b, lo, hi }) => (
              <g key={b.id}>
                <rect x={L} y={y(hi)} width={W - L - R} height={Math.max(0, y(lo) - y(hi))} fill={TONE_HEX[b.tone]} fillOpacity={b.tone === "top" ? 0.10 : 0.05} />
                <line x1={L} x2={W - R} y1={y(lo)} y2={y(lo)} stroke={TONE_HEX[b.tone]} strokeOpacity="0.35" strokeWidth="1" />
                <text x={L + 10} y={y(hi) + 16} fontSize="12" fontWeight="700" fill={TONE_HEX[b.tone]} fillOpacity="0.85" style={{ letterSpacing: "0.04em" }}>{b.label.toUpperCase()}</text>
              </g>
            ))}

            {/* Path to the target, with the next milestone on it */}
            <line x1={x(last.t)} y1={y(last.pct)} x2={x(endT)} y2={y(targetPct)} stroke="#ffffff" strokeOpacity="0.35" strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round" />
            {next && (
              <g>
                <circle cx={x(next.t)} cy={y(next.pct)} r="6" fill="#0b0b12" stroke="#ffffff" strokeOpacity="0.8" strokeWidth="2" />
                <text x={x(next.t)} y={y(next.pct) - 12} fontSize="12" fill="#e4e4e7" textAnchor="middle" fontWeight="600">{next.pct}% by {next.label}</text>
              </g>
            )}

            {/* Target */}
            <circle cx={x(endT)} cy={y(targetPct)} r="7" fill={TONE_HEX[top.tone]} />
            <text x={x(endT) - 12} y={y(targetPct) - 12} fontSize="12" fill={TONE_HEX[top.tone]} textAnchor="end" fontWeight="700">TARGET · {top.label.toUpperCase()}</text>

            {/* Your papers */}
            <path d={areaPath} fill="url(#go-area)" />
            <path d={linePath} fill="none" stroke="#818cf8" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            {points.slice(0, -1).map((p, i) => (
              <circle key={i} cx={x(p.t)} cy={y(p.pct)} r="4" fill="#0b0b12" stroke="#a5b4fc" strokeWidth="2" />
            ))}
            <circle cx={youX} cy={y(last.pct)} r="8" fill="#818cf8" stroke="#0b0b12" strokeWidth="3" />
            <text x={youLabelRight ? youX - 14 : youX + 14} y={y(last.pct) + 4} fontSize="13" fill="#ffffff" fontWeight="700" textAnchor={youLabelRight ? "end" : "start"}>YOU · {last.pct}%</text>

            {/* Dates */}
            <text x={L} y={H - 10} fontSize="11.5" fill="#a1a1aa">{points.length > 1 ? "Grade check · " : ""}{fmt(t0)}</text>
            <text x={W - R} y={H - 10} fontSize="11.5" fill="#a1a1aa" textAnchor="end">{examDate ? `Exam · ${fmt(endT)}` : fmt(endT)}</text>
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
