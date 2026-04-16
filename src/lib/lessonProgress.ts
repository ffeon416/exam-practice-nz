// ── Lesson progress tracking via localStorage ──

const STORAGE_KEY = "lesson-progress";

interface ProgressStore {
  [key: string]: boolean; // "year-subject-lessonId" → true
}

function getStore(): ProgressStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStore(store: ProgressStore) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // storage full or unavailable
  }
}

function makeKey(yearLevel: number, subject: string, lessonId: string): string {
  return `${yearLevel}-${subject}-${lessonId}`;
}

export function markLessonComplete(
  yearLevel: number,
  subject: string,
  lessonId: string
): void {
  const store = getStore();
  store[makeKey(yearLevel, subject, lessonId)] = true;
  saveStore(store);
}

export function markLessonIncomplete(
  yearLevel: number,
  subject: string,
  lessonId: string
): void {
  const store = getStore();
  delete store[makeKey(yearLevel, subject, lessonId)];
  saveStore(store);
}

export function isLessonComplete(
  yearLevel: number,
  subject: string,
  lessonId: string
): boolean {
  const store = getStore();
  return !!store[makeKey(yearLevel, subject, lessonId)];
}

export function getCourseProgress(
  yearLevel: number,
  subject: string,
  lessonIds: string[]
): { completed: number; total: number } {
  const store = getStore();
  let completed = 0;
  for (const id of lessonIds) {
    if (store[makeKey(yearLevel, subject, id)]) completed++;
  }
  return { completed, total: lessonIds.length };
}

export function getSelectedYear(): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("selected-year");
    if (raw) {
      const n = parseInt(raw, 10);
      if ([10, 11, 12, 13].includes(n)) return n;
    }
  } catch {}
  return null;
}

export function setSelectedYear(year: number): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("selected-year", String(year));
  } catch {}
}
