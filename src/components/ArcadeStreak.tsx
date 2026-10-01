"use client";

// The streak as an arcade combo screen. Ace in pixels, the streak as a
// combo multiplier, a timer that runs out at midnight (your time), the last
// seven days as spades, and one button: play tonight's paper.

import { useEffect, useState } from "react";
import Link from "next/link";
import { Press_Start_2P } from "next/font/google";
import { ACE_MOOD, moodForStreak, nextMoodStep, type AceMood } from "@/components/AceMascot";
import { msUntilLocalMidnight } from "@/lib/dailyTask";

const pixel = Press_Start_2P({ weight: "400", subsets: ["latin"], display: "swap" });

const CYAN = "#4df0ff", MAGENTA = "#ff4fd8", YELLOW = "#ffd23f", BG = "#0d0b1a", FRAME = "#6b5bd2", DIM = "#2a2540";
const BONUS_LINE: Record<number, string> = { 1: "Ace wakes up", 3: "Ace comes right", 7: "Ace catches fire", 14: "Full noise" };
const ACE_COLOR: Record<AceMood, string> = { 0: "#5a5a6e", 1: "#3b9fae", 2: CYAN, 3: CYAN, 4: YELLOW };
const ACE_GLOW: Record<AceMood, string> = { 0: "transparent", 1: "transparent", 2: `${CYAN}55`, 3: `${YELLOW}88`, 4: `${MAGENTA}aa` };

// Ace, 15 × 16 pixels. 1 = body, 2 = eye.
const ACE_MAP = [
  "000000010000000",
  "000000111000000",
  "000001111100000",
  "000011111110000",
  "000111111111000",
  "001111111111100",
  "011111111111110",
  "111112111211111",
  "111111111111111",
  "111111111111111",
  "011111111111110",
  "001111101111100",
  "000000010000000",
  "000000111000000",
  "000001111100000",
  "000011111110000",
];
export function PixelAce({ size = 220, color = CYAN, glow = "transparent", className = "" }: { size?: number; color?: string; glow?: string; className?: string }) {
  const w = ACE_MAP[0].length, h = ACE_MAP.length;
  return (
    <svg width={size} height={(size * h) / w} viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" className={className} style={{ filter: glow === "transparent" ? undefined : `drop-shadow(0 0 10px ${glow})` }} aria-hidden>
      {ACE_MAP.flatMap((row, y) => [...row].map((c, x) => c === "0" ? null : <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill={c === "2" ? BG : color} />))}
    </svg>
  );
}

function useMidnight() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilLocalMidnight());
    const id = setTimeout(tick, 0); const iv = setInterval(tick, 1000);
    return () => { clearTimeout(id); clearInterval(iv); };
  }, []);
  return ms;
}

