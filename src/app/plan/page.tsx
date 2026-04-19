"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  clearPlan,
  createPlan,
  getCurrentWeek,
  getDaysUntilExam,
  getWeekProgress,
  getPlanVersion,
  getServerPlanVersion,
  loadPlan,
  markTaskComplete,
  savePlan,
  subjectLabel,
  subscribePlan,
  type StudyPlan,
  type StudyTask,
  type StudyWeek,
} from "@/lib/studyPlanner";

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
  const version = useSyncExternalStore(
    subscribePlan,
    getPlanVersion,
    getServerPlanVersion
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // Force-clear old plans from before the v2 rebuild
    if (!localStorage.getItem("plan-v2-cleared-2")) {
      clearPlan();
      localStorage.setItem("plan-v2-cleared-2", "1");
      localStorage.setItem("plan-v2-skip-sync", "1");
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const plan = useMemo<StudyPlan | null>(() => {
    void version;
    if (!mounted) return null;
    return loadPlan();
  }, [version, mounted]);

  // Sync from database (only if user hasn't just cleared their plan)
  useEffect(() => {
    if (!mounted) return;
    // Skip sync if we just force-cleared — let user set up fresh
    if (localStorage.getItem("plan-v2-skip-sync")) return;
    fetch("/api/plan")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.plan) return;
        const local = loadPlan();
        if (!local && data.plan) {
          savePlan({
            examDate: data.plan.examDate,
            subjects: data.plan.subjects,
            yearLevel: data.plan.yearLevel,
            weeks: data.plan.weeks,
            createdAt: data.plan.createdAt ?? new Date().toISOString(),
          });
        }
      })
      .catch(() => {});
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center text-zinc-500 text-sm">
        Loading...
      </div>
    );
  }

  if (!plan) return <PlanSetup />;
  return <PlanView plan={plan} />;
}

