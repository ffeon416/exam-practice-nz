"use client";

// The road to exam day. One winding road across the card, a node per day
// (today big and lit, the rest rings in their task's colour), rising at the
// end to a flag on exam day. Nothing is scheduled past the flag.

import { useEffect, useRef, useState } from "react";
import { display } from "@/lib/displayFont";
import { smoothPath } from "@/lib/gradeOutlook";
import { type TaskKind } from "@/lib/dailyTask";
import { KIND_ACCENT, KIND_SHORT, type WeekDay } from "@/components/WeekStrip";

const EXAM = "#ff6b7a";
const ROAD = "#1b1b26";
const ROAD_DASH = "#3b3b4d";

type Slot = { key: string; top: string; bottom: string; sub: string; kind: TaskKind | "exam"; state: WeekDay["state"]; gap?: number };

export default function RoadMap({ days, examDate, examDays }: { days: WeekDay[]; examDate: string | null; examDays: number | null }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);
  useEffect(() => {
    const el = wrap.current; if (!el) return;
    const ro = new ResizeObserver((es) => { const w = es[0]?.contentRect.width; if (w) setWidth(Math.round(w)); });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Slots: the scheduled days, then the exam flag (unless exam day already sits in the week).
  const scheduled = days.filter((d) => d.state !== "off");
  const slots: Slot[] = scheduled.map((d) => ({
    key: String(d.day), kind: d.state === "exam" ? "exam" : d.kind, state: d.state,
    top: d.state === "today" ? "Today" : `${d.weekday} ${d.dateNum}`,
    bottom: d.state === "exam" ? "Exam" : KIND_SHORT[d.kind],
    sub: d.state === "exam" ? (examDate ? fmt(examDate) : "") : d.state === "missed" ? "Missed" : `Day ${String(d.day).padStart(2, "0")}`,
  }));
  const hasExamSlot = slots.some((s) => s.kind === "exam");
  if (!hasExamSlot && examDate && examDays != null) {
    const last = scheduled[scheduled.length - 1];
    const todayIdx = scheduled.findIndex((d) => d.state === "today");
    const daysAfterToday = last && todayIdx >= 0 ? last.day - scheduled[todayIdx].day : 0;
    const gap = Math.max(0, examDays - daysAfterToday);
    slots.push({ key: "exam", kind: "exam", state: "exam", top: "", bottom: "Exam", sub: fmt(examDate), gap });
  }

  // Geometry: nodes zigzag low/high, the flag sits up top right.
  const n = slots.length;
  const H = 210, padL = 40, padR = 56, yLow = 138, yHigh = 82, yFlag = 30;
  const W = Math.max(320, width);
  const X = (i: number) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const pts = slots.map((s, i) => ({ x: X(i), y: s.kind === "exam" ? yFlag : i % 2 === 0 ? yLow : yHigh }));
  const road = smoothPath(pts);
  const gapSlot = slots.find((s) => s.gap != null && s.gap > 0);
  const gapIdx = gapSlot ? slots.indexOf(gapSlot) : -1;

  return (
    <div ref={wrap}>
      {/* Top labels */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {slots.map((s) => (
          <p key={s.key} className={`font-mono text-[10.5px] sm:text-[11.5px] uppercase tracking-[0.2em] ${s.state === "today" ? "text-indigo-300 font-bold" : "text-zinc-500"} ${s.kind === "exam" ? "text-right pr-1" : "text-center"}`}>{s.top}</p>
        ))}
      </div>

      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="block -my-1" aria-hidden>
        {/* road */}
        <path d={road} fill="none" stroke={ROAD} strokeWidth="14" strokeLinecap="round" strokeLinejoin="round" />
        <path d={road} fill="none" stroke={ROAD_DASH} strokeWidth="1.5" strokeDasharray="3 6" strokeLinecap="round" />
        {/* +N days on the last stretch */}
        {gapIdx > 0 && (
          <text x={(X(gapIdx - 1) + X(gapIdx)) / 2 + 16} y={(pts[gapIdx - 1].y + pts[gapIdx].y) / 2 + 36} textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontSize="10.5" letterSpacing="2" fill="#71717a">+{gapSlot!.gap} DAYS</text>
        )}
        {/* nodes */}
        {slots.map((s, i) => {
          const { x, y } = pts[i];
          if (s.kind === "exam") return (
            <g key={s.key}>
              <line x1={x} y1={y} x2={x} y2={y - 40} stroke={EXAM} strokeWidth="2.5" strokeLinecap="round" />
              <path d={`M${x} ${y - 42} L${x + 30} ${y - 34} L${x} ${y - 24} Z`} fill={EXAM} />
              <circle cx={x} cy={y} r="9" fill={EXAM} />
            </g>
          );
          const c = KIND_ACCENT[s.kind];
          if (s.state === "today") return (
            <g key={s.key}>
              <circle cx={x} cy={y} r="24" fill="#1c1a30" />
              <circle cx={x} cy={y} r="14" fill={c} style={{ filter: `drop-shadow(0 0 14px ${c}88)` }} />
            </g>
          );
          if (s.state === "done") return (
            <g key={s.key}>
              <circle cx={x} cy={y} r="10" fill={c} />
              <path d={`M${x - 4.5} ${y} l3 3 l6 -6`} fill="none" stroke="#07120d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
          if (s.state === "missed") return <circle key={s.key} cx={x} cy={y} r="9" fill="#0e0f13" stroke="#3f3f4b" strokeWidth="2.5" />;
          return <circle key={s.key} cx={x} cy={y} r="9" fill="#0e0f13" stroke={c} strokeWidth="2.5" />;
        })}
      </svg>

      {/* Bottom labels */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {slots.map((s) => (
          <div key={s.key} className={`min-w-0 ${s.kind === "exam" ? "text-right pr-1" : "text-center"}`}>
            <p className={`${display.className} font-bold tracking-[-0.02em] leading-tight text-[14px] sm:text-[18px] truncate ${s.kind === "exam" ? "text-rose-400" : s.state === "missed" ? "text-zinc-600 line-through decoration-zinc-700" : s.state === "upcoming" ? "text-zinc-200" : "text-white"}`}>{s.bottom}</p>
            <p className="text-[11px] sm:text-[13px] text-zinc-500 mt-1 truncate">{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(d: string): string { return new Date(d + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }); }
