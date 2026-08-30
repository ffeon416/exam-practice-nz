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
import { useTier } from "@/hooks/useTier";
import { display } from "@/lib/displayFont";

/* Shared Soar-style ambient ground — one radial glow, no blur blobs */
function PageGlow() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      <div
        className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full"
        style={{ background: "radial-gradient(50% 50% at 50% 42%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }}
      />
    </div>
  );
}

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
  const { limits: tierLimits, loading: tierLoading } = useTier();
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

  if (!mounted || tierLoading) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center text-zinc-500 text-sm">
        Loading...
      </div>
    );
  }

  // Tier gate — Study planner is Student+Pro.
  if (!tierLimits.studyPlanner) {
    return <PlanUpgradeGate />;
  }

  if (!plan) return <PlanSetup />;
  return <PlanView plan={plan} />;
}

/* ━━━ Upgrade gate ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function PlanUpgradeGate() {
  return (
    <div className="relative overflow-hidden">
      <PageGlow />

      <div className="max-w-md mx-auto px-5 pt-8 sm:pt-14 pb-16 sm:pb-20">
        {/* Hero icon with plan badge */}
        <div className="home-rise relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 mx-auto mb-6 flex items-center justify-center shadow-lg shadow-indigo-500/30">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span className="absolute -top-1.5 -right-1.5 text-[9px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-500 to-violet-500 px-1.5 py-0.5 rounded-md shadow-md">
            Student
          </span>
        </div>

        <h1
          className={`${display.className} home-rise text-[26px] sm:text-[32px] font-bold text-white tracking-[-0.02em] text-center mb-3 leading-tight`}
          style={{ animationDelay: "80ms", textWrap: "balance" }}
        >
          Stop guessing what to study next.
        </h1>
        <p
          className="home-rise text-zinc-400 text-[14px] sm:text-[15px] text-center mb-7 leading-relaxed max-w-sm mx-auto"
          style={{ animationDelay: "160ms" }}
        >
          Tell us your exam date and subjects — we&apos;ll build you a week-by-week plan that <em>actually</em> gets you ready, targeting the topics you keep getting wrong.
        </p>

        {/* Benefits */}
        <ul className="space-y-2.5 mb-6">
          <Benefit text="Personalised week-by-week schedule from today until exam day" />
          <Benefit text="Targets your weakest topics first — no wasted study time" />
          <Benefit text="Schedules mock exams in the final weeks so you peak at the right time" />
          <Benefit text="Tick off tasks as you go and watch your progress climb" />
        </ul>

        {/* Price card */}
        <div className="rounded-2xl bg-indigo-500/[0.08] border border-indigo-500/20 px-5 py-4 mb-5 text-center">
          <p className="font-mono text-[11px] uppercase tracking-wider text-indigo-300 font-semibold mb-1">Student plan</p>
          <p className="text-white">
            <span className="text-[28px] font-extrabold tracking-tight">NZ$15</span>
            <span className="text-zinc-400 text-[13px] ml-1">/month</span>
          </p>
          <p className="text-zinc-500 text-[11px] mt-1">Cancel anytime · All subjects unlocked</p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          <Link
            href="/pricing"
            className="w-full py-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-extrabold text-[14px] text-center transition-all shadow-lg shadow-indigo-500/30"
          >
            Unlock my study plan
          </Link>
          <Link
            href="/dashboard"
            className="w-full py-3 rounded-full text-zinc-500 font-medium text-[13px] hover:text-zinc-300 transition-colors text-center"
          >
            Maybe later
          </Link>
        </div>
      </div>
    </div>
  );
}

