"use client";

// StudyAce's path: a vertical timeline. A thin rail runs down the left —
// the part you've travelled glows in the brand gradient — and each task is
// a row beside it. Today's task is the one real card on the screen, with
// the Start button; done tasks fold to a line; locked ones sit dim until
// you reach them. Week headers use the app's mono label style.

import { display } from "@/lib/displayFont";
import type { DayNode, PlanWeek } from "@/lib/dailyPlan";

const KIND_META: Record<DayNode["kind"], { blurb: string; length: string }> = {
  check: { blurb: "Eight questions, marked properly. Sets where you are this week.", length: "8 questions · about 15 min" },
  paper: { blurb: "A fresh paper in your exam's style, marked the moment you finish.", length: "8 questions · about 15 min" },
  fix: { blurb: "A paper built on the one thing losing you the most marks.", length: "8 questions · about 15 min" },
  mock: { blurb: "Timed, full length, no feedback until the end. Like the real day.", length: "12 questions · timed" },
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
          <section key={w.k} className={`mb-8 ${w.state === "locked" ? "opacity-60" : ""}`}>
            {/* Week header */}
            <div className="flex items-end justify-between gap-4 pb-3 mb-1 border-b border-white/[0.06]">
              <div>
                <p className={`font-mono text-[10.5px] uppercase tracking-[0.14em] ${current ? "text-indigo-300" : "text-zinc-500"}`}>Week {w.k + 1} · {date(w.start)}</p>
                <p className="text-zinc-400 text-[13px] mt-1">{w.state === "locked" ? "Planned after your next grade check." : w.note}</p>
              </div>
              <p className={`${display.className} font-bold text-[20px] leading-none tabular-nums ${current ? "text-white" : "text-zinc-500"}`}>{w.done}<span className="text-zinc-600 text-[14px]">/{w.total}</span></p>
            </div>

            {/* Timeline */}
            <ol className="relative">
              {w.nodes.map((n, j) => {
                const done = n.state === "done", cur = n.state === "current";
                const isCheck = n.kind === "check";
                const last = j === w.nodes.length - 1;
                const railColor = done ? "linear-gradient(180deg,#a78bfa,#7c3aed)" : "rgba(255,255,255,0.08)";
                return (
                  <li key={n.i} className="relative pl-12">
                    {/* rail segment below this node */}
                    {!last && <span className="absolute left-[15px] top-6 bottom-0 w-[2px]" style={{ background: railColor, boxShadow: done ? "0 0 12px rgba(139,92,246,0.55)" : "none" }} aria-hidden />}
                    {/* node */}
                    <span className="absolute left-0 top-[6px] w-8 h-8 flex items-center justify-center" aria-hidden>
                      {cur && <span className="absolute w-8 h-8 rounded-full bg-violet-400/40 sa-pulse-ring" />}
                      <span className={`relative rounded-full ${
                        done ? "w-3.5 h-3.5 bg-violet-400 shadow-[0_0_10px_rgba(167,139,250,0.8)]"
                        : cur ? "w-4 h-4 bg-white ring-4 ring-violet-500/40"
                        : `w-3 h-3 border-2 ${isCheck ? "border-emerald-500/50" : "border-zinc-600"} bg-[#06060a]`
                      }`} />
                    </span>

                    {cur ? (
                      /* ── Today's task: the one card ── */
                      <div className={`mb-6 rounded-[24px] border p-5 sm:p-6 ${isCheck ? "border-emerald-400/35 bg-gradient-to-br from-emerald-500/[0.10] to-transparent" : "border-indigo-400/35 bg-gradient-to-br from-indigo-500/[0.12] to-violet-500/[0.04]"}`}>
                        <p className={`font-mono text-[10.5px] uppercase tracking-[0.14em] mb-1.5 ${isCheck ? "text-emerald-300" : "text-indigo-300"}`}>Today · {long(n.date)}</p>
                        <p className={`${display.className} text-white font-bold text-[24px] sm:text-[28px] leading-tight tracking-[-0.02em] mb-1.5`}>{n.title}</p>
                        <p className="text-zinc-400 text-[13.5px] leading-relaxed mb-1">{KIND_META[n.kind].blurb}</p>
                        <p className="text-zinc-600 text-[12px] mb-5">{KIND_META[n.kind].length}</p>
                        <button onClick={() => !busy && onNode(n)} disabled={busy}
                          className="w-full bg-white text-[#0a0a0f] font-bold text-[16px] py-4 rounded-full min-h-[52px] hover:scale-[1.01] transition-transform disabled:opacity-60">
                          {busy ? "Building your paper…" : "Start →"}
                        </button>
                      </div>
                    ) : (
                      /* ── Done or locked: a quiet row ── */
                      <div className="flex items-center justify-between gap-4 py-2.5 mb-2 min-h-[44px]">
                        <div className="min-w-0">
                          <p className={`text-[14.5px] font-semibold leading-tight ${done ? "text-zinc-300" : isCheck ? "text-emerald-400/70" : "text-zinc-500"}`}>{n.title}</p>
                          <p className="text-[11.5px] text-zinc-600 mt-0.5">{done ? "Done" : `${day(n.date)} ${date(n.date)}`}</p>
                        </div>
                        {done ? (
                          <span className="font-mono text-[10.5px] uppercase tracking-wider text-violet-300 shrink-0">✓ done</span>
                        ) : (
                          <svg className="w-4 h-4 text-zinc-700 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 118 0v3" /></svg>
                        )}
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
