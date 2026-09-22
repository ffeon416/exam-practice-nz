"use client";

// Duolingo-style path: a winding column of nodes, one per task day. Done
// nodes are filled purple, the current node pulses with a START bubble,
// locked nodes are grey. Each week is a section with a header and a note
// explaining why it's as heavy as it is. Tap the current node to do it.

import type { DayNode, PlanWeek } from "@/lib/dailyPlan";

const ICON: Record<DayNode["kind"], (a: boolean) => React.ReactNode> = {
  check: (a) => (
    <svg className={a ? "w-7 h-7" : "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 12l4 4L20 6" /></svg>
  ),
  paper: (a) => (
    <svg className={a ? "w-7 h-7" : "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13H7z" /><path strokeLinecap="round" d="M9 12h6M9 16h6" /></svg>
  ),
  fix: (a) => (
    <svg className={a ? "w-7 h-7" : "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M14 6l4 4-9 9H5v-4l9-9zM12 8l4 4" /></svg>
  ),
  mock: (a) => (
    <svg className={a ? "w-7 h-7" : "w-6 h-6"} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><circle cx="12" cy="13" r="8" /><path strokeLinecap="round" d="M12 9v4l3 2M9 3h6" /></svg>
  ),
};

const OFFSETS = [0, 44, 72, 44, 0, -44, -72, -44]; // gentle zigzag, px

export default function DailyPath({ weeks, busy, onNode }: { weeks: PlanWeek[]; busy?: boolean; onNode: (n: DayNode) => void }) {
  const fmtDay = (t: number) => new Date(t).toLocaleDateString("en-NZ", { weekday: "short" });
  const fmtDate = (t: number) => new Date(t).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  return (
    <div className="max-w-md mx-auto">
      {weeks.map((w) => (
        <section key={w.k} className={w.state === "locked" ? "opacity-70" : ""}>
          {/* Week header */}
          <div className={`rounded-2xl px-4 py-3 mb-6 ${w.state === "current" ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white" : "bg-white/[0.04] border border-white/[0.08] text-zinc-300"}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10.5px] uppercase tracking-wider opacity-80">Week {w.k + 1} · {fmtDate(w.start)}</p>
              <p className="font-mono text-[11px] font-bold">{w.done}/{w.total}</p>
            </div>
            <p className="text-[13.5px] font-semibold mt-0.5">{w.state === "locked" ? "Planned after your next grade check" : w.note}</p>
          </div>

          {/* Nodes */}
          <ol className="relative mb-4">
            {w.nodes.map((n, j) => {
              const off = OFFSETS[(n.i) % OFFSETS.length];
              const done = n.state === "done", cur = n.state === "current", locked = n.state === "locked";
              const isCheck = n.kind === "check";
              return (
                <li key={n.i} className="relative flex items-center justify-center" style={{ height: 104 }}>
                  {/* connector */}
                  {j < w.nodes.length - 1 && (
                    <span className="absolute left-1/2 top-[70px] h-[40px] w-[3px] rounded-full" style={{ transform: `translateX(calc(-50% + ${(off + OFFSETS[(n.i + 1) % OFFSETS.length]) / 2}px))`, background: done ? "#8b5cf6" : "#27272a" }} aria-hidden />
                  )}
                  <div className="relative" style={{ transform: `translateX(${off}px)` }}>
                    {cur && (
                      <span className="absolute -top-9 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white text-[#0a0a0f] text-[11px] font-extrabold tracking-wider whitespace-nowrap shadow-lg">
                        {busy ? "BUILDING…" : "START"}
                        <span className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-3 h-3 bg-white rotate-45" aria-hidden />
                      </span>
                    )}
                    <button
                      onClick={cur && !busy ? () => onNode(n) : undefined}
                      disabled={!cur || busy}
                      aria-label={`${n.title}, ${fmtDay(n.date)}${done ? ", done" : cur ? ", start" : ", locked"}`}
                      className={`relative w-[68px] h-[68px] rounded-full flex items-center justify-center transition-transform ${
                        done ? "bg-violet-600 text-white shadow-[0_6px_0_#4c1d95]"
                        : cur ? "bg-white text-[#0a0a0f] shadow-[0_6px_0_#a78bfa] hover:scale-105"
                        : "bg-zinc-800 text-zinc-500 shadow-[0_6px_0_#18181b] cursor-default"
                      } ${isCheck && !done ? "ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-[#06060a]" : ""}`}
                    >
                      {cur && <span className="absolute inset-0 rounded-full bg-violet-400/40 sa-pulse-ring" aria-hidden />}
                      {done ? ICON.check(false) : locked ? (
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></svg>
                      ) : ICON[n.kind](true)}
                    </button>
                    {/* label beside the node, on the open side */}
                    <div className={`absolute top-1/2 -translate-y-1/2 ${off >= 0 ? "right-[84px] text-right" : "left-[84px] text-left"} w-[150px]`}>
                      <p className={`text-[14px] font-bold leading-tight ${cur ? "text-white" : done ? "text-zinc-300" : "text-zinc-500"}`}>{n.title}</p>
                      <p className={`text-[11.5px] ${cur ? "text-indigo-300" : "text-zinc-600"}`}>{done ? "done" : cur ? `today · ${fmtDay(n.date)}` : `${fmtDay(n.date)} ${fmtDate(n.date)}`}</p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}
