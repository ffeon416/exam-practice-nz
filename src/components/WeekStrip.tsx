"use client";

// The week as a timeline: one node per day on a single line, the line lit
// up to today. Past days say what they were and whether they got done;
// today is the big node; days to come show only their kind; exam day is
// the flag the line runs into. Nothing is scheduled past it.

import { display } from "@/lib/displayFont";
import { type TaskKind } from "@/lib/dailyTask";

export const KIND_ACCENT: Record<TaskKind, string> = { check: "#3ee6a0", mock: "#a78bfa", paper: "#7dd3fc", review: "#fbbf24" };
export const KIND_SHORT: Record<TaskKind, string> = { check: "Grade check", mock: "Mock", paper: "Paper", review: "Lesson" };
const EXAM = "#ff6b7a";

export type WeekDay = {
  day: number;                 // plan day
  weekday: string;             // "Mon"
  dateNum: number;             // 30
  kind: TaskKind;
  subject?: string | null;     // label, shown for past + today (+ exam)
  state: "done" | "missed" | "today" | "upcoming" | "exam" | "off";
};

export default function WeekStrip({ days }: { days: WeekDay[] }) {
  const todayIdx = days.findIndex((d) => d.state === "today");
  const lastIdx = (() => { let i = -1; days.forEach((d, j) => { if (d.state !== "off") i = j; }); return i; })();
  const n = days.length;
  const x = (i: number) => ((i + 0.5) / n) * 100; // % across the row
  const accent = todayIdx >= 0 ? KIND_ACCENT[days[todayIdx].kind] : "#a78bfa";

  return (
    <div className="relative">
      {/* Weekday labels */}
      <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {days.map((d) => (
          <p key={d.day} className={`text-center font-mono text-[10px] uppercase tracking-[0.18em] ${d.state === "today" ? "text-white" : d.state === "off" ? "text-zinc-800" : "text-zinc-500"}`}>{d.weekday}</p>
        ))}
      </div>

      {/* The line + nodes */}
      <div className="relative h-12 mt-1">
        {lastIdx >= 0 && (
          <>
            {/* full line, to the last scheduled day */}
            <div className="absolute top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-white/[0.08]" style={{ left: `${x(0)}%`, width: `${x(lastIdx) - x(0)}%` }} aria-hidden />
            {/* travelled */}
            {todayIdx > 0 && <div className="absolute top-1/2 -translate-y-1/2 h-[2px] rounded-full" style={{ left: `${x(0)}%`, width: `${x(todayIdx) - x(0)}%`, background: `linear-gradient(90deg, ${accent}66, ${accent})` }} aria-hidden />}
          </>
        )}
        {days.map((d, i) => {
          const c = d.state === "exam" ? EXAM : KIND_ACCENT[d.kind];
          return (
            <div key={d.day} className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center" style={{ left: `${x(i)}%` }}>
              {d.state === "today" && <span className="absolute w-11 h-11 rounded-full sa-pulse-ring" style={{ border: `1.5px solid ${c}`, opacity: 0.5 }} aria-hidden />}
              {d.state === "today" ? (
                <span className="w-7 h-7 rounded-full border-[3px] border-[#06060a]" style={{ background: c, boxShadow: `0 0 0 2px ${c}, 0 0 24px ${c}88` }} />
              ) : d.state === "done" ? (
                <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: c }}>
                  <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="#07120d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                </span>
              ) : d.state === "missed" ? (
                <span className="w-5 h-5 rounded-full border-2 border-zinc-700 bg-[#06060a] flex items-center justify-center"><span className="w-2 h-[2px] bg-zinc-600 rounded-full" /></span>
              ) : d.state === "exam" ? (
                <span className="w-7 h-7 rounded-full flex items-center justify-center bg-[#06060a]" style={{ border: `2px solid ${EXAM}`, boxShadow: `0 0 18px ${EXAM}55` }}>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill={EXAM}><path d="M5 3v18h2v-7h11l-3-4.5L18 5H7V3H5z" /></svg>
                </span>
              ) : d.state === "off" ? (
                <span className="w-1.5 h-1.5 rounded-full bg-white/[0.06]" />
              ) : (
                <span className="w-3.5 h-3.5 rounded-full bg-[#06060a] border-2" style={{ borderColor: `${c}99` }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Kind + sub labels */}
      <div className="grid mt-1" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
        {days.map((d) => {
          const today = d.state === "today", off = d.state === "off", exam = d.state === "exam", missed = d.state === "missed";
          return (
            <div key={d.day} className="text-center min-w-0 px-0.5">
              {off ? null : (
                <>
                  <p className={`${display.className} font-bold tracking-[-0.02em] leading-tight text-[13px] sm:text-[15px] truncate ${today ? "text-white" : exam ? "text-rose-300" : missed ? "text-zinc-600 line-through decoration-zinc-700" : d.state === "done" ? "text-zinc-200" : "text-zinc-500"}`}>
                    {exam ? "Exam" : KIND_SHORT[d.kind]}
                  </p>
                  <p className={`text-[10px] sm:text-[11px] mt-0.5 truncate ${today ? "font-semibold" : "text-zinc-600"}`} style={today ? { color: KIND_ACCENT[d.kind] } : undefined}>
                    {today ? "Today" : exam ? d.subject ?? "" : missed ? "Missed" : d.state === "done" ? d.subject ?? "Done" : `Day ${String(d.day).padStart(2, "0")}`}
                  </p>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
