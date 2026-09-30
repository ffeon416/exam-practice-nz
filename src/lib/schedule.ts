// The schedule engine. Pure, no React.
//
// A plan runs in weeks of seven days. Day 1 of every week is a grade check:
// eight marked questions that tell us where the student is against the pace
// line to their goal. That read decides the shape of the six days after it:
//
//   behind pace  → lessons first: teach what's costing marks, then test it
//   on track     → balanced: papers, lessons and mocks in turn
//   ahead/there  → pressure practice: mocks, with lessons to keep it honest
//   exam ≤ 8 days → exam week: mocks and fixes only
//
// A "review" day is a lesson built from the questions they actually dropped
// marks on, followed by a short paper on exactly that. It only appears when
// there's something to review; otherwise it becomes a paper.

import type { TaskKind } from "./dailyTask";

export type PaceState = "there" | "ahead" | "track" | "behind" | "far";
export type WeekFocus = "lessons" | "balanced" | "mocks" | "final";

export const WEEK_LEN = 7;

/** 1-based week number of a 1-based plan day. */
export function weekOf(day: number): number { return Math.floor((day - 1) / WEEK_LEN) + 1; }
/** 1..7 position of a plan day inside its week. Day 1 of a week is the grade check. */
export function dayInWeek(day: number): number { return ((day - 1) % WEEK_LEN) + 1; }
/** The plan day a week starts on. */
export function weekStartDay(week: number): number { return (week - 1) * WEEK_LEN + 1; }

export function weekFocus(opts: { pace: PaceState | null; examDays: number | null }): WeekFocus {
  if (opts.examDays != null && opts.examDays >= 0 && opts.examDays <= 8) return "final";
  switch (opts.pace) {
    case "behind": case "far": return "lessons";
    case "ahead": case "there": return "mocks";
    default: return "balanced";
  }
}

// Positions 2..7 of the week (position 1 is always the grade check).
const TEMPLATES: Record<WeekFocus, TaskKind[]> = {
  lessons:  ["review", "paper", "review", "mock", "review", "paper"],
  balanced: ["paper", "review", "mock", "paper", "review", "mock"],
  mocks:    ["mock", "paper", "mock", "review", "paper", "mock"],
  final:    ["mock", "review", "mock", "paper", "mock", "review"],
};

export const FOCUS_LABEL: Record<WeekFocus, string> = {
  lessons: "Lessons first",
  balanced: "On track",
  mocks: "Pressure practice",
  final: "Exam week",
};

export function taskForDay(opts: {
  day: number;                                  // 1-based plan day
  subjects: string[];                           // in the student's chosen order
  hasBaseline: (subject: string) => boolean;
  hasReviewMaterial: (subject: string) => boolean;
  focusFor: (subject: string) => WeekFocus;
  /** What they got yesterday. Today is never the same kind twice in a row. */
  yesterdayKind?: TaskKind | null;
}): { subject: string; kind: TaskKind } {
  const subjects = opts.subjects.length ? opts.subjects : ["mathematics"];
  const prev = opts.yesterdayKind ?? null;
  const measured = subjects.filter((s) => opts.hasBaseline(s));
  // Any subject still unmeasured takes priority, in order — unless yesterday
  // was already a grade check and there's a measured subject to work on.
  const unmeasured = subjects.find((s) => !opts.hasBaseline(s));
  if (unmeasured && !(prev === "check" && measured.length > 0)) return { subject: unmeasured, kind: "check" };
  const pool = measured.length ? measured : subjects;
  const subject = pool[(opts.day - 1) % pool.length];
  const pos = dayInWeek(opts.day);
  let kind: TaskKind = pos === 1 ? "check" : TEMPLATES[opts.focusFor(subject)][pos - 2];
  if (kind === "check" && unmeasured) kind = "mock"; // that subject's check happens on its own day
  if (kind === "review" && !opts.hasReviewMaterial(subject)) kind = prev === "paper" ? "mock" : "paper";
  if (kind === prev) kind = nextDifferent(kind, opts.hasReviewMaterial(subject));
  return { subject, kind };
}

function nextDifferent(kind: TaskKind, canReview: boolean): TaskKind {
  switch (kind) {
    case "check": return "paper";
    case "mock": return canReview ? "review" : "paper";
    case "paper": return "mock";
    case "review": return "paper";
  }
}

