// Study planner — builds a week-by-week revision plan from the student's
// exam date, year level, and chosen subjects. Plans are persisted in
// localStorage and exposed via the React 19 useSyncExternalStore pattern,
// so the dashboard, navbar, and /plan page all stay in sync without anyone
// calling setState inside an effect.

import { ALL_EXAMS } from "@/data/exams";
import { loadProgress, getWeakTopics } from "@/lib/storage";
import { getTopicLabel } from "@/data/topics";
import type { Exam } from "@/lib/types";

const PLAN_KEY = "study-plan";

// ── Types ──────────────────────────────────────────────────────────────

export interface StudyPlan {
  examDate: string; // ISO date (YYYY-MM-DD)
  subjects: string[]; // e.g. ['mathematics', 'english']
  yearLevel: number; // 10-13
  weeks: StudyWeek[];
  createdAt: string;
}

export interface StudyWeek {
  weekNumber: number;
  startDate: string;
  endDate: string;
  focus: string; // e.g. "Calculus & Algebra"
  tasks: StudyTask[];
}

export interface StudyTask {
  id: string;
  description: string;
  type: "exam" | "review" | "practice";
  examId?: string;
  subject?: string;
  topic?: string;
  completed: boolean;
}

// ── Helpers ────────────────────────────────────────────────────────────

function yearLevelToNceaLevel(yearLevel: number): 0 | 1 | 2 | 3 {
  if (yearLevel <= 10) return 0;
  if (yearLevel === 11) return 1;
  if (yearLevel === 12) return 2;
  return 3;
}

const SUBJECT_LABELS: Record<string, string> = {
  mathematics: "Mathematics",
  statistics: "Statistics",
  science: "Science",
  biology: "Biology",
  chemistry: "Chemistry",
  physics: "Physics",
  english: "English",
  accounting: "Accounting",
  economics: "Economics",
  geography: "Geography",
  history: "History",
  health: "Health",
  "digital-tech": "Digital Tech",
  "social-studies": "Social Studies",
  "te-reo": "Te Reo Māori",
  "media-studies": "Media Studies",
  "classical-studies": "Classical Studies",
  "art-history": "Art History",
  "business-studies": "Business Studies",
};

