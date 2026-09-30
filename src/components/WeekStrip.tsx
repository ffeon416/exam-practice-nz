"use client";

// The week at a glance: seven tiles, one per plan day. Past days show what
// they were and whether they got done; today is lit; days still to come show
// only their kind (the paper itself stays unseen until its morning).

import { display } from "@/lib/displayFont";
import { type TaskKind } from "@/lib/dailyTask";

export const KIND_ACCENT: Record<TaskKind, string> = { check: "#3ee6a0", mock: "#a78bfa", paper: "#7dd3fc", review: "#fbbf24" };
export const KIND_SHORT: Record<TaskKind, string> = { check: "Grade check", mock: "Mock", paper: "Paper", review: "Lesson" };

export type WeekDay = {
  day: number;                 // plan day
  weekday: string;             // "Mon"
  dateNum: number;             // 30
  kind: TaskKind;
  subject?: string | null;     // label, shown for past + today
  state: "done" | "missed" | "today" | "upcoming";
};

export default function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {days.map((d) => {
        const c = KIND_ACCENT[d.kind];
        const today = d.state === "today", done = d.state === "done", missed = d.state === "missed", up = d.state === "upcoming";
        return (
          <div key={d.day}
            className={`relative rounded-2xl border px-2 py-2.5 sm:px-3 sm:py-3 min-h-[92px] sm:min-h-[104px] flex flex-col justify-between overflow-hidden transition-colors ${today ? "border-white/60 bg-white/[0.06]" : done ? "border-transparent" : "border-white/[0.07] bg-white/[0.015]"}`}
            style={done ? { background: `${c}1a`, borderColor: `${c}40` } : undefined}
            aria-current={today ? "date" : undefined}>
            <div className="flex items-center justify-between gap-1">
              <span className={`font-mono text-[9.5px] sm:text-[10px] uppercase tracking-[0.16em] ${today ? "text-white" : "text-zinc-500"}`}>{d.weekday}</span>
              {done && <span className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: c }}><svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="#07120d" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></span>}
              {missed && <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-zinc-600">Missed</span>}
              {today && <span className="w-1.5 h-1.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />}
            </div>
            <div>
              <p className={`${display.className} font-bold leading-none tracking-[-0.02em] text-[15px] sm:text-[17px] ${up ? "text-zinc-400" : missed ? "text-zinc-600 line-through decoration-zinc-700" : "text-white"}`}>{KIND_SHORT[d.kind]}</p>
              <p className={`text-[10.5px] sm:text-[11.5px] mt-0.5 truncate ${today ? "text-zinc-300" : "text-zinc-500"}`}>
                {up ? "Day " + String(d.day).padStart(2, "0") : d.subject ?? ""}
              </p>
            </div>
            {!today && !done && <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: c, opacity: up ? 0.35 : 0.2 }} aria-hidden />}
            {today && <span className="absolute inset-x-0 bottom-0 h-[3px]" style={{ background: c }} aria-hidden />}
          </div>
        );
      })}
    </div>
  );
}
