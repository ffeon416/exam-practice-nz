export type Tier = "free" | "student" | "pro";

// There is no free practice plan (removed 2026-08-31): the free experience is
// the Grade Detector (/grade). Unpaid accounts exist only as leads — they can
// sit grade checks, nothing else (no bonus exams, no trial, no side doors).
export const FREE_SUBJECTS = [] as const;

export function isSubjectAvailable(subject: string, tier: Tier): boolean {
  return tier === "student" || tier === "pro";
}

export const TIER_LIMITS = {
  // "free" = an unpaid account. No weekly exams — practice requires Student or
  // Pro. Every AI route (generate-paper, mark, practice, tutor) refuses it.
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

/** Monthly list prices (NZD). Student is legacy (existing subscribers only). */
export const TIER_PRICES: Record<Tier, number | null> = {
  free: null,
  student: 15,
  pro: 49,
};

/** Billing periods offered for Pro — the only plan for sale since 2026-09-16. */
export type Billing = "monthly" | "quarterly" | "yearly";

export const BILLING_PERIODS: readonly Billing[] = ["monthly", "quarterly", "yearly"] as const;

export function isBilling(v: unknown): v is Billing {
  return v === "monthly" || v === "quarterly" || v === "yearly";
}

/** What Pro costs per billing period (NZD, charged upfront each period). */
export const PRO_PRICING: Record<Billing, { amount: number; months: number; label: string; per: string }> = {
  monthly: { amount: 49, months: 1, label: "Monthly", per: "per month" },
  quarterly: { amount: 119, months: 3, label: "3 months", per: "every 3 months" },
  yearly: { amount: 149, months: 12, label: "Yearly", per: "per year" },
};

/** Per-month equivalent for a billing period, rounded to cents. */
export function proMonthlyEquivalent(b: Billing): number {
  const p = PRO_PRICING[b];
  return Math.round((p.amount / p.months) * 100) / 100;
}

/** Whole-percent saving vs paying monthly for the same number of months. */
export function proSavingPct(b: Billing): number {
  const p = PRO_PRICING[b];
  const monthlyTotal = PRO_PRICING.monthly.amount * p.months;
  return Math.round((1 - p.amount / monthlyTotal) * 100);
}

/** Check if a limit value represents "unlimited" (-1 from the API, or Infinity server-side) */
export function isUnlimited(value: number): boolean {
  return value === -1 || value === Infinity;
}
