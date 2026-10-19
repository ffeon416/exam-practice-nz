// The parent check (/on-track): is this teen on track for the grade the
// parent wants, by the exam? Pure arithmetic on what the parent tells us —
// the grade now, the goal, the exam month, and four habits that decide
// whether study time turns into marks. A rule of thumb, never a promise;
// the page says so and shows the working.

export const GRADES = ["F", "D", "C", "B", "A", "A+"] as const;
export type Grade = (typeof GRADES)[number];

export type GoalId = "top" | "strong" | "solid" | "pass";
export const GOALS: { id: GoalId; grade: Grade; label: string; detail: string }[] = [
  { id: "top", grade: "A+", label: "The top grade", detail: "Competitive courses — medicine, law, engineering at a selective university" },
  { id: "strong", grade: "A", label: "A strong A", detail: "A good university place with a real choice of course" },
  { id: "solid", grade: "B", label: "A solid B", detail: "Into most university courses and apprenticeships" },
  { id: "pass", grade: "C", label: "A clear pass", detail: "Keep every option open and build from there" },
];

export type Days = "0-1" | "2-3" | "4-5" | "daily";
export type Practice = "timed" | "mixed" | "notes" | "unsure";
export type Marking = "regular" | "sometimes" | "nobody";
export type Focus = "weakest" | "whatever" | "favourite";

export const DAYS: { id: Days; label: string; hours: number }[] = [
  { id: "0-1", label: "Hardly ever — 0 or 1 day", hours: 0.5 },
  { id: "2-3", label: "2 or 3 days", hours: 1.75 },
  { id: "4-5", label: "4 or 5 days", hours: 3.25 },
  { id: "daily", label: "Pretty much every day", hours: 4.5 },
];
export const PRACTICE: { id: Practice; label: string; factor: number }[] = [
  { id: "timed", label: "Timed exam questions, then checks the answers", factor: 1 },
  { id: "mixed", label: "A bit of both", factor: 0.8 },
  { id: "notes", label: "Mostly re-reading notes or watching videos", factor: 0.5 },
  { id: "unsure", label: "Honestly, I don’t know", factor: 0.65 },
];
export const MARKING: { id: Marking; label: string; factor: number }[] = [
  { id: "regular", label: "Yes — a teacher or tutor marks it most weeks", factor: 1 },
  { id: "sometimes", label: "Sometimes, when there’s a test", factor: 0.8 },
  { id: "nobody", label: "No — they check their own work, or nobody does", factor: 0.6 },
];
export const FOCUS: { id: Focus; label: string; factor: number }[] = [
  { id: "weakest", label: "The topics they find hardest", factor: 1 },
  { id: "whatever", label: "Whatever the homework is", factor: 0.85 },
  { id: "favourite", label: "The subjects and topics they like", factor: 0.7 },
];

/** Focused, marked hours it typically takes to move one grade. Our working assumption, not a measured fact. */
export const HOURS_PER_GRADE = 30;

export type OnTrackInput = {
  current: Grade | null;      // null = parent doesn't know
  goal: GoalId;
  examMonth: string;          // "YYYY-MM-DD" (or "YYYY-MM")
  days: Days;
  practice: Practice;
  marking: Marking;
  focus: Focus;
};

export type Verdict = "on" | "borderline" | "off" | "hold" | "unknown";

export type Fix = { id: "timed" | "marked" | "weakest" | "days"; title: string; why: string };

export type OnTrackResult = {
  verdict: Verdict;
  goalGrade: Grade;
  steps: number;              // grades to climb (0 if already there)
  weeks: number;
  requiredHours: number;      // per week, to close the gap by the exam
  currentHours: number;       // per week, from days studied
  effectiveHours: number;     // after the habit factors
  fixes: Fix[];
};

