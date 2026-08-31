export type Tier = "free" | "student" | "pro";

// There is no free practice plan (removed 2026-08-31): the free experience is
// the Grade Detector (/grade). Unpaid accounts exist only as leads — they can
// sit grade checks and spend referral bonus exams, nothing else.
export const FREE_SUBJECTS = [] as const;

export function isSubjectAvailable(subject: string, tier: Tier): boolean {
  return tier === "student" || tier === "pro";
}

export const TIER_LIMITS = {
  // "free" = an unpaid account. No weekly exams — practice requires Student or
  // Pro. Referral bonus exams are still consumable over this (zero) cap.
  free: {
    examsPerWeek: 0,
    maxQuestions: 8,
    tutorMessagesPerWeek: 0, // Tutor is Pro-only
    allSubjects: false,
    spacedRepetition: false,
    adaptiveDifficulty: false,
    studyPlanner: false,
    deepEssayMarking: false,
    mockExamMode: false,
  },
  student: {
    examsPerWeek: 20,
    maxQuestions: 12,
    tutorMessagesPerWeek: 0, // Student tier has no tutor — upgrade to Pro for that
    allSubjects: true,
    spacedRepetition: true,
    adaptiveDifficulty: false,
    studyPlanner: true,
    deepEssayMarking: true,
    mockExamMode: true,
  },
  pro: {
    examsPerWeek: Infinity,
    maxQuestions: 20,
    tutorMessagesPerWeek: 100,
    allSubjects: true,
    spacedRepetition: true,
    adaptiveDifficulty: true,
    studyPlanner: true,
    deepEssayMarking: true,
    mockExamMode: true,
  },
} as const;

export type TierLimits = (typeof TIER_LIMITS)[Tier];

/** Friendly tier labels for UI */
export const TIER_LABELS: Record<Tier, string> = {
  free: "Free",
  student: "Student",
  pro: "Pro",
};

/** Monthly prices */
export const TIER_PRICES: Record<Tier, number | null> = {
  free: null,
  student: 15,
  pro: 20,
};

/** Check if a limit value represents "unlimited" (-1 from the API, or Infinity server-side) */
export function isUnlimited(value: number): boolean {
  return value === -1 || value === Infinity;
}
