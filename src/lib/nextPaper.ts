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

export type TodayTask = { date: string; subject: string; task: "check" | "mock" | "paper" | "fix"; topic?: string };

/** Get today's paper if it exists, else build it (waits). */
export async function getOrBuildToday(t: TodayTask): Promise<{ exam: Exam; built: boolean } | null> {
  const prefs = nextPaperPrefs();
  if (!prefs) return null;
  const res = await fetch("/api/next-paper", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ curriculum: prefs.curriculum, year: prefs.year, subjects: prefs.subjects, kind: "today", ...t }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { exam: Exam | null; built: boolean };
  return data.exam ? { exam: data.exam, built: data.built } : null;
}

/** Fire-and-forget: have a given day's paper ready (used for tomorrow, after today's is marked). */
export function prebuildDay(t: TodayTask): void {
  const prefs = nextPaperPrefs();
  if (!prefs) return;
  try {
    fetch("/api/next-paper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ curriculum: prefs.curriculum, year: prefs.year, subjects: prefs.subjects, kind: "today", ...t }),
      keepalive: true,
    }).catch(() => {});
  } catch {}
}

/** Fire-and-forget: after a marked paper, build TOMORROW's task overnight. */
export function prebuildNextPaper(): void {
  try {
    const raw = localStorage.getItem("studyace-tomorrow-task");
    if (!raw) return;
    prebuildDay(JSON.parse(raw) as TodayTask);
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

/** Build a grade check (baseline) or weak-spot paper for one subject and wait for it. */
export async function buildPaperFor(opts: { subject: string; kind: "check" | "weak" | "paper" | "mock"; topic?: string }): Promise<Exam | null> {
  const prefs = nextPaperPrefs();
  if (!prefs) return null;
  const res = await fetch("/api/next-paper", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ curriculum: prefs.curriculum, year: prefs.year, subjects: prefs.subjects, ...opts }),
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
