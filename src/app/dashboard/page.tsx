"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadProgress, getWeakTopics } from "@/lib/storage";
import { gradeLabel, gradeColor } from "@/lib/scoring";
import { getTopicLabel } from "@/data/topics";
import type { StudentProgress } from "@/lib/types";

export default function DashboardPage() {
  const [progress, setProgress] = useState<StudentProgress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

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

      {!hasData ? (
        <div className="bg-card border border-card-border rounded-lg p-12 text-center">
          <h2 className="text-xl font-semibold text-white mb-2">
            No exams taken yet
          </h2>
          <p className="text-slate-400 mb-4">
            Take your first exam to start tracking progress.
          </p>
          <Link
            href="/subjects"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Browse Exams
          </Link>
        </div>
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
