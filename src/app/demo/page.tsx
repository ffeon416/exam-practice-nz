"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { demoQuestions } from "@/data/demoQuestions";
import { questionMaxMarks } from "@/lib/scoring";
import type { MarkingResult } from "@/lib/types";
import { Markdown } from "@/components/Markdown";

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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [step, currentQ]);

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

    // Mark the REAL typed answers through the same honest pipeline as the live
    // exams — no canned results, no sugar-coating. Wrong answers are marked
    // wrong. Kick the request off immediately, then play the progress reveal;
    // we only show results once the real marking has come back.
    const markPromise = fetch("/api/demo-mark", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    })
      .then((r) => r.json())
      .catch(() => null);

    for (let i = 0; i < 3; i++) {
      await new Promise((r) => setTimeout(r, 600 + Math.random() * 500));
      setMarkingDone((prev) => {
        const next = [...prev];
        next[i] = true;
        return next;
      });
    }

    const data = await markPromise;
    const marked: MarkingResult[] =
      data && Array.isArray(data.results) && data.results.length === demoQuestions.length
        ? data.results
        : // Network/parse failure → honest self-mark, never a fake pass.
          demoQuestions.map((q) => ({
            questionId: q.id,
            marksAwarded: 0,
            maxMarks: questionMaxMarks(q.answerType),
            workingMark: q.answerType === "multi-choice" ? null : 0,
            answerMark: 0,
            grade: "not-achieved" as const,
            feedback:
              "We couldn't reach the marker just now. Compare your answer with the correct approach below.",
            correctApproach: q.markingGuide,
            examTip: "Always show your working clearly.",
            topicsToReview: q.topics,
          }));

    await new Promise((r) => setTimeout(r, 300));
    setResults(marked);
    setStep("results");
  };

  // ── INTRO ──
  if (step === "intro") {
    return (
      <div className="relative overflow-hidden bg-[#06060a] isolate">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full"
            style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }} />
        </div>

        <section className="max-w-5xl mx-auto px-5 pt-12 sm:pt-20 pb-16 sm:pb-24">
          {/* Hero */}
          <div className="text-center max-w-3xl mx-auto mb-16 sm:mb-24">
            <h1 className={`${display.className} home-rise text-[34px] sm:text-[56px] md:text-[64px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-6`}
              style={{ textWrap: "balance" }}>
              See how we mark
              <br />
              <em className="italic bg-gradient-to-r from-indigo-300 via-indigo-400 to-violet-400 bg-clip-text text-transparent">
                your answers
              </em>
            </h1>

            <p className="home-rise text-zinc-400 text-[16px] sm:text-[19px] leading-relaxed max-w-xl mx-auto mb-10" style={{ animationDelay: "80ms" }}>
              Answer 3 real NCEA questions. Get instant marks, feedback, and exam tips &mdash; no account needed.
            </p>

            <div className="home-rise relative inline-block mb-8" style={{ animationDelay: "160ms" }}>
              <button
                onClick={() => setStep("answering")}
                className="relative group bg-white text-[#0a0a0f] font-bold px-12 py-5 rounded-full transition-all hover:scale-[1.02] active:scale-[0.99] shadow-2xl shadow-indigo-500/20 text-[17px] inline-flex items-center justify-center gap-2"
              >
                Start Demo
                <svg
                  className="w-5 h-5 group-hover:translate-x-1 transition-transform"
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
            </div>

            <div className="home-rise flex flex-wrap items-center justify-center gap-2 sm:gap-3" style={{ animationDelay: "240ms" }}>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-[13px] text-zinc-200">
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                3 questions
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-[13px] text-zinc-200">
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ~3 minutes
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.1] text-[13px] text-zinc-200">
                <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Instant marking
              </span>
            </div>
          </div>

          {/* Preview card */}
          <div className="mb-16 sm:mb-24">
            <div className="text-center mb-6 sm:mb-8">
              <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">Preview</p>
              <h2 className={`${display.className} text-white font-bold text-[22px] sm:text-[28px] tracking-[-0.02em]`} style={{ textWrap: "balance" }}>
                Here&rsquo;s what you&rsquo;ll get
              </h2>
            </div>

            <div className="relative max-w-xl mx-auto">
              <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-indigo-500/25 via-violet-500/15 to-transparent blur-xl" />
              <div className="relative rounded-2xl bg-[#0c0c12] border border-white/[0.1] overflow-hidden shadow-2xl shadow-black/50">
                <div className="px-5 sm:px-6 py-4 border-b border-white/[0.06] flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] text-zinc-500 mb-1">Question 1 &middot; NCEA Science</p>
                    <p className="text-zinc-200 text-[14px] leading-relaxed">
                      Describe what happens during photosynthesis&hellip;
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="text-[18px] sm:text-[20px] font-bold tabular-nums text-emerald-400">3/3</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border font-medium text-green-400 bg-green-500/15 border-green-500/30">
                      Achieved
                    </span>
                  </div>
                </div>
                <div className="px-5 sm:px-6 py-4 space-y-4">
                  <div>
                    <p className="font-mono text-[11px] text-zinc-500 font-semibold mb-1.5 uppercase tracking-wider">Feedback</p>
                    <p className="text-zinc-200 text-[13px] leading-relaxed">
                      Great answer! You&rsquo;ve correctly described photosynthesis and explained why it matters.
                    </p>
                  </div>
                  <div className="rounded-lg bg-indigo-500/[0.1] border border-indigo-500/25 px-4 py-3">
                    <p className="font-mono text-[11px] text-indigo-300 font-semibold mb-1 uppercase tracking-wider">Exam tip</p>
                    <p className="text-zinc-200 text-[13px] leading-relaxed">
                      Always include the equation when explaining photosynthesis &mdash; it&rsquo;s an easy mark.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* How it works */}
          <div>
            <div className="text-center mb-8 sm:mb-10">
              <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">How it works</p>
              <h2 className={`${display.className} text-white font-bold text-[22px] sm:text-[28px] tracking-[-0.02em]`} style={{ textWrap: "balance" }}>
                Three simple steps
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 max-w-3xl mx-auto">
              {[
                { n: "01", t: "Answer", d: "Three real NCEA questions from Science, Maths, and English." },
                { n: "02", t: "Get marked", d: "Instant marks, a grade, and detailed feedback in seconds." },
                { n: "03", t: "Learn", d: "See the correct approach and a tip to nail it in the exam." },
              ].map((s) => (
                <div key={s.n} className="rounded-2xl bg-white/[0.015] border border-white/[0.07] p-5 sm:p-6 hover:bg-white/[0.04] hover:border-white/[0.12] transition-colors">
                  <div className="font-mono text-[12px] text-indigo-400 font-bold tracking-wider mb-3">{s.n}</div>
                  <h3 className={`${display.className} text-white font-bold text-[17px] tracking-[-0.01em] mb-2`}>{s.t}</h3>
                  <p className="text-zinc-400 text-[13px] leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
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
      <div className="max-w-3xl mx-auto px-5 pt-4 sm:pt-12 pb-16 sm:pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-1">
              {levelLabels[currentQ]} {subjectLabels[currentQ]}
            </p>
            <h2 className={`${display.className} text-white font-bold text-[20px] sm:text-[24px] tracking-[-0.02em]`}>
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
        <div className="rounded-2xl bg-white/[0.015] border border-white/[0.07] p-4 sm:p-7 mb-4 sm:mb-6">
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
            className={`font-semibold text-[14px] px-5 py-2.5 min-h-[44px] rounded-full transition-all inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
              isLastQ
                ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30"
                : "text-white border border-white/[0.12] hover:border-white/[0.3] hover:bg-white/[0.04]"
            }`}
          >
            {isLastQ ? "Submit for marking" : "Next question"}
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
      <div className="max-w-lg mx-auto px-5 pt-16 sm:pt-32 pb-16 sm:pb-24 text-center">
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

        <h2 className={`${display.className} text-white font-bold text-[22px] sm:text-[26px] tracking-[-0.02em] mb-2`}>
          Marking your answers&hellip;
        </h2>
        <p className="text-zinc-400 text-[14px] mb-10">
          Analysing your responses and generating feedback
        </p>

        {/* Progress cards */}
        <div className="flex justify-center gap-2 sm:gap-3">
          {["Science", "Maths", "English"].map((label, i) => (
            <div
              key={label}
              className={`rounded-2xl border px-3 sm:px-4 py-3 w-24 sm:w-28 transition-all duration-500 ${
                markingDone[i]
                  ? "bg-emerald-500/10 border-emerald-500/30"
                  : "bg-white/[0.015] border-white/[0.07]"
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
      <div className="max-w-3xl mx-auto px-5 pt-4 sm:pt-12 pb-16 sm:pb-24">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-10">
          <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-2">
            Demo Results
          </p>
          <h1 className={`${display.className} text-[24px] sm:text-[36px] font-bold text-white tracking-[-0.02em] mb-3`} style={{ textWrap: "balance" }}>
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
        <div className="space-y-3 sm:space-y-4 mb-8 sm:mb-12">
          {results.map((result, i) => {
            const q = demoQuestions[i];
            const isExpanded = expandedAnswer[i] ?? false;

            return (
              <div
                key={result.questionId}
                className="rounded-2xl bg-white/[0.015] border border-white/[0.07] overflow-hidden"
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
                    <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-1.5">
                      Feedback
                    </p>
                    <Markdown text={result.feedback} className="text-zinc-300 text-[13px] leading-relaxed" compact />
                  </div>

                  {/* Correct approach */}
                  <div>
                    <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider font-medium mb-1.5">
                      Correct approach
                    </p>
                    <p className="text-zinc-400 text-[13px] leading-relaxed">
                      {result.correctApproach}
                    </p>
                  </div>

                  {/* Exam tip */}
                  <div className="rounded-lg bg-indigo-500/[0.06] border border-indigo-500/20 px-4 py-3">
                    <p className="font-mono text-[11px] text-indigo-400 uppercase tracking-wider font-medium mb-1">
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
        <div className="rounded-[32px] bg-gradient-to-br from-indigo-500/10 via-violet-500/5 to-transparent border border-white/[0.07] p-5 sm:p-12 text-center relative overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full" aria-hidden
            style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }} />

          <div className="relative">
            <h2 className={`${display.className} text-[22px] sm:text-[32px] font-bold text-white tracking-[-0.02em] mb-3`} style={{ textWrap: "balance" }}>
              Like what you see?
            </h2>
            <p className="text-zinc-400 text-[14px] sm:text-[15px] mb-8 max-w-md mx-auto">
              See your real grade free, then practise unlimited exams across 19 NCEA
              subjects
            </p>
            <Link
              href="/grade"
              className="group inline-flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-extrabold px-8 py-3.5 rounded-full transition-all hover:scale-[1.02] shadow-lg shadow-indigo-500/30 text-[15px] mb-4"
            >
              Get my free grade check
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
