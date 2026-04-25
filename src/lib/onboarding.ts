const STORAGE_KEY = "studyace-onboarding";

export interface OnboardingPrefs {
  yearLevel: 10 | 11 | 12 | 13;
  subjects: string[];
  completedAt: string;
}

export function loadOnboarding(): OnboardingPrefs | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as OnboardingPrefs;
    if (
      typeof parsed !== "object" ||
      ![10, 11, 12, 13].includes(parsed.yearLevel) ||
      !Array.isArray(parsed.subjects)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function saveOnboarding(prefs: Omit<OnboardingPrefs, "completedAt">) {
  if (typeof window === "undefined") return;
  try {
    const toSave: OnboardingPrefs = { ...prefs, completedAt: new Date().toISOString() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch {
    // Quota exceeded or storage disabled
  }
}
