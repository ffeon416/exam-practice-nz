import type { CutScores, Grade, MarkingResult } from "./types";
import { resolveCurriculum, bandForPct, LETTER_BANDS, type GradeBand } from "@/data/curricula";

// Site-wide marking scheme: every question is worth 1 mark for correct working
// + 1 mark for the correct final answer (max 2). Multiple-choice has no working
// to show, so it is worth 1 mark for the correct option only. This is the single
// source of truth for a question's mark total — used everywhere instead of the
// per-question `marks` field baked into the exam JSONs.
export function questionMaxMarks(answerType?: string): number {
  return answerType === "multi-choice" ? 1 : 2;
}

export function calculateOverallGrade(
  results: MarkingResult[],
  // Kept for call-site compatibility; ignored now that every paper is scored on
  // the uniform 1+1 scheme, which the original NZQA cut scores don't match.
  _cutScores?: CutScores
): Grade {
  void _cutScores;
  const totalMarks = results.reduce((s, r) => s + r.marksAwarded, 0);
  const maxMarks = results.reduce((s, r) => s + r.maxMarks, 0);
  const pct = maxMarks > 0 ? totalMarks / maxMarks : 0;

  if (pct >= 0.8) return "excellence";
  if (pct >= 0.65) return "merit";
  if (pct >= 0.5) return "achieved";
  return "not-achieved";
}

/** The letter for a fraction of marks (0–1): A+, A, B, C or D. */
export function letterForPct(pct: number): GradeBand {
  return bandForPct({ gradeBands: LETTER_BANDS } as Parameters<typeof bandForPct>[0], pct);
}

/** Question difficulty tiers, shown as the grade they're pitched at. */
export const TIER_LABEL: Record<"achieved" | "merit" | "excellence", string> = { achieved: "C-grade", merit: "B-grade", excellence: "A-grade" };

// ── Banding ──
// Every exam system shows the same letter scale (A+ … D). Internally
// everything still runs on the uniform 1+1 marks; this is the display band
// for a set of marked results.
export function curriculumBand(
  curriculumId: string | undefined,
  results: MarkingResult[]
): GradeBand | null {
  const c = resolveCurriculum(curriculumId);
  const totalMarks = results.reduce((s, r) => s + r.marksAwarded, 0);
  const maxMarks = results.reduce((s, r) => s + r.maxMarks, 0);
  const pct = maxMarks > 0 ? totalMarks / maxMarks : 0;
  return bandForPct(c, pct);
}

// Map a band's tone onto the nearest internal Grade so tone-driven UI
// (rings, chips) works unchanged for any curriculum.
export function bandToneGrade(band: GradeBand): Grade {
  switch (band.tone) {
    case "top": return "excellence";
    case "high": return "merit";
    case "pass": return "achieved";
    case "fail": return "not-achieved";
  }
}

export function gradeLabel(grade: Grade): string {
  switch (grade) {
    case "excellence":
      return "A";
    case "merit":
      return "B";
    case "achieved":
      return "C";
    case "not-achieved":
      return "D";
  }
}

export function gradeColor(grade: Grade): string {
  switch (grade) {
    case "excellence":
      return "text-yellow-400";
    case "merit":
      return "text-blue-400";
    case "achieved":
      return "text-green-400";
    case "not-achieved":
      return "text-red-400";
  }
}

export function gradeBgColor(grade: Grade): string {
  switch (grade) {
    case "excellence":
      return "bg-yellow-500/10 border-yellow-500/30";
    case "merit":
      return "bg-blue-500/10 border-blue-500/30";
    case "achieved":
      return "bg-green-500/10 border-green-500/30";
    case "not-achieved":
      return "bg-red-500/10 border-red-500/30";
  }
}

export function analyzeGaps(
  results: MarkingResult[]
): { topic: string; score: number; total: number; pct: number }[] {
  const topicMap: Record<string, { score: number; total: number }> = {};

  for (const r of results) {
    for (const topic of r.topicsToReview) {
      if (!topicMap[topic]) topicMap[topic] = { score: 0, total: 0 };
      topicMap[topic].score += r.marksAwarded;
      topicMap[topic].total += r.maxMarks;
    }
  }

  return Object.entries(topicMap)
    .map(([topic, { score, total }]) => ({
      topic,
      score,
      total,
      pct: total > 0 ? Math.round((score / total) * 100) : 0,
    }))
    .sort((a, b) => a.pct - b.pct);
}
