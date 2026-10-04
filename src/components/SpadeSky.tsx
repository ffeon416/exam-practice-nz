"use client";

// The streak as a night sky ("H · Light up the spade"). Ace's constellation
// is a spade of 13 stars; every night with a marked paper lights the next
// one. Miss a night and the streak is 0, so the sky goes dark again. Finish
// all 13 and the student names the constellation.

import { useEffect, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { msUntilLocalMidnight } from "@/lib/dailyTask";
import { scopedKey } from "@/lib/userScope";

export const SPADE_STARS = 13;
const VIOLET = "#a78bfa";
const NAME_KEY = "studyace-constellation-name";

// The spade, in the order the stars light: tip, down the right side, the
// right lobe, the stem, then back up the left side to the tip.
const STARS: [number, number][] = [
  [259, 43], [382, 166], [491, 304], [491, 434], [382, 500], [295, 449], [338, 623],
  [179, 623], [223, 449], [136, 500], [27, 434], [27, 304], [136, 166],
];

// Background stars: fixed positions (no Math.random → same on server and client).
const DUST = Array.from({ length: 90 }, (_, i) => {
  const r = (n: number) => { const x = Math.sin((i + 1) * n) * 43758.5453; return x - Math.floor(x); };
  return { left: r(12.9898) * 100, top: r(78.233) * 100, size: r(37.719) > 0.82 ? 2.5 : 1.5, o: 0.18 + r(4.581) * 0.5, tw: r(9.17) > 0.86 };
});

export function Constellation({ lit, tonight }: { lit: number; tonight: number | null }) {
  const pts = (a: [number, number][]) => a.map(([x, y]) => `${x},${y}`).join(" ");
  const litPts = STARS.slice(0, lit);
  const complete = lit >= SPADE_STARS;
  const t = tonight != null ? STARS[tonight] : null;
  const from = tonight != null && tonight > 0 ? STARS[tonight - 1] : null;
  return (
    <svg viewBox="-20 0 600 680" className="w-full h-auto max-h-[640px]" role="img" aria-label={`${lit} of ${SPADE_STARS} stars lit`}>
      {/* the whole spade, faint */}
      <polygon points={pts(STARS)} fill="none" stroke="#4a4763" strokeWidth="1.5" strokeDasharray="1.5 7" strokeLinecap="round" />
      {/* the lit stretch */}
      {litPts.length > 1 && (complete
        ? <polygon points={pts(litPts)} fill={`${VIOLET}14`} stroke={VIOLET} strokeWidth="2" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 6px ${VIOLET}99)` }} />
        : <polyline points={pts(litPts)} fill="none" stroke={VIOLET} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${VIOLET}99)` }} />)}
      {/* the line to tonight's star */}
      {t && from && <line x1={from[0]} y1={from[1]} x2={t[0]} y2={t[1]} stroke={VIOLET} strokeWidth="2" strokeDasharray="6 7" strokeLinecap="round" className="sa-dash-flow" />}
      {STARS.map(([x, y], i) => {
        if (i < lit) return (
          <g key={i}>
            <circle cx={x} cy={y} r="17" fill="#2a2550" opacity="0.85" />
            <circle cx={x} cy={y} r="6.5" fill="#ffffff" style={{ filter: "drop-shadow(0 0 8px #ffffff)" }} />
          </g>
        );
        if (i === tonight) return (
          <g key={i}>
            <circle cx={x} cy={y} r="22" fill="none" stroke={VIOLET} strokeWidth="2" opacity="0.6" className="sa-pulse-ring" />
            <circle cx={x} cy={y} r="22" fill="#0b0a16" stroke={VIOLET} strokeWidth="1.5" />
            <circle cx={x} cy={y} r="6" fill={VIOLET} />
            <text x={x + 34} y={y + 4} fontFamily="ui-monospace, Menlo, monospace" fontSize="12" letterSpacing="2.5" fontWeight="700" fill={VIOLET}>TONIGHT</text>
          </g>
        );
        return <circle key={i} cx={x} cy={y} r="4" fill="#4a4763" />;
      })}
    </svg>
  );
}

function useMidnight() {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setMs(msUntilLocalMidnight());
    const id = setTimeout(tick, 0); const iv = setInterval(tick, 30_000);
    return () => { clearTimeout(id); clearInterval(iv); };
  }, []);
  return ms;
}

