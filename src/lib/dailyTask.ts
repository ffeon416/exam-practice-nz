// The daily task. One thing per day, chosen for the student, dropped at
// midnight in their own timezone (the browser's). They only ever see today.
// Pure: dates, picking, streaks. No React.

export type TaskKind = "check" | "mock" | "paper" | "fix";

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

// The rhythm we set: mock, paper, fix, mock, paper, fix, grade check — then
// repeat. A subject with no baseline always gets its grade check first.
const CYCLE: TaskKind[] = ["mock", "paper", "fix", "mock", "paper", "fix", "check"];

export function taskForDay(opts: {
  day: number;                 // 1-based
  subjects: string[];          // in the student's chosen order
  hasBaseline: (subject: string) => boolean;
  hasWeakSpot: (subject: string) => boolean;
}): { subject: string; kind: TaskKind } {
  const subjects = opts.subjects.length ? opts.subjects : ["mathematics"];
  // Any subject still unmeasured takes priority, in order.
  const unmeasured = subjects.find((s) => !opts.hasBaseline(s));
  if (unmeasured) return { subject: unmeasured, kind: "check" };
  const subject = subjects[(opts.day - 1) % subjects.length];
  let kind = CYCLE[(opts.day - 1) % CYCLE.length];
  if (kind === "fix" && !opts.hasWeakSpot(subject)) kind = "paper";
  return { subject, kind };
}

export const TASK_TITLE: Record<TaskKind, string> = {
  check: "Grade check",
  mock: "Mock exam",
  paper: "Practice paper",
  fix: "Fix your weak spot",
};
export const TASK_BLURB: Record<TaskKind, string> = {
  check: "Eight questions, marked properly. Sets where you are and shapes what comes next.",
  mock: "Timed, full length, no feedback until the end. Like the real day.",
  paper: "A fresh paper in your exam's style, marked the moment you finish.",
  fix: "Built on the one thing losing you the most marks right now.",
};
export const TASK_LENGTH: Record<TaskKind, string> = {
  check: "8 questions · about 15 min",
  mock: "12 questions · timed",
  paper: "8 questions · about 15 min",
  fix: "8 questions · about 15 min",
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
