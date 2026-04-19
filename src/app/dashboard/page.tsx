"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { loadProgress, getWeakTopics } from "@/lib/storage";
import { gradeLabel, gradeColor } from "@/lib/scoring";
import { getTopicLabel } from "@/data/topics";
import { getExam } from "@/data/exams";
import {
  listCustomExams,
  deleteCustomExam,
  getCustomExam,
  isCustomExamId,
  type CustomExamMeta,
} from "@/lib/customExams";
import {
  getReviewStats,
  getReviewsVersion,
  getServerReviewsVersion,
  subscribeReviews,
} from "@/lib/spacedRepetition";
import {
  getCurrentWeek,
  getPlanVersion,
  getServerPlanVersion,
  loadPlan,
  markTaskComplete,
  subscribePlan,
  getDaysUntilExam,
  type StudyTask,
  type StudyWeek,
} from "@/lib/studyPlanner";
import type { StudentProgress } from "@/lib/types";
import { useTier } from "@/hooks/useTier";
import { TIER_LABELS } from "@/lib/tierLimits";

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getMotivation(avgPct: number, streak: number, total: number): string {
  if (total === 0) return "Let's get started!";
  if (streak >= 7) return "A whole week straight — legend.";
  if (streak >= 3) return "You're on a roll. Keep it up!";
  if (avgPct >= 80) return "You're crushing it.";
  if (avgPct >= 60) return "Solid progress. Keep pushing.";
  if (total >= 5) return "The more you practise, the easier it gets.";
  return "Great start. Every exam counts.";
}

