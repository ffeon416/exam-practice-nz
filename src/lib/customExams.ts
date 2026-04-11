import type { Exam } from "./types";

const STORAGE_KEY = "custom-exams";

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
