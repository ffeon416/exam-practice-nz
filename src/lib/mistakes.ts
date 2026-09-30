// What the student got wrong, with the question it happened on. Feeds the
// review lesson (what to teach) and the schedule (is there enough to review?).

import type { Exam, ExamAttempt } from "./types";

export type Mistake = { question: string; yourAnswer: string; feedback: string; correctApproach: string; marks: string; date: string };

/** Questions in this subject that lost marks, newest first, within `days`. */
export function recentMistakes(attempts: ExamAttempt[], subject: string, getExam: (id: string) => Exam | null, days = 30): Mistake[] {
  const since = Date.now() - days * 864e5;
  const out: Mistake[] = [];
  const sorted = [...attempts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  for (const a of sorted) {
    if (new Date(a.date).getTime() < since) continue;
    const exam = getExam(a.examId);
    const subj = a.subject ?? exam?.subject;
    if (subj !== subject) continue;
    for (const r of a.results ?? []) {
      if (r.marksAwarded >= r.maxMarks) continue;
      const q = exam?.questions.find((x) => x.id === r.questionId);
      if (!q) continue;
      out.push({ question: q.text, yourAnswer: a.answers?.[q.id] ?? "", feedback: r.feedback ?? "", correctApproach: r.correctApproach ?? "", marks: `${r.marksAwarded}/${r.maxMarks}`, date: a.date });
    }
  }
  return out;
}