export function subjectLabel(subject: string): string {
  return SUBJECT_LABELS[subject] ?? subject;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseLocalDate(iso: string): Date {
  // Treat stored ISO date as local midnight so week boundaries stay stable
  // regardless of timezone.
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function startOfWeek(date: Date): Date {
  // Monday-based weeks
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diff = (day + 6) % 7; // days since Monday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Exam catalog lookup ────────────────────────────────────────────────

function examsForSubject(subject: string, yearLevel: number): Exam[] {
  const level = yearLevelToNceaLevel(yearLevel);
  // Match subject, prefer exams at the student's NCEA level, but fall back
  // to adjacent levels when there aren't enough papers for that subject.
  const atLevel = ALL_EXAMS.filter(
    (e) => e.subject === subject && e.level === level
  );
  if (atLevel.length > 0) return atLevel;
  return ALL_EXAMS.filter((e) => e.subject === subject);
}

// ── Plan generation ────────────────────────────────────────────────────

/**
 * Generate a week-by-week study plan. The plan always has at least one week,
 * even if the exam is very close. Weeks run Monday-Sunday. The earliest weeks
 * focus on the student's weakest topics first; the final week is reserved
 * for mock exams and light review.
 */
export function createPlan(
  examDate: string,
  subjects: string[],
  yearLevel: number
): StudyPlan {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = parseLocalDate(examDate);

  const firstWeekStart = startOfWeek(today);
  const examWeekStart = startOfWeek(exam);
  const rawWeeks =
    Math.max(0, Math.round((examWeekStart.getTime() - firstWeekStart.getTime()) / (7 * 86400000))) + 1;
  // Clamp to a sensible range. Plans with 20+ weeks just get repetitive.
  const totalWeeks = Math.min(Math.max(rawWeeks, 1), 20);

  // Figure out weakest topics up front so the first weeks prioritise them.
  const progress = typeof window === "undefined" ? null : loadProgress();
  const weakTopics = progress ? getWeakTopics(progress, 10) : [];

  const weeks: StudyWeek[] = [];

  for (let i = 0; i < totalWeeks; i++) {
    const weekStart = addDays(firstWeekStart, i * 7);
    const weekEnd = addDays(weekStart, 6);
    const isFinalWeek = i === totalWeeks - 1;
    const weekNumber = i + 1;

    // Rotate subjects so each gets focused attention but nothing is forgotten.
    // In a short plan (<= subjects.length) each week handles one subject.
    // In a longer plan we cycle through subjects, mixing in a review week
    // every few weeks.
    const weekSubjects = pickWeekSubjects(subjects, i, totalWeeks);
    const focus = weekSubjects.map(subjectLabel).join(" & ");

    const tasks: StudyTask[] = isFinalWeek
      ? buildFinalWeekTasks(subjects, yearLevel, weekNumber)
      : buildWeekTasks(
          weekSubjects,
          yearLevel,
          weekNumber,
          i,
          weakTopics.map((t) => ({ topic: t.topic, label: getTopicLabel(t.topic) }))
        );

    weeks.push({
      weekNumber,
      startDate: toIsoDate(weekStart),
      endDate: toIsoDate(weekEnd),
      focus: focus || "Revision",
      tasks,
    });
  }

  const plan: StudyPlan = {
    examDate: toIsoDate(exam),
    subjects,
    yearLevel,
    weeks,
    createdAt: new Date().toISOString(),
  };

  return plan;
}

function pickWeekSubjects(
  subjects: string[],
  weekIndex: number,
  totalWeeks: number
): string[] {
  if (subjects.length === 0) return [];
  if (totalWeeks <= subjects.length) {
    // Short plan — one subject per week (last weeks may repeat earlier ones).
    return [subjects[weekIndex % subjects.length]];
  }
  // Longer plan — give each subject focused weeks proportional to count, but
  // keep pairs of two subjects in the same week so skills don't go stale.
  const primary = subjects[weekIndex % subjects.length];
  const secondary = subjects[(weekIndex + 1) % subjects.length];
  return primary === secondary ? [primary] : [primary, secondary];
}

function buildWeekTasks(
  weekSubjects: string[],
  yearLevel: number,
  weekNumber: number,
  weekIndex: number,
  weakTopics: Array<{ topic: string; label: string }>
): StudyTask[] {
  const tasks: StudyTask[] = [];
  let taskIdx = 0;
  const newId = (kind: string) => `w${weekNumber}-${kind}-${taskIdx++}`;
  const level = yearLevelToNceaLevel(yearLevel);
  const levelLabel = level === 0 ? `Year ${yearLevel}` : `Level ${level}`;

  for (const subject of weekSubjects) {
    const label = subjectLabel(subject);
    const exams = examsForSubject(subject, yearLevel);

    // Primary task: a practice exam — link to a catalog paper if available,
    // otherwise link to the AI exam builder.
    if (exams.length > 0) {
      const paper = exams[weekIndex % exams.length];
      tasks.push({
        id: newId("exam"),
        description: `${label} ${levelLabel} — complete a practice exam`,
        type: "exam",
        subject,
        examId: paper.id,
        completed: false,
      });
    } else {
      tasks.push({
        id: newId("exam"),
        description: `${label} ${levelLabel} — generate a practice exam`,
        type: "exam",
        subject,
        completed: false,
      });
    }

    // Second task: targeted practice on a different paper or via the builder
    if (exams.length > 1) {
      const second = exams[(weekIndex + 1) % exams.length];
      tasks.push({
        id: newId("practice"),
        description: `${label} — practise a different topic area`,
        type: "practice",
        subject,
        examId: second.id !== exams[weekIndex % exams.length].id ? second.id : undefined,
        completed: false,
      });
    } else {
      tasks.push({
        id: newId("practice"),
        description: `${label} — build a custom practice paper`,
        type: "practice",
        subject,
        completed: false,
      });
    }
  }

  // Review task — target weak topics first, then general review
  const weak = weakTopics[weekIndex % Math.max(weakTopics.length, 1)];
  if (weak) {
    tasks.push({
      id: newId("review"),
      description: `Review: ${weak.label} (your weakest area)`,
      type: "review",
      topic: weak.topic,
      completed: false,
    });
  } else {
    tasks.push({
      id: newId("review"),
      description: `Review your marked answers from this week`,
      type: "review",
      completed: false,
    });
  }

  return tasks.slice(0, 5);
}

function buildFinalWeekTasks(
  subjects: string[],
  yearLevel: number,
  weekNumber: number
): StudyTask[] {
  const tasks: StudyTask[] = [];
  let taskIdx = 0;
  const newId = (kind: string) => `w${weekNumber}-final-${kind}-${taskIdx++}`;
  const level = yearLevelToNceaLevel(yearLevel);
  const levelLabel = level === 0 ? `Year ${yearLevel}` : `Level ${level}`;

  // One mock exam per subject
  for (const subject of subjects) {
    const label = subjectLabel(subject);
    const exams = examsForSubject(subject, yearLevel).slice().sort(
      (a, b) => b.year - a.year
    );
    const paper = exams[0];
    tasks.push({
      id: newId("mock"),
      description: `${label} ${levelLabel} — timed mock exam`,
      type: "exam",
      subject,
      examId: paper?.id,
      completed: false,
    });
  }

  tasks.push({
    id: newId("light"),
    description: "Light review only — skim your notes, no new material",
    type: "review",
    completed: false,
  });

  tasks.push({
    id: newId("rest"),
    description: "Rest the day before — eat well, hydrate, sleep early",
    type: "review",
    completed: false,
  });

  return tasks.slice(0, 5);
}

// ── Storage + external-store subscription ──────────────────────────────

export function loadPlan(): StudyPlan | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StudyPlan;
  } catch {
    return null;
  }
}

export function savePlan(plan: StudyPlan): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PLAN_KEY, JSON.stringify(plan));
    notify();
  } catch {
    // Storage full or disabled — fail silently
  }
}

