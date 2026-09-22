// The journey: the path from a subject's baseline (its grade check) to the
// grade the student chose, split into two-week sprints. Each sprint is a
// fixed set of tasks ending in a grade check that re-measures. The current
// sprint is shown in detail; the rest of the line is the shape of the road.
// Pure geometry + scheduling — no React, no imports.

export type StepKind = "start" | "paper" | "fix" | "mock" | "check" | "destination";
export interface Step {
  i: number;            // 0 = start … last = destination
  u: number;            // 0..1 along the path
  x: number; y: number; // position on the path (viewBox units)
  sprint: number;       // 0-based sprint index (start belongs to sprint 0)
  kind: StepKind;
  title: string;
  sub: string;
  state: "done" | "next" | "upcoming";
  above: boolean;
  /** Labelled on the line (current sprint's tasks, every check, the destination). */
  labelled: boolean;
  when: number | null;
}
export interface Sprint { k: number; startT: number; endT: number; state: "done" | "current" | "upcoming"; done: number; total: number }

export const VB = { w: 1000, h: 520, padX: 80, top: 120, bottom: 430 };
export const TASKS_PER_SPRINT = 6; // 5 tasks + the closing grade check

/** A gentle rising wave: low on the left, high on the right. */
export function pathPoint(u: number): { x: number; y: number } {
  const x = VB.padX + u * (VB.w - VB.padX * 2);
  const rise = VB.bottom - u * (VB.bottom - VB.top);
  const wave = Math.sin(u * Math.PI * 2 * 1.5 + Math.PI) * 44 * (1 - u * 0.35);
  return { x, y: rise + wave };
}

export function samplePath(u0: number, u1: number, samples = 96): string {
  let d = "";
  for (let k = 0; k <= samples; k++) {
    const p = pathPoint(u0 + (u1 - u0) * (k / samples));
    d += `${k === 0 ? "M" : " L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  return d;
}

const fmt = (t: number) => new Date(t).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });

export function buildJourney(opts: {
  baseline: number;      // when the grade check happened
  now: number;
  exam: number;
  completed: number;     // papers sat since the grade check
  hasWeakSpot: boolean;
  goalLabel: string;     // e.g. "Merit"
}): { steps: Step[]; sprints: Sprint[]; current: Sprint } {
  const day = 864e5;
  const exam = Math.max(opts.exam, opts.now + 7 * day);
  const span = exam - opts.baseline;
  const K = Math.max(1, Math.min(6, Math.round(span / (14 * day))));
  const total = K * TASKS_PER_SPRINT; // index of destination
  const done = Math.max(0, Math.min(opts.completed, total - 1));
  const currentK = Math.min(K - 1, Math.floor(done / TASKS_PER_SPRINT));

  const sprints: Sprint[] = [];
  for (let k = 0; k < K; k++) {
    const startT = opts.baseline + (span * k) / K;
    const endT = opts.baseline + (span * (k + 1)) / K;
    const doneIn = Math.max(0, Math.min(TASKS_PER_SPRINT, done - k * TASKS_PER_SPRINT));
    sprints.push({ k, startT, endT, state: k < currentK ? "done" : k === currentK ? "current" : "upcoming", done: doneIn, total: TASKS_PER_SPRINT });
  }

  const pattern: StepKind[] = ["paper", "paper", opts.hasWeakSpot ? "fix" : "paper", "paper", "mock", "check"];
  const steps: Step[] = [];
  const start = pathPoint(0);
  steps.push({ i: 0, u: 0, x: start.x, y: start.y, sprint: 0, kind: "start", title: "Grade check", sub: fmt(opts.baseline), state: "done", above: false, labelled: true, when: opts.baseline });

  for (let i = 1; i <= total; i++) {
    const k = Math.floor((i - 1) / TASKS_PER_SPRINT);
    const j = (i - 1) % TASKS_PER_SPRINT; // 0..5
    const u = i / total;
    const { x, y } = pathPoint(u);
    const isDest = i === total;
    const kind: StepKind = isDest ? "destination" : pattern[j];
    const state: Step["state"] = i <= done ? "done" : i === done + 1 ? "next" : "upcoming";
    const sp = sprints[k];
    const when = i <= done ? null : sp.startT + ((sp.endT - sp.startT) * (j + 1)) / TASKS_PER_SPRINT;
    const title =
      isDest ? `Goal · ${opts.goalLabel}`
      : kind === "check" ? `Sprint ${k + 1} check`
      : kind === "mock" ? "Mock exam"
      : kind === "fix" ? "Fix your weak spot"
      : "Practice paper";
    const sub =
      isDest ? `exam · ${fmt(exam)}`
      : state === "done" ? ""
      : state === "next" ? (when && when - opts.now < 7 * day ? "up next · this week" : `up next · ${fmt(when!)}`)
      : kind === "check" ? fmt(when!)
      : `w/c ${fmt(when!)}`;
    const labelled = isDest || kind === "check" || k === currentK;
    steps.push({ i, u, x, y, sprint: k, kind, title, sub, state, above: (total - i) % 2 === 0, labelled, when });
  }
  return { steps, sprints, current: sprints[currentK] };
}

export function trackerStep(steps: Step[]): Step {
  const done = steps.filter((s) => s.state === "done");
  return done[done.length - 1] ?? steps[0];
}

// ── Pace honesty: is the goal reachable at this rate? ──
export type PaceState = "there" | "on-track" | "behind" | "unrealistic";
export function paceFor(nowPct: number, goalPct: number, slopePerWeek: number, weeksLeft: number): { state: PaceState; neededPerWeek: number; papersPerWeek: number } {
  const w = Math.max(1, weeksLeft);
  const needed = (goalPct - nowPct) / w; // points per week required
  const papers = Math.max(3, Math.min(7, Math.ceil(needed / 1.5) + 2));
  if (goalPct <= nowPct) return { state: "there", neededPerWeek: 0, papersPerWeek: 3 };
  if (needed > 9) return { state: "unrealistic", neededPerWeek: needed, papersPerWeek: 7 };
  if (slopePerWeek >= needed * 0.8) return { state: "on-track", neededPerWeek: needed, papersPerWeek: papers };
  return { state: "behind", neededPerWeek: needed, papersPerWeek: papers };
}
