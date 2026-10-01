"use client";

// The pace line: grade bands as faint rules, a day per tick along the
// bottom from the start of the plan to exam day, the pace line from the
// first score to the goal on the flag, and You as the big node today.

import { useEffect, useRef, useState } from "react";
import { display } from "@/lib/displayFont";
import { LETTER_BANDS } from "@/data/curricula";
import { localDateKey } from "@/lib/dailyTask";

export type PacePoint = { date: string; pct: number };
const GREEN = "#3ee6a0";

function addDays(key: string, n: number): string { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() + n); return localDateKey(d); }
function dayDiff(a: string, b: string): number { return Math.round((new Date(b + "T12:00:00").getTime() - new Date(a + "T12:00:00").getTime()) / 864e5); }

export default function PaceLine({
  points, planStart, examDate, goalPct, goalLabel, today, color, you, shouldBe,
}: {
  points: PacePoint[];      // oldest first, one per local day
  planStart: string;        // day 1
  examDate: string;         // the flag
  goalPct: number;
  goalLabel: string;
  today: string;
  color: string;            // the state colour (You node, score line)
  you: number | null;       // latest score
  shouldBe: number | null;  // where the pace line is today
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver((es) => { const w = es[0]?.contentRect.width; if (w) setWidth(Math.round(w)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const total = Math.max(1, dayDiff(planStart, examDate));            // days from day 1 to exam
  const H = 300, padL = 54, padR = 60, padT = 30, padB = 50;
  const W = Math.max(320, width);
  const X = (key: string) => padL + (Math.min(total, Math.max(0, dayDiff(planStart, key))) / total) * (W - padL - padR);
  const scores = points.map((p) => p.pct);
  const yMin = Math.max(0, Math.floor((Math.min(50, ...(scores.length ? scores : [50])) - 8) / 10) * 10);
  const yMax = 100;
  const Y = (v: number) => padT + ((yMax - v) / (yMax - yMin)) * (H - padT - padB);
  const bands = LETTER_BANDS.filter((b) => b.tone !== "fail").map((b) => ({ label: b.label, v: Math.round(b.minPct * 100) })).filter((b) => b.v >= yMin && b.v <= yMax);

  const first = points[0] ?? null;
  const todayX = X(today), examX = X(examDate);
  const paceStart = first ? { x: X(first.date), y: Y(first.pct) } : null;
  const flag = { x: examX, y: Y(goalPct) };
  // Gentle curve: a quadratic whose control point sits a little under the straight line.
  const pacePath = paceStart ? `M${paceStart.x} ${paceStart.y} Q${(paceStart.x + flag.x) / 2} ${(paceStart.y + flag.y) / 2 + 18} ${flag.x} ${flag.y}` : "";
  const scoreLine = points.map((p) => `${X(p.date)},${Y(p.pct)}`).join(" ");

  // Day ticks: every day; labels at day 1, today, each Monday, exam.
  const ticks: { key: string; label: string | null; kind: "past" | "today" | "future" | "exam" }[] = [];
  for (let i = 0; i <= total; i++) {
    const key = addDays(planStart, i);
    const d = new Date(key + "T12:00:00");
    const isExam = key === examDate, isToday = key === today;
    const label = isExam ? "Exam" : isToday ? "Today" : i === 0 || d.getDay() === 1 ? d.toLocaleDateString("en-NZ", { weekday: "short", day: "numeric" }) : null;
    ticks.push({ key, label: label ? label.toUpperCase().replace(",", "") : null, kind: isExam ? "exam" : isToday ? "today" : key < today ? "past" : "future" });
  }
  // Thin the labels when days are dense.
  const minGap = 64;
  let lastLabelX = -Infinity;
  const labelled = ticks.map((t) => {
    if (!t.label) return t;
    const x = X(t.key);
    if (t.kind === "today" || t.kind === "exam" || x - lastLabelX >= minGap) { lastLabelX = x; return t; }
    return { ...t, label: null };
  });

  const youY = you != null ? Y(you) : null;
  const youLabel = you != null ? `You · ${LETTER_BANDS.find((b) => you >= b.minPct * 100)?.label ?? "F"}` : null;

  return (
    <div ref={wrap}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={youLabel ? `${youLabel}, goal ${goalLabel} on exam day` : "No scores yet"}>
        {/* Grade bands */}
        {bands.map((b) => (
          <g key={b.label}>
            <line x1={padL} x2={W - padR + 24} y1={Y(b.v)} y2={Y(b.v)} stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
            <text x={padL - 14} y={Y(b.v) + 4} textAnchor="end" fontFamily="ui-monospace, Menlo, monospace" fontSize="11" letterSpacing="1" fill={b.v === goalPct ? GREEN : "#71717a"} fontWeight={b.v === goalPct ? 700 : 500}>{b.label}</text>
          </g>
        ))}
        {/* Day ticks */}
        {labelled.map((t) => {
          const x = X(t.key);
          const c = t.kind === "today" ? color : t.kind === "exam" ? "#ff6b7a" : t.kind === "past" ? "#52525b" : "#2a2a33";
          return (
            <g key={t.key}>
              <circle cx={x} cy={H - padB + 14} r={t.kind === "today" ? 3.5 : 2} fill={c} />
              {t.label && <text x={x} y={H - padB + 36} textAnchor={t.kind === "exam" ? "end" : "middle"} fontFamily="ui-monospace, Menlo, monospace" fontSize="10" letterSpacing="1.5" fontWeight={t.kind === "today" ? 700 : 500} fill={c === "#2a2a33" ? "#52525b" : c}>{t.label}</text>}
            </g>
          );
        })}
        {/* Pace line to the flag */}
        {pacePath && (
          <>
            <path d={pacePath} fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${GREEN}66)` }} />
            <path d={pacePath} fill="none" stroke="#0e0f13" strokeWidth="1" strokeDasharray="2 6" strokeLinecap="round" />
          </>
        )}
        {/* Flag on exam day */}
        <g>
          <line x1={flag.x} y1={flag.y} x2={flag.x} y2={flag.y - 30} stroke={GREEN} strokeWidth="2" strokeLinecap="round" />
          <path d={`M${flag.x} ${flag.y - 32} L${flag.x + 22} ${flag.y - 26} L${flag.x} ${flag.y - 18} Z`} fill={GREEN} />
          <circle cx={flag.x} cy={flag.y} r="6" fill={GREEN} />
        </g>
        {/* Scores so far */}
        {points.length > 1 && <polyline points={scoreLine} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />}
        {points.slice(0, -1).map((p) => <circle key={p.date} cx={X(p.date)} cy={Y(p.pct)} r="3.5" fill="#0e0f13" stroke={color} strokeWidth="2" />)}
        {/* Pace says here */}
        {first && shouldBe != null && (
          <g>
            <circle cx={todayX} cy={Y(shouldBe)} r="3" fill={GREEN} />
            <text x={todayX + 14} y={Y(shouldBe) - 10} fontFamily="ui-sans-serif, system-ui" fontSize="12" fill="#a1a1aa">pace says here</text>
          </g>
        )}
        {/* You */}
        {youY != null && (
          <g>
            <circle cx={todayX} cy={youY} r="22" fill="#1c1a30" />
            <circle cx={todayX} cy={youY} r="10" fill={color} style={{ filter: `drop-shadow(0 0 10px ${color}99)` }} />
            <text x={todayX + 18} y={youY + 26} fontFamily="ui-sans-serif, system-ui" fontSize="15" fontWeight="800" fill="#ffffff" className={display.className}>{youLabel}</text>
          </g>
        )}
      </svg>
    </div>
  );
}
