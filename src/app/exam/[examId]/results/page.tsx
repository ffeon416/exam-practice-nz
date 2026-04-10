"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getExam } from "@/data/exams";
import { getTopicLabel } from "@/data/topics";
import {
  calculateOverallGrade,
  gradeLabel,
  gradeColor,
  gradeBgColor,
  analyzeGaps,
} from "@/lib/scoring";
import { addExamAttempt } from "@/lib/storage";
import type { Exam, MarkingResult } from "@/lib/types";
import TopicTag from "@/components/TopicTag";

export default function ResultsPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const [exam, setExam] = useState<Exam | null>(null);
  const [results, setResults] = useState<MarkingResult[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selfMarked, setSelfMarked] = useState(false);
  const [view, setView] = useState<"summary" | "review">("summary");
  const [currentQ, setCurrentQ] = useState(0);
  // Self-assessment: true = right, false = wrong, undefined = not yet assessed
  const [selfAssess, setSelfAssess] = useState<Record<string, boolean>>({});
  const [expandedQ, setExpandedQ] = useState<string | null>(null);
  const [autoScored, setAutoScored] = useState(false);

  useEffect(() => {
    const e = getExam(examId);
    if (!e) return;
    setExam(e);

    const stored = sessionStorage.getItem(`exam-answers-${examId}`);
    if (!stored) {
      setError("No answers found. Please take the exam first.");
      setLoading(false);
      return;
    }

    const { answers: savedAnswers, mode } = JSON.parse(stored);
    setAnswers(savedAnswers);

    function selfMark(): MarkingResult[] {
      return e!.questions.map((q) => {
        const studentAnswer = (savedAnswers[q.id] ?? "").trim();
        const hasAnswer = studentAnswer.length > 0;
        return {
          questionId: q.id,
          marksAwarded: 0,
          maxMarks: q.marks,
          grade: "not-achieved" as const,
          feedback: hasAnswer
            ? "Compare your answer with the correct approach below. Did you include all the key steps?"
            : "You didn't answer this question. Study the correct approach below so you can tackle it next time.",
          correctApproach: q.expectedAnswer ?? q.markingGuide,
          examTip: q.markingGuide,
          topicsToReview: q.topics,
        };
      });
    }

    fetch("/api/mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questions: e.questions.map((q) => ({
          id: q.id,
          text: q.text,
          marks: q.marks,
          gradeLevel: q.gradeLevel,
          markingGuide: q.markingGuide,
          topics: q.topics,
        })),
        answers: savedAnswers,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("api-failed");
        return res.json();
      })
      .then((data) => {
        setResults(data.results);
        setSelfMarked(false);

        const overallGrade = calculateOverallGrade(data.results, e.cutScores);
        const totalMarks = data.results.reduce(
          (s: number, r: MarkingResult) => s + r.marksAwarded,
          0
        );
        const maxMarks = data.results.reduce(
          (s: number, r: MarkingResult) => s + r.maxMarks,
          0
        );

        addExamAttempt({
          examId,
          date: new Date().toISOString(),
          answers: savedAnswers,
          results: data.results,
          overallGrade,
          totalMarks,
          maxMarks,
          mode,
        });

        setLoading(false);
      })
      .catch(() => {
        const fallbackResults = selfMark();
        setResults(fallbackResults);
        setSelfMarked(true);

        // Auto-score: flexible matching — check for key concepts, not exact wording
        const autoAssess: Record<string, boolean> = {};

        function normalize(s: string): string {
          return s
            .toLowerCase()
            .replace(/\s+/g, " ")
            .replace(/[×·*]/g, "*")
            .replace(/[–—−-]/g, "-")
            .replace(/[''`]/g, "")
            .replace(/,/g, "")
            .replace(/\./g, "")
            .trim();
        }

        function flexMatch(raw: string, expected: string): boolean {
          const normRaw = normalize(raw);
          const normExpected = normalize(expected);

          // Exact match
          if (normRaw === normExpected) return true;

          // For short numeric answers, check the number is present
          const expectedNum = expected.replace(/[^0-9.\-\/]/g, "").trim();
          const rawNum = raw.replace(/[^0-9.\-\/]/g, "").trim();
          if (expectedNum && rawNum && expectedNum === rawNum) return true;

          // For text answers: check if the key words from the expected answer appear in the student's answer
          const expectedWords = normExpected
            .split(/\s+/)
            .filter((w) => w.length > 3)
            .filter((w) => !["the", "that", "this", "with", "from", "have", "been", "were", "will", "would", "could", "should", "their", "there", "about", "which", "when", "what", "your", "more", "than", "also", "into", "some", "them", "then", "each", "because", "answer", "correct"].includes(w));

          if (expectedWords.length === 0) return normRaw === normExpected;

          // Count how many key words appear in the student's answer
          const matchCount = expectedWords.filter((w) => normRaw.includes(w)).length;
          const matchRatio = matchCount / expectedWords.length;

          // Accept if 60%+ of key words are present
          return matchRatio >= 0.6;
        }

        e.questions.forEach((question) => {
          const raw = (savedAnswers[question.id] ?? "").trim();
          const expected = question.expectedAnswer ?? "";

          if (!raw || !expected) {
            autoAssess[question.id] = false;
            return;
          }

          autoAssess[question.id] = flexMatch(raw, expected);
        });
        setSelfAssess(autoAssess);
        setAutoScored(true);
        setLoading(false);
      });
  }, [examId]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <div className="animate-pulse">
          <div className="w-16 h-16 bg-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
            <span className="text-2xl text-white">AI</span>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">
            Marking your exam...
          </h2>
          <p className="text-slate-400">
            AI is reviewing each answer against the marking schedule
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-red-400 mb-4">{error}</p>
        <Link
          href="/subjects"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          Back to exams
        </Link>
      </div>
    );
  }

  if (!exam || !results) return null;

  const overallGrade = calculateOverallGrade(results, exam?.cutScores);
  const totalMarks = results.reduce((s, r) => s + r.marksAwarded, 0);
  const maxMarks = results.reduce((s, r) => s + r.maxMarks, 0);
  const pct = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;
  const gaps = analyzeGaps(results);

  const answeredCount = exam.questions.filter(
    (q) => (answers[q.id] ?? "").trim().length > 0
  ).length;
  const unansweredCount = exam.questions.length - answeredCount;

  // Current question for review view
  const q = exam.questions[currentQ];
  const r = results[currentQ];
  const isFullMarks = r && !selfMarked && r.marksAwarded === r.maxMarks;
  const hasAnswer = (answers[q?.id] ?? "").trim().length > 0;

  // ── SUMMARY VIEW ──
  if (view === "summary") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Two circles side by side */}
        {(() => {
          const radius = 50;
          const circumference = 2 * Math.PI * radius;
          const total = exam.questions.length;

          // Circle 1: Answered vs Skipped
          const answeredPct = Math.round((answeredCount / total) * 100);
          const answeredOffset = circumference - (answeredPct / 100) * circumference;

          // Circle 2: Right vs Wrong
          const assessedCount = Object.keys(selfAssess).length;
          const selfRightCount = Object.values(selfAssess).filter(Boolean).length;
          const rightCount = selfMarked ? selfRightCount : results.filter((res) => res.marksAwarded === res.maxMarks).length;
          const wrongCount = selfMarked ? (assessedCount - selfRightCount) : (total - rightCount);
          const reviewedTotal = selfMarked ? assessedCount : total;
          const rightPct = reviewedTotal > 0 ? Math.round((rightCount / total) * 100) : 0;
          const rightOffset = circumference - (rightPct / 100) * circumference;

          return (
            <div className="mb-6">
              <div className="flex justify-center gap-8 sm:gap-12 mb-4">
                {/* Circle 1 — Answered / Skipped */}
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32 sm:w-36 sm:h-36 mb-2">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120" shapeRendering="geometricPrecision">
                      <circle cx="60" cy="60" r={radius} fill="none" stroke="#334155" strokeWidth="10" />
                      <circle cx="60" cy="60" r={radius} fill="none" stroke="#3b82f6" strokeWidth="10"
                        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={answeredOffset}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl sm:text-3xl font-bold text-white">{answeredCount}</span>
                      <span className="text-[10px] sm:text-xs text-slate-400">of {total}</span>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-white mb-1">Answered</span>
                  <div className="flex items-center gap-3 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-slate-400">{answeredCount} answered</span></span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-600" /><span className="text-slate-400">{unansweredCount} skipped</span></span>
                  </div>
                </div>

                {/* Circle 2 — Right / Wrong */}
                <div className="flex flex-col items-center">
                  <div className="relative w-32 h-32 sm:w-36 sm:h-36 mb-2">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120" shapeRendering="geometricPrecision">
                      <circle cx="60" cy="60" r={radius} fill="none" stroke="#ef4444" strokeWidth="10" opacity="0.7" />
                      <circle cx="60" cy="60" r={radius} fill="none" stroke="#22c55e" strokeWidth="10"
                        strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={rightOffset}
                        className="transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {selfMarked && assessedCount === 0 ? (
                        <span className="text-lg font-bold text-slate-500">?</span>
                      ) : (
                        <>
                          <span className="text-2xl sm:text-3xl font-bold text-white">{rightCount}</span>
                          <span className="text-[10px] sm:text-xs text-slate-400">of {total}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium text-white mb-1">Correct</span>
                  <div className="flex items-center gap-3 text-[10px]">
                    {selfMarked && assessedCount === 0 ? (
                      <span className="text-slate-500">Review questions below</span>
                    ) : (
                      <>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-slate-400">{rightCount} right</span></span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 opacity-50" /><span className="text-slate-400">{wrongCount} wrong</span></span>
                        {selfMarked && assessedCount < total && (
                          <span className="text-slate-500">({total - assessedCount} left)</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Grade + exam title */}
              <div className="text-center">
                {!selfMarked && (
                  <h1 className={`text-lg font-bold ${gradeColor(overallGrade)}`}>
                    {gradeLabel(overallGrade)} — {pct}%
                  </h1>
                )}
                <p className="text-slate-500 text-xs mt-1">{exam.title}</p>
              </div>
            </div>
          );
        })()}

        {/* What to work on — only topics that exist in this exam */}
        {!selfMarked && (() => {
          // Get only topics that are actually in this exam's questions
          const examTopics = new Set(exam.questions.flatMap((qq) => qq.topics));
          const weak = gaps.filter((g) => g.pct < 70 && examTopics.has(g.topic));
          const strong = gaps.filter((g) => g.pct >= 70 && examTopics.has(g.topic));
          if (weak.length === 0 && strong.length === 0) return null;
          return (
            <div className="bg-card border border-card-border rounded-lg p-5 mb-6">
              {weak.length > 0 && (
                <>
                  <h2 className="text-sm font-semibold text-red-400 mb-1">Work on these</h2>
                  <p className="text-slate-500 text-xs mb-2">You scored under 70% on these topics — practise them to improve</p>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {weak.map((g) => (
                      <span key={g.topic} className="text-xs px-2 py-1 rounded border bg-red-600/10 border-red-700/30 text-red-400">
                        {getTopicLabel(g.topic)}
                      </span>
                    ))}
                  </div>
                </>
              )}
              {strong.length > 0 && (
                <>
                  <h2 className="text-sm font-semibold text-green-400 mb-1">{weak.length > 0 ? "Looking good on" : "Nice work on"}</h2>
                  <p className="text-slate-500 text-xs mb-2">You scored 70%+ on these — keep it up</p>
                  <div className="flex flex-wrap gap-1.5">
                    {strong.map((g) => (
                      <span key={g.topic} className="text-xs px-2 py-1 rounded border bg-green-600/10 border-green-700/30 text-green-400">
                        {getTopicLabel(g.topic)}
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
          );
        })()}

        {/* Question grid + inline answer reveal */}
        <div className="bg-card border border-card-border rounded-lg p-5 mb-6">
          <h2 className="text-sm font-semibold text-white mb-1">Learn From Your Mistakes</h2>
          <p className="text-slate-500 text-xs mb-3">Tap any question to see the correct answer</p>
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-10 gap-2 mb-3">
            {exam.questions.map((question, i) => {
              const result = results[i];
              const answered = (answers[question.id] ?? "").trim().length > 0;
              const full = result && !selfMarked && result.marksAwarded === result.maxMarks;
              const partial = result && !selfMarked && result.marksAwarded > 0 && !full;
              const assessed = selfAssess[question.id];
              const isSelected = expandedQ === question.id;

              return (
                <button
                  key={question.id}
                  onClick={() => setExpandedQ(isSelected ? null : question.id)}
                  className={`py-2 px-1 rounded text-xs font-medium transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white border border-blue-400 ring-1 ring-blue-400"
                      : selfMarked && assessed === true
                      ? "bg-green-600/20 text-green-400 border border-green-700/30 hover:bg-green-600/30"
                      : selfMarked && assessed === false
                      ? "bg-red-600/20 text-red-400 border border-red-700/30 hover:bg-red-600/30"
                      : full
                      ? "bg-green-600/20 text-green-400 border border-green-700/30 hover:bg-green-600/30"
                      : partial
                      ? "bg-yellow-600/20 text-yellow-400 border border-yellow-700/30 hover:bg-yellow-600/30"
                      : selfMarked && answered
                      ? "bg-blue-600/20 text-blue-400 border border-blue-700/30 hover:bg-blue-600/30"
                      : selfMarked && !answered
                      ? "bg-slate-800 text-slate-500 border border-slate-700 hover:bg-slate-700"
                      : "bg-red-600/20 text-red-400 border border-red-700/30 hover:bg-red-600/30"
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Inline answer card */}
          {expandedQ && (() => {
            const qIdx = exam.questions.findIndex((qq) => qq.id === expandedQ);
            const qq = exam.questions[qIdx];
            const rr = results[qIdx];
            if (!qq || !rr) return null;
            const myAns = (answers[qq.id] ?? "").trim();

            return (
              <div className="border-t border-slate-700 pt-3 mt-1 space-y-3">
                {/* Question text */}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Q{qq.number}</p>
                  <p className="text-sm text-slate-300 whitespace-pre-wrap">{qq.text.replace(/\[Diagram:[^\]]+\]/g, "").trim()}</p>
                </div>

                {/* Your working */}
                {answers[`${qq.id}_working`] && (
                  <div>
                    <p className="text-xs text-slate-400 mb-1">Your working</p>
                    <p className="text-sm text-white bg-slate-900 border border-slate-700 rounded p-2.5 whitespace-pre-wrap">
                      {answers[`${qq.id}_working`]}
                    </p>
                  </div>
                )}

                {/* Your final answer */}
                <div>
                  <p className="text-xs text-slate-400 mb-1">Your final answer</p>
                  <p className="text-sm text-white bg-slate-900 border border-slate-700 rounded p-2.5 whitespace-pre-wrap">
                    {myAns || "(No answer)"}
                  </p>
                </div>

                {/* Correct working */}
                <div>
                  <p className="text-xs text-blue-400 mb-1">Correct working</p>
                  <p className="text-sm text-slate-200 bg-blue-950/20 border border-blue-900/30 rounded p-2.5 whitespace-pre-wrap">
                    {qq.markingGuide}
                  </p>
                </div>

                {/* Correct final answer */}
                <div>
                  <p className="text-xs text-green-400 mb-1">Correct final answer</p>
                  <p className="text-sm text-white bg-green-950/30 border border-green-800/30 rounded p-2.5 whitespace-pre-wrap font-medium">
                    {qq.expectedAnswer ?? "(See working above)"}
                  </p>
                </div>
              </div>
            );
          })()}
        </div>


        {/* Next grade hint */}
        {!selfMarked && overallGrade !== "excellence" && exam.cutScores && (
          <div className="bg-amber-950/20 border border-amber-700/30 rounded-lg p-4 mb-6">
            <p className="text-slate-300 text-sm">
              You need{" "}
              <span className="font-bold text-white">
                {(overallGrade === "not-achieved"
                  ? exam.cutScores.achieved.min
                  : overallGrade === "achieved"
                  ? exam.cutScores.merit.min
                  : exam.cutScores.excellence.min) - totalMarks}
              </span>{" "}
              more mark
              {(overallGrade === "not-achieved"
                ? exam.cutScores.achieved.min
                : overallGrade === "achieved"
                ? exam.cutScores.merit.min
                : exam.cutScores.excellence.min) -
                totalMarks !==
              1
                ? "s"
                : ""}{" "}
              to reach{" "}
              <span className="font-bold text-white">
                {overallGrade === "not-achieved"
                  ? "Achieved"
                  : overallGrade === "achieved"
                  ? "Merit"
                  : "Excellence"}
              </span>
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => {
              setCurrentQ(0);
              setView("review");
            }}
            className="w-full py-3 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Review All Questions
          </button>
          <div className="flex gap-3">
            <Link
              href="/subjects"
              className="flex-1 text-center py-3 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Try Another Exam
            </Link>
            <Link
              href="/practice"
              className="flex-1 text-center py-3 rounded bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Practice Weak Areas
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── REVIEW VIEW (one question at a time) ──
  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setView("summary")}
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          &larr; Back to summary
        </button>
        <span className="text-sm text-slate-400">
          {currentQ + 1} / {exam.questions.length}
        </span>
        {!selfMarked && r && (
          <span
            className={`text-sm font-bold ${
              isFullMarks
                ? "text-green-400"
                : r.marksAwarded > 0
                ? "text-yellow-400"
                : "text-red-400"
            }`}
          >
            {r.marksAwarded}/{r.maxMarks}
          </span>
        )}
        {selfMarked && (
          <span className="text-sm text-slate-400">{q.marks} marks</span>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex gap-1 mb-5 flex-wrap justify-center sm:justify-start">
        {exam.questions.map((question, i) => {
          const result = results[i];
          const full = result && !selfMarked && result.marksAwarded === result.maxMarks;
          const partial = result && !selfMarked && result.marksAwarded > 0 && !full;
          const assessed = selfAssess[question.id];
          const isCurrent = i === currentQ;

          return (
            <button
              key={question.id}
              onClick={() => setCurrentQ(i)}
              className={`h-2 rounded-full transition-all ${
                isCurrent ? "w-6" : "w-2"
              } ${
                isCurrent
                  ? "bg-blue-500"
                  : selfMarked && assessed === true
                  ? "bg-green-500"
                  : selfMarked && assessed === false
                  ? "bg-red-500"
                  : full
                  ? "bg-green-500"
                  : partial
                  ? "bg-yellow-500"
                  : selfMarked
                  ? "bg-slate-600"
                  : "bg-red-500"
              }`}
            />
          );
        })}
      </div>

      {/* Question card */}
      <div className="bg-card border border-card-border rounded-lg overflow-hidden mb-4">
        {/* Question header */}
        <div className="px-5 py-3 border-b border-slate-700 flex items-center justify-between">
          <span className="text-white font-semibold">{currentQ + 1}. <span className="text-slate-400 font-normal text-sm">Q{q.number}</span></span>
          <div className="flex gap-1.5">
            {q.topics.map((t) => (
              <TopicTag key={t} topicId={t} />
            ))}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Diagram */}
          {q.image && (
            <div className="rounded-lg overflow-hidden border border-slate-700 bg-white p-2">
              <img
                src={q.image}
                alt={`Diagram for Question ${q.number}`}
                className="max-w-full h-auto mx-auto max-h-[500px] object-contain"
              />
            </div>
          )}

          {/* Question text */}
          <div>
            <div className="text-sm">
              {q.text.split(/(\[Diagram:[^\]]+\])/).map((part, j) =>
                part.startsWith("[Diagram:") ? (
                  q.image ? null : (
                    <div
                      key={j}
                      className="bg-slate-800/60 border border-slate-700 rounded px-3 py-2 mb-2 text-xs text-slate-400 italic"
                    >
                      {part.slice(1, -1)}
                    </div>
                  )
                ) : (
                  <p key={j} className="text-slate-300 whitespace-pre-wrap">
                    {part}
                  </p>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Your working */}
      {answers[`${q.id}_working`] && (
        <div className="bg-card border border-card-border rounded-lg p-4 mb-4">
          <h4 className="text-xs font-medium text-slate-400 mb-2 uppercase">Your Working</h4>
          <p className="text-sm text-white bg-slate-900 rounded p-3 whitespace-pre-wrap">
            {answers[`${q.id}_working`]}
          </p>
        </div>
      )}

      {/* Your final answer */}
      <div className="bg-card border border-card-border rounded-lg p-4 mb-4">
        <h4 className="text-xs font-medium text-slate-400 mb-2 uppercase">Your Final Answer</h4>
        <p
          className={`text-sm whitespace-pre-wrap rounded p-3 ${
            !hasAnswer
              ? "text-slate-500 italic bg-slate-900"
              : isFullMarks
              ? "text-white bg-green-950/20 border border-green-900/20"
              : "text-white bg-slate-900"
          }`}
        >
          {answers[q.id] || "(No answer)"}
        </p>
      </div>

      {/* Correct working */}
      <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-4 mb-4">
        <h4 className="text-xs font-medium text-blue-400 mb-2 uppercase">Correct Working</h4>
        <p className="text-slate-300 text-sm whitespace-pre-wrap">
          {q.markingGuide}
        </p>
      </div>

      {/* Correct final answer */}
      <div className="bg-green-950/20 border border-green-900/30 rounded-lg p-4 mb-4">
        <h4 className="text-xs font-medium text-green-400 mb-2 uppercase">Correct Final Answer</h4>
        <p className="text-white text-sm whitespace-pre-wrap font-medium">
          {q.expectedAnswer ?? "(See working above)"}
        </p>
      </div>

      {/* Feedback */}
      {r && !isFullMarks && (
        <div className="bg-amber-950/15 border border-amber-900/20 rounded-lg p-4 mb-4">
          <h4 className="text-xs font-medium text-amber-400 mb-2 uppercase">Feedback</h4>
          <p className="text-slate-300 text-sm whitespace-pre-wrap">
            {selfMarked ? r.examTip : r.feedback}
          </p>
        </div>
      )}

      {/* Exam tip — only for wrong answers in AI mode */}
      {r && !selfMarked && !isFullMarks && (
        <div className="bg-blue-950/20 border border-blue-900/20 rounded-lg p-4 mb-4">
          <h4 className="text-xs font-medium text-blue-400 mb-2 uppercase">Exam Tip</h4>
          <p className="text-slate-300 text-sm">{r.examTip}</p>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3 mt-2">
        <button
          onClick={() => setCurrentQ((c) => Math.max(0, c - 1))}
          disabled={currentQ === 0}
          className="flex-1 py-3 rounded border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
        >
          &larr; Previous
        </button>
        {currentQ < exam.questions.length - 1 ? (
          <button
            onClick={() => setCurrentQ((c) => c + 1)}
            className="flex-1 py-3 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            Next &rarr;
          </button>
        ) : (
          <button
            onClick={() => setView("summary")}
            className="flex-1 py-3 rounded bg-green-600 text-white font-medium hover:bg-green-700 transition-colors"
          >
            Done — View Summary
          </button>
        )}
      </div>
    </div>
  );
}
