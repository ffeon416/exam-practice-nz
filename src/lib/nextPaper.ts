// Client helpers for "tonight's paper". The server (/api/next-paper) owns the
// paper; this module knows the student's onboarding prefs (subjects, year,
// exam system — all localStorage) and hands them over.

import { loadOnboarding } from "./onboarding";
import { saveCustomExam } from "./customExams";
import type { Exam } from "./types";

export const CURRICULUM_LS_KEY = "studyace-curriculum";

export function currentCurriculumId(): string {
  try {
    return localStorage.getItem(CURRICULUM_LS_KEY) || "nz-ncea";
  } catch {
    return "nz-ncea";
  }
}

export function nextPaperPrefs(): { curriculum: string; year: number; subjects: string[] } | null {
  const ob = loadOnboarding();
  if (!ob || !ob.subjects.length) return null;
  return { curriculum: ob.curriculumId ?? currentCurriculumId(), year: ob.yearLevel, subjects: ob.subjects };
}

/** Fire-and-forget: ask the server to have the next paper ready. Safe to call often. */
export function prebuildNextPaper(): void {
  const prefs = nextPaperPrefs();
  if (!prefs) return;
  try {
    fetch("/api/next-paper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

/** Build (or fetch the waiting) next paper and wait for it. */
export async function buildNextPaper(): Promise<Exam | null> {
  const prefs = nextPaperPrefs();
  if (!prefs) return null;
  const res = await fetch("/api/next-paper", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { exam: Exam | null };
  return data.exam ?? null;
}

export async function fetchNextPaper(): Promise<Exam | null> {
  const res = await fetch("/api/next-paper", { headers: { "Cache-Control": "no-store" } });
  if (!res.ok) return null;
  const data = (await res.json()) as { exam: Exam | null };
  return data.exam ?? null;
}

/** Put a server-built paper into the device store so /exam opens it instantly. */
export function adoptPaper(exam: Exam): Exam {
  const withCurriculum = { ...exam, curriculumId: exam.curriculumId ?? currentCurriculumId(), isCustom: true, createdAt: new Date().toISOString() };
  saveCustomExam(withCurriculum);
  return withCurriculum;
}
