"use client";

// The journey: one wavy purple line from the grade check to "Perfect A's".
// The tasks between sit on the line (papers, a mock, fixing the weak spot),
// the completed part glows, and a YOU circle rides the line — it slides
// forward every time a task is done. Tapping the next task starts it.

import { useMemo } from "react";
import { buildJourney, pathPoint, VB, type Step } from "@/lib/journey";

export default function JourneyPath({
  completed, now, exam, hasWeakSpot, destinationLabel, busy, onStep,
}: {
  completed: number;
  now: number;
  exam: number;
  hasWeakSpot: boolean;
  destinationLabel: string;
  busy?: boolean;
  onStep: (step: Step) => void;
}) {
  const steps = useMemo(() => buildJourney({ completed, now, exam, hasWeakSpot, destinationLabel }), [completed, now, exam, hasWeakSpot, destinationLabel]);
  const done = steps.filter((s) => s.state === "done");
  const here = done[done.length - 1] ?? steps[0];
  const next = steps.find((s) => s.state === "next") ?? null;

  // Whole path (dim) and the completed stretch (bright), sampled along the wave.
  const full = useMemo(() => samplePath(0, 1), []);
  const lit = useMemo(() => samplePath(0, here.u), [here.u]);

  return (
    <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="w-full h-auto block select-none" role="img" aria-label="Your path to the top grade">
      <defs>
        <linearGradient id="jp-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <filter id="jp-glow" x="-10%" y="-60%" width="120%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* the road ahead, then the part you've travelled */}
      <path d={full} fill="none" stroke="#7c3aed" strokeOpacity="0.28" strokeWidth="8" strokeLinecap="round" />
      <path d={lit} fill="none" stroke="url(#jp-stroke)" strokeWidth="8" strokeLinecap="round" filter="url(#jp-glow)" style={{ transition: "d 900ms ease" }} />

      {/* steps */}
      {steps.map((s) => {
        const isDest = s.kind === "destination";
        const clickable = s.state === "next" && !busy;
        const r = isDest ? 13 : s.state === "next" ? 9 : 6;
        const fill = s.state === "done" ? "#a78bfa" : s.state === "next" ? "#ffffff" : "#27272a";
        const stroke = s.state === "upcoming" ? "#52525b" : "#0f0f17";
        const dy = s.above ? -1 : 1;
        const titleY = s.above ? s.y - 40 : s.y + 34;
        const subY = s.above ? s.y - 22 : s.y + 52;
        const anchor = s.i === 0 ? "start" : isDest ? "end" : "middle";
        const tx = s.i === 0 ? s.x - 6 : isDest ? s.x + 14 : s.x;
        const titleFill = isDest ? "#34d399" : s.state === "next" ? "#ffffff" : s.state === "done" ? "#a1a1aa" : "#71717a";
        return (
          <g key={s.i} onClick={clickable ? () => onStep(s) : undefined} style={{ cursor: clickable ? "pointer" : "default" }}>
            {isDest && <circle cx={s.x} cy={s.y} r="22" fill="#34d399" fillOpacity="0.18" />}
            {isDest
              ? <circle cx={s.x} cy={s.y} r={r} fill="#34d399" stroke="#0f0f17" strokeWidth="3" />
              : <circle cx={s.x} cy={s.y} r={r} fill={fill} stroke={stroke} strokeWidth="2" />}
            {s.i !== here.i && (
              <>
                <text x={tx} y={titleY + (dy < 0 ? 0 : 0)} fontSize={isDest ? 17 : 15} fontWeight={s.state === "next" || isDest ? 700 : 600} fill={titleFill} textAnchor={anchor}>{s.title}</text>
                {s.sub && <text x={tx} y={subY} fontSize="12.5" fill={s.state === "next" ? "#c4b5fd" : "#71717a"} textAnchor={anchor}>{s.sub}</text>}
              </>
            )}
            {clickable && <text x={s.x} y={s.above ? s.y + 30 : s.y - 22} fontSize="11.5" fontWeight="700" fill="#c4b5fd" textAnchor="middle" style={{ letterSpacing: "0.08em" }}>TAP TO START</text>}
          </g>
        );
      })}

      {/* YOU — slides along the line as tasks get done */}
      <g style={{ transform: `translate(${here.x}px, ${here.y}px)`, transition: "transform 900ms cubic-bezier(.2,.8,.2,1)" }}>
        <circle r="28" fill="#8b5cf6" fillOpacity="0.35" className="sa-pulse-ring" />
        <circle r="18" fill="#8b5cf6" stroke="#ffffff" strokeWidth="3.5" filter="url(#jp-glow)" />
        <text y="4.5" fontSize="12" fontWeight="800" fill="#ffffff" textAnchor="middle">YOU</text>
        {here.i !== 0 && (
          <text y={here.above ? -40 : 38} fontSize="14" fontWeight="600" fill="#e4e4e7" textAnchor="middle">{here.title}</text>
        )}
      </g>
      {next == null && null}
    </svg>
  );
}

function samplePath(u0: number, u1: number, samples = 96): string {
  let d = "";
  for (let k = 0; k <= samples; k++) {
    const u = u0 + (u1 - u0) * (k / samples);
    const p = pathPoint(u);
    d += `${k === 0 ? "M" : " L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  return d;
}
