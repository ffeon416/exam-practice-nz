"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  clearPlan,
  createPlan,
  getCurrentWeek,
  getDaysUntilExam,
  getPlanVersion,
  getServerPlanVersion,
  getWeekProgress,
  getWeeksUntilExam,
  loadPlan,
  markTaskComplete,
  savePlan,
  subjectLabel,
  subscribePlan,
  type StudyPlan,
  type StudyTask,
  type StudyWeek,
} from "@/lib/studyPlanner";

// Subjects offered by the plan form. Keep the list aligned with the
// /generate page so students see familiar options.
const SUBJECTS: Array<{ value: string; label: string; years: number[] }> = [
  { value: "mathematics", label: "Mathematics", years: [10, 11, 12, 13] },
  { value: "science", label: "Science", years: [10, 11] },
  { value: "statistics", label: "Statistics", years: [11, 12, 13] },
  { value: "english", label: "English", years: [10, 11, 12, 13] },
  { value: "biology", label: "Biology", years: [11, 12, 13] },
  { value: "chemistry", label: "Chemistry", years: [12, 13] },
  { value: "physics", label: "Physics", years: [12, 13] },
  { value: "history", label: "History", years: [11, 13] },
  { value: "geography", label: "Geography", years: [11, 12, 13] },
  { value: "te-reo", label: "Te Reo Māori", years: [11, 12, 13] },
  { value: "economics", label: "Economics", years: [11, 12, 13] },
  { value: "accounting", label: "Accounting", years: [11, 12, 13] },
  { value: "health", label: "Health", years: [10, 11] },
  { value: "digital-tech", label: "Digital Technologies", years: [10] },
  { value: "social-studies", label: "Social Studies", years: [10] },
  { value: "media-studies", label: "Media Studies", years: [12, 13] },
  { value: "classical-studies", label: "Classical Studies", years: [12, 13] },
  { value: "art-history", label: "Art History", years: [12, 13] },
  { value: "business-studies", label: "Business Studies", years: [13] },
];

export default function PlanPage() {
  // Drive all reads through useSyncExternalStore so the page re-renders
  // whenever the plan is saved, cleared, or tasks are toggled.
  const version = useSyncExternalStore(
    subscribePlan,
    getPlanVersion,
    getServerPlanVersion
  );

  // Gate the first client render behind `mounted` so returning users don't
  // get a hydration mismatch between SSR (no plan) and the stored plan.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const plan = useMemo<StudyPlan | null>(() => {
    void version;
    if (!mounted) return null;
    return loadPlan();
  }, [version, mounted]);

  // Keep the initial client render identical to SSR by showing a neutral
  // placeholder until the mount effect flips `mounted`.
  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-zinc-500 text-sm">
        Loading plan…
      </div>
    );
  }
  if (!plan) return <PlanCreateForm />;
  return <PlanView plan={plan} />;
}

// ── Create form ────────────────────────────────────────────────────────

