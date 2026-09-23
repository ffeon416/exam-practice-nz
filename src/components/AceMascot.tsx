"use client";

// Ace — the StudyAce spade. He's only as healthy as your streak. Five moods:
// flat out (0 days), a bit rough (1–2), coming right (3–6), buzzing (7–13),
// full noise (14+). Pure SVG, transform-only animation.

export type AceMood = 0 | 1 | 2 | 3 | 4;

export function moodForStreak(days: number): AceMood {
  return days <= 0 ? 0 : days <= 2 ? 1 : days <= 6 ? 2 : days <= 13 ? 3 : 4;
}

export const ACE_MOOD: Record<AceMood, { name: string; line: string; sub: string }> = {
  0: { name: "Flat out", line: "Ace is flat out.", sub: "One paper tonight and he's back on his feet." },
  1: { name: "Bit rough", line: "Ace is a bit rough.", sub: "Colour's creeping back. Don't skip tomorrow." },
  2: { name: "Coming right", line: "Ace is coming right.", sub: "Back on his feet. Keep it going." },
  3: { name: "Buzzing", line: "Ace is buzzing.", sub: "One task a day keeps him like this." },
  4: { name: "Full noise", line: "Ace is full noise.", sub: "Peak Ace. Don't be the one who lets him down." },
};

const BODY: Record<AceMood, [string, string]> = {
  0: ["#5a5a64", "#34343c"],
  1: ["#6f679f", "#4a4472"],
  2: ["#8f80f5", "#5c40d6"],
  3: ["#a493ff", "#6c41ea"],
  4: ["#b8a9ff", "#7c4dff"],
};

// Classic spade: inverted heart with a flared stem. Drawn in a 100×100 box.
const SPADE = "M50 4 C50 4 10 38 10 61 C10 78 25 87 38 81 C44 78 47 73 48 70 C46 83 40 92 31 97 L69 97 C60 92 54 83 52 70 C53 73 56 78 62 81 C75 87 90 78 90 61 C90 38 50 4 50 4 Z";
const STAR = "M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z";

/** Thresholds where Ace's mood changes. */
export const ACE_STEPS = [1, 3, 7, 14] as const;
export function nextMoodStep(days: number): { next: number | null; prev: number; toGo: number; progress: number } {
  const next = ACE_STEPS.find((s) => s > days) ?? null;
  const prev = [...ACE_STEPS].reverse().find((s) => s <= days) ?? 0;
  if (next == null) return { next: null, prev, toGo: 0, progress: 1 };
  return { next, prev, toGo: next - days, progress: Math.max(0, Math.min(1, (days - prev) / (next - prev))) };
}

export const MOOD_COLOR: Record<AceMood, string> = { 0: "#7a7a88", 1: "#8b83c4", 2: "#8f80f5", 3: "#a78bfa", 4: "#c4b5fd" };

export default function AceMascot({ mood, size = 72, className = "", onPoke }: { mood: AceMood; size?: number; className?: string; onPoke?: () => void }) {
  const [top, bottom] = BODY[mood];
  const gid = `ace-body-${mood}`;
  const ink = mood === 0 ? "#1d1d24" : "#171325";
  const eyeR = mood <= 1 ? 4.5 : mood === 2 ? 5 : 5.6;

  return (
    <svg width={size} height={size * (130 / 120)} viewBox="0 0 120 130" className={className} role="img" aria-label={`Ace: ${ACE_MOOD[mood].name}`} onClick={onPoke} style={onPoke ? { cursor: "pointer" } : undefined}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={bottom} /></linearGradient>
        <radialGradient id="ace-glow"><stop offset="0" stopColor="#b8a9ff" stopOpacity="0.55" /><stop offset="1" stopColor="#b8a9ff" stopOpacity="0" /></radialGradient>
      </defs>
      {mood === 4 && <circle cx="60" cy="66" r="58" fill="url(#ace-glow)" className="sa-ace-glow" />}
      {mood >= 3 && (
        <g className="sa-ace-sparks" fill={mood === 4 ? "#fff2c4" : "#d9d1ff"}>
          <path d={STAR} transform="translate(18 34)" />
          <path d={STAR} transform="translate(104 48) scale(0.8)" />
          {mood === 4 && <path d={STAR} transform="translate(100 18) scale(1.1)" />}
          {mood === 4 && <path d={STAR} transform="translate(24 96) scale(0.7)" />}
        </g>
      )}
      {mood === 0 && (
        <g className="sa-ace-z" fill="#9a9aa6" fontFamily="ui-sans-serif, system-ui" fontWeight="800">
          <text x="92" y="34" fontSize="13">z</text>
          <text x="102" y="22" fontSize="9">z</text>
        </g>
      )}
      <g className={mood === 0 ? "sa-ace-slump" : "sa-ace-breathe"} style={{ transformOrigin: "60px 108px" }}>
        <g transform={mood === 0 ? "rotate(9 60 80) translate(0 6)" : undefined}>
          <path d={SPADE} transform="translate(10 12)" fill={`url(#${gid})`} />
          {/* Face */}
          {mood === 0 ? (
            <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M40 60 q6 5 12 0" /><path d="M68 60 q6 5 12 0" />
              <path d="M52 78 q8 -4 16 0" />
            </g>
          ) : (
            <g>
              {/* eyes */}
              <g className="sa-ace-blink" style={{ transformOrigin: "60px 58px" }}>
                <circle cx="46" cy="58" r={eyeR} fill={ink} /><circle cx="74" cy="58" r={eyeR} fill={ink} />
                <circle cx="48" cy="56" r="1.8" fill="#fff" /><circle cx="76" cy="56" r="1.8" fill="#fff" />
              </g>
              {mood === 1 && <><rect x="39" y="50" width="15" height="6" fill={`url(#${gid})`} /><rect x="67" y="50" width="15" height="6" fill={`url(#${gid})`} /></>}
              {/* mouth */}
              {mood === 1 && <path d="M52 78 q8 -5 16 0" stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none" />}
              {mood === 2 && <path d="M52 74 q8 6 16 0" stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none" />}
              {mood === 3 && <path d="M48 72 q12 12 24 0" stroke={ink} strokeWidth="3.2" strokeLinecap="round" fill="none" />}
              {mood === 4 && <><path d="M45 70 q15 18 30 0 Z" fill={ink} /><ellipse cx="60" cy="80" rx="6" ry="3.2" fill="#ff8fb1" /></>}
              {/* cheeks */}
              {mood >= 3 && <><ellipse cx="34" cy="68" rx="6" ry="3.4" fill="#ff8fb1" opacity="0.75" /><ellipse cx="86" cy="68" rx="6" ry="3.4" fill="#ff8fb1" opacity="0.75" /></>}
            </g>
          )}
          {mood === 1 && <path d="M92 40 q-6 10 0 13 q6 -3 0 -13 z" fill="#9fd3ff" className="sa-ace-drop" />}
        </g>
      </g>
    </svg>
  );
}
