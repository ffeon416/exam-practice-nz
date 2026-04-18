"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { demoQuestions, demoResults } from "@/data/demoQuestions";
import type { MarkingResult } from "@/lib/types";

type Step = "intro" | "answering" | "marking" | "results";

function gradeColor(grade: string) {
  switch (grade) {
    case "excellence":
      return "text-yellow-400 bg-yellow-500/15 border-yellow-500/30";
    case "merit":
      return "text-blue-400 bg-blue-500/15 border-blue-500/30";
    case "achieved":
      return "text-green-400 bg-green-500/15 border-green-500/30";
    default:
      return "text-red-400 bg-red-500/15 border-red-500/30";
  }
}

function gradeLabel(grade: string) {
  switch (grade) {
    case "excellence":
      return "Excellence";
    case "merit":
      return "Merit";
    case "achieved":
      return "Achieved";
    default:
      return "Not Achieved";
  }
}

function marksColor(awarded: number, max: number) {
  const pct = awarded / max;
  if (pct >= 1) return "text-emerald-400";
  if (pct >= 0.5) return "text-yellow-400";
  return "text-red-400";
}

// Abbreviate question text for result cards
function abbreviate(text: string, len = 80) {
  const firstLine = text.split("\n")[0];
  if (firstLine.length <= len) return firstLine;
  return firstLine.slice(0, len).trim() + "...";
}

// Check if question 3 (has a passage)
function hasPassage(q: typeof demoQuestions[number]) {
  return q.text.includes("Read the following passage");
}

function extractPassage(text: string): { intro: string; passage: string; question: string } {
  const passageStart = text.indexOf('"The old lighthouse');
  const passageEnd = text.indexOf('earned the view."') + 'earned the view."'.length;
  const intro = text.slice(0, text.indexOf("\n\n")).trim();
  const passage = text.slice(passageStart, passageEnd);
  const question = text.slice(passageEnd).trim().replace(/^\n+/, "");
  return { intro, passage, question };
}

