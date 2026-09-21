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