function Benefit({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg
        className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-[13px] text-zinc-300 leading-snug">{text}</span>
    </li>
  );
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
      <PageGlow />

      <div className="max-w-xl mx-auto px-5 pt-6 sm:pt-16 pb-16 sm:pb-20">
        {/* Explainer */}
        <div className="text-center mb-8 sm:mb-10">
          <h1
            className={`${display.className} home-rise text-[26px] sm:text-[38px] font-bold text-white tracking-[-0.02em] mb-3`}
            style={{ textWrap: "balance" }}
          >
            Exam countdown
          </h1>
          <p className="home-rise text-zinc-400 text-[15px] max-w-md mx-auto leading-relaxed" style={{ animationDelay: "80ms" }}>
            Tell us when your exams are and what subjects you&apos;re sitting.
            We&apos;ll build you a week-by-week plan that focuses on your weakest
            topics first — so you spend your time where it matters most.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-3 gap-3 mb-6 sm:mb-10">
          <div className="text-center">
            <p className="font-mono text-indigo-400 text-[12px] font-bold mb-1.5">01</p>
            <p className="font-mono text-zinc-500 text-[11px] uppercase tracking-wider">Set your exam date</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-indigo-400 text-[12px] font-bold mb-1.5">02</p>
            <p className="font-mono text-zinc-500 text-[11px] uppercase tracking-wider">Pick your subjects</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-indigo-400 text-[12px] font-bold mb-1.5">03</p>
            <p className="font-mono text-zinc-500 text-[11px] uppercase tracking-wider">Follow your plan</p>
          </div>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="rounded-[32px] bg-white/[0.015] border border-white/[0.07] p-5 sm:p-7 space-y-5 sm:space-y-6"
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
                  className={`min-h-[44px] py-2.5 rounded-full text-[13px] font-semibold transition-all ${
                    yearLevel === y
                      ? "bg-indigo-500 text-white"
                      : "bg-white/[0.03] border border-white/[0.1] text-zinc-400 hover:border-white/[0.3] hover:bg-white/[0.04]"
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
                    className={`flex items-center gap-2 px-3.5 py-2.5 rounded-full text-[13px] text-left transition-all ${
                      active
                        ? "bg-indigo-500/15 border border-indigo-500/40 text-white"
                        : "bg-white/[0.03] border border-white/[0.1] text-zinc-400 hover:border-white/[0.3] hover:bg-white/[0.04]"
                    }`}
                  >
                    <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
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
            className="w-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-extrabold py-3 shadow-lg shadow-indigo-500/30 transition-all text-[14px] disabled:opacity-40 disabled:cursor-not-allowed"
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

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const orderedWeeks = [...plan.weeks].sort((a, b) => a.weekNumber - b.weekNumber);
  const ringDash = (overallPct / 100) * 552.9; // circumference of the r=88 ring

  function handleReset() {
    if (!confirm("Start over? This will delete your current plan and all progress.")) return;
    clearPlan();
    fetch("/api/plan", { method: "DELETE" }).catch(() => {});
  }

  return (
    <div className="relative overflow-hidden">
      <PageGlow />

      <div className="max-w-2xl mx-auto px-5 pt-6 sm:pt-16 pb-16 sm:pb-20">
        {/* Countdown ring hero */}
        <div className="flex flex-col items-center mb-8 sm:mb-10">
          <div className="home-rise flex flex-wrap items-center justify-center gap-1.5 mb-6">
            {plan.subjects.map((s) => (
              <span key={s} className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400">
                {subjectLabel(s)}
              </span>
            ))}
          </div>
          <div className="home-rise relative w-56 h-56 sm:w-64 sm:h-64" style={{ animationDelay: "80ms" }}>
            <div aria-hidden className="absolute -inset-4 rounded-full pointer-events-none"
              style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(99,102,241,0.22) 0%, transparent 70%)" }} />
            <svg className="relative w-full h-full -rotate-90" viewBox="0 0 200 200" aria-hidden>
              <circle cx="100" cy="100" r="88" fill="none" strokeWidth="10" stroke="currentColor" className="text-white/[0.06]" />
              {/* Render the progress arc only when there IS progress — a
                  zero-length dash with a round cap paints a stray dot at 12
                  o'clock, making a fresh plan look already-started. */}
              {overallPct > 0 && (
                <circle
                  cx="100" cy="100" r="88" fill="none" strokeWidth="10" strokeLinecap="round"
                  stroke="url(#planRing)"
                  strokeDasharray={`${ringDash} 552.9`}
                  className="transition-all duration-1000 ease-out"
                />
              )}
              <defs>
                <linearGradient id="planRing" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {daysLeft === 0 ? (
                <span className={`${display.className} text-[28px] sm:text-[32px] font-bold tracking-[-0.02em] bg-gradient-to-br from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent`}>
                  Exam day
                </span>
              ) : (
                <>
                  <span className="text-[62px] sm:text-[76px] font-black leading-none tabular-nums bg-gradient-to-br from-white to-zinc-300 bg-clip-text text-transparent">
                    {daysLeft}
                  </span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-zinc-500 font-bold mt-1.5">
                    {daysLeft === 1 ? "day" : "days"} to go
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="home-rise text-center mt-6" style={{ animationDelay: "160ms" }}>
            <p className="text-white font-semibold text-[14px]">
              <span className="font-black bg-gradient-to-r from-indigo-300 to-violet-400 bg-clip-text text-transparent">{overallPct}%</span> of your plan complete
            </p>
            <p className="font-mono text-zinc-500 text-[11px] mt-1 tracking-tight">
              {doneTasks}/{totalTasks} tasks · Exam {new Date(plan.examDate).toLocaleDateString("en-NZ", { day: "numeric", month: "long" })}
            </p>
          </div>
        </div>

        {/* Completion state */}
        {overallPct === 100 && (
          <div className="rounded-[32px] bg-gradient-to-br from-emerald-500/[0.08] to-indigo-500/[0.05] border border-emerald-500/20 p-8 sm:p-10 text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
            <h2 className={`${display.className} text-[24px] sm:text-[28px] font-bold text-white tracking-[-0.02em] mb-2`}>
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
                className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-extrabold px-6 py-3 shadow-lg shadow-indigo-500/30 transition-all text-[14px]"
              >
                Do one more practice exam
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <Link
                href="/review"
                className="inline-flex items-center justify-center gap-2 rounded-full text-white font-semibold px-6 py-3 border border-white/[0.12] hover:border-white/[0.3] hover:bg-white/[0.04] transition-all text-[14px]"
              >
                Quick review session
              </Link>
            </div>
          </div>
        )}

        {/* Roadmap timeline */}
        <h2 className="font-mono text-[12px] text-zinc-500 uppercase tracking-wider font-semibold mb-4">Your roadmap</h2>
        <div className="relative mb-6">
          {/* Spine */}
          <div aria-hidden className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-gradient-to-b from-white/10 via-indigo-500/30 to-white/[0.04]" />
          <div className="space-y-2.5">
            {orderedWeeks.map((w) => {
              const { pct } = getWeekProgress(w);
              const isCurrent = !!current && w.weekNumber === current.weekNumber;
              const isPast = !isCurrent && new Date(w.endDate) < today;
              const isDone = pct === 100;
              return (
                <div key={w.weekNumber} className="relative pl-12">
                  {/* Node */}
                  <div className="absolute left-0 top-2.5 z-10">
                    {isCurrent && <span aria-hidden className="absolute inset-0 rounded-full bg-indigo-500/50 animate-ping" />}
                    <div className={`relative w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold border-2 ${
                      isDone
                        ? "bg-emerald-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/30"
                        : isCurrent
                        ? "bg-gradient-to-br from-indigo-500 to-violet-600 border-indigo-300 text-white shadow-lg shadow-indigo-500/40"
                        : isPast
                        ? "bg-[#0b0b12] border-amber-500/40 text-amber-400/80"
                        : "bg-[#0b0b12] border-white/15 text-zinc-500"
                    }`}>
                      {isDone ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        w.weekNumber
                      )}
                    </div>
                  </div>
                  <WeekCard week={w} defaultOpen={isCurrent} highlight={isCurrent} />
                </div>
              );
            })}
          </div>
        </div>

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
      className={`rounded-2xl overflow-hidden transition-all ${
        highlight
          ? "bg-indigo-500/[0.07] border border-indigo-500/25 shadow-lg shadow-indigo-500/10"
          : "bg-white/[0.02] border border-white/[0.07]"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-white/[0.02] transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-white font-semibold text-[14px] truncate">
            Week {week.weekNumber} — {week.focus}
          </p>
          <p className="font-mono text-zinc-600 text-[10px] mt-0.5 tracking-tight">{dateRange}</p>
          {/* Per-week progress */}
          <div className="mt-2 w-full max-w-[200px] h-1 rounded-full bg-white/[0.06] overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                pct === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-indigo-500 to-violet-500"
              }`}
              style={{ width: `${Math.max(pct, 2)}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {pct === 100 ? (
            <span className="inline-flex items-center gap-1 text-[12px] font-bold text-emerald-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75" />
              </svg>
              Done
            </span>
          ) : (
            <span className="text-[12px] font-medium tabular-nums text-zinc-500">
              {done}/{total}
            </span>
          )}
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
        className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
          task.completed
            ? "bg-emerald-500 border-emerald-500 shadow-[0_0_10px_-1px_rgba(16,185,129,0.7)] scale-100"
            : "border-zinc-600 hover:border-indigo-400 hover:scale-110"
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
          <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${
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
