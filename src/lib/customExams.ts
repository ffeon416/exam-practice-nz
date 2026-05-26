import type { Exam } from "./types";
import { isQuestionBroken } from "./questionGuard";

const STORAGE_KEY = "custom-exams";

// Hard guarantee: an exam being written to the store must have ZERO broken
// questions (references a visual we don't have / asks the student to draw).
// We don't silently filter — silent filtering caused a 6-question request to
// land as a 3-question paper because the API mapping had stripped graph data
// and the sanitizer then dropped the now-graphless questions. If any question
// is broken at save time, throw so the caller surfaces a visible error and we
// never silently shrink a paper again.
class BrokenExamError extends Error {
  constructor(public exam: Exam, public brokenCount: number) {
    super(
      `Refusing to save exam ${exam.id}: ${brokenCount}/${exam.questions.length} questions reference a missing visual or ask the student to draw. This indicates a generator or mapping bug — fix upstream rather than silently shrinking the paper.`,
    );
    this.name = "BrokenExamError";
  }
}

export interface CustomExamMeta {
  id: string;
  title: string;
  subject: string;
  level: number;
  topic?: string | null;
  createdAt: string;
  questionCount: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readStore(): Record<string, Exam> {
  if (!isBrowser()) return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Exam>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, Exam>): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.error("Failed to write custom exams to localStorage:", err);
  }
}

export function generateCustomExamId(): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `custom-${Date.now()}-${rand}`;
}

export function saveCustomExam(exam: Exam): Exam {
  const brokenCount = exam.questions.filter((q) => isQuestionBroken(q)).length;
  if (brokenCount > 0) {
    throw new BrokenExamError(exam, brokenCount);
  }
  const store = readStore();
  store[exam.id] = exam;
  writeStore(store);
  return exam;
}

export function getCustomExam(id: string): Exam | null {
  const store = readStore();
  return store[id] ?? null;
}

export function listCustomExams(): CustomExamMeta[] {
  const store = readStore();
  return Object.values(store)
    .map((exam) => ({
      id: exam.id,
      title: exam.title,
      subject: exam.subject,
      level: exam.level,
      topic: (exam as Exam & { topic?: string | null }).topic ?? null,
      createdAt:
        (exam as Exam & { createdAt?: string }).createdAt ??
        new Date(0).toISOString(),
      questionCount: exam.questions.length,
    }))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function deleteCustomExam(id: string): void {
  const store = readStore();
  delete store[id];
  writeStore(store);
}

export function isCustomExamId(id: string): boolean {
  return id.startsWith("custom-");
}
