"use client";

// StudyAce's path. A vertical timeline with energy: the travelled rail is a
// flowing gradient, every task is an icon node, today's task is one card
// with a slowly turning gradient border and the Start button, and each
// week has a lit progress strip. Done tasks fold to a line; locked ones
// sit dim until you reach them.

import { display } from "@/lib/displayFont";
import type { DayNode, PlanWeek } from "@/lib/dailyPlan";

const META: Record<DayNode["kind"], { blurb: string; length: string; icon: React.ReactNode }> = {
  check: {
    blurb: "Eight questions, marked properly. Sets where you are, and plans the week after.",
    length: "8 questions · about 15 min",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.4} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3M12 18v3M3 12h3M18 12h3" /><circle cx="12" cy="12" r="4" /></svg>,
  },
  paper: {
    blurb: "A fresh paper in your exam's style, marked the moment you finish.",
    length: "8 questions · about 15 min",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13H7z" /><path strokeLinecap="round" d="M9.5 12h5M9.5 16h5" /></svg>,
  },
  fix: {
    blurb: "A paper built on the one thing losing you the most marks.",
    length: "8 questions · about 15 min",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13 3L4 14h7l-1 7 9-11h-7z" /></svg>,
  },
  mock: {
    blurb: "Timed, full length, no feedback until the end. Like the real day.",
    length: "12 questions · timed",
    icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor"><circle cx="12" cy="13" r="8" /><path strokeLinecap="round" d="M12 9v4l3 2M9.5 3h5" /></svg>,
  },
};