export default function DemoPage() {
  const [step, setStep] = useState<Step>("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<MarkingResult[] | null>(null);
  const [markingDone, setMarkingDone] = useState<boolean[]>([false, false, false]);
  const [expandedAnswer, setExpandedAnswer] = useState<Record<number, boolean>>({});

  const question = demoQuestions[currentQ];
  const isLastQ = currentQ === demoQuestions.length - 1;
  const currentHasAnswer = (answers[question.id] ?? "").trim().length > 0;
  const allAnswered = demoQuestions.every((q) => (answers[q.id] ?? "").trim().length > 0);

  const updateAnswer = useCallback(
    (field: string, value: string) => {
      setAnswers((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const handleNext = useCallback(() => {
    if (isLastQ) {
      // Submit for marking
      setStep("marking");
      submitForMarking();
    } else {
      setCurrentQ((prev) => prev + 1);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLastQ, currentQ]);

  const handlePrev = useCallback(() => {
    if (currentQ > 0) setCurrentQ((prev) => prev - 1);
  }, [currentQ]);

  const submitForMarking = async () => {
    setMarkingDone([false, false, false]);
    // Use pre-baked results — zero API cost, feels identical to real AI marking
    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
      setMarkingDone((prev) => {
        const next = [...prev];
        next[i] = true;
        return next;
      });
    }
    await new Promise((r) => setTimeout(r, 400));
    setResults(demoResults);
    setStep("results");
  };

  // ── INTRO ──
  if (step === "intro") {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/[0.08] blur-[120px] rounded-full" />
          <div className="absolute top-[300px] right-0 w-[400px] h-[400px] bg-purple-500/[0.06] blur-[100px] rounded-full" />
        </div>

        <section className="max-w-3xl mx-auto px-5 pt-16 sm:pt-28 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-[11px] text-zinc-400 mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            No sign-up needed
          </div>

          <h1 className="text-[32px] sm:text-[48px] md:text-[56px] font-bold text-white tracking-tight leading-[1.1] sm:leading-[1.05] mb-5 sm:mb-6">
            See how AI marks
            <br />
            <span className="bg-gradient-to-r from-indigo-300 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
              your answers
            </span>
          </h1>

          <p className="text-zinc-400 text-[14px] sm:text-[16px] md:text-[18px] leading-relaxed max-w-xl mx-auto mb-8 sm:mb-10 px-2">
            Try 3 real NCEA questions. Get instant feedback with marks,
            explanations, and exam tips &mdash; in seconds.
          </p>

          <button
            onClick={() => setStep("answering")}
            className="group bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-8 py-3.5 rounded-lg transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/20 text-[15px] inline-flex items-center justify-center gap-2"
          >
            Start Demo
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </button>

          <p className="text-[12px] text-zinc-600 mt-6">
            3 questions &middot; ~5 minutes &middot; Instant AI marking
          </p>
        </section>
      </div>
    );
  }

  // ── ANSWERING ──
  if (step === "answering") {
    const showPassage = hasPassage(question);
    const passage = showPassage ? extractPassage(question.text) : null;

    const subjectLabels = ["Science", "Maths", "English"];
    const levelLabels = ["Year 11", "Year 11", "Year 11"];

    return (
      <div className="max-w-3xl mx-auto px-5 pt-8 sm:pt-12 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold mb-1">
              {levelLabels[currentQ]} {subjectLabels[currentQ]}
            </p>
            <h2 className="text-white font-bold text-[20px] sm:text-[24px]">
              Question {currentQ + 1} of 3
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-zinc-500 mr-1">
              {question.marks} mark{question.marks !== 1 ? "s" : ""}
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${gradeColor(
                question.gradeLevel
              )}`}
            >
              {gradeLabel(question.gradeLevel)}
            </span>
          </div>
        </div>

        {/* Question card */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-5 sm:p-7 mb-6">
          {showPassage && passage ? (
            <>
              <p className="text-zinc-300 text-[14px] sm:text-[15px] leading-relaxed mb-4">
                {passage.intro}
              </p>
              <blockquote className="rounded-xl bg-white/[0.03] border border-white/[0.06] px-5 py-4 mb-4">
                <p className="text-zinc-300 text-[14px] leading-relaxed italic">
                  &ldquo;{passage.passage.replace(/^"|"$/g, "")}&rdquo;
                </p>
              </blockquote>
              <p className="text-zinc-300 text-[14px] sm:text-[15px] leading-relaxed">
                {passage.question}
              </p>
            </>
          ) : (
            <p className="text-zinc-300 text-[14px] sm:text-[15px] leading-relaxed whitespace-pre-line">
              {question.text}
            </p>
          )}
        </div>

        {/* Working textarea (for working-type questions) */}
        {question.answerType === "working" && (
          <div className="mb-4">
            <label className="block text-[12px] text-zinc-500 mb-2 font-medium">
              Show your working (optional)
            </label>
            <textarea
              value={answers[`${question.id}_working`] ?? ""}
              onChange={(e) =>
                updateAnswer(`${question.id}_working`, e.target.value)
              }
              placeholder="Show your working here..."
              rows={3}
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-[14px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-y"
            />
          </div>
        )}

        {/* Answer textarea */}
        <div className="mb-8">
          <label className="block text-[12px] text-zinc-500 mb-2 font-medium">
            Your answer
          </label>
          <textarea
            value={answers[question.id] ?? ""}
            onChange={(e) => updateAnswer(question.id, e.target.value)}
            placeholder="Type your answer here..."
            rows={4}
            className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-3 text-[14px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-y"
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentQ === 0}
            className="text-zinc-400 hover:text-white text-[14px] font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
              />
            </svg>
            Back
          </button>

          {/* Dot navigation */}
          <div className="flex items-center gap-2">
            {demoQuestions.map((_, i) => {
              const hasAnswer = !!answers[demoQuestions[i].id]?.trim();
              return (
                <button
                  key={i}
                  onClick={() => setCurrentQ(i)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    i === currentQ
                      ? "bg-indigo-500 scale-125"
                      : hasAnswer
                      ? "bg-indigo-500/50"
                      : "bg-white/[0.15]"
                  }`}
                  aria-label={`Go to question ${i + 1}`}
                />
              );
            })}
          </div>

          <button
            onClick={handleNext}
            disabled={isLastQ ? !allAnswered : !currentHasAnswer}
            className={`font-semibold text-[14px] px-5 py-2.5 rounded-lg transition-all inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
              isLastQ
                ? "bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg shadow-indigo-500/20"
                : "bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.1]"
            }`}
          >
            {isLastQ ? "Submit for AI Marking" : "Next question"}
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // ── MARKING ──
  if (step === "marking") {
    return (
      <div className="max-w-lg mx-auto px-5 pt-24 sm:pt-32 pb-24 text-center">
        {/* Pulse animation */}
        <div className="relative w-16 h-16 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
          <div className="relative w-16 h-16 rounded-full bg-indigo-500/30 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-indigo-300 animate-pulse"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.8}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
              />
            </svg>
          </div>
        </div>

        <h2 className="text-white font-bold text-[22px] sm:text-[26px] mb-2">
          AI is marking your answers...
        </h2>
        <p className="text-zinc-500 text-[14px] mb-10">
          Analysing your responses and generating feedback
        </p>

        {/* Progress cards */}
        <div className="flex justify-center gap-2 sm:gap-3">
          {["Science", "Maths", "English"].map((label, i) => (
            <div
              key={label}
              className={`rounded-xl border px-3 sm:px-4 py-3 w-24 sm:w-28 transition-all duration-500 ${
                markingDone[i]
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-white/[0.02] border-white/[0.08]"
              }`}
            >
              <div className="flex items-center justify-center h-6 mb-1.5">
                {markingDone[i] ? (
                  <svg
                    className="w-5 h-5 text-emerald-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={3}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-zinc-600 border-t-indigo-400 animate-spin" />
                )}
              </div>
              <p className="text-[11px] text-zinc-400">{label}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── RESULTS ──
  if (step === "results" && results) {
    const totalAwarded = results.reduce((s, r) => s + r.marksAwarded, 0);
    const totalMax = results.reduce((s, r) => s + r.maxMarks, 0);

    return (
      <div className="max-w-3xl mx-auto px-5 pt-8 sm:pt-12 pb-24">
        {/* Header */}
        <div className="text-center mb-10">
          <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold mb-2">
            Demo Results
          </p>
          <h1 className="text-[28px] sm:text-[36px] font-bold text-white tracking-tight mb-3">
            Your results are in
          </h1>
          <p className="text-zinc-400 text-[15px]">
            You scored{" "}
            <span className="text-white font-semibold">
              {totalAwarded}/{totalMax}
            </span>{" "}
            marks across 3 questions
          </p>
        </div>

        {/* Result cards */}
        <div className="space-y-4 mb-12">
          {results.map((result, i) => {
            const q = demoQuestions[i];
            const isExpanded = expandedAnswer[i] ?? false;

            return (
              <div
                key={result.questionId}
                className="rounded-2xl bg-white/[0.02] border border-white/[0.08] overflow-hidden"
              >
                {/* Card header */}
                <div className="px-5 sm:px-6 py-4 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] text-zinc-500 mb-1">
                      Question {i + 1}
                    </p>
                    <p className="text-zinc-300 text-[14px] leading-relaxed">
                      {abbreviate(q.text)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-[18px] font-bold tabular-nums ${marksColor(
                        result.marksAwarded,
                        result.maxMarks
                      )}`}
                    >
                      {result.marksAwarded}/{result.maxMarks}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${gradeColor(
                        result.grade
                      )}`}
                    >
                      {gradeLabel(result.grade)}
                    </span>
                  </div>
                </div>

                {/* Card body */}
                <div className="border-t border-white/[0.06] px-5 sm:px-6 py-4 space-y-4">
                  {/* Your answer (collapsible) */}
                  <div>
                    <button
                      onClick={() =>
                        setExpandedAnswer((prev) => ({
                          ...prev,
                          [i]: !prev[i],
                        }))
                      }
                      className="flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors font-medium"
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M8.25 4.5l7.5 7.5-7.5 7.5"
                        />
                      </svg>
                      Your answer
                    </button>
                    {isExpanded && (
                      <div className="mt-2 rounded-lg bg-white/[0.02] border border-white/[0.06] px-4 py-3">
                        <p className="text-zinc-400 text-[13px] leading-relaxed whitespace-pre-line">
                          {answers[q.id]?.trim() || "(No answer provided)"}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Feedback */}
                  <div>
                    <p className="text-[12px] text-zinc-500 font-medium mb-1.5">
                      Feedback
                    </p>
                    <p className="text-zinc-300 text-[13px] leading-relaxed">
                      {result.feedback}
                    </p>
                  </div>

                  {/* Correct approach */}
                  <div>
                    <p className="text-[12px] text-zinc-500 font-medium mb-1.5">
                      Correct approach
                    </p>
                    <p className="text-zinc-400 text-[13px] leading-relaxed">
                      {result.correctApproach}
                    </p>
                  </div>

                  {/* Exam tip */}
                  <div className="rounded-lg bg-indigo-500/[0.06] border border-indigo-500/20 px-4 py-3">
                    <p className="text-[12px] text-indigo-400 font-medium mb-1">
                      Exam tip
                    </p>
                    <p className="text-zinc-300 text-[13px] leading-relaxed">
                      {result.examTip}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA section */}
        <div className="rounded-3xl bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent border border-white/[0.08] p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-indigo-500/20 blur-[100px] rounded-full" />

          <div className="relative">
            <h2 className="text-[24px] sm:text-[32px] font-bold text-white tracking-tight mb-3">
              Like what you see?
            </h2>
            <p className="text-zinc-400 text-[14px] sm:text-[15px] mb-8 max-w-md mx-auto">
              Create a free account to practise unlimited exams across 19 NCEA
              subjects
            </p>
            <Link
              href="/sign-up"
              className="group inline-flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-400 text-white font-semibold px-8 py-3.5 rounded-lg transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/20 text-[15px] mb-4"
            >
              Sign up free
              <svg
                className="w-4 h-4 group-hover:translate-x-0.5 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </Link>
            <div>
              <Link
                href="/pricing"
                className="text-zinc-400 hover:text-zinc-300 text-[13px] transition-colors"
              >
                See pricing →
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
