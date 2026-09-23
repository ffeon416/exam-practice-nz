// Subject goals: the foundation. The student says what grade they want in
// each subject and when the exam is; StudyAce maps the path from their
// baseline to it. Stored on the device for instant render and on the server
// (as append-only `subject_goal` events — no migration needed; the latest
// event per subject wins) so it survives devices and feeds reminders later.

import { scopedKey } from "./userScope";

export interface SubjectGoal {
  subject: string;
  /** Grade band id from the curriculum registry, e.g. "excellence", "band6". */
  goal: string;
  /** ISO date (YYYY-MM-DD) of the exam for this subject. */
  examDate: string;
  curriculumId: string;
  year: number;
  updatedAt: string;
  /** When the plan for this subject began (first time the goal was set). Papers before this don't count. */
  startedAt: string;
}

const KEY = "studyace-goals";

// Goals saved under the old per-system band ids (NCEA "excellence", HSC
// "band6", GCSE "grade9"…) map onto the letter scale.
const LEGACY_GOAL: Record<string, string> = { excellence: "a", merit: "b", achieved: "c", "not-achieved": "d" };
export function normalizeGoalId(id: string): string {
  if (["a-plus", "a", "b", "c", "d", "f"].includes(id)) return id;
  return LEGACY_GOAL[id] ?? "a";
}

export function loadGoals(): SubjectGoal[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(scopedKey(KEY));
    const parsed = raw ? (JSON.parse(raw) as SubjectGoal[]) : [];
    // Goals saved before startedAt existed: the plan began when they were set.
    return Array.isArray(parsed) ? parsed.map((g) => ({ ...g, goal: normalizeGoalId(g.goal), startedAt: g.startedAt ?? g.updatedAt })) : [];
  } catch {
    return [];
  }
}

export function saveGoalsLocal(goals: SubjectGoal[]): void {
  try { localStorage.setItem(scopedKey(KEY), JSON.stringify(goals)); } catch {}
}

/** Upsert one goal locally and on the server. */
export async function setGoal(goal: Omit<SubjectGoal, "updatedAt" | "startedAt">): Promise<SubjectGoal[]> {
  const existing = loadGoals().find((g) => g.subject === goal.subject);
  const nowIso = new Date().toISOString();
  const full: SubjectGoal = { ...goal, updatedAt: nowIso, startedAt: existing?.startedAt ?? nowIso };
  const next = [...loadGoals().filter((g) => g.subject !== goal.subject), full];
  saveGoalsLocal(next);
  fetch("/api/goals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(full),
    keepalive: true,
  }).catch(() => {});
  return next;
}

/** Pull the server copy and merge (server wins on conflicts by updatedAt). */
export async function syncGoals(): Promise<SubjectGoal[]> {
  const local = loadGoals();
  try {
    const res = await fetch("/api/goals", { headers: { "Cache-Control": "no-store" } });
    if (!res.ok) return local;
    const { goals } = (await res.json()) as { goals: SubjectGoal[] };
    const bySubject = new Map<string, SubjectGoal>();
    for (const raw of [...local, ...(goals ?? [])]) {
      const g = { ...raw, goal: normalizeGoalId(raw.goal) };
      const cur = bySubject.get(g.subject);
      if (!cur || g.updatedAt > cur.updatedAt) bySubject.set(g.subject, g);
    }
    const merged = [...bySubject.values()];
    saveGoalsLocal(merged);
    return merged;
  } catch {
    return local;
  }
}

export function goalFor(goals: SubjectGoal[], subject: string): SubjectGoal | null {
  return goals.find((g) => g.subject === subject) ?? null;
}
