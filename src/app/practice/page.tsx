"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ALL_EXAMS } from "@/data/exams";
import { getTopicLabel, TOPICS } from "@/data/topics";
import type { Question } from "@/lib/types";
import Graph from "@/components/Graph";
import {
  getRecommendedLevel,
  getTopicRating,
  updateRating,
} from "@/lib/adaptiveDifficulty";

const ALL_QUESTIONS = ALL_EXAMS.flatMap((exam) =>
  exam.questions.map((q) => ({ ...q, examTitle: exam.title, level: exam.level }))
);

type QWithMeta = Question & { examTitle: string; level: number };

export default function PracticePage() {
  const [level, setLevel] = useState<0 | 1 | 2 | 3>(1);
  const [search, setSearch] = useState("");
  const [question, setQuestion] = useState<QWithMeta | null>(null);
  const [lesson, setLesson] = useState<string>("");
  const [answer, setAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [score, setScore] = useState({ right: 0, wrong: 0 });
  const [loading, setLoading] = useState(false);
  const [showLesson, setShowLesson] = useState(true);

  function normalize(s: string): string {
    return s.toLowerCase().replace(/\s+/g, " ").replace(/[×·*]/g, "*").replace(/[–—−-]/g, "-").replace(/[''`]/g, "").replace(/[,.]/g, "").trim();
  }

  function flexMatch(raw: string, expected: string): boolean {
    const normRaw = normalize(raw);
    const normExpected = normalize(expected);
    if (normRaw === normExpected) return true;
    // Numeric match
    const expectedNum = expected.replace(/[^0-9.\-\/]/g, "").trim();
    const rawNum = raw.replace(/[^0-9.\-\/]/g, "").trim();
    if (expectedNum && rawNum && expectedNum === rawNum) return true;
    // Key word match — accept if 60%+ of key words present
    const stopWords = ["the","that","this","with","from","have","been","were","will","would","could","should","their","there","about","which","when","what","your","more","than","also","into","some","them","then","each","because","answer","correct"];
    const expectedWords = normExpected.split(/\s+/).filter((w) => w.length > 3).filter((w) => !stopWords.includes(w));
    if (expectedWords.length === 0) return normRaw === normExpected;
    const matchCount = expectedWords.filter((w) => normRaw.includes(w)).length;
    return matchCount / expectedWords.length >= 0.6;
  }

  const levelTopics = TOPICS.filter((t) => t.level === level);

  // If the search text exactly (or closely) matches a known topic, resolve
  // its id so we can pull the adaptive rating for that topic and filter the
  // question pool to the recommended difficulty level.
  const matchedTopicId = (() => {
    const s = search.trim().toLowerCase();
    if (!s) return null;
    const hit = TOPICS.find((t) => {
      const label = t.label.toLowerCase();
      return label === s || label.includes(s) || s.includes(label);
    });
    return hit?.id ?? null;
  })();

  const recommendedLevel = matchedTopicId
    ? getRecommendedLevel(matchedTopicId)
    : null;
  const topicRating = matchedTopicId ? getTopicRating(matchedTopicId) : null;

  const filteredQuestions = ALL_QUESTIONS.filter((q) => {
    if (q.level !== level) return false;
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const topicLabels = q.topics.map((t) => getTopicLabel(t).toLowerCase());
    return topicLabels.some((t) => t.includes(s) || s.includes(t)) ||
      q.text.toLowerCase().includes(s) ||
      q.examTitle.toLowerCase().includes(s);
  });

  // When we know the student's rating for this topic, prefer questions at
  // the recommended difficulty. Strong students get merit/excellence,
  // weaker students get achieved. Fall back to the unfiltered pool if the
  // filter empties out.
  const difficultyFiltered = recommendedLevel
    ? (() => {
        const priority: Record<string, number> = { achieved: 0, merit: 1, excellence: 2 };
        const target = priority[recommendedLevel];
        // Top-rated students (merit/excellence) should never see "achieved"
        // junk — filter it out entirely for them.
        const minAllowed = target >= 1 ? 1 : 0;
        const narrowed = filteredQuestions.filter((q) => {
          const lvl = priority[q.gradeLevel] ?? 0;
          return lvl >= minAllowed;
        });
        return narrowed.length > 0 ? narrowed : filteredQuestions;
      })()
    : filteredQuestions;

  const questionsToUse = difficultyFiltered.length > 0 ? difficultyFiltered : ALL_QUESTIONS.filter((q) => q.level === level);
  const availableQuestions = questionsToUse.filter((q) => !usedIds.has(q.id));

  const startQuestion = useCallback(async () => {
    const pool = availableQuestions.length > 0 ? availableQuestions : questionsToUse;
    if (pool.length === 0) return;
    if (availableQuestions.length === 0) setUsedIds(new Set());

    const idx = Math.floor(Math.random() * pool.length);
    const q = pool[idx];
    setQuestion(q);
    setAnswer("");
    setChecked(false);
    setIsCorrect(false);
    setLesson("");
    setShowLesson(true);
    setLoading(true);
    setUsedIds((prev) => new Set([...prev, q.id]));

    try {
      const res = await fetch("/api/practice-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "lesson",
          questionText: q.text,
          topics: q.topics.map((t) => getTopicLabel(t)).join(", "),
          markingGuide: q.markingGuide,
          expectedAnswer: q.expectedAnswer,
          level: q.level,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setLesson(data.lesson);
    } catch {
      setLesson(q.markingGuide);
    } finally {
      setLoading(false);
    }
  }, [availableQuestions, questionsToUse]);

  const [feedback, setFeedback] = useState("");
  const [checking, setChecking] = useState(false);

  async function checkAnswer() {
    if (!question || !answer.trim()) return;

    // For short/numeric/multi-choice answers, use flexible match
    if (question.answerType === "number" || question.answerType === "multi-choice" || (question.expectedAnswer && question.expectedAnswer.length < 50)) {
      const expected = question.expectedAnswer ?? "";
      const correct = flexMatch(answer.trim(), expected);
      setIsCorrect(correct);
      setChecked(true);
      setFeedback("");
      setScore((prev) => ({
        right: prev.right + (correct ? 1 : 0),
        wrong: prev.wrong + (correct ? 0 : 1),
      }));
      // Adaptive: log the result against every topic the question touches.
      question.topics.forEach((topic) => {
        updateRating(topic, question.gradeLevel, correct);
      });
      return;
    }

    // For essay/working answers, use AI marking
    setChecking(true);
    try {
      const res = await fetch("/api/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questions: [{
            id: question.id,
            text: question.text,
            marks: question.marks,
            gradeLevel: question.gradeLevel,
            markingGuide: question.markingGuide,
            topics: question.topics,
          }],
          answers: { [question.id]: answer },
        }),
      });
      if (!res.ok) throw new Error("api-failed");
      const data = await res.json();
      const result = data.results?.[0];
      if (result) {
        const gotMarks = result.marksAwarded > 0;
        setIsCorrect(gotMarks);
        setFeedback(result.feedback + (result.correctApproach ? "\n\nHow to improve:\n" + result.correctApproach : ""));
        setScore((prev) => ({
          right: prev.right + (gotMarks ? 1 : 0),
          wrong: prev.wrong + (gotMarks ? 0 : 1),
        }));
        // Adaptive: update ratings for each topic this question touches.
        question.topics.forEach((topic) => {
          updateRating(topic, question.gradeLevel, gotMarks);
        });
      }
    } catch {
      // Fallback: just show the marking guide
      setIsCorrect(false);
      setFeedback("AI marking unavailable. Compare your answer with the marking guide below.");
    } finally {
      setChecking(false);
      setChecked(true);
    }
  }

  // ── SETUP VIEW ──
  if (!question && !loading) {
    return (
      <div className="max-w-md mx-auto px-5 py-16">
        <h1 className="text-[22px] font-semibold text-white mb-1 tracking-tight">Fix your weak spots</h1>
        <p className="text-zinc-500 text-[13px] mb-8">Type what you need help with. We&apos;ll teach you, then test you.</p>

        {/* Year */}
        <div className="flex gap-2 mb-6">
          {([
            { val: 0 as const, label: "Yr 10" },
            { val: 1 as const, label: "Yr 11" },
            { val: 2 as const, label: "Yr 12" },
            { val: 3 as const, label: "Yr 13" },
          ]).map((opt) => (
            <button
              key={opt.val}
              onClick={() => { setLevel(opt.val); setSearch(""); }}
              className={`px-4 py-2 rounded-lg text-[12px] font-medium transition-colors border ${
                level === opt.val
                  ? "border-white/30 text-white"
                  : "border-zinc-800 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && questionsToUse.length > 0) startQuestion(); }}
          placeholder="e.g. trigonometry, graphs, algebra..."
          className="w-full bg-transparent border border-zinc-800 rounded-lg px-4 py-3 text-white text-[14px] placeholder-zinc-700 focus:outline-none focus:border-zinc-600 mb-4"
          autoFocus
        />

        {/* Adaptive difficulty hint */}
        {recommendedLevel && topicRating !== null && (
          <div className="mb-4 text-[11px] text-zinc-500">
            <span className="text-zinc-400">Rating</span>{" "}
            <span className="text-white font-medium">{topicRating}</span>
            <span className="text-zinc-600 mx-1.5">·</span>
            <span className="text-zinc-400">Serving</span>{" "}
            <span className="text-indigo-400 font-medium capitalize">{recommendedLevel}</span>{" "}
            <span className="text-zinc-400">questions</span>
          </div>
        )}

        {/* Quick picks — just show top 8 */}
        <div className="flex flex-wrap gap-1.5 mb-6">
          {levelTopics.slice(0, 8).map((t) => (
            <button
              key={t.id}
              onClick={() => setSearch(t.label)}
              className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${
                search.toLowerCase() === t.label.toLowerCase()
                  ? "bg-white/10 text-white"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <button
          onClick={startQuestion}
          disabled={questionsToUse.length === 0}
          className="w-full py-3 rounded-lg bg-indigo-500 text-white font-medium text-[13px] hover:bg-indigo-400 transition-colors disabled:opacity-30"
        >
          Teach me
        </button>

        <div className="text-center mt-4">
          <Link href="/subjects" className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors">
            Back to exams
          </Link>
        </div>
      </div>
    );
  }

  // ── LOADING ──
  if (loading) {
    return (
      <div className="max-w-md mx-auto px-5 py-20 text-center">
        <div className="animate-pulse">
          <div className="w-10 h-10 rounded-full bg-white/5 mx-auto mb-3" />
          <p className="text-zinc-500 text-[13px]">Building a lesson...</p>
        </div>
      </div>
    );
  }

  if (!question) return null;

  // ── QUESTION VIEW ──
  return (
    <div className="max-w-2xl mx-auto px-5 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => { setQuestion(null); setLesson(""); setScore({ right: 0, wrong: 0 }); setUsedIds(new Set()); }}
          className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          &larr; Back
        </button>
        {(score.right + score.wrong) > 0 && (
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-500">{score.right} right</span>
            <span className="text-red-400">{score.wrong} wrong</span>
          </div>
        )}
      </div>

      {/* Lesson */}
      {lesson && (
        <div className="border border-zinc-800 rounded-lg mb-4">
          <button
            onClick={() => setShowLesson(!showLesson)}
            className="w-full px-4 py-3 flex items-center justify-between text-left"
          >
            <span className="text-[12px] font-medium text-indigo-400">How to solve this type of question</span>
            <span className="text-zinc-600 text-[11px]">{showLesson ? "hide" : "show"}</span>
          </button>
          {showLesson && (
            <div className="px-4 pb-4">
              <p className="text-zinc-400 text-[13px] whitespace-pre-wrap leading-relaxed">{lesson}</p>
            </div>
          )}
        </div>
      )}

      {/* Question */}
      <div className="border border-zinc-800 rounded-lg mb-4">
        <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
          <span className="text-[12px] font-medium text-white">Your turn</span>
          <span className="text-[11px] text-zinc-600">{question.examTitle}</span>
        </div>

        <div className="px-4 py-4">
          {question.graph && <Graph data={question.graph} />}
          {question.image && (
            <div className="rounded-lg overflow-hidden border border-zinc-800 bg-white p-2 mb-4">
              <img src={question.image} alt="Question diagram" className="max-w-full h-auto mx-auto max-h-[500px] object-contain" />
            </div>
          )}

          <div className="text-[13px] mb-4">
            {question.text.split(/(\[Diagram:[^\]]+\])/).map((part, j) =>
              part.startsWith("[Diagram:") ? (
                question.image ? null : (
                  <div key={j} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-2 mb-2 text-[11px] text-zinc-600 italic">
                    {part.slice(1, -1)}
                  </div>
                )
              ) : (
                <p key={j} className="text-zinc-300 whitespace-pre-wrap leading-relaxed">{part}</p>
              )
            )}
          </div>

          {!checked && !checking && (
            <>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={question.answerType === "working" ? "Write your full answer..." : "Your answer..."}
                rows={question.answerType === "working" ? 8 : 3}
                className="w-full bg-transparent border border-zinc-800 rounded-lg px-4 py-3 text-white text-[13px] placeholder-zinc-700 focus:outline-none focus:border-zinc-600 resize-y mb-3"
              />
              <div className="flex gap-2">
                <button
                  onClick={checkAnswer}
                  disabled={!answer.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-indigo-500 text-white text-[13px] font-medium hover:bg-indigo-400 transition-colors disabled:opacity-30"
                >
                  {question.answerType === "working" ? "Submit for marking" : "Check"}
                </button>
                <button
                  onClick={startQuestion}
                  className="px-4 py-2.5 rounded-lg text-zinc-600 text-[13px] hover:text-zinc-400 transition-colors"
                >
                  Skip
                </button>
              </div>
            </>
          )}

          {checking && (
            <div className="text-center py-6">
              <div className="animate-pulse">
                <p className="text-zinc-500 text-[13px]">Marking your answer...</p>
              </div>
            </div>
          )}
        </div>

        {/* Result */}
        {checked && (
          <div className="border-t border-zinc-800/50 px-4 py-4 space-y-3">
            <div className={`text-center py-2.5 rounded-lg ${isCorrect ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              <span className={`text-[13px] font-medium ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                {isCorrect ? "Correct" : "Incorrect"}
              </span>
            </div>

            <div>
              <p className="text-[11px] text-zinc-600 mb-1">Your answer</p>
              <p className="text-[13px] text-zinc-300 whitespace-pre-wrap">{answer}</p>
            </div>

            {feedback && (
              <div>
                <p className="text-[11px] text-indigo-400/70 mb-1">Feedback</p>
                <p className="text-[13px] text-zinc-300 whitespace-pre-wrap leading-relaxed">{feedback}</p>
              </div>
            )}

            {!isCorrect && question.expectedAnswer && (
              <div>
                <p className="text-[11px] text-emerald-500/70 mb-1">Correct answer</p>
                <p className="text-[13px] text-zinc-300 whitespace-pre-wrap">{question.expectedAnswer}</p>
              </div>
            )}

            <div>
              <p className="text-[11px] text-zinc-600 mb-1">Marking guide</p>
              <p className="text-[12px] text-zinc-500 whitespace-pre-wrap leading-relaxed">{question.markingGuide}</p>
            </div>

            <button
              onClick={startQuestion}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-white/5 border border-zinc-800 text-white text-[13px] font-medium hover:bg-white/10 transition-colors"
            >
              Next question
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