export default function ArcadeStreak({
  name, streak, best, days, doneToday,
}: {
  name: string;
  streak: number;
  best: number;
  /** Last 7 days, oldest first. */
  days: { key: string; done: boolean; isToday: boolean }[];
  doneToday: boolean;
}) {
  const ms = useMidnight();
  const pad = (n: number) => String(n).padStart(2, "0");
  const time = ms == null ? "--:--:--" : `${pad(Math.floor(ms / 3.6e6))}:${pad(Math.floor((ms % 3.6e6) / 6e4))}:${pad(Math.floor((ms % 6e4) / 1000))}`;
  const elapsed = ms == null ? 0 : 1 - ms / 864e5; // fraction of today gone
  const segs = 24;
  const filled = Math.min(segs, Math.floor(elapsed * segs));
  const mood = moodForStreak(streak);
  const step = nextMoodStep(streak);
  const nextBonus = step.next != null ? step.next : null;
  const urgent = !doneToday && ms != null && ms < 3 * 3.6e6;
  const label = `${pixel.className} uppercase leading-[1.35]`;

  return (
    <div className="relative rounded-sm border-[3px] overflow-hidden" style={{ borderColor: FRAME, background: BG, boxShadow: `0 0 0 1px ${FRAME}55, 0 0 40px ${FRAME}33` }}>
      {/* scanlines */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px)" }} aria-hidden />
      <div className="relative px-5 sm:px-10 lg:px-12 py-6 sm:py-10">
        {/* HUD */}
        <div className={`${label} grid grid-cols-3 text-[9px] sm:text-[12px] lg:text-[14px]`}>
          <div style={{ color: CYAN }}>1UP<br />{name}</div>
          <div className="text-center" style={{ color: YELLOW }}>Best<br />x{best}</div>
          <div className="text-right" style={{ color: urgent ? YELLOW : MAGENTA }}>Time<br /><span className="tabular-nums">{time}</span></div>
        </div>

        {/* Ace + combo */}
        <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-6 sm:gap-10 lg:gap-14 items-center mt-10 sm:mt-14">
          <div className="justify-self-center sm:justify-self-start">
            <PixelAce size={200} color={ACE_COLOR[mood]} glow={ACE_GLOW[mood]} className={mood === 0 ? "" : "sa-ace-breathe"} />
          </div>
          <div className="text-center sm:text-left">
            <p className={`${label} text-[14px] sm:text-[20px] lg:text-[24px]`} style={{ color: YELLOW }}>Combo</p>
            <p className={`${pixel.className} text-[56px] sm:text-[84px] lg:text-[110px] leading-none mt-3 ${streak === 0 ? "" : "sa-arcade-glow"}`} style={{ color: streak === 0 ? DIM : MAGENTA }}>x{streak}</p>
            <p className={`${label} text-[9px] sm:text-[12px] lg:text-[14px] mt-5`} style={{ color: CYAN }}>
              {nextBonus != null
                ? <>Next bonus at x{nextBonus}:<br />{BONUS_LINE[nextBonus] ?? ACE_MOOD[moodForStreak(nextBonus)].name}</>
                : <>Max combo.<br />{ACE_MOOD[mood].name}</>}
            </p>
          </div>
        </div>

        {/* Combo timer */}
        <div className="mt-12 sm:mt-16">
          <div className={`${label} flex justify-between text-[8px] sm:text-[11px] lg:text-[12px]`} style={{ color: MAGENTA }}>
            <span>Combo<br />timer</span>
            <span className="text-right">Drops at<br />midnight</span>
          </div>
          <div className="mt-2 p-1 border-2 grid gap-[3px]" style={{ borderColor: FRAME, gridTemplateColumns: `repeat(${segs}, minmax(0, 1fr))` }} role="progressbar" aria-valuenow={filled} aria-valuemax={segs} aria-label="Time left today">
            {Array.from({ length: segs }, (_, i) => (
              <span key={i} className="h-6 sm:h-7 block" style={{ background: i < filled ? (urgent ? YELLOW : MAGENTA) : "#1a1630" }} />
            ))}
          </div>
        </div>

        {/* This week + play */}
        <div className="flex items-end justify-between gap-6 flex-wrap mt-12 sm:mt-16">
          <div>
            <p className={`${label} text-[9px] sm:text-[11px] lg:text-[12px]`} style={{ color: CYAN }}>This week</p>
            <div className="flex gap-3 sm:gap-4 mt-3">
              {days.map((d) => (
                <PixelAce key={d.key} size={38} color={d.done ? CYAN : d.isToday ? MAGENTA : DIM} className={d.isToday && !d.done ? "sa-arcade-blink" : ""} />
              ))}
            </div>
          </div>
          <Link href="/schedule" className={`${label} inline-block text-[10px] sm:text-[13px] lg:text-[15px] px-6 sm:px-8 py-4 sm:py-5 text-center transition-transform hover:translate-x-[2px] hover:translate-y-[2px]`}
            style={{ background: YELLOW, color: "#1a1200", boxShadow: `6px 6px 0 ${MAGENTA}` }}>
            {doneToday ? <>▶ Done.<br />See tomorrow</> : <>▶ Play<br />tonight&apos;s<br />paper</>}
          </Link>
        </div>
      </div>
    </div>
  );
}