/** Where a score sits against the straight pace line from the first plan score to the goal on exam day. */
export function paceRead(opts: {
  points: { date: string; pct: number }[];   // oldest first, local date keys
  planStart: string;                          // local date key of day 1
  examDate: string | null;                    // YYYY-MM-DD
  goalPct: number;
  today: string;
}): { state: PaceState; you: number; shouldBe: number; diff: number } | null {
  const first = opts.points[0]; const last = opts.points[opts.points.length - 1];
  if (!first || !last) return null;
  const startT = new Date(opts.planStart + "T12:00:00").getTime();
  const examT = opts.examDate ? new Date(opts.examDate + "T12:00:00").getTime() : startT + 56 * 864e5;
  const span = Math.max(864e5, examT - startT);
  const f = Math.min(1, Math.max(0, (new Date(opts.today + "T12:00:00").getTime() - startT) / span));
  const shouldBe = first.pct + (opts.goalPct - first.pct) * f;
  const you = last.pct;
  const diff = Math.round(you - shouldBe);
  const state: PaceState = you >= opts.goalPct ? "there" : diff < -15 ? "far" : diff < -4 ? "behind" : diff > 4 ? "ahead" : "track";
  return { state, you, shouldBe: Math.round(shouldBe), diff };
}

/** The headline and the sentence under it that explain this week's shape. */
export function weekLine(opts: {
  focus: WeekFocus;
  pace: ReturnType<typeof paceRead>;
  hasBaseline: boolean;
  subjectLabel: string;
  goalLabel: string;
  reviewLabel: string | null;   // what the lessons are about, e.g. "coastal processes"
  examDays: number | null;
  kinds: TaskKind[];            // this week's seven kinds
}): { title: string; sub: string } {
  const n = (k: TaskKind) => opts.kinds.filter((x) => x === k).length;
  const words = ["no", "one", "two", "three", "four", "five", "six"];
  const lessons = n("review"), mocks = n("mock"), papers = n("paper");
  const on = opts.reviewLabel ? ` on ${opts.reviewLabel}` : "";
  const parts = [lessons ? `${words[lessons]} lesson${lessons === 1 ? "" : "s"}${on}` : "", mocks ? `${words[mocks]} mock${mocks === 1 ? "" : "s"}` : "", papers ? `${words[papers]} paper${papers === 1 ? "" : "s"}` : ""].filter(Boolean);
  const mix = parts.length > 1 ? parts.slice(0, -1).join(", ") + " and " + parts[parts.length - 1] : parts[0] ?? "";

  if (!opts.hasBaseline) return { title: "Start with a grade check.", sub: `Eight marked questions in ${opts.subjectLabel}. That number sets your pace line to ${opts.goalLabel} and shapes every day after it.` };
  if (opts.focus === "final") return { title: "Exam week. Mocks and fixes.", sub: `${opts.examDays === 0 ? "Your exam is today." : `Your ${opts.subjectLabel} exam is in ${opts.examDays} day${opts.examDays === 1 ? "" : "s"}.`} Timed mocks to practise the pressure, lessons to close the last gaps: ${mix}.` };
  const p = opts.pace;
  if (!p) return { title: "Week one. Building your line.", sub: `From your check, this week is ${mix}. Next Sunday's check tells us whether to change it.` };
  switch (opts.focus) {
    case "lessons": return {
      title: p.state === "far" ? "Behind pace. We teach first." : "A bit behind. Lessons first.",
      sub: `Your check put you ${Math.abs(p.diff)} point${Math.abs(p.diff) === 1 ? "" : "s"} under the pace line in ${opts.subjectLabel}, so this week is ${mix}. Lessons are built from the questions you dropped marks on, then you sit a short paper on exactly that.`,
    };
    case "mocks": return {
      title: p.state === "there" ? `You're at ${opts.goalLabel}. Now make it stick.` : `${p.diff} points ahead. Pressure practice.`,
      sub: `You're ${p.state === "there" ? "already at your goal" : "ahead of the pace line"} in ${opts.subjectLabel}, so this week is ${mix}: timed papers, like the real day, with a lesson to keep the weak spots closed.`,
    };
    default: return {
      title: "On track. Keep the rhythm.",
      sub: `You're ${Math.abs(p.diff) <= 1 ? "right on" : `within ${Math.abs(p.diff)} points of`} the pace line in ${opts.subjectLabel}. This week is ${mix}. Sunday's check tells us whether to change it.`,
    };
  }
}