/* ━━━ Setup ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function PlanSetup() {
  const defaultDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 42);
    return d.toISOString().slice(0, 10);
  })();

  const [examDate, setExamDate] = useState(defaultDate);
  const [yearLevel, setYearLevel] = useState<number>(11);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const availableSubjects = SUBJECTS.filter((s) => s.years.includes(yearLevel));

  function toggleSubject(value: string) {
    setSubjects((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  function handleYearChange(year: number) {
    setYearLevel(year);
    const allowed = SUBJECTS.filter((s) => s.years.includes(year)).map((s) => s.value);
    setSubjects((prev) => prev.filter((v) => allowed.includes(v)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!examDate) { setError("Pick your exam date."); return; }
    if (subjects.length === 0) { setError("Pick at least one subject."); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (new Date(examDate) < today) { setError("Exam date needs to be in the future."); return; }

    const plan = createPlan(examDate, subjects, yearLevel);
    savePlan(plan);
    localStorage.removeItem("plan-v2-skip-sync");

    fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    }).catch(() => {});
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-xl mx-auto px-5 pt-6 sm:pt-16 pb-16 sm:pb-20">
        {/* Explainer */}
        <div className="text-center mb-8 sm:mb-10">
          <h1 className="text-[24px] sm:text-[36px] font-extrabold text-white tracking-tight mb-3">
            Exam countdown
          </h1>
          <p className="text-zinc-400 text-[15px] max-w-md mx-auto leading-relaxed">
            Tell us when your exams are and what subjects you&apos;re sitting.
            We&apos;ll build you a week-by-week plan that focuses on your weakest
            topics first — so you spend your time where it matters most.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-3 mb-6 sm:mb-10">
          <div className="text-center">
            <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-[13px] font-bold flex items-center justify-center mx-auto mb-2">1</div>
            <p className="text-zinc-500 text-[11px]">Set your exam date</p>
          </div>
          <div className="text-center">
            <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-[13px] font-bold flex items-center justify-center mx-auto mb-2">2</div>
            <p className="text-zinc-500 text-[11px]">Pick your subjects</p>
          </div>
          <div className="text-center">
            <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-[13px] font-bold flex items-center justify-center mx-auto mb-2">3</div>
            <p className="text-zinc-500 text-[11px]">Follow your plan</p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-6 space-y-5 sm:space-y-6"
        >
          {/* Exam date */}
          <div>
            <label htmlFor="examDate" className="block text-zinc-400 text-[13px] font-medium mb-1.5">
              When is your first exam?
            </label>
            <input
              id="examDate"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              onClick={(e) => {
                try { (e.currentTarget as HTMLInputElement).showPicker(); } catch {}
              }}
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-4 py-3 text-white text-[14px] focus:border-indigo-500 focus:outline-none transition-colors cursor-pointer"
              required
            />
          </div>

          {/* Year level */}
          <div>
            <label className="block text-zinc-400 text-[13px] font-medium mb-1.5">
              Year level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[10, 11, 12, 13].map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => handleYearChange(y)}
                  className={`min-h-[44px] py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                    yearLevel === y
                      ? "bg-indigo-500 text-white"
                      : "bg-white/[0.04] border border-white/[0.1] text-zinc-400 hover:bg-white/[0.08]"
                  }`}
                >
                  Year {y}
                </button>
              ))}
            </div>
          </div>

          {/* Subjects */}
          <div>
            <label className="block text-zinc-400 text-[13px] font-medium mb-1.5">
              What subjects are you sitting? <span className="text-zinc-600">({subjects.length} selected)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableSubjects.map((s) => {
                const active = subjects.includes(s.value);
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => toggleSubject(s.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] text-left transition-all ${
                      active
                        ? "bg-indigo-500/15 border border-indigo-500/40 text-white"
                        : "bg-white/[0.04] border border-white/[0.1] text-zinc-400 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      active ? "bg-indigo-500 border-indigo-500" : "border-zinc-600"
                    }`}>
                      {active && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </span>
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="text-red-400 text-[13px] bg-red-500/[0.08] border border-red-500/20 rounded-lg px-4 py-2.5">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={subjects.length === 0}
            className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-semibold py-3 rounded-lg transition-all text-[14px] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create my plan
          </button>
        </form>
      </div>
    </div>
  );
}

/* ━━━ Plan view ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function PlanView({ plan }: { plan: StudyPlan }) {
  const current = getCurrentWeek();
  const daysLeft = getDaysUntilExam(plan);

  const totalTasks = plan.weeks.reduce((n, w) => n + w.tasks.length, 0);
  const doneTasks = plan.weeks.reduce(
    (n, w) => n + w.tasks.filter((t) => t.completed).length,
    0
  );
  const overallPct = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // Split weeks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const futureWeeks = plan.weeks.filter((w) => {
    const end = new Date(w.endDate);
    return end >= today && (!current || w.weekNumber !== current.weekNumber);
  });
  const pastWeeks = plan.weeks.filter((w) => {
    const end = new Date(w.endDate);
    return end < today && (!current || w.weekNumber !== current.weekNumber);
  });

  function handleReset() {
    if (!confirm("Start over? This will delete your current plan and all progress.")) return;
    clearPlan();
    fetch("/api/plan", { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-2xl mx-auto px-5 pt-6 sm:pt-16 pb-16 sm:pb-20">
        {/* Countdown header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400 mb-4 sm:mb-5">
            {plan.subjects.map(subjectLabel).join(", ")}
          </div>
          <h1 className="text-[32px] sm:text-[48px] font-extrabold text-white tracking-tight mb-1">
            {daysLeft === 0 ? (
              "Exam day"
            ) : (
              <>
                <span className="bg-gradient-to-r from-indigo-300 to-purple-400 bg-clip-text text-transparent">
                  {daysLeft}
                </span>{" "}
                {daysLeft === 1 ? "day" : "days"} to go
              </>
            )}
          </h1>
          <p className="text-zinc-500 text-[14px]">
            Exam: {new Date(plan.examDate).toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>

        {/* Overall progress */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-zinc-400 text-[13px]">Overall progress</span>
            <span className="text-white text-[13px] font-medium">
              {doneTasks}/{totalTasks} tasks done
            </span>
          </div>
          <div className="w-full bg-white/[0.06] rounded-full h-2.5">
            <div
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2.5 rounded-full transition-all duration-700 ease-out"
              style={{ width: `${overallPct}%` }}
            />
          </div>
          <p className="text-zinc-600 text-[11px] mt-2">
            {overallPct === 100
              ? "You've completed everything!"
              : overallPct >= 50
              ? "You're on track. Keep going!"
              : "Tick off tasks as you complete them."}
          </p>
        </div>

        {/* Completion state */}
        {overallPct === 100 && (
          <div className="rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] to-indigo-500/[0.05] border border-emerald-500/20 p-8 sm:p-10 text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
            <h2 className="text-[24px] sm:text-[28px] font-bold text-white tracking-tight mb-2">
              You&apos;re ready!
            </h2>
            <p className="text-zinc-400 text-[15px] max-w-md mx-auto mb-6 leading-relaxed">
              You&apos;ve completed every task in your study plan.
              {daysLeft > 0
                ? ` You've still got ${daysLeft} ${daysLeft === 1 ? "day" : "days"} — use them for light review and rest.`
                : " Good luck in your exam today — you've put in the work."}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/subjects"
                className="inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-6 py-3 rounded-lg transition-all text-[14px]"
              >
                Do one more practice exam
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/review"
                className="inline-flex items-center justify-center gap-2 bg-white/[0.06] hover:bg-white/[0.12] text-white font-medium px-6 py-3 rounded-lg border border-white/[0.1] transition-all text-[14px]"
              >
                Quick review session
              </Link>
            </div>
          </div>
        )}

        {/* This week */}
        {current && (
          <div className="mb-6">
            <h2 className="text-[13px] text-indigo-400 uppercase tracking-wider font-semibold mb-3">
              This week — {current.focus}
            </h2>
            <WeekCard week={current} defaultOpen highlight />
          </div>
        )}

        {/* Coming up */}
        {futureWeeks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-[13px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">
              Coming up
            </h2>
            <div className="space-y-2">
              {futureWeeks.map((w) => (
                <WeekCard key={w.weekNumber} week={w} />
              ))}
            </div>
          </div>
        )}

        {/* Done */}
        {pastWeeks.length > 0 && (
          <div className="mb-6">
            <h2 className="text-[13px] text-zinc-500 uppercase tracking-wider font-semibold mb-3">
              Done
            </h2>
            <div className="space-y-2">
              {pastWeeks.map((w) => {
                const { done, total, pct } = getWeekProgress(w);
                return (
                  <div
                    key={w.weekNumber}
                    className="rounded-xl bg-white/[0.02] border border-white/[0.06] px-4 py-3 flex items-center justify-between"
                  >
                    <span className="text-zinc-500 text-[13px]">
                      Week {w.weekNumber} — {w.focus}
                    </span>
                    <span className={`text-[12px] font-medium ${pct === 100 ? "text-emerald-400" : "text-zinc-500"}`}>
                      {done}/{total}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-white/[0.06]">
          <button
            onClick={handleReset}
            className="text-[13px] text-zinc-600 hover:text-red-400 transition-colors"
          >
            Start over
          </button>
          <Link
            href="/subjects"
            className="text-[13px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
          >
            Build an exam &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ━━━ Week card ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function WeekCard({
  week,
  defaultOpen = false,
  highlight = false,
}: {
  week: StudyWeek;
  defaultOpen?: boolean;
  highlight?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { done, total, pct } = getWeekProgress(week);

  const dateRange = (() => {
    const fmt = (d: Date) => d.toLocaleDateString("en-NZ", { day: "numeric", month: "short" });
    return `${fmt(new Date(week.startDate))} – ${fmt(new Date(week.endDate))}`;
  })();

  return (
    <div
      className={`rounded-xl overflow-hidden transition-colors ${
        highlight
          ? "bg-indigo-500/[0.06] border border-indigo-500/20"
          : "bg-white/[0.02] border border-white/[0.06]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-white font-medium text-[14px]">
            Week {week.weekNumber} — {week.focus}
          </p>
          <p className="text-zinc-600 text-[11px] mt-0.5">{dateRange}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className={`text-[12px] font-medium tabular-nums ${
            pct === 100 ? "text-emerald-400" : "text-zinc-500"
          }`}>
            {done}/{total}
          </span>
          <svg
            className={`w-4 h-4 text-zinc-600 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="border-t border-white/[0.04] px-4 py-3 space-y-1.5">
          {week.tasks.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ━━━ Task row ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TaskRow({ task }: { task: StudyTask }) {
  const link = taskLink(task);

  return (
    <div className="flex items-start gap-3 py-1">
      <button
        type="button"
        onClick={() => {
          markTaskComplete(task.id);
          const updatedPlan = loadPlan();
          if (updatedPlan) {
            fetch("/api/plan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plan: updatedPlan }),
            }).catch(() => {});
          }
        }}
        className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-all ${
          task.completed
            ? "bg-indigo-500 border-indigo-500"
            : "border-zinc-600 hover:border-indigo-400"
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${
            task.type === "exam"
              ? "bg-indigo-500/15 text-indigo-300"
              : task.type === "practice"
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-amber-500/15 text-amber-300"
          }`}>
            {task.type}
          </span>
          {link ? (
            <Link
              href={link}
              className={`text-[13px] hover:text-indigo-300 transition-colors ${
                task.completed ? "line-through text-zinc-600" : "text-zinc-300"
              }`}
            >
              {task.description}
            </Link>
          ) : (
            <span className={`text-[13px] ${
              task.completed ? "line-through text-zinc-600" : "text-zinc-300"
            }`}>
              {task.description}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function taskLink(task: StudyTask): string | null {
  if (task.examId) return `/exam/${task.examId}?mode=practice`;
  if (task.type === "review") return "/review";
  if (task.subject) return `/subjects?subject=${task.subject}`;
  return "/subjects";
}
