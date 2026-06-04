export type Tier = "free" | "student" | "pro";

// Subjects available on the Free tier. Everything else requires Student or Pro.
// Kept deliberately narrow — core, highest-enrolment subjects that let a free
// user try the product properly before upgrading.
export const FREE_SUBJECTS = ["mathematics", "english"] as const;

export function isSubjectAvailable(subject: string, tier: Tier): boolean {
  if (tier === "student" || tier === "pro") return true;
  return (FREE_SUBJECTS as readonly string[]).includes(subject);
}

export const TIER_LIMITS = {
  free: {
    examsPerWeek: 2,
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
  pro: 19.99,
};

/** Check if a limit value represents "unlimited" (-1 from the API, or Infinity server-side) */
export function isUnlimited(value: number): boolean {
  return value === -1 || value === Infinity;
}
