// Server-side paper builder. One function that turns (curriculum, subject,
// year) into a saved, verified Exam row — used by /api/next-paper to build
// "tonight's paper" in the background so the student never waits for the
// 30–90 s generation on a phone. Mirrors the client mapping in
// /subjects (same ids, same 1+1 marks, same broken-question guard) so a
// paper built here is indistinguishable from one built there.

import { generatePracticePaper } from "./claude";
import { saveExam, logApiUsage, incrementUsage } from "./db";
import { resolveCurriculum } from "@/data/curricula";
import { isQuestionBroken } from "./questionGuard";
import type { Exam, Question } from "./types";

/** The `level` the generator expects: NCEA uses 0–3 internally, others pass the year through. */
export function levelValueFor(curriculumId: string, year: number): number {
  return curriculumId === "nz-ncea" ? (year === 10 ? 0 : year - 10) : year;
}

function newExamId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `custom-${Date.now()}-${rand}`;
}

export async function buildPaper(opts: {
  userId: string;
  curriculumId: string;
  subject: string;
  year: number;
  questionCount?: number;
  topic?: string | null;
  /** Overrides the generator's title (e.g. "Tonight's paper · Mathematics"). */
  title?: string;
}): Promise<Exam & { createdAt: string; topic: string | null; isCustom: true }> {
  const curriculum = resolveCurriculum(opts.curriculumId);
  const subjectMeta = curriculum.subjects.find((s) => s.value === opts.subject);
  if (!subjectMeta) throw new Error(`Subject ${opts.subject} is not in ${curriculum.id}`);
  const count = Math.max(4, Math.min(opts.questionCount ?? 8, 20));
  const level = levelValueFor(curriculum.id, opts.year);
  const topic = opts.topic?.trim() || null;

  let lastErr: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const paper = await generatePracticePaper(opts.subject, level, topic, count, curriculum.id);
      if (paper.questions.length !== count) {
        throw new Error(`Generator returned ${paper.questions.length} questions, expected ${count}`);
      }
      const id = newExamId();
      const questions: Question[] = paper.questions.map((q, i) => ({
        id: `${id}-q${i + 1}`,
        number: String(i + 1),
        text: q.text,
        marks: (q.answerType ?? "working") === "multi-choice" ? 1 : 2,
        gradeLevel: q.gradeLevel ?? "achieved",
        topics: topic ? [topic] : [opts.subject],
        answerType: q.answerType ?? "working",
        options: q.options,
        expectedAnswer: q.expectedAnswer,
        markingGuide: q.markingGuide ?? "",
        graph: q.graph,
        image: (q as { image?: string }).image,
      }));
      // Same hard guarantee as the client store: never persist a paper with a
      // question that references a visual we don't have.
      const broken = questions.filter((q) => isQuestionBroken(q)).length;
      if (broken > 0) throw new Error(`${broken}/${questions.length} questions reference a missing visual`);

      const exam = {
        id,
        title: opts.title ?? paper.title ?? `${subjectMeta.label} Practice Exam`,
        level,
        standard: "PRACTICE",
        year: new Date().getFullYear(),
        subject: opts.subject,
        timeMinutes: Math.max(30, questions.length * 6),
        questions,
        totalMarks: questions.reduce((s, q) => s + q.marks, 0),
        createdAt: new Date().toISOString(),
        topic,
        isCustom: true as const,
        curriculumId: curriculum.id,
      };
      await saveExam(opts.userId, exam);
      await incrementUsage(opts.userId, "exams_generated");
      await logApiUsage(opts.userId, "generate_paper", paper.usage);
      return exam;
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
    }
  }
  throw lastErr ?? new Error("Paper generation failed");
}
