"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getExam } from "@/data/exams";
import { getCustomExam, isCustomExamId } from "@/lib/customExams";
import type { Exam, Question } from "@/lib/types";
import Timer from "@/components/Timer";
import TopicTag from "@/components/TopicTag";
import Graph from "@/components/Graph";
import TutorChat, { type Message as TutorMessage } from "@/components/TutorChat";

export default function ExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = (searchParams.get("mode") ?? "practice") as
    | "practice"
    | "mock";

  const [exam, setExam] = useState<Exam | null>(null);
  const [examNotFound, setExamNotFound] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorHistory, setTutorHistory] = useState<
    Record<string, TutorMessage[]>
  >({});

  useEffect(() => {
    // Run on mount only — wait for the next tick so localStorage is hydrated
    let cancelled = false;
    async function tryLoad() {
      if (cancelled) return;
      if (typeof window === "undefined") return;

      // Try localStorage first (fast)
      const e = isCustomExamId(examId) ? getCustomExam(examId) : getExam(examId);
      if (e) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExam(e);
        return;
      }

      // Not found locally — try database (cross-device sync)
      try {
        const res = await fetch(`/api/exams/${examId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.exam) {
            // Cache locally for next time
            if (isCustomExamId(examId)) {
              const { saveCustomExam } = await import("@/lib/customExams");
              saveCustomExam(data.exam);
            }
            if (!cancelled) {
              // eslint-disable-next-line react-hooks/set-state-in-effect
              setExam(data.exam);
              return;
            }
          }
        }
      } catch {
        // DB fetch failed — fall through to not-found
      }

      if (!cancelled) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setExamNotFound(true);
      }
    }
    tryLoad();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  const handleSubmit = useCallback(async () => {
    if (!exam || submitting) return;
    const unanswered = exam.questions.filter(q => !(answers[q.id]?.trim())).length;
    if (unanswered > 0) {
      if (!confirm(`You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`)) {
        return;
      }
    }
    setSubmitting(true);

    // Store answers in sessionStorage for the results page
    sessionStorage.setItem(
      `exam-answers-${exam.id}`,
      JSON.stringify({ answers, mode })
    );

    router.push(`/exam/${exam.id}/results`);
  }, [exam, answers, mode, submitting, router]);

  const handleTimeUp = useCallback(() => {
    handleSubmit();
  }, [handleSubmit]);

  if (!exam) {
    if (examNotFound) {
      return (
        <div className="relative overflow-hidden max-w-md mx-auto px-5 py-20 text-center">
          <div className="absolute inset-0 -z-10"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" /></div>
          <h1 className="text-2xl font-semibold text-white mb-3">Exam not found</h1>
          <p className="text-zinc-400 text-sm mb-2">
            We couldn&apos;t find this exam on this device.
          </p>
          <p className="text-zinc-500 text-xs mb-8">
            Custom exams are saved to the device they were generated on. Build a new one to start practising.
          </p>
          <button
            onClick={() => router.push("/subjects")}
            className="w-full py-3 rounded-lg bg-indigo-500 text-white font-medium hover:bg-indigo-400 transition-colors"
          >
            Build a new exam
          </button>
        </div>
      );
    }
    return (
      <div className="relative overflow-hidden max-w-md mx-auto px-5 py-20 text-center">
        <div className="absolute inset-0 -z-10"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" /></div>
        <div className="inline-flex items-center justify-center w-12 h-12 mb-4">
          <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
        <p className="text-zinc-400 text-sm">Loading your exam...</p>
      </div>
    );
  }

  // Pre-exam screen
  if (!started) {
    const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
    return (
      <div className="relative overflow-hidden max-w-2xl mx-auto px-5 pt-8 sm:pt-16 pb-16 sm:pb-20 bg-[#06060a]">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/[0.1] blur-[120px] rounded-full" />
          <div className="absolute top-[200px] right-0 w-[400px] h-[400px] bg-purple-500/[0.06] blur-[100px] rounded-full" />
        </div>
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 sm:p-8 text-center">
          <div className={`inline-block px-4 py-1.5 rounded-full text-[11px] font-bold mb-5 ${
            mode === "mock"
              ? "bg-gradient-to-r from-red-500/20 to-orange-500/10 text-red-300 border border-red-500/30"
              : "bg-gradient-to-r from-indigo-500/20 to-purple-500/10 text-indigo-300 border border-indigo-500/30"
          }`}>
            {mode === "mock" ? "Mock Exam" : "Practice Mode"}
          </div>

          <h1 className="text-[26px] sm:text-[34px] font-extrabold text-white mb-3 tracking-tight">{exam.title}</h1>

          <div className="flex items-center justify-center gap-4 text-[13px] text-zinc-400 mb-6">
            <span>{exam.questions.length} questions</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span>{totalMarks} marks</span>
            <span className="w-1 h-1 rounded-full bg-zinc-600" />
            <span>{exam.timeMinutes} min</span>
          </div>

          <div className="space-y-2.5 text-[13px] text-zinc-400 mb-8 text-left max-w-sm mx-auto">
            {mode === "mock" ? (
              <>
                <p className="flex items-center gap-2"><span className="text-[16px]">{"\u23F1"}</span> You have {exam.timeMinutes} minutes to complete this exam</p>
                <p className="flex items-center gap-2"><span className="text-[16px]">{"\uD83D\uDCDD"}</span> No feedback until you submit</p>
                <p className="flex items-center gap-2"><span className="text-[16px]">{"\uD83C\uDFAF"}</span> Simulates real exam conditions</p>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2"><span className="text-[16px]">{"\u23F1"}</span> No time limit — take as long as you need</p>
                <p className="flex items-center gap-2"><span className="text-[16px]">{"\uD83D\uDCDD"}</span> Answer all questions then submit for AI marking</p>
                <p className="flex items-center gap-2"><span className="text-[16px]">{"\uD83C\uDFAF"}</span> You&apos;ll get detailed feedback on every answer</p>
              </>
            )}
          </div>

          <p className="text-indigo-400 text-[14px] font-semibold mb-3">Ready?</p>

          <button
            onClick={() => setStarted(true)}
            className="w-full sm:w-auto bg-white text-[#06060a] text-[16px] font-bold px-10 py-4 rounded-xl hover:bg-zinc-100 shadow-2xl shadow-white/10 transition-all hover:scale-[1.02] min-h-[48px]"
          >
            Start Exam
          </button>
        </div>
      </div>
    );
  }

  const question: Question = exam.questions[currentQ];
  const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k].trim() !== ""
  ).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-5 pt-4 sm:pt-6 pb-16 sm:pb-20">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6 pb-4 border-b border-white/[0.06]">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-semibold text-white truncate">{exam.title}</h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            {answeredCount}/{exam.questions.length} answered
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 shrink-0">
          {mode === "mock" && (
            <Timer
              totalMinutes={exam.timeMinutes}
              onTimeUp={handleTimeUp}
              running={true}
            />
          )}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-400 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {submitting ? "Submitting..." : "Submit Exam"}
          </button>
        </div>
      </div>

      {/* Question navigator dots */}
      <div className="flex gap-1.5 mb-6 flex-wrap">
        {exam.questions.map((q, i) => (
          <button
            key={q.id}
            onClick={() => setCurrentQ(i)}
            className={`w-10 h-10 sm:w-9 sm:h-9 rounded text-xs font-medium transition-colors ${
              i === currentQ
                ? "bg-indigo-500 text-white"
                : answers[q.id]?.trim()
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-white/[0.04] text-zinc-500 hover:bg-white/[0.08]"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Current question */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-sm font-medium text-indigo-400">
            Question {question.number}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${
                question.gradeLevel === "excellence"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : question.gradeLevel === "merit"
                  ? "bg-blue-500/10 text-blue-400"
                  : "bg-green-500/10 text-green-400"
              }`}
            >
              {question.gradeLevel.charAt(0).toUpperCase() +
                question.gradeLevel.slice(1)}
            </span>
            <span className="text-xs text-zinc-400">
              {question.marks} mark{question.marks !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Graph */}
        {question.graph && <Graph data={question.graph} />}

        {/* Diagram image */}
        {question.image && (
          <div className="mb-4 rounded-lg overflow-hidden border border-white/[0.06] bg-white p-2">
            <img
              src={question.image}
              alt={`Diagram for Question ${question.number}`}
              className="max-w-full h-auto mx-auto max-h-[500px] object-contain"
            />
          </div>
        )}

        <div className="mb-4 leading-relaxed">
          {question.text.split(/(\[Diagram:[^\]]+\])/).map((part, i) =>
            part.startsWith("[Diagram:") ? (
              question.image ? null : (
                <div
                  key={i}
                  className="bg-white/[0.04] border border-white/[0.08] rounded px-4 py-3 mb-3 text-sm text-zinc-400 italic"
                >
                  {part.slice(1, -1)}
                </div>
              )
            ) : (
              <p key={i} className="text-white whitespace-pre-wrap">
                {part}
              </p>
            )
          )}
        </div>

        <div className="flex gap-1.5 mb-4">
          {question.topics.map((t) => (
            <TopicTag key={t} topicId={t} />
          ))}
        </div>

        {/* Answer input */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-zinc-400">
              Your answer:
            </label>
            {mode === "practice" && (
              <button
                type="button"
                onClick={() => setTutorOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-400 transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                Ask tutor
              </button>
            )}
          </div>
          {question.answerType === "multi-choice" && question.options ? (
            (() => {
              const isMultiSelect = /tick.*two|select.*two|choose.*two|tick the two|select the two|two answers|TWO answers/i.test(question.text);
              const selected = (answers[question.id] ?? "").split(" and ").filter(Boolean);

              return (
                <div className="space-y-2">
                  {isMultiSelect && (
                    <div className="mb-3 px-3 py-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30">
                      <p className="text-sm text-indigo-300 font-medium">⚠ Select TWO answers ({selected.length}/2 selected)</p>
                    </div>
                  )}
                  {question.options.map((opt) => {
                    const isSelected = isMultiSelect
                      ? selected.includes(opt)
                      : answers[question.id] === opt;

                    return (
                      <button
                        key={opt}
                        onClick={() => {
                          if (isMultiSelect) {
                            const next = isSelected
                              ? selected.filter((s) => s !== opt)
                              : selected.length < 2
                              ? [...selected, opt]
                              : [selected[1], opt];
                            setAnswers((prev) => ({ ...prev, [question.id]: next.join(" and ") }));
                          } else {
                            setAnswers((prev) => ({ ...prev, [question.id]: opt }));
                          }
                        }}
                        className={`block w-full text-left px-4 py-3 rounded-lg border transition-colors min-h-[44px] ${
                          isSelected
                            ? "border-indigo-500 bg-indigo-500/10 text-white"
                            : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
                        }`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <div className="space-y-4">
              {/* Working out box (1 mark) */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wide font-medium">
                  Working out <span className="text-zinc-600 normal-case font-normal">(show your method)</span>
                </label>
                <textarea
                  value={answers[`${question.id}_working`] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [`${question.id}_working`]: e.target.value,
                    }))
                  }
                  placeholder="Show your working here..."
                  rows={question.answerType === "working" ? 6 : 4}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-y text-sm"
                />
              </div>

              {/* Final answer box (1 mark) */}
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5 uppercase tracking-wide font-medium">
                  Final answer <span className="text-zinc-600 normal-case font-normal">({question.marks} {question.marks === 1 ? "mark" : "marks"})</span>
                </label>
                <textarea
                  value={answers[question.id] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [question.id]: e.target.value,
                    }))
                  }
                  placeholder="Your final answer..."
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-y text-sm"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-2 mt-4">
        <button
          onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
          disabled={currentQ === 0}
          className="px-3 sm:px-4 py-2.5 rounded-xl text-sm border border-white/[0.1] text-zinc-300 hover:bg-white/[0.06] transition-colors disabled:opacity-30 min-h-[44px]"
        >
          Previous
        </button>
        <span className="text-[11px] sm:text-sm text-zinc-400 text-center">
          <span className="block sm:inline">{currentQ + 1} of {exam.questions.length}</span>
          <span className="hidden sm:inline"> &middot; </span>
          <span className="block sm:inline">{totalMarks} marks total</span>
        </span>
        {currentQ === exam.questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-3 sm:px-4 py-2.5 rounded-xl text-sm bg-emerald-500 text-white hover:bg-emerald-400 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        ) : (
          <button
            onClick={() =>
              setCurrentQ((q) => Math.min(exam.questions.length - 1, q + 1))
            }
            className="px-3 sm:px-4 py-2.5 rounded-xl text-sm bg-indigo-500 text-white hover:bg-indigo-400 transition-colors min-h-[44px]"
          >
            Next
          </button>
        )}
      </div>

      {tutorOpen && (
        <TutorChat
          question={{
            id: question.id,
            text: question.text,
            markingGuide: question.markingGuide,
            expectedAnswer: question.expectedAnswer,
          }}
          studentAnswer={[
            answers[`${question.id}_working`]
              ? `Working: ${answers[`${question.id}_working`]}`
              : "",
            answers[question.id] ? `Answer: ${answers[question.id]}` : "",
          ]
            .filter(Boolean)
            .join("\n") || undefined}
          initialMessages={tutorHistory[question.id]}
          onMessagesChange={(msgs) =>
            setTutorHistory((prev) => ({ ...prev, [question.id]: msgs }))
          }
          onClose={() => setTutorOpen(false)}
        />
      )}
    </div>
  );
}
