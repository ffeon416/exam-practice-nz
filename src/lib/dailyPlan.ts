// The daily path. Duolingo-style: a sequence of nodes you do in order, one a
// day on task days, locked until you reach them. Every week ends with a
// grade check that re-measures; the next week's load is set from the pace
// (on track → light week, behind → heavier, unrealistic → daily). Pure.

import type { PaceState } from "./journey";

export type NodeKind = "check" | "paper" | "fix" | "mock";
export interface DayNode {
  i: number;                // 0-based order across the whole path
  week: number;             // 0-based
  date: number;             // ms
  kind: NodeKind;
  title: string;
  state: "done" | "current" | "locked";
}
export interface PlanWeek {
  k: number;
  start: number;
  end: number;
  nodes: DayNode[];
  done: number;
  total: number;
  /** Why this week looks the way it does. */
  note: string;
  state: "done" | "current" | "locked";
}

const DAY = 864e5;

/** Which weekdays (0 = first day of the week) carry a task, by pace. */
function cadence(pace: PaceState, hasWeakSpot: boolean): { days: number[]; kinds: NodeKind[]; note: string } {
  if (pace === "unrealistic") {
    return {
      days: [0, 1, 2, 3, 4, 5],
      kinds: ["paper", hasWeakSpot ? "fix" : "paper", "paper", "mock", hasWeakSpot ? "fix" : "paper", "paper"],
      note: "Heavy week: the goal needs more than the usual pace. Six tasks, then a check.",
    };
  }
  if (pace === "behind") {
    return {
      days: [0, 1, 2, 3, 4],
      kinds: ["paper", "paper", hasWeakSpot ? "fix" : "paper", "paper", "mock"],
      note: "You're behind the line, so this week has five tasks instead of three.",
    };
  }
  return {
    days: [0, 2, 4],
    kinds: ["paper", hasWeakSpot ? "fix" : "paper", "mock"],
    note: pace === "there" ? "You're at goal level. Three tasks to keep it there, then a check." : "On track. Three tasks this week, then a check.",
  };
}

export function buildDailyPlan(opts: {
  now: number;
  exam: number;
  /** Papers completed since the baseline grade check (baseline excluded). */
  completed: number;
  hasBaseline: boolean;
  pace: PaceState;
  hasWeakSpot: boolean;
}): { weeks: PlanWeek[]; current: DayNode | null; totalWeeks: number } {
  const startOfToday = new Date(opts.now); startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const exam = Math.max(opts.exam, today + 7 * DAY);
  const totalWeeks = Math.max(1, Math.min(12, Math.ceil((exam - today) / (7 * DAY))));

  const weeks: PlanWeek[] = [];
  let i = 0;
  let completed = opts.completed;

  // No baseline yet: the whole path is one node. Nothing else opens until it's done.
  if (!opts.hasBaseline) {
    const n: DayNode = { i: 0, week: 0, date: today, kind: "check", title: "Grade check", state: "current" };
    return { weeks: [{ k: 0, start: today, end: today + 7 * DAY, nodes: [n], done: 0, total: 1, note: "Everything starts here. Eight questions, marked properly, so we know where you are.", state: "current" }], current: n, totalWeeks };
  }

  // Which week are we in? Completed nodes fill weeks in order; the week
  // holding the first unfinished node is "current". Only the current and the
  // next week are laid out — later weeks are re-planned after each check.
  for (let k = 0; k < Math.min(totalWeeks, 8); k++) {
    const c = cadence(opts.pace, opts.hasWeakSpot);
    const start = today + k * 7 * DAY; // planning is always relative to today
    const nodes: DayNode[] = [];
    c.days.forEach((d, j) => {
      nodes.push({ i: i++, week: k, date: start + d * DAY, kind: c.kinds[j], title: titleFor(c.kinds[j]), state: "locked" });
    });
    nodes.push({ i: i++, week: k, date: start + 6 * DAY, kind: "check", title: "Weekly grade check", state: "locked" });
    const w: PlanWeek = { k, start, end: start + 7 * DAY, nodes, done: 0, total: nodes.length, note: c.note, state: "locked" };
    weeks.push(w);
  }

  // Assign states in order.
  let current: DayNode | null = null;
  for (const w of weeks) {
    for (const n of w.nodes) {
      if (completed > 0) { n.state = "done"; completed--; w.done++; }
      else if (!current) { n.state = "current"; current = n; }
    }
  }
  for (const w of weeks) {
    w.state = w.done === w.total ? "done" : w.nodes.some((n) => n.state === "current") ? "current" : "locked";
  }
  // Everything done (short runway, or a very active student): the last grade
  // check stays open — re-checking is always useful and updates the plan.
  if (!current && weeks.length) {
    const lastWeek = weeks[weeks.length - 1];
    const lastNode = lastWeek.nodes[lastWeek.nodes.length - 1];
    lastNode.state = "current"; lastNode.title = "Grade check · re-measure";
    lastWeek.done = Math.max(0, lastWeek.done - 1); lastWeek.state = "current";
    lastWeek.note = "Week complete. Sit the grade check again to update where you are and plan the next week.";
    current = lastNode;
  }
  // Shift dates so the current node is today (the plan follows the student, not the calendar).
  if (current) {
    const shift = today - current.date;
    for (const w of weeks) { w.start += shift; w.end += shift; for (const n of w.nodes) n.date += shift; }
  }
  return { weeks, current, totalWeeks };
}

function titleFor(kind: NodeKind): string {
  return kind === "paper" ? "Practice paper" : kind === "fix" ? "Fix your weak spot" : kind === "mock" ? "Mock exam" : "Grade check";
}
