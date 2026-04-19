"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ALL_EXAMS } from "@/data/exams";
import { getTopicLabel, TOPICS } from "@/data/topics";
import type { Question } from "@/lib/types";
import Graph from "@/components/Graph";
import TutorChat, { type Message as TutorMessage } from "@/components/TutorChat";
import {
  getRecommendedLevel,
  getTopicRating,
  updateRating,
} from "@/lib/adaptiveDifficulty";

const ALL_QUESTIONS = ALL_EXAMS.flatMap((exam) =>
  exam.questions.map((q) => ({ ...q, examTitle: exam.title, level: exam.level }))
);

type QWithMeta = Question & { examTitle: string; level: number };

const LOADING_TIPS = [
  "Reading up on this topic...",
  "Building you a mini lesson...",
  "Finding the right question for your level...",
  "Almost ready...",
];

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
  const [loadingTip, setLoadingTip] = useState(0);
  const [showLesson, setShowLesson] = useState(true);
  const [tutorOpen, setTutorOpen] = useState(false);
  const [tutorHistory, setTutorHistory] = useState<Record<string, TutorMessage[]>>({});

  function normalize(s: string): string {
    return s.toLowerCase().replace(/\s+/g, " ").replace(/[×·*]/g, "*").replace(/[–—−-]/g, "-").replace(/[''`]/g, "").replace(/[,.]/g, "").trim();
  }

  function flexMatch(raw: string, expected: string): boolean {
    const normRaw = normalize(raw);
    const normExpected = normalize(expected);
    if (normRaw === normExpected) return true;
    const expectedNum = expected.replace(/[^0-9.\-\/]/g, "").trim();
    const rawNum = raw.replace(/[^0-9.\-\/]/g, "").trim();
    if (expectedNum && rawNum && expectedNum === rawNum) return true;
    const stopWords = ["the","that","this","with","from","have","been","were","will","would","could","should","their","there","about","which","when","what","your","more","than","also","into","some","them","then","each","because","answer","correct"];
    const expectedWords = normExpected.split(/\s+/).filter((w) => w.length > 3).filter((w) => !stopWords.includes(w));
    if (expectedWords.length === 0) return normRaw === normExpected;
    const matchCount = expectedWords.filter((w) => normRaw.includes(w)).length;
    return matchCount / expectedWords.length >= 0.6;
  }

  const levelTopics = TOPICS.filter((t) => t.level === level);

  // Filter quick picks based on search
  const visibleTopics = (() => {
    if (!search.trim()) return levelTopics.slice(0, 10);
    const s = search.trim().toLowerCase();
    const matchingTopicIds = new Set<string>();
    ALL_QUESTIONS.filter((q) => q.level === level).forEach((q) => {
      const matchesExam = q.examTitle.toLowerCase().includes(s);
      const matchesTopic = q.topics.some((t) => getTopicLabel(t).toLowerCase().includes(s));
      if (matchesExam || matchesTopic) {
        q.topics.forEach((t) => matchingTopicIds.add(t));
      }
    });
    const matched = levelTopics.filter((t) => matchingTopicIds.has(t.id));
    return matched.length > 0 ? matched : levelTopics.slice(0, 10);
  })();

  const matchedTopicId = (() => {
    const s = search.trim().toLowerCase();
    if (!s) return null;
    const hit = TOPICS.find((t) => {
      const label = t.label.toLowerCase();
      return label === s || label.includes(s) || s.includes(label);
    });
    return hit?.id ?? null;
  })();

  const recommendedLevel = matchedTopicId ? getRecommendedLevel(matchedTopicId) : null;
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

  const difficultyFiltered = recommendedLevel
    ? (() => {
        const priority: Record<string, number> = { achieved: 0, merit: 1, excellence: 2 };
        const target = priority[recommendedLevel];
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
    setLoadingTip(0);
    setTutorOpen(false);
    setUsedIds((prev) => new Set([...prev, q.id]));

    // Cycle loading tips
    let tipIdx = 0;
    const iv = setInterval(() => {
      tipIdx = (tipIdx + 1) % LOADING_TIPS.length;
      setLoadingTip(tipIdx);
    }, 2500);

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
      clearInterval(iv);
      setLoading(false);
    }
  }, [availableQuestions, questionsToUse]);

  const [feedback, setFeedback] = useState("");
  const [checking, setChecking] = useState(false);

  async function checkAnswer() {
    if (!question || !answer.trim()) return;

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
      question.topics.forEach((topic) => {
        updateRating(topic, question.gradeLevel, correct);
      });
      return;
    }

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
        question.topics.forEach((topic) => {
          updateRating(topic, question.gradeLevel, gotMarks);
        });
      }
    } catch {
      setIsCorrect(false);
      setFeedback("AI marking unavailable. Compare your answer with the marking guide below.");
    } finally {
      setChecking(false);
      setChecked(true);
    }
  }

  // ━━━ SETUP ━━━
  if (!question && !loading) {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
        </div>

        <div className="max-w-xl mx-auto px-5 pt-6 sm:pt-16 pb-16 sm:pb-20">
          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-[24px] sm:text-[36px] font-extrabold text-white tracking-tight mb-2">
              Fix your weak spots
            </h1>
            <p className="text-zinc-400 text-[15px] max-w-md mx-auto">
              Pick a topic you&apos;re struggling with. We&apos;ll teach you the concept,
              then test you on it — with an AI tutor to help if you get stuck.
            </p>
          </div>

          {/* How it works */}
          <div className="grid grid-cols-3 gap-3 mb-6 sm:mb-10">
            <div className="text-center">
              <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-[13px] font-bold flex items-center justify-center mx-auto mb-2">1</div>
              <p className="text-zinc-500 text-[11px]">Pick a topic</p>
            </div>
            <div className="text-center">
              <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-[13px] font-bold flex items-center justify-center mx-auto mb-2">2</div>
              <p className="text-zinc-500 text-[11px]">Read the lesson</p>
            </div>
            <div className="text-center">
              <div className="w-9 h-9 rounded-full bg-indigo-500/15 border border-indigo-500/25 text-indigo-300 text-[13px] font-bold flex items-center justify-center mx-auto mb-2">3</div>
              <p className="text-zinc-500 text-[11px]">Answer & learn</p>
            </div>
          </div>

          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4 sm:p-6">
            {/* Year level */}
            <label className="block text-zinc-400 text-[13px] font-medium mb-2">Year level</label>
            <div className="grid grid-cols-4 gap-2 mb-6">
              {([
                { val: 0 as const, label: "Year 10" },
                { val: 1 as const, label: "Year 11" },
                { val: 2 as const, label: "Year 12" },
                { val: 3 as const, label: "Year 13" },
              ]).map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => { setLevel(opt.val); setSearch(""); }}
                  className={`min-h-[44px] py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                    level === opt.val
                      ? "bg-indigo-500 text-white"
                      : "bg-white/[0.04] border border-white/[0.1] text-zinc-400 hover:bg-white/[0.08]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Topic search */}
            <label className="block text-zinc-400 text-[13px] font-medium mb-2">What do you want to practise?</label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && questionsToUse.length > 0) startQuestion(); }}
              placeholder="e.g. trigonometry, photosynthesis, algebra..."
              className="w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-4 py-3 text-white text-[14px] placeholder-zinc-600 focus:border-indigo-500 focus:outline-none transition-colors mb-3"
              autoFocus
            />

            {/* Adaptive hint */}
            {recommendedLevel && topicRating !== null && (
              <div className="mb-3 flex items-center gap-2 text-[12px]">
                <span className={`px-2 py-0.5 rounded-full border text-[11px] font-medium ${
                  recommendedLevel === "excellence" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" :
                  recommendedLevel === "merit" ? "text-blue-400 bg-blue-500/10 border-blue-500/30" :
                  "text-green-400 bg-green-500/10 border-green-500/30"
                }`}>
                  {recommendedLevel}
                </span>
                <span className="text-zinc-500">level questions based on your rating ({topicRating})</span>
              </div>
            )}

            {/* Quick picks — filtered by search */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {visibleTopics.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSearch(t.label)}
                  className={`text-[11px] px-2.5 py-1 rounded-full transition-all ${
                    search.toLowerCase() === t.label.toLowerCase()
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "bg-white/[0.04] text-zinc-500 hover:text-zinc-300 border border-transparent hover:border-white/[0.1]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={startQuestion}
              disabled={questionsToUse.length === 0}
              className="w-full py-3.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-semibold text-[14px] transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Start practising
            </button>
          </div>

          <div className="text-center mt-6">
            <Link href="/dashboard" className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors">
              Back to dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ━━━ LOADING ━━━
  if (loading) {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
        </div>

        <div className="max-w-md mx-auto px-5 pt-16 sm:pt-24 pb-16 sm:pb-20 text-center">
          <div className="relative inline-flex items-center justify-center w-16 h-16 mb-6">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <svg className="w-7 h-7 text-white animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
              </svg>
            </div>
          </div>
          <h2 className="text-[20px] font-extrabold text-white mb-2">Building your lesson...</h2>
          <p className="text-zinc-400 text-[14px] mb-6 min-h-[20px]">
            {LOADING_TIPS[loadingTip]}
          </p>
          <div className="max-w-xs mx-auto">
            <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" style={{ width: "65%" }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!question) return null;

  // ━━━ QUESTION VIEW ━━━
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-xl mx-auto px-5 pt-6 pb-20">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <button
            onClick={() => { setQuestion(null); setLesson(""); setScore({ right: 0, wrong: 0 }); setUsedIds(new Set()); }}
            className="text-[12px] text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            &larr; Change topic
          </button>
          <div className="flex items-center gap-4">
            {(score.right + score.wrong) > 0 && (
              <div className="flex items-center gap-3 text-[12px]">
                <span className="text-emerald-400 font-medium">{score.right} right</span>
                <span className="text-red-400 font-medium">{score.wrong} wrong</span>
              </div>
            )}
          </div>
        </div>

        {/* Lesson card */}
        {lesson && (
          <div className="rounded-2xl bg-gradient-to-br from-indigo-500/[0.06] to-purple-500/[0.03] border border-indigo-500/15 mb-4">
            <button
              onClick={() => setShowLesson(!showLesson)}
              className="w-full px-5 py-3.5 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                </svg>
                <span className="text-[13px] font-semibold text-indigo-300">Learn first</span>
              </div>
              <svg className={`w-4 h-4 text-zinc-500 transition-transform ${showLesson ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showLesson && (
              <div className="px-5 pb-5 border-t border-indigo-500/10">
                <p className="text-zinc-300 text-[13px] whitespace-pre-wrap leading-relaxed pt-4">{lesson}</p>
              </div>
            )}
          </div>
        )}

        {/* Question card */}
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06]">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-white">Your turn</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                question.gradeLevel === "excellence" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" :
                question.gradeLevel === "merit" ? "text-blue-400 bg-blue-500/10 border-blue-500/30" :
                "text-green-400 bg-green-500/10 border-green-500/30"
              }`}>
                {question.gradeLevel}
              </span>
            </div>
            {/* Tutor button */}
            {!checked && (
              <button
                onClick={() => setTutorOpen(true)}
                className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
                Stuck? Ask tutor
              </button>
            )}
          </div>

          {/* Question body */}
          <div className="px-5 py-5">
            {question.graph && <Graph data={question.graph} />}
            {question.image && (
              <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-white p-2 mb-4">
                <img src={question.image} alt="Question diagram" className="max-w-full h-auto mx-auto max-h-[400px] object-contain" />
              </div>
            )}

            <div className="text-[14px] mb-5">
              {question.text.split(/(\[Diagram:[^\]]+\])/).map((part, j) =>
                part.startsWith("[Diagram:") ? (
                  question.image ? null : (
                    <div key={j} className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 mb-2 text-[11px] text-zinc-600 italic">
                      {part.slice(1, -1)}
                    </div>
                  )
                ) : (
                  <p key={j} className="text-zinc-200 whitespace-pre-wrap leading-relaxed">{part}</p>
                )
              )}
            </div>

            {/* Answer input */}
            {!checked && !checking && (
              <>
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder={question.answerType === "working" ? "Show your working and answer..." : "Your answer..."}
                  rows={question.answerType === "working" ? 6 : 3}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-[14px] placeholder-zinc-600 focus:border-indigo-500 focus:outline-none transition-colors resize-y mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={checkAnswer}
                    disabled={!answer.trim()}
                    className="flex-1 py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-[14px] font-semibold transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none"
                  >
                    Check my answer
                  </button>
                  <button
                    onClick={startQuestion}
                    className="px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[13px] hover:text-zinc-200 hover:bg-white/[0.08] transition-all"
                  >
                    Skip
                  </button>
                </div>
              </>
            )}

            {/* Checking animation */}
            {checking && (
              <div className="text-center py-8">
                <div className="inline-flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-zinc-400 text-[14px]">Marking your answer...</span>
                </div>
              </div>
            )}
          </div>

          {/* Result */}
          {checked && (
            <div className="border-t border-white/[0.06] px-5 py-5 space-y-4">
              {/* Verdict */}
              <div className={`text-center py-3 rounded-xl ${isCorrect ? "bg-emerald-500/[0.08] border border-emerald-500/20" : "bg-red-500/[0.08] border border-red-500/20"}`}>
                <span className={`text-[15px] font-semibold ${isCorrect ? "text-emerald-400" : "text-red-400"}`}>
                  {isCorrect ? "Correct!" : "Not quite"}
                </span>
              </div>

              {/* Your answer */}
              <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-4">
                <p className="text-zinc-600 text-[11px] uppercase tracking-wider font-medium mb-1.5">Your answer</p>
                <p className="text-zinc-300 text-[13px] whitespace-pre-wrap">{answer}</p>
              </div>

              {/* AI feedback */}
              {feedback && (
                <div className="rounded-xl bg-indigo-500/[0.04] border border-indigo-500/15 p-4">
                  <p className="text-indigo-400 text-[11px] uppercase tracking-wider font-semibold mb-1.5">AI feedback</p>
                  <p className="text-zinc-300 text-[13px] whitespace-pre-wrap leading-relaxed">{feedback}</p>
                </div>
              )}

              {/* Correct answer */}
              {!isCorrect && question.expectedAnswer && (
                <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4">
                  <p className="text-emerald-400 text-[11px] uppercase tracking-wider font-semibold mb-1.5">Correct answer</p>
                  <p className="text-white text-[14px] whitespace-pre-wrap">{question.expectedAnswer}</p>
                </div>
              )}

              {/* Marking guide */}
              <details className="rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <summary className="px-4 py-3 text-zinc-500 text-[12px] font-medium cursor-pointer hover:text-zinc-300 transition-colors">
                  Marking guide
                </summary>
                <div className="px-4 pb-4">
                  <p className="text-zinc-400 text-[12px] whitespace-pre-wrap leading-relaxed">{question.markingGuide}</p>
                </div>
              </details>

              {/* Next */}
              <button
                onClick={startQuestion}
                disabled={loading}
                className="w-full py-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-[14px] font-semibold transition-all shadow-lg shadow-indigo-500/20"
              >
                Next question
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tutor chat */}
      {tutorOpen && question && (
        <TutorChat
          question={{
            id: question.id,
            text: question.text,
            markingGuide: question.markingGuide,
            expectedAnswer: question.expectedAnswer,
          }}
          studentAnswer={answer || undefined}
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
