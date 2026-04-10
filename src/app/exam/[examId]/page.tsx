"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getExam } from "@/data/exams";
import type { Exam, Question } from "@/lib/types";
import Timer from "@/components/Timer";
import TopicTag from "@/components/TopicTag";
import Graph from "@/components/Graph";

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
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const e = getExam(examId);
    if (!e) {
      router.push("/subjects");
      return;
    }
    setExam(e);
  }, [examId, router]);

  const handleSubmit = useCallback(async () => {
    if (!exam || submitting) return;
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
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center text-slate-400">
        Loading...
      </div>
    );
  }

  // Pre-exam screen
  if (!started) {
    const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-card border border-card-border rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">{exam.title}</h1>
          <p className="text-slate-400 mb-6">
            {exam.questions.length} questions &middot; {totalMarks} marks
            &middot; {exam.timeMinutes} minutes
          </p>

          <div
            className={`inline-block px-4 py-2 rounded text-sm font-medium mb-6 ${
              mode === "mock"
                ? "bg-red-500/10 text-red-400 border border-red-500/30"
                : "bg-blue-500/10 text-blue-400 border border-blue-500/30"
            }`}
          >
            {mode === "mock"
              ? "Mock Exam — Timed, no hints"
              : "Practice Mode — Take your time, learn as you go"}
          </div>

          <div className="space-y-2 text-sm text-slate-400 mb-8 text-left max-w-sm mx-auto">
            {mode === "mock" ? (
              <>
                <p>
                  &bull; You have {exam.timeMinutes} minutes to complete this
                  exam
                </p>
                <p>&bull; No feedback until you submit</p>
                <p>&bull; Simulates real exam conditions</p>
              </>
            ) : (
              <>
                <p>&bull; No time limit — take as long as you need</p>
                <p>&bull; Answer all questions then submit for AI marking</p>
                <p>&bull; You&apos;ll get detailed feedback on every answer</p>
              </>
            )}
          </div>

          <button
            onClick={() => setStarted(true)}
            className="bg-blue-600 text-white text-lg font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
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
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header bar */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-700">
        <div>
          <h1 className="text-lg font-semibold text-white">{exam.title}</h1>
          <p className="text-sm text-slate-400">
            {answeredCount}/{exam.questions.length} answered
          </p>
        </div>
        <div className="flex items-center gap-4">
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
            className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
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
            className={`w-8 h-8 rounded text-xs font-medium transition-colors ${
              i === currentQ
                ? "bg-blue-600 text-white"
                : answers[q.id]?.trim()
                ? "bg-green-600/20 text-green-400 border border-green-600/30"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* Current question */}
      <div className="bg-card border border-card-border rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <span className="text-sm font-medium text-blue-400">
            Question {question.number}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-xs px-2 py-0.5 rounded ${
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
            <span className="text-xs text-slate-400">
              {question.marks} mark{question.marks !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Graph */}
        {question.graph && <Graph data={question.graph} />}

        {/* Diagram image */}
        {question.image && (
          <div className="mb-4 rounded-lg overflow-hidden border border-slate-700 bg-white p-2">
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
                  className="bg-slate-800/60 border border-slate-700 rounded px-4 py-3 mb-3 text-sm text-slate-400 italic"
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
          <label className="block text-sm text-slate-400 mb-2">
            Your answer:
          </label>
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
                        className={`block w-full text-left px-4 py-2.5 rounded-lg border transition-colors ${
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
            <textarea
              value={answers[question.id] ?? ""}
              onChange={(e) =>
                setAnswers((prev) => ({
                  ...prev,
                  [question.id]: e.target.value,
                }))
              }
              placeholder={
                question.answerType === "working"
                  ? "Show your working and final answer..."
                  : "Type your answer..."
              }
              rows={question.answerType === "working" ? 6 : 2}
              className="w-full bg-slate-900 border border-slate-700 rounded px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-y"
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <button
          onClick={() => setCurrentQ((q) => Math.max(0, q - 1))}
          disabled={currentQ === 0}
          className="px-4 py-2 rounded text-sm border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors disabled:opacity-30"
        >
          Previous
        </button>
        <span className="text-sm text-slate-400 self-center">
          {currentQ + 1} of {exam.questions.length} &middot; {totalMarks} marks
          total
        </span>
        {currentQ === exam.questions.length - 1 ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-4 py-2 rounded text-sm bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Exam"}
          </button>
        ) : (
          <button
            onClick={() =>
              setCurrentQ((q) => Math.min(exam.questions.length - 1, q + 1))
            }
            className="px-4 py-2 rounded text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
}
