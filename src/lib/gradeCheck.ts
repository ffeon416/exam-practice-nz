// The kid's first grade check: 8 questions, marked with the site's honest 1+1
// scheme, turned into what the result screen and the parent's summary show.
// Pure — no I/O — so it's unit tested (tests/gradeCheck.test.ts).
//
// Honesty: a question our marker FAILED on (a system error, not a wrong
// answer) is left out of the score rather than counted as zero — and if more
// than MAX_UNMARKED fail, the check isn't scored at all and the kid is asked
// to submit again. Nothing is ever rounded up.

import type { GradeCheckSummary } from "./children";
import type { MarkingResult, Question } from "./types";
import { LETTER_BANDS, resolveCurriculum } from "@/data/curricula";
import { curriculumBand } from "./scoring";

export const CHECK_QUESTIONS = 8;
export const MAX_UNMARKED = 2;

/** Target grades a kid can pick (the same letter scale everywhere). */
export const TARGET_BANDS = LETTER_BANDS.filter((b) => ["a-plus", "a", "b", "c"].includes(b.id));

/** What the kid's browser gets: no marking guide, no expected answer. */
export type PublicQuestion = Pick<Question, "id" | "number" | "text" | "marks" | "answerType" | "options" | "graph">;

export function publicQuestions(qs: Question[]): PublicQuestion[] {
  return qs.map(({ id, number, text, marks, answerType, options, graph }) => ({ id, number, text, marks, answerType, ...(options ? { options } : {}), ...(graph ? { graph } : {}) }));
}

export type Marked = MarkingResult & { unmarked?: boolean };

const firstSentence = (s: string) => (s.split(/(?<=[.!?])\s/)[0] ?? s).trim().slice(0, 160);

function topicLabel(t: string): string {
  const s = t.replace(/[-_]+/g, " ").trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "Exam technique";
}

/**
 * The three things costing the most marks, worst first. Lost marks on a
 * question are shared across the topics it's tagged with; the "why" is the
 * marker's own feedback on the question that lost the most there.
 */
export function costingMarks(results: Marked[], subjectLabel: string): GradeCheckSummary["costing"] {
  const byTopic = new Map<string, { lost: number; worst: Marked | null; worstLost: number }>();
  for (const r of results) {
    if (r.unmarked) continue;
    const lost = r.maxMarks - r.marksAwarded;
    if (lost <= 0) continue;
    const topics = r.topicsToReview.length ? r.topicsToReview : [subjectLabel];
    for (const t of topics) {
      const key = topicLabel(t);
      const cur = byTopic.get(key) ?? { lost: 0, worst: null, worstLost: 0 };
      cur.lost += lost / topics.length;
      if (lost > cur.worstLost) { cur.worst = r; cur.worstLost = lost; }
      byTopic.set(key, cur);
    }
  }
  return [...byTopic.entries()]
    .sort((a, b) => b[1].lost - a[1].lost)
    .slice(0, 3)
    .map(([topic, v]) => ({
      topic,
      lost: Math.round(v.lost * 10) / 10,
      why: v.worst ? firstSentence(v.worst.feedback || v.worst.correctApproach || "") : "",
    }));
}

export function summarise(opts: {
  results: Marked[];
  curriculumId: string;
  subject: string;
  targetBandId: string;
  now?: Date;
}): GradeCheckSummary | { tooManyUnmarked: true } {
  const unmarked = opts.results.filter((r) => r.unmarked).length;
  if (unmarked > MAX_UNMARKED) return { tooManyUnmarked: true };
  const scored = opts.results.filter((r) => !r.unmarked);

  const curriculum = resolveCurriculum(opts.curriculumId);
  const subjectLabel = curriculum.subjects.find((s) => s.value === opts.subject)?.label ?? opts.subject;
  const total = scored.reduce((s, r) => s + r.marksAwarded, 0);
  const max = scored.reduce((s, r) => s + r.maxMarks, 0);
  const pct = max > 0 ? Math.round((total / max) * 100) : 0;
  const band = curriculumBand(curriculum.id, scored) ?? LETTER_BANDS[LETTER_BANDS.length - 1];
  const target = LETTER_BANDS.find((b) => b.id === opts.targetBandId) ?? LETTER_BANDS.find((b) => b.id === "a")!;
  const costing = costingMarks(scored, subjectLabel);

  const focus = costing[0]?.topic;
  const tomorrow = focus
    ? { title: `${focus}`, detail: `A 20-minute ${subjectLabel} task on ${focus.toLowerCase()}, marked the same way.` }
    : { title: `${subjectLabel} practice`, detail: `A 20-minute ${subjectLabel} task, a step harder than tonight.` };

  return {
    subject: opts.subject,
    subjectLabel,
    curriculumId: curriculum.id,
    pct,
    bandId: band.id,
    bandLabel: band.label,
    targetBandId: target.id,
    targetLabel: target.label,
    costing,
    tomorrow,
    completedAt: (opts.now ?? new Date()).toISOString(),
  };
}
