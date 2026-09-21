// Grade outlook: where a student is, where they're heading, and what closes
// the gap — computed from their own marked papers. Plain arithmetic, no AI,
// and every number is labelled an estimate in the UI (house rule: honest).

import type { ExamAttempt, Exam } from "./types";
import { resolveCurriculum, type GradeBand } from "@/data/curricula";

export type Point = { t: number; pct: number; attempt: ExamAttempt };

export function subjectSeries(attempts: ExamAttempt[], subject: string | null): Point[] {
  return attempts
    .filter((a) => a.maxMarks > 0 && (subject == null || a.subject === subject))
    .map((a) => ({ t: new Date(a.date).getTime(), pct: Math.round((a.totalMarks / a.maxMarks) * 100), attempt: a }))
    .filter((p) => Number.isFinite(p.t))
    .sort((a, b) => a.t - b.t);
}

/** Recency-weighted average of the last six papers (newest counts most). */
export function predictedPct(points: Point[]): number | null {
  const last = points.slice(-6);
  if (last.length === 0) return null;
  let w = 0, sum = 0;
  last.forEach((p, i) => { const weight = i + 1; w += weight; sum += p.pct * weight; });
  return Math.round(sum / w);
}

/** Least-squares slope in percentage points per week over the last eight papers. */
export function trendPerWeek(points: Point[]): number {
  const last = points.slice(-8);
  if (last.length < 2) return 0;
  const week = 7 * 864e5;
  const xs = last.map((p) => (p.t - last[0].t) / week);
  const ys = last.map((p) => p.pct);
  const n = xs.length;
  const mx = xs.reduce((s, x) => s + x, 0) / n;
  const my = ys.reduce((s, y) => s + y, 0) / n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) ** 2; }
  if (den === 0) return 0;
  return Math.max(-10, Math.min(10, num / den));
}

export function projectedPct(now: number, slopePerWeek: number, weeks: number): number {
  return Math.max(0, Math.min(100, Math.round(now + slopePerWeek * weeks)));
}

export function bandsFor(curriculumId: string | undefined): GradeBand[] {
  return resolveCurriculum(curriculumId).gradeBands; // highest first
}

export function bandAt(bands: GradeBand[], pct: number): GradeBand {
  return bands.find((b) => pct / 100 >= b.minPct) ?? bands[bands.length - 1];
}

/** Marks between a score and the top band on a paper of `maxMarks`. */
export function marksToTop(pct: number, bands: GradeBand[], maxMarks = 16): number {
  const top = bands[0];
  return Math.max(0, Math.ceil(top.minPct * maxMarks) - Math.floor((pct / 100) * maxMarks));
}

export type TierAccuracy = { tier: "achieved" | "merit" | "excellence"; awarded: number; max: number; pct: number; questions: number };

/** Accuracy by question difficulty, using the exams we have on this device. */
export function tierBreakdown(points: Point[], getExam: (id: string) => Exam | null): TierAccuracy[] | null {
  const acc: Record<TierAccuracy["tier"], { awarded: number; max: number; questions: number }> = {
    achieved: { awarded: 0, max: 0, questions: 0 },
    merit: { awarded: 0, max: 0, questions: 0 },
    excellence: { awarded: 0, max: 0, questions: 0 },
  };
  let any = false;
  for (const p of points.slice(-10)) {
    const exam = getExam(p.attempt.examId);
    if (!exam) continue;
    const byId = new Map(exam.questions.map((q) => [q.id, q] as const));
    for (const r of p.attempt.results) {
      const q = byId.get(r.questionId);
      if (!q) continue;
      const tier = (q.gradeLevel ?? "achieved") as TierAccuracy["tier"];
      acc[tier].awarded += r.marksAwarded;
      acc[tier].max += r.maxMarks;
      acc[tier].questions += 1;
      any = true;
    }
  }
  if (!any) return null;
  return (["achieved", "merit", "excellence"] as const).map((tier) => ({
    tier,
    ...acc[tier],
    pct: acc[tier].max > 0 ? Math.round((acc[tier].awarded / acc[tier].max) * 100) : 0,
  }));
}

/** Papers per week over the last 14 days. */
export function papersPerWeek(points: Point[]): number {
  const cutoff = Date.now() - 14 * 864e5;
  const n = points.filter((p) => p.t >= cutoff).length;
  return Math.round((n / 2) * 10) / 10;
}

// ── Milestones: the straight path from the grade check to the target ──
export type Milestone = { t: number; pct: number; label: string; status: "hit" | "missed" | "next" | "upcoming" };

/**
 * Weekly stepping stones from the baseline (first paper = the grade check)
 * to the target band by the end date. A milestone is "hit" when any paper
 * in its week scored at or above it, "missed" once its week has passed
 * without one, "next" for the first one still ahead.
 */
export function milestones(points: Point[], targetPct: number, endT: number, nowT: number): Milestone[] {
  if (points.length === 0) return [];
  const base = points[0];
  const week = 7 * 864e5;
  const n = Math.max(1, Math.min(12, Math.round((endT - base.t) / week)));
  const out: Milestone[] = [];
  let nextFound = false;
  for (let k = 1; k <= n; k++) {
    const t = base.t + (endT - base.t) * (k / n);
    const pct = Math.round(base.pct + (targetPct - base.pct) * (k / n));
    const windowStart = base.t + (endT - base.t) * ((k - 1) / n);
    const hit = points.some((p) => p.t > windowStart && p.t <= t + 864e5 && p.pct >= pct);
    let status: Milestone["status"];
    if (hit) status = "hit";
    else if (t < nowT) status = "missed";
    else if (!nextFound) { status = "next"; nextFound = true; }
    else status = "upcoming";
    out.push({ t, pct, status, label: new Date(t).toLocaleDateString("en-NZ", { day: "numeric", month: "short" }) });
  }
  return out;
}

export type WeakSpot = { subject: string; kind: "tier" | "topic"; label: string; pct: number; topicPrompt: string };

/** The single weakest thing worth a focused paper, or null if nothing stands out. */
export function weakSpot(subject: string, tiers: TierAccuracy[] | null, topics: { topic: string; topicLabel: string; correctRate: number; attempts: number; subject?: string }[]): WeakSpot | null {
  const realTopics = topics
    .filter((t) => (t.subject ?? subject) === subject && t.topic !== subject && t.attempts >= 2 && t.correctRate < 0.6)
    .sort((a, b) => a.correctRate - b.correctRate);
  if (realTopics[0]) {
    const t = realTopics[0];
    return { subject, kind: "topic", label: t.topicLabel, pct: Math.round(t.correctRate * 100), topicPrompt: t.topicLabel };
  }
  const tier = tiers?.filter((x) => x.questions >= 3 && x.pct < 60).sort((a, b) => a.pct - b.pct)[0];
  if (tier) {
    const name = { achieved: "Achieved-level", merit: "Merit-level", excellence: "Excellence-level" }[tier.tier];
    return {
      subject, kind: "tier", label: `${name} questions`, pct: tier.pct,
      topicPrompt: `${name} questions only — the hardest style this paper type uses, so the student can practise exactly those`,
    };
  }
  return null;
}
