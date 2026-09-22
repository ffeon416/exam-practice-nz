"use client";

// The heartbeat. One wavy purple line from the grade check to the goal, in
// two-week sprints. The current sprint's tasks are on the line with labels;
// other sprints show only their closing grade check. The travelled part
// glows and YOU slides forward as tasks get done. Tap the next task to do it.

import { useMemo } from "react";
import { buildJourney, samplePath, trackerStep, VB, type Step } from "@/lib/journey";

export default function JourneyPath({
  baseline, now, exam, completed, hasWeakSpot, goalLabel, busy, onStep,
}: {
  baseline: number; now: number; exam: number; completed: number;
  hasWeakSpot: boolean; goalLabel: string; busy?: boolean;
  onStep: (step: Step) => void;
}) {
  const { steps, sprints, current } = useMemo(
    () => buildJourney({ baseline, now, exam, completed, hasWeakSpot, goalLabel }),
    [baseline, now, exam, completed, hasWeakSpot, goalLabel]
  );
  const here = trackerStep(steps);
  const full = useMemo(() => samplePath(0, 1), []);
  const lit = useMemo(() => samplePath(0, here.u), [here.u]);
  const K = sprints.length;

  return (
    <div>
      <svg viewBox={`0 0 ${VB.w} ${VB.h}`} className="w-full h-auto block select-none lg:max-h-[calc(100vh-340px)] lg:min-h-[440px]" role="img" aria-label="Your path to your goal grade">
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

        {/* sprint bands along the bottom: current one lit */}
        {sprints.map((sp) => {
          const x0 = VB.padX + (sp.k / K) * (VB.w - VB.padX * 2);
          const x1 = VB.padX + ((sp.k + 1) / K) * (VB.w - VB.padX * 2);
          return (
            <g key={sp.k}>
              <line x1={x0 + 6} x2={x1 - 6} y1={VB.h - 26} y2={VB.h - 26} stroke={sp.state === "current" ? "#a78bfa" : "#3f3f46"} strokeOpacity={sp.state === "done" ? 0.5 : 1} strokeWidth="3" strokeLinecap="round" />
              <text x={(x0 + x1) / 2} y={VB.h - 8} fontSize="11" fill={sp.state === "current" ? "#c4b5fd" : "#71717a"} textAnchor="middle" fontWeight={sp.state === "current" ? 700 : 500} style={{ letterSpacing: "0.06em" }}>
                {sp.state === "current" ? `SPRINT ${sp.k + 1} · ${sp.done}/${sp.total}` : `SPRINT ${sp.k + 1}`}
              </text>
            </g>
          );
        })}

        {/* the road, then the part travelled */}
        <path d={full} fill="none" stroke="#7c3aed" strokeOpacity="0.28" strokeWidth="8" strokeLinecap="round" />
        <path d={lit} fill="none" stroke="url(#jp-stroke)" strokeWidth="8" strokeLinecap="round" filter="url(#jp-glow)" />

        {/* steps */}
        {steps.map((s) => {
          const isDest = s.kind === "destination";
          const isCheck = s.kind === "check";
          const clickable = s.state === "next" && !busy && !isDest;
          if (!s.labelled) {
            // Other sprints' tasks: a faint tick only.
            return <circle key={s.i} cx={s.x} cy={s.y} r="3" fill={s.state === "done" ? "#a78bfa" : "#3f3f46"} />;
          }
          const r = isDest ? 13 : isCheck ? 9 : s.state === "next" ? 9 : 6;
          const fill = s.state === "done" ? "#a78bfa" : s.state === "next" ? "#ffffff" : isCheck ? "#18181b" : "#27272a";
          const stroke = isCheck && s.state !== "done" ? "#a78bfa" : s.state === "upcoming" ? "#52525b" : "#0f0f17";
          const titleY = s.above ? s.y - 40 : s.y + 34;
          const subY = s.above ? s.y - 22 : s.y + 52;
          const anchor = s.i === 0 ? "start" : isDest ? "end" : "middle";
          const tx = s.i === 0 ? s.x - 6 : isDest ? s.x + 14 : s.x;
          const titleFill = isDest ? "#34d399" : s.state === "next" ? "#ffffff" : isCheck ? "#c4b5fd" : s.state === "done" ? "#a1a1aa" : "#71717a";
          return (
            <g key={s.i} onClick={clickable ? () => onStep(s) : undefined} style={{ cursor: clickable ? "pointer" : "default" }}>
              {isDest && <circle cx={s.x} cy={s.y} r="22" fill="#34d399" fillOpacity="0.18" />}
              {isDest
                ? <circle cx={s.x} cy={s.y} r={r} fill="#34d399" stroke="#0f0f17" strokeWidth="3" />
                : <circle cx={s.x} cy={s.y} r={r} fill={fill} stroke={stroke} strokeWidth={isCheck ? 2.5 : 2} />}
              {s.i !== here.i && (
                <>
                  <text x={tx} y={titleY} fontSize={isDest ? 17 : 15} fontWeight={s.state === "next" || isDest || isCheck ? 700 : 600} fill={titleFill} textAnchor={anchor}>{s.title}</text>
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
          {here.i !== 0 && <text y={here.above ? -40 : 38} fontSize="14" fontWeight="600" fill="#e4e4e7" textAnchor="middle">{here.title}</text>}
        </g>
      </svg>
      <p className="sr-only">Sprint {current.k + 1} of {K}, {current.done} of {current.total} tasks done.</p>
    </div>
  );
}