export default function DailyPath({ weeks, busy, onNode }: { weeks: PlanWeek[]; busy?: boolean; onNode: (n: DayNode) => void }) {
  const day = (t: number) => new Date(t).toLocaleDateString("en-NZ", { weekday: "short" });
  const date = (t: number) => new Date(t).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  const long = (t: number) => new Date(t).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="max-w-2xl">
      {weeks.map((w) => {
        const current = w.state === "current";
        return (
          <section key={w.k} className={`mb-10 ${w.state === "locked" ? "opacity-55" : ""}`}>
            {/* Week header + lit progress strip */}
            <div className="mb-5">
              <div className="flex items-end justify-between gap-4 mb-3">
                <div>
                  <p className={`font-mono text-[10.5px] uppercase tracking-[0.14em] ${current ? "text-indigo-300" : "text-zinc-500"}`}>Week {w.k + 1} · {date(w.start)}</p>
                  <p className={`${display.className} font-bold text-[20px] leading-tight tracking-[-0.01em] mt-1 ${current ? "text-white" : "text-zinc-400"}`}>
                    {w.state === "locked" ? "Planned after your next grade check" : w.note}
                  </p>
                </div>
                <p className={`${display.className} font-bold text-[24px] leading-none tabular-nums shrink-0 ${current ? "text-white" : "text-zinc-500"}`}>{w.done}<span className="text-zinc-600 text-[15px]">/{w.total}</span></p>
              </div>
              <div className="flex gap-1.5">
                {w.nodes.map((n) => (
                  <span key={n.i} className={`h-1.5 flex-1 rounded-full ${n.state === "done" ? "bg-gradient-to-r from-indigo-400 to-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.7)]" : n.state === "current" ? "bg-white/70" : "bg-white/[0.08]"}`} />
                ))}
              </div>
            </div>

            {/* Timeline */}
            <ol className="relative">
              {w.nodes.map((n, j) => {
                const done = n.state === "done", cur = n.state === "current";
                const isCheck = n.kind === "check";
                const last = j === w.nodes.length - 1;
                return (
                  <li key={n.i} className="relative pl-[68px]">
                    {/* rail below this node */}
                    {!last && (
                      <span className={`absolute left-[21px] top-[46px] bottom-0 w-[3px] rounded-full ${done ? "sa-rail-flow shadow-[0_0_14px_rgba(139,92,246,0.6)]" : "bg-white/[0.07]"}`} aria-hidden />
                    )}
                    {/* icon node */}
                    <span className="absolute left-0 top-0 w-[46px] h-[46px] flex items-center justify-center" aria-hidden>
                      {cur && <span className="absolute inset-0 rounded-full bg-violet-400/40 sa-pulse-ring" />}
                      <span className={`relative w-[46px] h-[46px] rounded-full flex items-center justify-center ${
                        done ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-[0_0_18px_rgba(139,92,246,0.55)]"
                        : cur ? (isCheck ? "bg-emerald-400 text-[#06120d]" : "bg-white text-[#0a0a0f]") + " shadow-[0_0_24px_rgba(255,255,255,0.35)]"
                        : `bg-[#0b0b12] border ${isCheck ? "border-emerald-500/40 text-emerald-500/60" : "border-white/[0.12] text-zinc-600"}`
                      }`}>
                        {done ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7" /></svg> : META[n.kind].icon}
                      </span>
                    </span>

                    {cur ? (
                      /* ── Today: the one card, gradient border slowly turning ── */
                      <div className="relative rounded-[26px] p-[1.5px] overflow-hidden mb-8">
                        <span className={`absolute inset-[-60%] sa-spin-slow ${isCheck ? "bg-[conic-gradient(from_0deg,transparent_0deg,#34d399_80deg,transparent_140deg,transparent_220deg,#6ee7b7_290deg,transparent_360deg)]" : "bg-[conic-gradient(from_0deg,transparent_0deg,#a78bfa_80deg,transparent_140deg,transparent_220deg,#6366f1_290deg,transparent_360deg)]"}`} aria-hidden />
                        <div className={`relative rounded-[24.5px] p-5 sm:p-7 ${isCheck ? "bg-[radial-gradient(120%_120%_at_0%_0%,rgba(52,211,153,0.16),#0b0b12_55%)]" : "bg-[radial-gradient(120%_120%_at_0%_0%,rgba(99,102,241,0.22),#0b0b12_55%)]"}`}>
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <p className={`font-mono text-[10.5px] uppercase tracking-[0.14em] ${isCheck ? "text-emerald-300" : "text-indigo-300"}`}>Today · {long(n.date)}</p>
                            <span className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500">{w.done + 1} of {w.total} this week</span>
                          </div>
                          <p className={`${display.className} text-white font-bold text-[28px] sm:text-[34px] leading-[1.05] tracking-[-0.02em] mb-2`}>{n.title}</p>
                          <p className="text-zinc-300 text-[14px] leading-relaxed mb-1">{META[n.kind].blurb}</p>
                          <p className="text-zinc-500 text-[12px] mb-6">{META[n.kind].length}</p>
                          <button onClick={() => !busy && onNode(n)} disabled={busy}
                            className={`w-full font-bold text-[16px] py-4 rounded-full min-h-[54px] transition-transform hover:scale-[1.01] disabled:opacity-60 ${isCheck ? "bg-emerald-400 text-[#06120d]" : "bg-white text-[#0a0a0f]"}`}>
                            {busy ? "Building your paper…" : isCheck ? "Check my grade →" : "Start →"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ── Done or locked: a quiet row ── */
                      <div className="flex items-center justify-between gap-4 min-h-[46px] mb-6">
                        <div className="min-w-0">
                          <p className={`text-[15px] font-semibold leading-tight ${done ? "text-zinc-200" : isCheck ? "text-emerald-400/60" : "text-zinc-500"}`}>{n.title}</p>
                          <p className="text-[11.5px] text-zinc-600 mt-0.5">{done ? "Done" : `${day(n.date)} ${date(n.date)}`}</p>
                        </div>
                        {done
                          ? <span className="font-mono text-[10.5px] uppercase tracking-wider text-violet-300 shrink-0">done</span>
                          : <svg className="w-4 h-4 text-zinc-700 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></svg>}
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
