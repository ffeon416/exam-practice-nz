import { scopedKey } from "./userScope";

const STORAGE_KEY = "studyace-onboarding";

export interface OnboardingPrefs {
  /** Year/grade value in the chosen exam system (10–13 for NCEA; 9–13 elsewhere). */
  yearLevel: number;
  subjects: string[];
  /** Exam system registry id (e.g. "nz-ncea"). Absent on pre-2026-09-20 prefs → NCEA. */
  curriculumId?: string;
  completedAt: string;
}

export function loadOnboarding(): OnboardingPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_KEY));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingPrefs;
    if (
      typeof parsed !== "object" ||
      typeof parsed.yearLevel !== "number" ||
      !Array.isArray(parsed.subjects)
    ) {
      return null;
    }
    // One subject at a time (2026-10-04): the schedule, pace and countdown are
    // all built around a single exam. Setups saved with several subjects keep
    // the first; the others are still there to practise from the Practise page.
    return { ...parsed, subjects: parsed.subjects.slice(0, 1) };
  } catch {
    return null;
  }
}

export function saveOnboarding(prefs: Omit<OnboardingPrefs, "completedAt">) {
  if (typeof window === "undefined") return;
  try {
    const toSave: OnboardingPrefs = { ...prefs, subjects: prefs.subjects.slice(0, 1), completedAt: new Date().toISOString() };
    localStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(toSave));
  } catch {
    // Quota exceeded or storage disabled
  }
}