function PlanCreateForm() {
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 42); // ~6 weeks out
    return d.toISOString().slice(0, 10);
  })();

  const [examDate, setExamDate] = useState(defaultDate);
  const [yearLevel, setYearLevel] = useState<number>(11);
  const [subjects, setSubjects] = useState<string[]>(["mathematics", "english"]);
  const [error, setError] = useState<string | null>(null);

  const availableSubjects = SUBJECTS.filter((s) => s.years.includes(yearLevel));

  function toggleSubject(value: string) {
    setSubjects((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function handleYearChange(year: number) {
    setYearLevel(year);
    // Drop any subjects that aren't offered at the new year level.
    const allowed = SUBJECTS.filter((s) => s.years.includes(year)).map(
      (s) => s.value
    );
    setSubjects((prev) => prev.filter((v) => allowed.includes(v)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!examDate) {
      setError("Pick an exam date.");
      return;
    }
    if (subjects.length === 0) {
      setError("Select at least one subject.");
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(examDate);
    if (exam < today) {
      setError("Exam date must be in the future.");
      return;
    }

    const plan = createPlan(examDate, subjects, yearLevel);
    savePlan(plan);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Study Planner</h1>
      <p className="text-sm sm:text-base text-zinc-400 mb-8">
        Tell us when your exam is and we&apos;ll build a week-by-week plan —
        weakest topics first.
      </p>

      <form
        onSubmit={handleSubmit}
        className="bg-card border border-card-border rounded-lg p-6 space-y-6"
      >
        <div>
          <label
            htmlFor="examDate"
            className="block text-sm font-medium text-zinc-300 mb-2"
          >
            Exam date
          </label>
          <input
            id="examDate"
            type="date"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Year level
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[10, 11, 12, 13].map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => handleYearChange(y)}
                className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                  yearLevel === y
                    ? "bg-indigo-600 text-white"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                Year {y}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Subjects ({subjects.length} selected)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {availableSubjects.map((s) => {
              const active = subjects.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleSubject(s.value)}
                  className={`px-3 py-2 rounded text-sm text-left transition-colors border ${
                    active
                      ? "bg-indigo-600/20 border-indigo-500/60 text-white"
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800"
                  }`}
                >
                  <span
                    className={`inline-block w-3 h-3 mr-2 rounded-sm border align-middle ${
                      active
                        ? "bg-indigo-500 border-indigo-500"
                        : "border-zinc-600"
                    }`}
                  />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded transition-colors"
        >
          Create plan
        </button>
      </form>
    </div>
  );
}

// ── Existing plan view ─────────────────────────────────────────────────

function PlanView({ plan }: { plan: StudyPlan }) {
  const current = getCurrentWeek();
  const daysLeft = getDaysUntilExam(plan);
  const weeksLeft = getWeeksUntilExam(plan);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastWeeks = plan.weeks.filter((w) => {
    const end = new Date(w.endDate);
    return end < today && (!current || w.weekNumber !== current.weekNumber);
  });
  const futureWeeks = plan.weeks.filter((w) => {
    const start = new Date(w.startDate);
    return start > today && (!current || w.weekNumber !== current.weekNumber);
  });

  function handleReset() {
    if (
      !confirm(
        "Reset your study plan? This will delete all weeks and task progress."
      )
    )
      return;
    clearPlan();
  }

  const totalTasks = plan.weeks.reduce((n, w) => n + w.tasks.length, 0);
  const doneTasks = plan.weeks.reduce(
    (n, w) => n + w.tasks.filter((t) => t.completed).length,
    0
  );
  const overallPct =
    totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">Study Planner</h1>
        <p className="text-sm sm:text-base text-zinc-400">
          {daysLeft === 0
            ? "Your exam is today — good luck!"
            : weeksLeft <= 1
            ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"} until your exam`
            : `${weeksLeft} weeks until your exam`}
          {" · "}
          {plan.subjects.map(subjectLabel).join(", ")}
        </p>
      </div>

      {/* Overall progress */}
      <div className="bg-card border border-card-border rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-zinc-300">Overall progress</span>
          <span className="text-sm text-white font-medium">
            {doneTasks}/{totalTasks} tasks ({overallPct}%)
          </span>
        </div>
        <div className="w-full bg-zinc-800 rounded-full h-2">
          <div
            className="bg-indigo-500 h-2 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${overallPct}%` }}
          />
        </div>
      </div>

      {/* Current week */}
      {current && (
        <div className="mb-8">
          <div className="text-xs uppercase tracking-wider text-indigo-400 font-medium mb-2">
            This week
          </div>
          <WeekCard week={current} expanded highlight />
        </div>
      )}

      {/* Future weeks */}
      {futureWeeks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm uppercase tracking-wider text-zinc-500 font-medium mb-3">
            Upcoming
          </h2>
          <div className="space-y-3">
            {futureWeeks.map((w) => (
              <WeekCard key={w.weekNumber} week={w} />
            ))}
          </div>
        </div>
      )}

      {/* Past weeks */}
      {pastWeeks.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm uppercase tracking-wider text-zinc-500 font-medium mb-3">
            Completed
          </h2>
          <div className="space-y-2">
            {pastWeeks.map((w) => {
              const { done, total, pct } = getWeekProgress(w);
              return (
                <div
                  key={w.weekNumber}
                  className="bg-card border border-card-border rounded p-3 flex items-center justify-between text-sm"
                >
                  <div className="text-zinc-400">
                    Week {w.weekNumber} — {w.focus}
                  </div>
                  <div className="text-zinc-500">
                    {done}/{total} ({pct}%)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="border-t border-zinc-800 pt-6 mt-8">
        <button
          onClick={handleReset}
          className="text-sm text-zinc-500 hover:text-red-400 transition-colors"
        >
          Reset plan
        </button>
      </div>
    </div>
  );
}

function WeekCard({
  week,
  expanded: initialExpanded = false,
  highlight = false,
}: {
  week: StudyWeek;
  expanded?: boolean;
  highlight?: boolean;
}) {
  const [expanded, setExpanded] = useState(initialExpanded);
  const { done, total, pct } = getWeekProgress(week);

  return (
    <div
      className={`border rounded-lg overflow-hidden ${
        highlight
          ? "bg-indigo-950/20 border-indigo-500/40"
          : "bg-card border-card-border"
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors min-h-[56px]"
      >
        <div className="min-w-0 flex-1">
          <div className="text-white font-medium text-sm truncate">
            Week {week.weekNumber} · {week.focus}
          </div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {formatDateRange(week.startDate, week.endDate)}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs text-zinc-400 tabular-nums">
            {done}/{total}
          </span>
          <div className="hidden sm:block w-16 bg-zinc-800 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${
                highlight ? "bg-indigo-400" : "bg-zinc-500"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <svg
            className={`w-4 h-4 text-zinc-500 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.05] px-4 py-3 space-y-2">
          {week.tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: StudyTask }) {
  const link = taskLink(task);
  const typeBadge = (
    <span
      className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${
        task.type === "exam"
          ? "bg-indigo-500/15 text-indigo-300"
          : task.type === "practice"
          ? "bg-emerald-500/15 text-emerald-300"
          : "bg-amber-500/15 text-amber-300"
      }`}
    >
      {task.type}
    </span>
  );

  return (
    <div className="flex items-start gap-3 py-1.5">
      <button
        type="button"
        onClick={() => markTaskComplete(task.id)}
        aria-label={
          task.completed ? "Mark task incomplete" : "Mark task complete"
        }
        className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
          task.completed
            ? "bg-indigo-500 border-indigo-500"
            : "border-zinc-600 hover:border-indigo-400"
        }`}
      >
        {task.completed && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {typeBadge}
          {link ? (
            <Link
              href={link}
              className={`text-sm hover:text-indigo-300 transition-colors ${
                task.completed ? "line-through text-zinc-500" : "text-zinc-200"
              }`}
            >
              {task.description}
            </Link>
          ) : (
            <span
              className={`text-sm ${
                task.completed ? "line-through text-zinc-500" : "text-zinc-200"
              }`}
            >
              {task.description}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function taskLink(task: StudyTask): string | null {
  if (task.examId) {
    const mode = task.type === "exam" ? "mock" : "practice";
    return `/exam/${task.examId}?mode=${mode}`;
  }
  if (task.type === "review") return "/review";
  if (task.subject) return "/subjects";
  return null;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
  return `${fmt(s)} – ${fmt(e)}`;
}