export default function SpadeSky({ streak, doneToday }: { streak: number; doneToday: boolean }) {
  const ms = useMidnight();
  const lit = Math.min(SPADE_STARS, streak);
  const complete = lit >= SPADE_STARS;
  const tonight = !doneToday && !complete ? lit : null;
  const night = Math.max(1, lit); // as in the design: the count of stars lit, never "night 0"
  const till = ms == null ? null : `${Math.floor(ms / 3.6e6)}h ${String(Math.floor((ms % 3.6e6) / 6e4)).padStart(2, "0")}m till midnight`;
  const dateLine = new Date().toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" });

  // The name, once the spade is complete (kept on this device, per account).
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  useEffect(() => {
    const id = setTimeout(() => { try { setName(localStorage.getItem(scopedKey(NAME_KEY)) ?? ""); } catch { /* storage blocked */ } }, 0);
    return () => clearTimeout(id);
  }, []);
  const saveName = () => {
    const v = draft.trim().slice(0, 32); if (!v) return;
    try { localStorage.setItem(scopedKey(NAME_KEY), v); } catch { /* storage blocked */ }
    setName(v);
  };

  const headline = complete ? (name || "The spade is lit.") : lit === 0 ? "No stars lit yet." : `${lit} star${lit === 1 ? "" : "s"} lit.`;

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5 sm:mb-6">
        <div>
          <p className="font-mono text-[11px] sm:text-[12px] uppercase tracking-[0.22em] text-zinc-500" suppressHydrationWarning>Streak · {dateLine}</p>
          <h1 className={`${display.className} font-bold text-white text-[34px] sm:text-[44px] leading-none tracking-[-0.04em] mt-2`}>Light up the spade</h1>
        </div>
        {till && (
          <span className="inline-flex items-center gap-2.5 rounded-full px-4 py-2.5 font-mono font-bold text-[11px] sm:text-[12px] uppercase tracking-[0.18em]" style={{ color: VIOLET, background: `${VIOLET}1f` }}>
            <span className={`w-2 h-2 rounded-full ${doneToday ? "" : "animate-pulse"}`} style={{ background: VIOLET }} />{till}
          </span>
        )}
      </div>

      {/* The sky */}
      <div className="relative rounded-[28px] border border-white/[0.08] bg-[#05050b] overflow-clip">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {DUST.map((d, i) => (
            <span key={i} className="absolute rounded-full bg-white" style={{ left: `${d.left}%`, top: `${d.top}%`, width: d.size, height: d.size, opacity: d.o, animation: d.tw ? `sa-ace-twinkle ${3 + (i % 4)}s ease-in-out ${i % 5}s infinite` : undefined }} />
          ))}
        </div>
        <div className="relative grid grid-cols-1 lg:grid-cols-2 items-center gap-6 lg:gap-4 p-6 sm:p-10 lg:p-14 lg:min-h-[640px]">
          <div className="home-rise">
            <p className="font-mono font-bold text-[12px] sm:text-[13px] uppercase tracking-[0.24em]" style={{ color: VIOLET }}>Night {night} of {SPADE_STARS}</p>
            <h2 className={`${display.className} font-bold text-white text-[52px] sm:text-[76px] lg:text-[92px] leading-[0.95] tracking-[-0.05em] mt-4`}>{headline}</h2>
            <p className="text-zinc-300 text-[17px] sm:text-[20px] leading-relaxed mt-6 max-w-md">
              {complete
                ? name ? "Thirteen nights in a row. Keep lighting it: one paper a night holds the whole sky." : "Thirteen nights in a row. Ace's constellation is yours to name."
                : <>Light one star every night. Finish all {SPADE_STARS} and Ace&apos;s constellation is yours to name.</>}
            </p>
            <p className="text-zinc-500 text-[15px] mt-5">{streak > SPADE_STARS ? `${streak} nights running. ` : ""}Miss a night and the sky goes dark again.</p>

            {complete && !name ? (
              <div className="flex flex-wrap gap-3 mt-7">
                <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") saveName(); }} maxLength={32} placeholder="Name your constellation" aria-label="Name your constellation"
                  className="rounded-full bg-white/[0.06] border border-white/[0.14] focus:border-white/40 outline-none text-white text-[17px] px-6 min-h-[60px] w-full max-w-[300px]" />
                <button onClick={saveName} className="font-bold text-[18px] px-8 rounded-full min-h-[60px] text-[#0a0a0f] transition-transform hover:scale-[1.03]" style={{ background: VIOLET, boxShadow: `0 0 40px ${VIOLET}55` }}>Name it →</button>
              </div>
            ) : (
              <Link href="/schedule" className="inline-flex items-center font-bold text-[18px] sm:text-[19px] px-8 sm:px-9 rounded-full min-h-[60px] mt-7 text-[#0a0a0f] transition-transform hover:scale-[1.03]" style={{ background: doneToday ? "#ffffff" : VIOLET, boxShadow: doneToday ? undefined : `0 0 40px ${VIOLET}55` }}>
                {doneToday ? "Tonight's star is lit. See tomorrow →" : "Light tonight's star →"}
              </Link>
            )}
          </div>
          <div className="lg:pl-8">
            <Constellation lit={lit} tonight={tonight} />
          </div>
        </div>
      </div>
    </>
  );
}