export function clearPlan(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PLAN_KEY);
  notify();
}

export function markTaskComplete(taskId: string): void {
  const plan = loadPlan();
  if (!plan) return;
  let changed = false;
  for (const week of plan.weeks) {
    for (const task of week.tasks) {
      if (task.id === taskId) {
        task.completed = !task.completed;
        changed = true;
      }
    }
  }
  if (changed) savePlan(plan);
}

/**
 * Returns the week containing today (by local date). If today is before
 * the first week or after the last, falls back to the nearest week so the
 * dashboard still has something to show.
 */
export function getCurrentWeek(): StudyWeek | null {
  const plan = loadPlan();
  if (!plan || plan.weeks.length === 0) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const week of plan.weeks) {
    const start = parseLocalDate(week.startDate);
    const end = parseLocalDate(week.endDate);
    if (today >= start && today <= end) return week;
  }

  // Before first week? Use first. Past last week? Use last.
  const firstStart = parseLocalDate(plan.weeks[0].startDate);
  if (today < firstStart) return plan.weeks[0];
  return plan.weeks[plan.weeks.length - 1];
}

export function getWeeksUntilExam(plan: StudyPlan): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = parseLocalDate(plan.examDate);
  const diff = Math.ceil((exam.getTime() - today.getTime()) / (7 * 86400000));
  return Math.max(diff, 0);
}

export function getDaysUntilExam(plan: StudyPlan): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = parseLocalDate(plan.examDate);
  const diff = Math.ceil((exam.getTime() - today.getTime()) / 86400000);
  return Math.max(diff, 0);
}

export function getWeekProgress(week: StudyWeek): {
  done: number;
  total: number;
  pct: number;
} {
  const total = week.tasks.length;
  const done = week.tasks.filter((t) => t.completed).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { done, total, pct };
}

// ── External-store subscription (React 19 / useSyncExternalStore) ──────

type Listener = () => void;
const listeners = new Set<Listener>();
let version = 0;

function notify() {
  version += 1;
  listeners.forEach((l) => l());
}

export function subscribePlan(listener: Listener): () => void {
  if (typeof window === "undefined") return () => {};
  listeners.add(listener);

  const onStorage = (e: StorageEvent) => {
    if (e.key === PLAN_KEY) notify();
  };
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getPlanVersion(): number {
  return version;
}

export function getServerPlanVersion(): number {
  return 0;
}