export default function DashboardPage() {
  const { user } = useUser();
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [customExams, setCustomExams] = useState<CustomExamMeta[]>([]);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const { tier, loading: tierLoading, refresh: refreshTier } = useTier();
  const [mounted, setMounted] = useState(false);

  const reviewsVersion = useSyncExternalStore(subscribeReviews, getReviewsVersion, getServerReviewsVersion);
  const reviewStats = (() => {
    void reviewsVersion;
    if (!mounted) return { total: 0, due: 0, mastered: 0, learning: 0, new: 0 };
    return getReviewStats();
  })();

  const planVersion = useSyncExternalStore(subscribePlan, getPlanVersion, getServerPlanVersion);
  const plan = (() => {
    void planVersion;
    if (!mounted) return null;
    return loadPlan();
  })();
  const currentWeek: StudyWeek | null = (() => {
    if (!mounted) return null;
    return getCurrentWeek();
  })();
  const daysLeft = plan ? getDaysUntilExam(plan) : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setShowPaymentSuccess(true);
      refreshTier();
      window.history.replaceState({}, "", "/dashboard");
      const timer = setTimeout(() => setShowPaymentSuccess(false), 8000);
      return () => clearTimeout(timer);
    }
  }, [refreshTier]);

  useEffect(() => {
    setMounted(true);
    setProgress(loadProgress());
    setCustomExams(listCustomExams());

    fetch("/api/progress")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || (!data.examAttempts?.length && !Object.keys(data.topicScores || {}).length)) return;
        const local = loadProgress();
        const dbAttempts = data.examAttempts ?? [];
        if (dbAttempts.length > local.examAttempts.length) {
          setProgress({
            examAttempts: dbAttempts,
            topicScores: { ...local.topicScores, ...data.topicScores },
            totalExamsTaken: dbAttempts.length,
            streakDays: Math.max(local.streakDays, data.streakDays ?? 0),
            lastActiveDate: local.lastActiveDate,
          });
        }
      })
      .catch(() => {});
  }, []);

  function handleDeleteCustom(id: string) {
    if (!confirm("Delete this paper?")) return;
    deleteCustomExam(id);
    setCustomExams(listCustomExams());
  }

  if (!progress) return (
    <div className="max-w-xl mx-auto px-5 pt-16 pb-20">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-white/[0.04] rounded-lg w-48" />
        <div className="h-4 bg-white/[0.04] rounded-lg w-64" />
        <div className="h-32 bg-white/[0.04] rounded-2xl w-full mt-8" />
        <div className="h-20 bg-white/[0.04] rounded-2xl w-full" />
      </div>
    </div>
  );

  const hasData = progress.totalExamsTaken > 0;
  const weakTopics = getWeakTopics(progress, 3);
  const firstName = user?.firstName || "there";

  // Check if streak should be reset (student missed a day)
  const displayStreak = (() => {
    if (!progress.lastActiveDate || progress.streakDays === 0) return 0;
    const last = new Date(progress.lastActiveDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    // 0 = today, 1 = yesterday (streak still alive), >1 = broken
    if (diff > 1) return 0;
    return progress.streakDays;
  })();

  const avgPct =
    progress.examAttempts.length > 0
      ? Math.round(
          (progress.examAttempts.reduce(
            (s, a) => s + (a.maxMarks > 0 ? a.totalMarks / a.maxMarks : 0),
            0
          ) / progress.examAttempts.length) * 100
        )
      : 0;

  const recentAttempts = [...progress.examAttempts].reverse().slice(0, 5);
  const lastGrade = recentAttempts[0]?.overallGrade;

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-xl mx-auto px-5 pt-6 sm:pt-14 pb-16 sm:pb-20">
        {/* Payment success */}
        {showPaymentSuccess && (
          <div className="mb-6 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 px-5 py-3 flex items-center justify-between">
            <p className="text-[13px] text-emerald-200">
              You&apos;re on the <span className="font-semibold">{TIER_LABELS[tier]}</span> plan!
            </p>
            <button onClick={() => setShowPaymentSuccess(false)} className="text-emerald-400/60 hover:text-emerald-300 p-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-[24px] sm:text-[32px] font-extrabold text-white tracking-tight mb-1">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-zinc-500 text-[14px]">
            {getMotivation(avgPct, displayStreak, progress.totalExamsTaken)}
          </p>
        </div>

        {/* Hero action — what to do right now */}
        {!hasData ? (
          // First time
          <Link
            href="/subjects"
            className="group flex items-center gap-5 rounded-2xl bg-gradient-to-r from-indigo-500/[0.12] to-purple-500/[0.06] border border-indigo-500/20 p-6 mb-6 hover:border-indigo-500/40 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/30 transition-colors">
              <svg className="w-6 h-6 text-indigo-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-[16px]">Take your first exam</p>
              <p className="text-zinc-400 text-[13px]">Pick a subject and we&apos;ll generate a practice paper for you.</p>
            </div>
            <svg className="w-5 h-5 text-zinc-500 shrink-0 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ) : reviewStats.due > 0 ? (
          // Reviews due
          <Link
            href="/review"
            className="group flex items-center gap-5 rounded-2xl bg-gradient-to-r from-amber-500/[0.1] to-orange-500/[0.05] border border-amber-500/20 p-6 mb-6 hover:border-amber-500/40 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-amber-300 text-[18px] font-bold">{reviewStats.due}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-[16px]">Review time</p>
              <p className="text-zinc-400 text-[13px]">
                {reviewStats.due === 1 ? "1 question" : `${reviewStats.due} questions`} ready to review — keep it fresh.
              </p>
            </div>
            <svg className="w-5 h-5 text-zinc-500 shrink-0 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ) : (
          // Default: do another exam
          <Link
            href="/subjects"
            className="group flex items-center gap-5 rounded-2xl bg-gradient-to-r from-indigo-500/[0.12] to-purple-500/[0.06] border border-indigo-500/20 p-6 mb-6 hover:border-indigo-500/40 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 group-hover:bg-indigo-500/30 transition-colors">
              <svg className="w-6 h-6 text-indigo-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-[16px]">Practise another exam</p>
              <p className="text-zinc-400 text-[13px]">
                {weakTopics.length > 0
                  ? `Try focusing on ${getTopicLabel(weakTopics[0].topic)} — it's your weakest area.`
                  : "Keep building your skills across all topics."}
              </p>
            </div>
            <svg className="w-5 h-5 text-zinc-500 shrink-0 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}

        {/* Stats strip */}
        {hasData && (
          <div className="flex items-center justify-between rounded-2xl bg-white/[0.02] border border-white/[0.06] px-3 sm:px-5 py-4 mb-6">
            <div className="text-center flex-1">
              <div className="text-[22px] font-bold text-white">{progress.totalExamsTaken}</div>
              <div className="text-zinc-600 text-[10px] uppercase tracking-wider mt-0.5">Exams</div>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div className="text-center flex-1">
              <div className={`text-[22px] font-bold ${avgPct >= 70 ? "text-emerald-400" : avgPct >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                {avgPct}%
              </div>
              <div className="text-zinc-600 text-[10px] uppercase tracking-wider mt-0.5">Average</div>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div className="text-center flex-1">
              <div className={`text-[22px] font-bold ${displayStreak >= 3 ? "text-orange-400" : displayStreak >= 1 ? "text-white" : "text-zinc-600"}`}>
                {displayStreak > 0 ? `${displayStreak}d` : "—"}
              </div>
              <div className="text-zinc-600 text-[10px] uppercase tracking-wider mt-0.5">
                {displayStreak >= 3 ? "Streak!" : "Streak"}
              </div>
            </div>
            {lastGrade && (
              <>
                <div className="w-px h-8 bg-white/[0.06]" />
                <div className="text-center flex-1">
                  <div className={`text-[13px] sm:text-[16px] font-bold ${gradeColor(lastGrade)}`}>
                    {gradeLabel(lastGrade)}
                  </div>
                  <div className="text-zinc-600 text-[10px] uppercase tracking-wider mt-0.5">Last grade</div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Exam countdown */}
        {plan && daysLeft !== null && daysLeft > 0 && (
          <Link
            href="/plan"
            className="flex items-center gap-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] px-5 py-4 mb-6 hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
              <span className="text-indigo-300 text-[14px] font-bold">{daysLeft}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[14px] font-medium">
                {daysLeft} {daysLeft === 1 ? "day" : "days"} until your exam
              </p>
              <p className="text-zinc-600 text-[12px]">
                {currentWeek ? `This week: ${currentWeek.focus}` : "View your study plan"}
              </p>
            </div>
            <svg className="w-4 h-4 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}

        {/* This week's tasks */}
        {currentWeek && currentWeek.tasks.some((t) => !t.completed) && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-6">
            <h2 className="text-white font-semibold text-[14px] mb-3">This week&apos;s tasks</h2>
            <div className="space-y-2">
              {currentWeek.tasks.filter((t) => !t.completed).map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Weak spots */}
        {weakTopics.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-semibold text-[14px]">Focus on these</h2>
              <Link href="/practice" className="text-indigo-400 text-[12px] font-medium hover:text-indigo-300 transition-colors">
                Practise &rarr;
              </Link>
            </div>
            <div className="space-y-2">
              {weakTopics.map((t) => {
                const pct = Math.round(t.correctRate * 100);
                return (
                  <div key={t.topic} className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-zinc-300 truncate">{getTopicLabel(t.topic)}</span>
                        <span className={pct >= 40 ? "text-yellow-400" : "text-red-400"}>{pct}%</span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${pct >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent exams */}
        {recentAttempts.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-6">
            <h2 className="text-white font-semibold text-[14px] mb-3">Recent</h2>
            <div className="space-y-2">
              {recentAttempts.map((attempt, i) => {
                const pct = attempt.maxMarks > 0 ? Math.round((attempt.totalMarks / attempt.maxMarks) * 100) : 0;
                // Look up the real title
                let title: string;
                if (isCustomExamId(attempt.examId)) {
                  const custom = getCustomExam(attempt.examId);
                  title = custom?.title ?? "Practice exam";
                } else {
                  const catalog = getExam(attempt.examId);
                  title = catalog?.title ?? attempt.examId;
                }
                return (
                  <Link
                    key={i}
                    href={`/exam/${attempt.examId}/results`}
                    className="flex items-center justify-between py-2 hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-zinc-300 truncate">{title}</p>
                      <p className="text-[11px] text-zinc-600">
                        {new Date(attempt.date).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[12px] text-zinc-500 tabular-nums">{pct}%</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        attempt.overallGrade === "excellence" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" :
                        attempt.overallGrade === "merit" ? "text-blue-400 bg-blue-500/10 border-blue-500/30" :
                        attempt.overallGrade === "achieved" ? "text-green-400 bg-green-500/10 border-green-500/30" :
                        "text-red-400 bg-red-500/10 border-red-500/30"
                      }`}>
                        {gradeLabel(attempt.overallGrade)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Saved papers */}
        {customExams.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-6">
            <h2 className="text-white font-semibold text-[14px] mb-3">Your papers</h2>
            <div className="space-y-2">
              {customExams.slice(0, 4).map((ex) => (
                <div key={ex.id} className="flex items-center justify-between py-1.5">
                  <p className="text-[13px] text-zinc-300 truncate flex-1 min-w-0 mr-3">{ex.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/exam/${ex.id}?mode=practice`}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1] transition-colors"
                    >
                      Start
                    </Link>
                    <button
                      onClick={() => handleDeleteCustom(ex.id)}
                      className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan CTA */}
        {!plan && hasData && (
          <Link
            href="/plan"
            className="group flex items-center gap-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-6 hover:bg-white/[0.04] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white text-[14px] font-medium">Set up your exam countdown</p>
              <p className="text-zinc-500 text-[12px]">We&apos;ll plan your revision week by week.</p>
            </div>
            <svg className="w-4 h-4 text-zinc-600 shrink-0 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}

        {/* Tier badge — minimal */}
        {!tierLoading && tier === "free" && hasData && (
          <Link
            href="/pricing"
            className="flex items-center justify-center gap-2 text-zinc-600 text-[12px] hover:text-zinc-400 transition-colors py-3"
          >
            Free plan — upgrade for more features
          </Link>
        )}
      </div>
    </div>
  );
}

/* ━━━ Task row ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TaskRow({ task }: { task: StudyTask }) {
  const href = task.examId
    ? `/exam/${task.examId}?mode=practice`
    : task.type === "review"
    ? "/review"
    : task.subject
    ? `/subjects?subject=${task.subject}`
    : "/subjects";

  return (
    <div className="flex items-center gap-3 py-0.5">
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
        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
          task.completed ? "bg-indigo-500 border-indigo-500" : "border-zinc-700 hover:border-indigo-400"
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <Link
        href={href}
        className={`text-[13px] flex-1 min-w-0 truncate transition-colors ${
          task.completed ? "line-through text-zinc-600" : "text-zinc-300 hover:text-indigo-300"
        }`}
      >
        {task.description}
      </Link>
    </div>
  );
}
