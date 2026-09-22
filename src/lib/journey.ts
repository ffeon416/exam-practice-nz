// The journey: a wavy path from the grade check to "Perfect A's", with the
// student's upcoming tasks placed along it and a tracker that moves forward
// as they complete them. Pure geometry + scheduling, no React, no imports.

export type StepKind = "start" | "paper" | "fix" | "mock" | "destination";
export interface Step {
  i: number;            // 0 = start … n = destination
  u: number;            // 0..1 along the path
  x: number; y: number; // position on the path (viewBox units)
  kind: StepKind;
  title: string;
  sub: string;          // "done", "up next · this week", "w/c 5 Oct", …
  state: "done" | "next" | "upcoming";
  above: boolean;       // label placement
}

export const VB = { w: 1000, h: 520, padX: 80, top: 120, bottom: 430 };

/** A gentle rising wave: low on the left, high on the right, two soft crests. */
export function pathPoint(u: number): { x: number; y: number } {
  const x = VB.padX + u * (VB.w - VB.padX * 2);
  const rise = VB.bottom - u * (VB.bottom - VB.top);
  const wave = Math.sin(u * Math.PI * 2 * 1.5 + Math.PI) * 44 * (1 - u * 0.35);
  return { x, y: rise + wave };
}

export function pathD(samples = 96): string {
  let d = "";
  for (let s = 0; s <= samples; s++) {
    const p = pathPoint(s / samples);
    d += `${s === 0 ? "M" : " L"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }
  return d;
}

export function buildJourney(opts: {
  /** Papers completed since the grade check (the grade check itself excluded). */
  completed: number;
  /** ms timestamps */
  now: number;
  exam: number;
  hasWeakSpot: boolean;
  destinationLabel: string; // e.g. "Excellence"
}): Step[] {
  const week = 7 * 864e5;
  const weeksLeft = Math.max(2, Math.min(10, Math.round((opts.exam - opts.now) / week)));
  // One task a week, capped at eight so the labels stay readable.
  const n = Math.max(5, Math.min(8, weeksLeft)); // index of destination
  const done = Math.max(0, Math.min(opts.completed, n - 1));
  const remaining = n - done;
  const fmt = (t: number) => new Date(t).toLocaleDateString("en-NZ", { day: "numeric", month: "short" });

  const steps: Step[] = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const { x, y } = pathPoint(u);
    let kind: StepKind;
    if (i === 0) kind = "start";
    else if (i === n) kind = "destination";
    else if (i % 4 === 0) kind = "mock";
    else if (i % 4 === 2 && opts.hasWeakSpot) kind = "fix";
    else kind = "paper";

    const state: Step["state"] = i <= done ? "done" : i === done + 1 ? "next" : "upcoming";
    // Remaining steps are spread evenly from now to the exam.
    const when = i <= done ? null : opts.now + ((opts.exam - opts.now) * (i - done)) / remaining;

    const title =
      kind === "start" ? "Grade check"
      : kind === "destination" ? "Perfect A's"
      : kind === "mock" ? "Mock exam"
      : kind === "fix" ? "Fix your weak spot"
      : "Practice paper";
    const sub =
      kind === "start" ? ""
      : state === "done" ? ""
      : state === "next" ? (when && when - opts.now < week ? "up next · this week" : `up next · ${fmt(when!)}`)
      : kind === "destination" ? `${opts.destinationLabel} · exam ${fmt(opts.exam)}`
      : `w/c ${fmt(when!)}`;

    // Alternate sides counting back from the destination, which always sits above.
    // The start label always sits below (the line rises away from it).
    steps.push({ i, u, x, y, kind, title, sub, state, above: i === 0 ? false : (n - i) % 2 === 0 });
  }
  return steps;
}

/** Tracker sits on the last completed step (or the start). */
export function trackerPosition(steps: Step[]): { x: number; y: number; step: Step } {
  const doneSteps = steps.filter((s) => s.state === "done");
  const s = doneSteps[doneSteps.length - 1] ?? steps[0];
  return { x: s.x, y: s.y, step: s };
}
