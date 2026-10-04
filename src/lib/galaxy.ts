// The streak as a galaxy. Every night with a marked paper lights one star.
// Stars fill a constellation; a finished constellation is kept forever and
// the next one begins. A missed night darkens only the constellation in
// progress. Everything here is worked out from the dates of marked papers,
// so it is the same on every device.

export type Star = [number, number];
export type ConstellationDef = {
  id: string;
  /** "the Spade" — reads after "Light up …" */
  name: string;
  color: string;
  /** Stars in the order they light, in a 520 × 670 box. */
  stars: Star[];
  /** Lines between stars (indices). */
  edges: [number, number][];
  /** Star indices that outline a closed shape, filled once complete. */
  fill?: number[];
};

const ring = (n: number): [number, number][] => Array.from({ length: n }, (_, i) => [i, (i + 1) % n] as [number, number]);
const chain = (from: number, to: number): [number, number][] => Array.from({ length: to - from }, (_, i) => [from + i, from + i + 1] as [number, number]);
const seq = (n: number) => Array.from({ length: n }, (_, i) => i);

export const CONSTELLATIONS: ConstellationDef[] = [
  {
    id: "spade", name: "the Spade", color: "#a78bfa",
    stars: [[259, 43], [382, 166], [491, 304], [491, 434], [382, 500], [295, 449], [338, 623], [179, 623], [223, 449], [136, 500], [27, 434], [27, 304], [136, 166]],
    edges: ring(13), fill: seq(13),
  },
  {
    id: "tick", name: "the Tick", color: "#3ee6a0",
    stars: [[40, 360], [105, 440], [170, 520], [250, 415], [330, 310], [410, 205], [490, 100]],
    edges: chain(0, 6),
  },
  {
    id: "aplus", name: "the A+", color: "#fbbf24",
    stars: [[30, 580], [85, 440], [140, 300], [195, 150], [250, 300], [305, 440], [360, 580], [440, 170], [440, 250], [440, 330], [360, 250], [520, 250]],
    edges: [...chain(0, 6), [1, 5], [7, 8], [8, 9], [10, 8], [8, 11]],
  },
  {
    id: "flag", name: "the Flag", color: "#ff6b7a",
    stars: [[140, 630], [140, 510], [140, 390], [140, 280], [140, 170], [140, 60], [290, 105], [440, 170], [290, 235]],
    edges: [...chain(0, 8), [8, 3]],
  },
  {
    id: "pencil", name: "the Pencil", color: "#7dd3fc",
    stars: [[60, 610], [95, 495], [245, 345], [395, 195], [435, 155], [505, 225], [465, 265], [315, 415], [165, 565]],
    edges: [...ring(9), [3, 6], [1, 8]], fill: seq(9),
  },
  {
    id: "flame", name: "the Flame", color: "#fb923c",
    stars: [[250, 50], [330, 165], [410, 285], [440, 410], [395, 530], [300, 600], [200, 600], [110, 530], [75, 410], [130, 300], [215, 215]],
    edges: ring(11), fill: seq(11),
  },
  {
    id: "book", name: "the Book", color: "#8b8cf8",
    stars: [[260, 215], [150, 170], [40, 195], [40, 365], [40, 535], [150, 510], [260, 555], [370, 510], [480, 535], [480, 365], [480, 195], [370, 170]],
    edges: [...ring(12), [0, 6]], fill: seq(12),
  },
  {
    id: "crown", name: "the Crown", color: "#ffd23f",
    stars: [[70, 550], [165, 550], [260, 550], [355, 550], [450, 550], [470, 395], [490, 235], [375, 355], [260, 130], [145, 355], [30, 235], [50, 395]],
    edges: ring(12), fill: seq(12),
  },
];

/** The nth constellation a student works on (0-based). After the eighth the set comes round again. */
export function constellationAt(ordinal: number): ConstellationDef & { lap: number; title: string } {
  const def = CONSTELLATIONS[ordinal % CONSTELLATIONS.length];
  const lap = Math.floor(ordinal / CONSTELLATIONS.length);
  const base = def.name.replace(/^the /, "The ");
  return { ...def, lap, title: lap === 0 ? base : `${base} ${"I".repeat(Math.min(3, lap + 1))}` };
}

export type Galaxy = {
  /** Finished constellations, oldest first. */
  completed: { ordinal: number; date: string }[];
  /** The constellation in progress and how many of its stars are lit. */
  ordinal: number;
  lit: number;
  doneToday: boolean;
  /** Stars that went dark because last night was missed (0 if none). */
  lostLastNight: number;
  totalNights: number;
  bestRun: number;
};

const next = (key: string): string => { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() + 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/** `dates` and `today` are local date keys (YYYY-MM-DD). */
export function computeGalaxy(dates: string[], today: string): Galaxy {
  const set = new Set(dates.filter((d) => d <= today));
  const g: Galaxy = { completed: [], ordinal: 0, lit: 0, doneToday: set.has(today), lostLastNight: 0, totalNights: 0, bestRun: 0 };
  if (set.size === 0) return g;
  let run = 0;
  for (let d = [...set].sort()[0], guard = 0; d <= today && guard < 4000; d = next(d), guard++) {
    if (set.has(d)) {
      g.lit++; g.totalNights++; run++; g.bestRun = Math.max(g.bestRun, run);
      g.lostLastNight = 0;
      if (g.lit >= CONSTELLATIONS[g.ordinal % CONSTELLATIONS.length].stars.length) { g.completed.push({ ordinal: g.ordinal, date: d }); g.ordinal++; g.lit = 0; }
    } else if (d < today) {
      // A missed night: only the constellation in progress goes dark.
      g.lostLastNight = next(d) === today ? g.lit : 0;
      g.lit = 0; run = 0;
    }
  }
  return g;
}
