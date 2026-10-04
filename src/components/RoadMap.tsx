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
    sub: d.state === "exam" ? (examDate ? fmt(examDate) : "") : d.state === "missed" ? "Missed" : d.state === "today" ? `Today · Day ${String(d.day).padStart(2, "0")}` : `Day ${String(d.day).padStart(2, "0")}`,
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
  const H = 164, padL = 40, padR = 56, yLow = 112, yHigh = 70, yFlag = 34;
  const W = Math.max(320, width);
  const X = (i: number) => padL + (n <= 1 ? 0 : (i * (W - padL - padR)) / (n - 1));
  const pts = slots.map((s, i) => ({ x: X(i), y: s.kind === "exam" ? yFlag : i % 2 === 0 ? yLow : yHigh }));
  const road = smoothPath(pts);
  const todayIdx = slots.findIndex((s) => s.state === "today");
  const todayColor = todayIdx >= 0 ? KIND_ACCENT[slots[todayIdx].kind as TaskKind] : "#a78bfa";
  const colW = Math.min(120, Math.max(72, (W - padL - padR) / Math.max(1, n - 1) * 0.8));
  const gapSlot = slots.find((s) => s.gap != null && s.gap > 0);
  const gapIdx = gapSlot ? slots.indexOf(gapSlot) : -1;

  return (
    <div ref={wrap}>
      {/* Top labels */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {slots.map((s) => (
          <p key={s.key} className={`font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.18em] ${s.kind === "exam" ? "text-right pr-1" : "text-center"} ${s.state === "today" ? "" : "text-zinc-500"}`}>
            {s.state === "today"
              ? <span className="inline-block px-2 py-0.5 rounded-full font-bold text-[#0a0a0f]" style={{ background: KIND_ACCENT[s.kind as TaskKind], boxShadow: `0 0 18px ${KIND_ACCENT[s.kind as TaskKind]}66` }}>{s.top}</span>
              : s.top}
          </p>
        ))}
      </div>

      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} className="block -my-1" aria-hidden>
        <defs>
          <linearGradient id="sa-today-col" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={todayColor} stopOpacity="0.16" />
            <stop offset="1" stopColor={todayColor} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* today's column, lit from the label down to the node */}
        {todayIdx >= 0 && <rect x={X(todayIdx) - colW / 2} y="0" width={colW} height={H} rx="18" fill="url(#sa-today-col)" />}
        {/* road */}
        <path d={road} fill="none" stroke={ROAD} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
        <path d={road} fill="none" stroke={ROAD_DASH} strokeWidth="1.5" strokeDasharray="3 6" strokeLinecap="round" />
        {/* +N days on the last stretch */}
        {gapIdx > 0 && (
          <text x={(X(gapIdx - 1) + X(gapIdx)) / 2 + 16} y={(pts[gapIdx - 1].y + pts[gapIdx].y) / 2 + 30} textAnchor="middle" fontFamily="ui-monospace, Menlo, monospace" fontSize="10.5" letterSpacing="2" fill="#71717a">+{gapSlot!.gap} DAYS</text>
        )}
        {/* nodes */}
        {slots.map((s, i) => {
          const { x, y } = pts[i];
          if (s.kind === "exam") return (
            <g key={s.key}>
              <line x1={x} y1={y} x2={x} y2={y - 32} stroke={EXAM} strokeWidth="2.5" strokeLinecap="round" />
              <path d={`M${x} ${y - 34} L${x + 24} ${y - 27} L${x} ${y - 19} Z`} fill={EXAM} />
              <circle cx={x} cy={y} r="7.5" fill={EXAM} />
            </g>
          );
          const c = KIND_ACCENT[s.kind];
          if (s.state === "today") return (
            <g key={s.key}>
              <circle cx={x} cy={y} r="20" fill="none" stroke={c} strokeWidth="2" opacity="0.6" className="sa-pulse-ring" />
              <circle cx={x} cy={y} r="21" fill="#1c1a30" stroke={c} strokeOpacity="0.35" strokeWidth="1.5" />
              <circle cx={x} cy={y} r="12.5" fill={c} style={{ filter: `drop-shadow(0 0 14px ${c})` }} />
              <circle cx={x - 3} cy={y - 4} r="3" fill="#ffffff" opacity="0.35" />
            </g>
          );
          if (s.state === "done") return (
            <g key={s.key}>
              <circle cx={x} cy={y} r="8.5" fill={c} />
              <path d={`M${x - 4} ${y} l2.6 2.6 l5.2 -5.2`} fill="none" stroke="#07120d" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
          if (s.state === "missed") return <circle key={s.key} cx={x} cy={y} r="7.5" fill="#0e0f13" stroke="#3f3f4b" strokeWidth="2.25" />;
          return <circle key={s.key} cx={x} cy={y} r="7.5" fill="#0e0f13" stroke={c} strokeWidth="2.25" />;
        })}
      </svg>

      {/* Bottom labels */}
      <div className="grid" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {slots.map((s) => (
          <div key={s.key} className={`min-w-0 ${s.kind === "exam" ? "text-right pr-1" : "text-center"}`}>
            <p className={`${display.className} font-bold tracking-[-0.02em] leading-tight truncate ${s.state === "today" ? "text-[15px] sm:text-[18px] text-white" : "text-[13px] sm:text-[15px]"} ${s.kind === "exam" ? "text-rose-400" : s.state === "missed" ? "text-zinc-600 line-through decoration-zinc-700" : s.state === "upcoming" ? "text-zinc-200" : "text-white"}`}>{s.bottom}</p>
            <p className={`text-[11px] sm:text-[12px] mt-0.5 truncate ${s.state === "today" ? "font-semibold" : "text-zinc-500"}`} style={s.state === "today" ? { color: KIND_ACCENT[s.kind as TaskKind] } : undefined}>{s.sub}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function fmt(d: string): string { return new Date(d + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" }); }
