"use client";

// Under the ticket, always on: are you on pace for the grade you chose?
// One subject at a time. The grey dotted line is the pace from your first
// score to the goal on exam day; the solid line is your scores; the dotted
// line past today is where you're heading at your current rate. The whole
// card recolours by state: behind (rose), on track (green), ahead (violet).

import { useEffect, useMemo, useRef, useState } from "react";
import { display } from "@/lib/displayFont";
import { LETTER_BANDS } from "@/data/curricula";
import { dayNumber, daysUntil, localDateKey } from "@/lib/dailyTask";

export type PacePoint = { date: string; pct: number }; // local date key, latest score that day

const STATE = {
  behind: { color: "#ff6b7a", pill: "Behind pace" },
  track: { color: "#3ee6a0", pill: "On track" },
  ahead: { color: "#8b8cf8", pill: "Ahead of pace" },
} as const;
type PaceState = keyof typeof STATE;

function shift(key: string, days: number): Date { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() + days); return d; }
function letterFor(pct: number): string { return LETTER_BANDS.find((b) => pct >= b.minPct * 100)?.label ?? "F"; }

export default function PaceChart({
  subjectLabel, subjects, activeSubject, onSubject, subjectLabelFor, points, planStart, examDate, goalPct, goalLabel, trendPerWeek, today, noGoal,
}: {
  subjectLabel: string;
  subjects: string[];
  activeSubject: string;
  onSubject: (s: string) => void;
  subjectLabelFor: (s: string) => string;
  points: PacePoint[];        // since the plan started, oldest first
  planStart: string;          // local date key of day 1
  examDate: string | null;    // YYYY-MM-DD
  goalPct: number;            // e.g. 80 for an A
  goalLabel: string;          // "A"
  trendPerWeek: number;       // slope of recent scores, points per week
  today: string;              // local date key
  /** No goal chosen for this subject yet. */
  noGoal?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver((es) => { const w = es[0]?.contentRect.width; if (w) setWidth(Math.round(w)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const m = useMemo(() => {
    const examDays = examDate ? daysUntil(examDate, new Date(today + "T12:00:00")) : null;
    const day = dayNumber(planStart, new Date(today + "T12:00:00"));
    const total = examDate ? Math.max(day, dayNumber(planStart, new Date(examDate + "T12:00:00"))) : null;
    const first = points[0] ?? null;
    const last = points[points.length - 1] ?? null;
    const startT = new Date(planStart + "T12:00:00").getTime();
    const examT = examDate ? new Date(examDate + "T12:00:00").getTime() : startT + 56 * 864e5;
    const span = Math.max(864e5, examT - startT);
    const paceAt = (key: string) => {
      if (!first) return null;
      const f = Math.min(1, Math.max(0, (new Date(key + "T12:00:00").getTime() - startT) / span));
      return first.pct + (goalPct - first.pct) * f;
    };
    const shouldBe = paceAt(today);
    const you = last?.pct ?? null;
    const diff = you != null && shouldBe != null ? Math.round(you - shouldBe) : 0;
    const state: PaceState = diff < -4 ? "behind" : diff > 4 ? "ahead" : "track";
    const weeksLeft = Math.max(0, (examT - new Date(today + "T12:00:00").getTime()) / (7 * 864e5));
    // Where you're heading: your rate carried to exam day. With one score, assume the plan is followed.
    const projected = you == null ? null : points.length < 2 ? goalPct : Math.round(Math.min(100, Math.max(0, you + trendPerWeek * weeksLeft)));

    // Slots: up to 4 past days, today, up to 2 future days, exam.
    const lastScoreDaysAgo = last ? Math.round((new Date(today + "T12:00:00").getTime() - new Date(last.date + "T12:00:00").getTime()) / 864e5) : 0;
    const back = Math.min(Math.max(4, Math.min(lastScoreDaysAgo, 8)), Math.max(0, day - 1));
    const fwd = examDays == null ? 2 : Math.max(0, Math.min(2, examDays - 1));
    const slots: { key: string; label: string; kind: "past" | "today" | "future" | "exam" }[] = [];
    for (let i = back; i >= 1; i--) { const d = shift(today, -i); slots.push({ key: localDateKey(d), label: d.toLocaleDateString("en-NZ", { weekday: "short" }).toUpperCase(), kind: "past" }); }
    slots.push({ key: today, label: "TODAY", kind: "today" });
    for (let i = 1; i <= fwd; i++) { const d = shift(today, i); slots.push({ key: localDateKey(d), label: d.toLocaleDateString("en-NZ", { weekday: "short" }).toUpperCase(), kind: "future" }); }
    if (examDate && examDays != null && examDays >= 1) slots.push({ key: examDate, label: "EXAM", kind: "exam" });
    const byDate = new Map(points.map((p) => [p.date, p.pct]));
    return { examDays, day, total, first, last, you, shouldBe, diff, state, projected, slots, byDate, paceAt };
  }, [points, planStart, examDate, goalPct, trendPerWeek, today]);

  const { state, diff, you, shouldBe, projected, slots, byDate, paceAt, first, day, total } = m;
  const color = STATE[state].color;
  const dateLabel = new Date(today + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }).toUpperCase().replace(",", "");
  const projLetter = projected != null ? letterFor(projected) : goalLabel;
  const reachesGoal = projected != null && projected >= goalPct;

  const headline = noGoal ? `Choose a goal for ${subjectLabel}` : !first ? "Your line starts with a grade check"
    : state === "behind" ? `${Math.abs(diff)} points behind pace`
    : state === "ahead" ? `${diff} points ahead. Nice.`
    : "Right on track";
  const sub = noGoal ? "Pick the grade you want and an exam date in the panel, and your pace line appears here."
    : !first ? `Sit today's grade check in ${subjectLabel} and this becomes your live line to ${goalLabel}.`
    : state === "behind" ? `At this rate you'll finish on ${projLetter}. Today's paper is the quickest way to claw it back.`
    : state === "ahead" ? (reachesGoal ? `You're heading for ${goalLabel} with room to spare. Keep one a day and it's yours.` : `Ahead of pace, but the recent rate would land on ${projLetter}. Keep one a day and ${goalLabel} is yours.`)
    : (reachesGoal ? `You're heading for ${goalLabel}. Keep doing one paper a day and you'll get there.` : `On pace today. Keep one paper a day and the line keeps climbing to ${goalLabel}.`);

  // ── Geometry ──
  const H = 236, padL = 26, padR = 44, padT = 26, padB = 40;
  const W = Math.max(300, width);
  const n = slots.length;
  const X = (i: number) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const vals = [goalPct, ...(you != null ? [you] : []), ...(shouldBe != null ? [shouldBe] : []), ...(projected != null ? [projected] : []), ...slots.map((s) => byDate.get(s.key)).filter((v): v is number => v != null)];
  const yMin = Math.max(0, Math.floor((Math.min(...vals) - 12) / 10) * 10);
  const yMax = Math.min(100, Math.ceil((Math.max(...vals) + 8) / 10) * 10);
  const Y = (v: number) => padT + ((yMax - v) / Math.max(1, yMax - yMin)) * (H - padT - padB);
  const grid = LETTER_BANDS.filter((b) => b.tone !== "fail").map((b) => ({ label: b.label, v: b.minPct * 100 })).filter((g) => g.v >= yMin && g.v <= yMax);

  const scored = slots.map((s, i) => ({ i, v: byDate.get(s.key) })).filter((p): p is { i: number; v: number } => p.v != null);
  const youIdx = scored.length ? scored[scored.length - 1].i : 0;
  const youY = you != null ? Y(you) : null;
  const todayIdx = slots.findIndex((s) => s.kind === "today");
  const examIdx = slots.findIndex((s) => s.kind === "exam");
  const endIdx = examIdx >= 0 ? examIdx : todayIdx;
  const paceLine = first ? slots.map((s, i) => `${X(i)},${Y(paceAt(s.key) ?? first.pct)}`).join(" ") : "";
  const scoreLine = scored.map((p) => `${X(p.i)},${Y(p.v)}`).join(" ");
  const headLine = you != null && projected != null && endIdx > youIdx ? `${X(youIdx)},${Y(you)} ${X(endIdx)},${Y(projected)}` : "";
  const shouldLabelLeft = todayIdx >= n - 3;

  return (
    <div className="rounded-[28px] border border-white/[0.09] bg-[#0e0f13] p-6 sm:p-8 home-rise" style={{ animationDelay: "120ms" }}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          {subjectLabel} · Day {day}{total ? ` of ${total}` : ""} · {dateLabel}
        </p>
        {first && (
          <span className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full" style={{ color, background: `${color}1a` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />{STATE[state].pill}
          </span>
        )}
      </div>
      <h3 className={`${display.className} font-bold text-[34px] sm:text-[44px] leading-[1] tracking-[-0.035em] mt-4`} style={{ color: first ? color : "#f4f4f5" }}>{headline}</h3>
      <p className="text-zinc-300 text-[15px] sm:text-[16px] leading-relaxed max-w-2xl mt-2">{sub}</p>

      <div ref={wrap} className="mt-6 -mx-2">
        <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={first ? `${headline}. You ${you}%, pace ${Math.round(shouldBe ?? 0)}%` : "No scores yet"}>
          {/* Grade lines */}
          {grid.map((g) => (
            <g key={g.label}>
              <line x1={padL} x2={W - padR + 20} y1={Y(g.v)} y2={Y(g.v)} stroke="rgba(255,255,255,0.10)" strokeDasharray="2 4" />
              <text x={padL + 2} y={Y(g.v) - 5} fontFamily="ui-monospace, Menlo, monospace" fontSize="10" letterSpacing="1.5" fill="#71717a">{g.label}</text>
            </g>
          ))}
          {/* Day labels */}
          {slots.map((s, i) => (
            <text key={s.key} x={X(i)} y={H - 12} textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontSize="10" letterSpacing="1.2" fontWeight={s.kind === "today" ? 700 : 500}
              fill={s.kind === "today" ? "#ffffff" : s.kind === "exam" ? "#ff6b7a" : "#71717a"}>{s.label}</text>
          ))}
          {first && (
            <>
              {/* Pace to goal */}
              <polyline points={paceLine} fill="none" stroke="#6b6b78" strokeWidth="1.6" strokeDasharray="2 5" strokeLinecap="round" />
              {/* Heading */}
              {headLine && <polyline points={headLine} fill="none" stroke={color} strokeWidth="1.6" strokeDasharray="2 5" strokeLinecap="round" opacity="0.9" />}
              {/* Goal flag */}
              <g transform={`translate(${X(endIdx)},${Y(goalPct)})`}>
                <circle r="5.5" fill="#3ee6a0" />
                <line x1="0" y1="0" x2="0" y2="-24" stroke="#3ee6a0" strokeWidth="1.5" />
                <path d="M0 -24 L22 -18 L0 -12 Z" fill="#3ee6a0" />
              </g>
              {/* Your scores */}
              {scoreLine && <polyline points={scoreLine} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color}66)` }} />}
              {scored.slice(0, -1).map((p) => <circle key={p.i} cx={X(p.i)} cy={Y(p.v)} r="4" fill="#0e0f13" stroke={color} strokeWidth="2" />)}
              {/* Should be here */}
              {shouldBe != null && (
                <g>
                  {youIdx === todayIdx && youY != null && <line x1={X(todayIdx)} x2={X(todayIdx)} y1={Math.min(youY, Y(shouldBe))} y2={Math.max(youY, Y(shouldBe))} stroke="#8a8a96" strokeWidth="1.2" strokeDasharray="2 3" />}
                  <circle cx={X(todayIdx)} cy={Y(shouldBe)} r="5.5" fill="#0e0f13" stroke="#9a9aa6" strokeWidth="1.8" />
                  {(() => {
                    const txt = `should be here · ${Math.round(shouldBe)}%`;
                    const tx = X(todayIdx) + (shouldLabelLeft ? -12 : 12), ty = Y(shouldBe) + (you != null && you < shouldBe ? -12 : 18);
                    const w = txt.length * 6.4 + 10;
                    return (
                      <>
                        <rect x={shouldLabelLeft ? tx - w + 5 : tx - 5} y={ty - 11} width={w} height={16} rx="4" fill="#0e0f13" />
                        <text x={tx} y={ty} textAnchor={shouldLabelLeft ? "end" : "start"} fontFamily="ui-sans-serif, system-ui" fontSize="11.5" fill="#a1a1aa">{txt}</text>
                      </>
                    );
                  })()}
                </g>
              )}
              {/* You */}
              {you != null && youY != null && (
                <g>
                  <circle cx={X(youIdx)} cy={youY} r="13" fill={color} opacity="0.18" />
                  <circle cx={X(youIdx)} cy={youY} r="6.5" fill={color} />
                  <text x={X(youIdx) - 14} y={youY + (shouldBe != null && you >= shouldBe ? -16 : 26)} textAnchor="end" fontFamily="ui-sans-serif, system-ui" fontSize="17" fontWeight="800" fill="#ffffff">You · {you}%</text>
                </g>
              )}
            </>
          )}
        </svg>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap mt-2">
        <div className="flex items-center gap-5 text-[12px] text-zinc-400 flex-wrap">
          <span className="inline-flex items-center gap-2"><span className="w-5 h-[3px] rounded-full" style={{ background: color }} />Your scores</span>
          <span className="inline-flex items-center gap-2"><span className="w-5 border-t-2 border-dotted border-zinc-500" />Pace to {goalLabel}</span>
          {first && <span className="inline-flex items-center gap-2"><span className="w-5 border-t-2 border-dotted" style={{ borderColor: color }} />Where you&apos;re heading</span>}
        </div>
        {subjects.length > 1 && (
          <div className="flex gap-1.5">
            {subjects.map((s) => (
              <button key={s} onClick={() => onSubject(s)} className={`px-3 py-1.5 rounded-full text-[11.5px] font-semibold border min-h-[32px] ${s === activeSubject ? "border-white/30 text-white bg-white/[0.06]" : "border-white/[0.08] text-zinc-500"}`}>{subjectLabelFor(s)}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