/** Whole weeks from `today` until the exam (an ISO date, or a month → its first day). At least 1. */
export function weeksUntil(examDate: string, today = new Date()): number {
  const [y, m, d] = examDate.split("-").map(Number);
  if (!y || !m) return 1;
  const exam = new Date(y, m - 1, d || 1);
  return Math.max(1, Math.round((exam.getTime() - today.getTime()) / (7 * 864e5)));
}

/** When the main exams usually fall, for a parent who doesn't know the date yet. */
export function typicalExamDate(country: "NZ" | "AU" | "GB" | "US" | "CA", today = new Date()): string {
  const month = { NZ: 11, AU: 10, GB: 5, US: 5, CA: 6 }[country]; // Nov, Oct, May, May, June
  let y = today.getFullYear();
  // If this year's season is already here or gone (less than 3 weeks away), it's next year's.
  if (new Date(y, month - 1, 15).getTime() - today.getTime() < 21 * 864e5) y++;
  return `${y}-${String(month).padStart(2, "0")}-15`;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export function assess(input: OnTrackInput, today = new Date()): OnTrackResult {
  const goal = GOALS.find((g) => g.id === input.goal) ?? GOALS[2];
  const weeks = weeksUntil(input.examMonth, today);
  const currentHours = DAYS.find((d) => d.id === input.days)?.hours ?? 1.75;
  const factor =
    (PRACTICE.find((p) => p.id === input.practice)?.factor ?? 0.65) *
    (MARKING.find((m) => m.id === input.marking)?.factor ?? 0.6) *
    (FOCUS.find((f) => f.id === input.focus)?.factor ?? 0.85);
  const effectiveHours = round1(currentHours * factor);

  // The fixes, biggest lever first. Only the ones that apply.
  const fixes: Fix[] = [];
  if (input.practice === "notes" || input.practice === "unsure") fixes.push({ id: "timed", title: "Swap re-reading for timed exam questions", why: "Reading feels like progress and isn’t. Marks come from answering questions under time, then seeing what was wrong." });
  if (input.marking !== "regular") fixes.push({ id: "marked", title: "Get every answer marked honestly", why: "Self-marking is kind. An examiner isn’t. Work that nobody marks repeats the same mistakes until exam day." });
  if (input.focus !== "weakest") fixes.push({ id: "weakest", title: "Start every session on the weakest topic", why: "The grade is decided by the topics they avoid, not the ones they enjoy." });
  if (input.days === "0-1" || input.days === "2-3") fixes.push({ id: "days", title: "Shorter sessions, more days", why: "Twenty minutes on five days beats two hours on Sunday — the brain keeps what it meets often." });
  if (input.practice === "mixed" && fixes.length < 3) fixes.push({ id: "timed", title: "Make timed questions the default, not the extra", why: "Notes are for looking things up after a question went wrong, not for study time." });

  const base = { goalGrade: goal.grade, weeks, currentHours, effectiveHours, fixes: fixes.slice(0, 3) };

  if (!input.current) return { ...base, verdict: "unknown", steps: 0, requiredHours: 0 };

  const steps = GRADES.indexOf(goal.grade) - GRADES.indexOf(input.current);
  if (steps <= 0) {
    // Already there. The question becomes whether the habits will hold it.
    return { ...base, verdict: "hold", steps: 0, requiredHours: round1(HOURS_PER_GRADE / 2 / Math.max(weeks, 4)) };
  }
  const requiredHours = round1((steps * HOURS_PER_GRADE) / weeks);
  const ratio = effectiveHours / requiredHours;
  let verdict: Verdict = ratio >= 1 ? "on" : ratio >= 0.6 ? "borderline" : "off";
  // A three-grade climb in under ten weeks is rare whatever the habits.
  if (steps >= 3 && weeks < 10) verdict = "off";
  return { ...base, verdict, steps, requiredHours };
}

/** Months a parent can pick: this month and the next 17. */
export function examMonthOptions(today = new Date()): { value: string; label: string }[] {
  return Array.from({ length: 18 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) };
  });
}
