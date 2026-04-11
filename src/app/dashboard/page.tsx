"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadProgress, getWeakTopics } from "@/lib/storage";
import { gradeLabel, gradeColor } from "@/lib/scoring";
import { getTopicLabel } from "@/data/topics";
import {
  listCustomExams,
  deleteCustomExam,
  type CustomExamMeta,
} from "@/lib/customExams";
import {
  getReviewStats,
  getReviewsVersion,
  getServerReviewsVersion,
  subscribeReviews,
} from "@/lib/spacedRepetition";
import {
  getAllRatings,
  getRatingsVersion,
  getServerRatingsVersion,
  ratingToLevel,
  subscribeRatings,
} from "@/lib/adaptiveDifficulty";
import {
  getCurrentWeek,
  getPlanVersion,
  getServerPlanVersion,
  markTaskComplete,
  subscribePlan,
  type StudyTask,
  type StudyWeek,
} from "@/lib/studyPlanner";
import { useSyncExternalStore } from "react";
import type { StudentProgress } from "@/lib/types";

export default function DashboardPage() {
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [customExams, setCustomExams] = useState<CustomExamMeta[]>([]);
  // `mounted` gates every localStorage-derived value below so the first
  // client render matches the server render (empty) and only refreshes
  // after hydration. Without this guard, returning users would trigger a
  // hydration mismatch on every dashboard load.
  const [mounted, setMounted] = useState(false);

  // Reactive spaced-review stats via useSyncExternalStore — updates
  // automatically whenever reviews are added or completed.
  const reviewsVersion = useSyncExternalStore(
    subscribeReviews,
    getReviewsVersion,
    getServerReviewsVersion
  );
  const reviewStats = (() => {
    void reviewsVersion;
    if (!mounted) {
      return { total: 0, due: 0, mastered: 0, learning: 0, new: 0 };
    }
    return getReviewStats();
  })();

  // Live adaptive-rating snapshot. Bumps whenever updateRating() is called.
  const ratingsVersion = useSyncExternalStore(
    subscribeRatings,
    getRatingsVersion,
    getServerRatingsVersion
  );
  const ratings = (() => {
    void ratingsVersion;
    if (!mounted) return {} as Record<string, number>;
    return getAllRatings();
  })();
  const sortedRatings = Object.entries(ratings).sort((a, b) => b[1] - a[1]);
  const topRatings = sortedRatings.slice(0, 5);
  const bottomRatings = sortedRatings.slice(-3).reverse();
  const hasRatings = sortedRatings.length > 0;

  // Live study plan snapshot — the dashboard widget below refreshes any
  // time a plan is created, cleared, or a task is toggled.
  const planVersion = useSyncExternalStore(
    subscribePlan,
    getPlanVersion,
    getServerPlanVersion
  );
  const currentWeek: StudyWeek | null = (() => {
    void planVersion;
    if (!mounted) return null;
    return getCurrentWeek();
  })();

  useEffect(() => {
    setMounted(true);
    setProgress(loadProgress());
    setCustomExams(listCustomExams());
  }, []);

  function handleDeleteCustom(id: string) {
    if (!confirm("Delete this generated paper? This cannot be undone.")) return;
    deleteCustomExam(id);
    setCustomExams(listCustomExams());
  }

  if (!progress) return null;

  const hasData = progress.totalExamsTaken > 0;
  const weakTopics = getWeakTopics(progress, 6);
  const allTopics = Object.values(progress.topicScores).sort(
    (a, b) => b.attempts - a.attempts
  );

  // Calculate average score
  const avgPct =
    progress.examAttempts.length > 0
      ? Math.round(
          (progress.examAttempts.reduce(
            (s, a) => s + (a.maxMarks > 0 ? a.totalMarks / a.maxMarks : 0),
            0
          ) /
            progress.examAttempts.length) *
            100
        )
      : 0;

  // Recent attempts
  const recentAttempts = [...progress.examAttempts]
    .reverse()
    .slice(0, 10);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-slate-400 mb-8">Track your progress and find your weak spots.</p>

      <TodaysTasksWidget week={currentWeek} />

      {!hasData && customExams.length === 0 ? (
        <div className="bg-card border border-card-border rounded-lg p-12 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            No exams taken yet
          </h2>
          <p className="text-slate-400 mb-4">
            Take your first exam to start tracking progress.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/subjects"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Browse Exams
            </Link>
            <Link
              href="/generate"
              className="inline-block bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-500 transition-colors"
            >
              Generate Paper
            </Link>
          </div>
        </div>
      ) : !hasData ? (
        <>
          {/* Custom generated papers (no exam history yet) */}
          <div className="bg-card border border-card-border rounded-lg p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-white">Generated Papers</h2>
                <p className="text-xs text-slate-400">Custom AI-built papers saved to this browser</p>
              </div>
              <Link
                href="/generate"
                className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
              >
                + New
              </Link>
            </div>
            <div className="space-y-2">
              {customExams.map((ex) => (
                <div
                  key={ex.id}
                  className="flex items-center justify-between gap-3 py-2 border-b border-slate-800 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{ex.title}</p>
                    <p className="text-xs text-slate-500 truncate">
                      {ex.subject}
                      {ex.level > 0 ? ` · NCEA L${ex.level}` : " · Year 10"}
                      {" · "}
                      {ex.questionCount} questions
                      {ex.topic ? ` · ${ex.topic}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/exam/${ex.id}?mode=practice`}
                      className="text-xs px-3 py-1.5 rounded bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1] hover:text-white transition-colors"
                    >
                      Start
                    </Link>
                    <button
                      onClick={() => handleDeleteCustom(ex.id)}
                      aria-label={`Delete ${ex.title}`}
                      className="text-xs p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border border-card-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {progress.totalExamsTaken}
              </div>
              <div className="text-xs text-slate-400 mt-1">Exams Taken</div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{avgPct}%</div>
              <div className="text-xs text-slate-400 mt-1">Average Score</div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {progress.streakDays}
              </div>
              <div className="text-xs text-slate-400 mt-1">Day Streak</div>
            </div>
            <div className="bg-card border border-card-border rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {allTopics.length}
              </div>
              <div className="text-xs text-slate-400 mt-1">Topics Covered</div>
            </div>
          </div>

          {/* Spaced review summary */}
          {reviewStats.total > 0 && (
            <div className="bg-card border border-card-border rounded-lg p-5 mb-8">
              <div className="flex items-start justify-between mb-4 gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">
                    Spaced review
                  </h2>
                  <p className="text-slate-400 text-sm">
                    {reviewStats.due > 0
                      ? `${reviewStats.due} ${
                          reviewStats.due === 1 ? "question" : "questions"
                        } due for review today.`
                      : "You're all caught up — nothing due right now."}
                  </p>
                </div>
                <Link
                  href="/review"
                  className={`shrink-0 px-4 py-2 rounded text-sm font-medium transition-colors ${
                    reviewStats.due > 0
                      ? "bg-indigo-500 text-white hover:bg-indigo-400"
                      : "border border-slate-700 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {reviewStats.due > 0 ? "Start reviewing" : "View queue"}
                </Link>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-slate-900/50 border border-slate-800 rounded p-3 text-center">
                  <div className="text-xl font-bold text-white">{reviewStats.due}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wide">
                    due
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded p-3 text-center">
                  <div className="text-xl font-bold text-indigo-300">
                    {reviewStats.new}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wide">
                    new
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded p-3 text-center">
                  <div className="text-xl font-bold text-amber-300">
                    {reviewStats.learning}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wide">
                    learning
                  </div>
                </div>
                <div className="bg-slate-900/50 border border-slate-800 rounded p-3 text-center">
                  <div className="text-xl font-bold text-emerald-300">
                    {reviewStats.mastered}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wide">
                    mastered
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Adaptive skill ratings */}
          {hasRatings && (
            <div className="bg-card border border-card-border rounded-lg p-5 mb-8">
              <div className="flex items-start justify-between mb-4 gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-white mb-1">
                    Skill ratings
                  </h2>
                  <p className="text-slate-400 text-sm">
                    Adaptive difficulty — the harder you beat, the higher you climb.
                  </p>
                </div>
                <Link
                  href="/practice"
                  className="shrink-0 px-4 py-2 rounded text-sm font-medium transition-colors bg-indigo-500 text-white hover:bg-indigo-400"
                >
                  Practice
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Top 5 */}
                <div>
                  <h3 className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                    Strongest topics
                  </h3>
                  <div className="space-y-1.5">
                    {topRatings.map(([topic, rating]) => {
                      const level = ratingToLevel(rating);
                      const levelColor =
                        level === "excellence"
                          ? "text-indigo-300"
                          : level === "merit"
                          ? "text-emerald-300"
                          : "text-slate-300";
                      return (
                        <div
                          key={topic}
                          className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded px-3 py-2"
                        >
                          <span className="text-sm text-white truncate mr-2">
                            {getTopicLabel(topic)}
                          </span>
                          <span className="text-xs shrink-0 tabular-nums">
                            <span className="text-white font-semibold">{rating}</span>
                            <span className="text-slate-600 mx-1.5">·</span>
                            <span className={`capitalize ${levelColor}`}>{level}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Bottom 3 */}
                <div>
                  <h3 className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">
                    Needs work
                  </h3>
                  {bottomRatings.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Nothing flagged — keep practising.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {bottomRatings.map(([topic, rating]) => {
                        const level = ratingToLevel(rating);
                        return (
                          <div
                            key={topic}
                            className="flex items-center justify-between bg-red-950/20 border border-red-900/20 rounded px-3 py-2"
                          >
                            <span className="text-sm text-white truncate mr-2">
                              {getTopicLabel(topic)}
                            </span>
                            <span className="text-xs shrink-0 tabular-nums">
                              <span className="text-red-300 font-semibold">{rating}</span>
                              <span className="text-slate-600 mx-1.5">·</span>
                              <span className="text-red-400 capitalize">{level}</span>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Topic heatmap */}
            <div className="bg-card border border-card-border rounded-lg p-5">
              <h2 className="text-lg font-semibold text-white mb-4">
                Topic Strength
              </h2>
              {allTopics.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Take some exams to see topic data.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
                  {allTopics.map((t, idx) => {
                    const pct = Math.round(t.correctRate * 100);
                    return (
                      <div key={t.topic}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-300 truncate mr-2">
                            {getTopicLabel(t.topic)}
                          </span>
                          <span
                            className={`shrink-0 ${
                              pct >= 70
                                ? "text-green-400"
                                : pct >= 40
                                ? "text-yellow-400"
                                : "text-red-400"
                            }`}
                          >
                            {pct}%
                            {t.trend === "improving" && " ↑"}
                            {t.trend === "declining" && " ↓"}
                          </span>
                        </div>
                        <div className="w-full bg-slate-800 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-700 ease-out ${
                              pct >= 70
                                ? "bg-green-500"
                                : pct >= 40
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            }`}
                            style={{ width: `${pct}%`, transitionDelay: `${idx * 60}ms` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Weak areas */}
            <div className="bg-card border border-card-border rounded-lg p-5">
              <h2 className="text-lg font-semibold text-white mb-4">
                Focus Areas
              </h2>
              {weakTopics.length === 0 ? (
                <p className="text-sm text-slate-400">No weak areas detected yet.</p>
              ) : (
                <div className="space-y-3">
                  {weakTopics.map((t) => {
                    const pct = Math.round(t.correctRate * 100);
                    return (
                      <div
                        key={t.topic}
                        className="flex items-center justify-between p-3 bg-red-950/20 border border-red-900/20 rounded"
                      >
                        <div>
                          <span className="text-sm text-white">
                            {getTopicLabel(t.topic)}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            {t.attempts} attempts
                          </span>
                        </div>
                        <span className="text-sm text-red-400 font-medium">
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                  <Link
                    href="/practice"
                    className="block text-center mt-3 text-sm text-blue-400 hover:text-blue-300 underline"
                  >
                    Practice these topics
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Custom generated papers */}
          {customExams.length > 0 && (
            <div className="bg-card border border-card-border rounded-lg p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Generated Papers</h2>
                  <p className="text-xs text-slate-400">Custom AI-built papers saved to this browser</p>
                </div>
                <Link
                  href="/generate"
                  className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                >
                  + New
                </Link>
              </div>
              <div className="space-y-2">
                {customExams.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between gap-3 py-2 border-b border-slate-800 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{ex.title}</p>
                      <p className="text-xs text-slate-500 truncate">
                        {ex.subject}
                        {ex.level > 0 ? ` · NCEA L${ex.level}` : " · Year 10"}
                        {" · "}
                        {ex.questionCount} questions
                        {ex.topic ? ` · ${ex.topic}` : ""}
                        {ex.createdAt && ex.createdAt !== new Date(0).toISOString() && (
                          <> · {new Date(ex.createdAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link
                        href={`/exam/${ex.id}?mode=practice`}
                        className="text-xs px-3 py-1.5 rounded bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1] hover:text-white transition-colors"
                      >
                        Start
                      </Link>
                      <button
                        onClick={() => handleDeleteCustom(ex.id)}
                        aria-label={`Delete ${ex.title}`}
                        className="text-xs p-1.5 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent attempts */}
          <div className="bg-card border border-card-border rounded-lg p-5">
            <h2 className="text-lg font-semibold text-white mb-4">
              Recent Exams
            </h2>
            <div className="space-y-2">
              {recentAttempts.map((attempt, i) => {
                const pct =
                  attempt.maxMarks > 0
                    ? Math.round(
                        (attempt.totalMarks / attempt.maxMarks) * 100
                      )
                    : 0;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between py-2 border-b border-slate-800 last:border-0"
                  >
                    <div>
                      <span className="text-sm text-white">
                        {attempt.examId}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">
                        {attempt.mode} &middot;{" "}
                        {new Date(attempt.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-300">
                        {attempt.totalMarks}/{attempt.maxMarks} ({pct}%)
                      </span>
                      <span
                        className={`text-xs font-medium ${gradeColor(attempt.overallGrade)}`}
                      >
                        {gradeLabel(attempt.overallGrade)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Today's tasks widget ───────────────────────────────────────────────
// Shows the current week's tasks from the active study plan. Clicking a
// task jumps straight to the exam or review page. If there's no plan the
// widget shows a CTA to create one.

function TodaysTasksWidget({ week }: { week: StudyWeek | null }) {
  if (!week) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-5 mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">
              Today&apos;s tasks
            </h2>
            <p className="text-sm text-slate-400">
              Build a study plan to see week-by-week tasks here.
            </p>
          </div>
          <Link
            href="/plan"
            className="shrink-0 px-4 py-2 rounded text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            Create plan
          </Link>
        </div>
      </div>
    );
  }

  const done = week.tasks.filter((t) => t.completed).length;
  const total = week.tasks.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="bg-card border border-card-border rounded-lg p-5 mb-8">
      <div className="flex items-start justify-between mb-4 gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white mb-1">
            Today&apos;s tasks
          </h2>
          <p className="text-sm text-slate-400">
            Week {week.weekNumber} · {week.focus} · {done}/{total} done ({pct}%)
          </p>
        </div>
        <Link
          href="/plan"
          className="shrink-0 px-3 py-1.5 rounded text-xs font-medium border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Open plan
        </Link>
      </div>
      <div className="w-full bg-zinc-800 rounded-full h-1.5 mb-4">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="space-y-1.5">
        {week.tasks.map((task) => (
          <DashboardTaskRow key={task.id} task={task} />
        ))}
      </div>
    </div>
  );
}

function DashboardTaskRow({ task }: { task: StudyTask }) {
  const href = (() => {
    if (task.examId) {
      const mode = task.type === "exam" ? "mock" : "practice";
      return `/exam/${task.examId}?mode=${mode}`;
    }
    if (task.type === "review") return "/review";
    if (task.subject) return "/subjects";
    return null;
  })();

  const body = (
    <span
      className={`text-sm flex-1 min-w-0 truncate ${
        task.completed ? "line-through text-zinc-500" : "text-zinc-200"
      }`}
    >
      {task.description}
    </span>
  );

  return (
    <div className="flex items-center gap-3 py-1">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          markTaskComplete(task.id);
        }}
        aria-label={task.completed ? "Mark incomplete" : "Mark complete"}
        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
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
      <span
        className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${
          task.type === "exam"
            ? "bg-indigo-500/15 text-indigo-300"
            : task.type === "practice"
            ? "bg-emerald-500/15 text-emerald-300"
            : "bg-amber-500/15 text-amber-300"
        }`}
      >
        {task.type}
      </span>
      {href ? (
        <Link href={href} className="flex-1 min-w-0 hover:text-indigo-300 transition-colors">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}
