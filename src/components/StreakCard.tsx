"use client";

// Ace on his stage. He's only as healthy as the streak: flat out at zero,
// full noise at a fortnight. Tap him and he reacts.

import { useState } from "react";
import { display } from "@/lib/displayFont";
import AceMascot, { ACE_MOOD, MOOD_COLOR, moodForStreak, nextMoodStep } from "@/components/AceMascot";

export default function StreakCard({
  streak, days, celebrate, size = 196,
}: {
  streak: number;
  days: { key: string; done: boolean; isToday: boolean; label: string }[];
  celebrate?: boolean;
  /** Ace's size in px. */
  size?: number;
}) {
  const [poked, setPoked] = useState(false);
  const mood = moodForStreak(streak); const m = ACE_MOOD[mood]; const c = MOOD_COLOR[mood]; const step = nextMoodStep(streak);
  const nextName = step.next != null ? ACE_MOOD[moodForStreak(step.next)].name : null;
  const stage = Math.round(size * 1.07);

  return (
    <div className="sa-gold" style={{ "--sa-r": "24px" } as React.CSSProperties}>
      <div className="relative bg-[#0e0f13] p-5 sm:p-7 overflow-hidden">
        {/* mood wash */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(70% 55% at 50% 38%, ${c}${mood === 0 ? "14" : "2e"} 0%, transparent 70%)` }} aria-hidden />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500">Streak</p>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full" style={{ color: c, background: `${c}1f` }}>{m.name}</span>
          </div>
          {/* stage */}
          <div className="relative flex justify-center pt-4 pb-2">
            <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none sa-stage" style={{ width: stage, height: stage, background: `radial-gradient(circle, ${c}${mood === 0 ? "22" : "55"} 0%, transparent 62%)` }} aria-hidden />
            <div className="absolute left-1/2 bottom-3 -translate-x-1/2 h-[14px] rounded-[50%] pointer-events-none" style={{ width: Math.round(size * 0.6), background: "radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)" }} aria-hidden />
            <div className={poked ? "sa-ace-poke" : ""} onAnimationEnd={() => setPoked(false)}>
              <AceMascot mood={mood} size={size} onPoke={() => setPoked(true)} />
            </div>
          </div>
          <div className="text-center mt-1">
            <p className={`${display.className} font-bold leading-none tracking-[-0.04em] ${streak > 0 ? "text-white" : "text-zinc-500"}`}>
              <span className="text-[72px] sm:text-[88px]">{streak}</span> <span className="text-[16px] text-zinc-400 font-semibold tracking-normal">day{streak === 1 ? "" : "s"}</span>
            </p>
            <p className={`${display.className} font-bold text-[20px] sm:text-[24px] tracking-[-0.01em] mt-2`} style={{ color: c }}>{m.line}</p>
            <p className="text-zinc-400 text-[13px] sm:text-[14px] mt-1">{m.sub}</p>
          </div>
          {/* next mood */}
          <div className="mt-5 max-w-md mx-auto">
            <div className="flex items-center justify-between text-[12px] mb-1.5">
              <span className="text-zinc-400">{nextName ? <>Next: <span className="text-white font-semibold">{nextName}</span></> : <span className="text-white font-semibold">Peak Ace</span>}</span>
              <span className="font-mono text-[11px] text-zinc-500">{step.next != null ? `${step.toGo} day${step.toGo === 1 ? "" : "s"} to go` : `${streak} days`}</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.round(step.progress * 100)}%`, background: `linear-gradient(90deg, ${c}, #fff2c4)`, boxShadow: `0 0 12px ${c}88` }} />
            </div>
          </div>
          <div className="flex gap-1 mt-4 max-w-md mx-auto">
            {days.map((d) => (
              <span key={d.key} title={d.key} className={`flex-1 h-5 rounded-md ${d.done ? "bg-gradient-to-b from-indigo-400 to-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.6)]" : d.isToday ? "border border-white/40" : "bg-white/[0.06]"} ${d.isToday && d.done && celebrate ? "sa-block-snap" : ""}`} />
            ))}
          </div>
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-600 mt-2">Last 14 days</p>
        </div>
      </div>
    </div>
  );
}
