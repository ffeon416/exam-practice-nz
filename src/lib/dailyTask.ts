// The daily task: dates, labels, streaks. Which task lands on which day is
// decided in schedule.ts. Pure, no React.

export type TaskKind = "check" | "mock" | "paper" | "review";

/** YYYY-MM-DD in the student's local timezone. */
export function localDateKey(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function msUntilLocalMidnight(now: Date = new Date()): number {
  const next = new Date(now); next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}

/** Whole local calendar days from today until an ISO date (0 = today, negative = past). */
export function daysUntil(isoDate: string, now: Date = new Date()): number {
  const t = new Date(now); t.setHours(0, 0, 0, 0);
  const e = new Date(isoDate + "T00:00:00");
  return Math.round((e.getTime() - t.getTime()) / 864e5);
}

/** 1-based day number since the plan began (local calendar days). */
export function dayNumber(startedAtIso: string, now: Date = new Date()): number {
  const s = new Date(startedAtIso); s.setHours(0, 0, 0, 0);
  const t = new Date(now); t.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round((t.getTime() - s.getTime()) / 864e5) + 1);
}

/** Read the task kind back out of a built paper's title ("Day 2026-09-23 · Grade check · Economics"). */
/** Old task logs stored "fix"; it's "review" now. */
export function normalizeKind(k: string | null | undefined): TaskKind | null {
  if (k === "fix") return "review";
  return k === "check" || k === "mock" || k === "paper" || k === "review" ? k : null;
}

export function kindFromTitle(title: string | null | undefined): TaskKind | null {
  if (!title) return null;
  if (title.includes("Grade check")) return "check";
  if (title.includes("Mock exam")) return "mock";
  if (title.includes("Weak spot") || title.includes("Review lesson")) return "review";
  if (title.includes("Practice paper")) return "paper";
  return null;
}

export const TASK_TITLE: Record<TaskKind, string> = {
  check: "Grade\ncheck",
  mock: "Mock\nexam",
  paper: "Practice\npaper",
  review: "Review\nlesson",
};
export const TASK_CTA: Record<TaskKind, string> = {
  check: "Check my grade →",
  mock: "Start the mock →",
  paper: "Start the paper →",
  review: "Start the lesson →",
};
export const TASK_META: Record<TaskKind, { questions: number; minutes: number }> = {
  check: { questions: 8, minutes: 15 },
  mock: { questions: 12, minutes: 30 },
  paper: { questions: 8, minutes: 15 },
  review: { questions: 6, minutes: 20 },
};
export const TASK_BLURB: Record<TaskKind, string> = {
  check: "Eight questions, marked properly. Sets where you are and shapes what comes next.",
  mock: "Timed, full length, no feedback until the end. Like the real day.",
  paper: "A fresh paper in your exam's style, marked the moment you finish.",
  review: "A lesson built from the questions you dropped marks on, then six questions on exactly that.",
};
export const TASK_LENGTH: Record<TaskKind, string> = {
  check: "8 questions · about 15 min",
  mock: "12 questions · timed",
  paper: "8 questions · about 15 min",
  review: "lesson + 6 questions · about 20 min",
};

/** Consecutive days with at least one marked paper, ending today or yesterday. */
export function streakDays(attemptDates: string[], today: string = localDateKey()): number {
  const set = new Set(attemptDates);
  const d = new Date(today + "T12:00:00");
  if (!set.has(localDateKey(d))) { d.setDate(d.getDate() - 1); if (!set.has(localDateKey(d))) return 0; }
  let n = 0;
  while (set.has(localDateKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/** Last N local days as [{key, done, isToday}] oldest → newest. */
export function recentDays(attemptDates: string[], n = 14, today: string = localDateKey()): { key: string; done: boolean; isToday: boolean; label: string }[] {
  const set = new Set(attemptDates);
  const out = [];
  const d = new Date(today + "T12:00:00"); d.setDate(d.getDate() - (n - 1));
  for (let i = 0; i < n; i++) {
    const key = localDateKey(d);
    out.push({ key, done: set.has(key), isToday: key === today, label: d.toLocaleDateString("en-NZ", { weekday: "narrow" }) });
    d.setDate(d.getDate() + 1);
  }
  return out;
}
