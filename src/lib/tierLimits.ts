export type Tier = "free" | "student" | "pro";

export const TIER_LIMITS = {
  free: {
    examsPerWeek: 2,
    maxQuestions: 8,
    tutorMessagesPerDay: 3,
    allSubjects: false,
    spacedRepetition: false,
    adaptiveDifficulty: false,
    studyPlanner: true,
    deepEssayMarking: false,
    mockExamMode: true,
  },
  student: {
    examsPerWeek: 20,
    maxQuestions: 12,
    tutorMessagesPerDay: 50,
    allSubjects: true,
    spacedRepetition: true,
    adaptiveDifficulty: false,
    studyPlanner: true,
    deepEssayMarking: false,
    mockExamMode: true,
  },
  pro: {
    examsPerWeek: Infinity,
    maxQuestions: 20,
    tutorMessagesPerDay: Infinity,
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
  student: 9.99,
  pro: 19.99,
};

/** Check if a limit value represents "unlimited" (-1 from the API, or Infinity server-side) */
export function isUnlimited(value: number): boolean {
  return value === -1 || value === Infinity;
}
