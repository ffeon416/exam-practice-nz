"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  getAllReviews,
  getDueReviews,
  getReviewStats,
  getReviewsVersion,
  getServerReviewsVersion,
  recordReview,
  subscribeReviews,
  type ReviewItem,
} from "@/lib/spacedRepetition";
import { getExam } from "@/data/exams";
import { getTopicLabel } from "@/data/topics";
import type { Question } from "@/lib/types";

type Phase = "intro" | "session" | "done";

interface EnrichedItem {
  review: ReviewItem;
  question: Question | null;
}

function enrich(review: ReviewItem): EnrichedItem {
  const exam = getExam(review.examId);
  const question = exam?.questions.find((q) => q.id === review.questionId) ?? null;
  return { review, question };
}

export default function ReviewPage() {
  const [phase, setPhase] = useState<Phase>("intro");
  // Snapshot taken when the session starts — we intentionally don't update
  // this as the user grades items, because advancing `index` through a
  // snapshot is what makes a session feel like a session rather than an
  // ever-shrinking live list.
  const [sessionItems, setSessionItems] = useState<EnrichedItem[]>([]);

  // Session state
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [working, setWorking] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [sessionCount, setSessionCount] = useState({ right: 0, partial: 0, wrong: 0 });

  // Reactive access to the review store via useSyncExternalStore — this is
  // the React-19-blessed pattern for reading external state (localStorage)
  // without calling setState inside a useEffect body.
  const version = useSyncExternalStore(
    subscribeReviews,
    getReviewsVersion,
    getServerReviewsVersion
  );

  // Derived data — re-reads on every version bump (cheap, localStorage).
  // On the server, these return zeros / empty arrays so SSR and first-client
  // render match.
  const isClient = typeof window !== "undefined";
  void version; // keep this in scope so lint sees it's used
  const stats = isClient
    ? getReviewStats()
    : { total: 0, due: 0, mastered: 0, learning: 0, new: 0 };
  const dueItems: EnrichedItem[] = isClient ? getDueReviews().map(enrich) : [];

  // Next-due date for the intro + done screens.
  let nextDueDate: Date | null = null;
  if (isClient) {
    const nowIso = new Date().toISOString();
    const upcoming = getAllReviews()
      .filter((i) => i.nextReview > nowIso)
      .sort((a, b) => a.nextReview.localeCompare(b.nextReview))[0];
    if (upcoming) nextDueDate = new Date(upcoming.nextReview);
  }

  function startSession() {
    if (dueItems.length === 0) return;
    setSessionItems(dueItems);
    setPhase("session");
    setIndex(0);
    setAnswer("");
    setWorking("");
    setRevealed(false);
    setSessionCount({ right: 0, partial: 0, wrong: 0 });
  }

  function handleGrade(quality: 0 | 3 | 5) {
    const current = sessionItems[index];
    if (!current) return;

    recordReview(
      current.review.questionId,
      current.review.examId,
      current.review.questionText,
      current.review.topics,
      quality
    );

    setSessionCount((c) => ({
      right: c.right + (quality === 5 ? 1 : 0),
      partial: c.partial + (quality === 3 ? 1 : 0),
      wrong: c.wrong + (quality === 0 ? 1 : 0),
    }));

    if (index + 1 < sessionItems.length) {
      setIndex(index + 1);
      setAnswer("");
      setWorking("");
      setRevealed(false);
    } else {
      setPhase("done");
    }
  }

  // ── INTRO / DASHBOARD VIEW ──
  if (phase === "intro") {
    const dueCount = dueItems.length;

    return (
      <div className="max-w-2xl mx-auto px-5 py-10">
        <div className="mb-8">
          <h1 className="text-[22px] font-semibold text-white mb-1 tracking-tight">
            Spaced review
          </h1>
          <p className="text-zinc-500 text-[13px]">
            Questions you got wrong come back at increasing intervals until you master them.
          </p>
        </div>

        {/* Due today hero */}
        <div className="border border-zinc-800 rounded-lg bg-zinc-900/40 p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-1">
                Due today
              </p>
              <p className="text-4xl font-semibold text-white">
                {dueCount}
                <span className="text-[13px] text-zinc-500 font-normal ml-2">
                  {dueCount === 1 ? "question" : "questions"}
                </span>
              </p>
            </div>
            <div className="shrink-0">
              {dueCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Ready
                </span>
              ) : (
                <span className="text-[11px] text-zinc-600 px-2.5 py-1">All clear</span>
              )}
            </div>
          </div>

          {dueCount > 0 ? (
            <button
              onClick={startSession}
              className="w-full py-3 rounded-lg bg-indigo-500 text-white font-medium text-[13px] hover:bg-indigo-400 transition-colors"
            >
              Start review session
            </button>
          ) : (
            <div className="text-center py-2">
              <p className="text-zinc-500 text-[13px] mb-1">
                Nothing due right now — nice work.
              </p>
              {nextDueDate && (
                <p className="text-zinc-600 text-[11px]">
                  Next review: {nextDueDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-px bg-zinc-800/50 rounded-lg overflow-hidden mb-6">
          <StatCell label="tracked" value={stats.total} />
          <StatCell label="new" value={stats.new} accent="indigo" />
          <StatCell label="learning" value={stats.learning} accent="amber" />
          <StatCell label="mastered" value={stats.mastered} accent="emerald" />
        </div>

        {/* How it works */}
        <div className="border border-zinc-800 rounded-lg p-5 mb-6">
          <h2 className="text-[12px] font-medium text-white mb-3">How spaced review works</h2>
          <ol className="space-y-2 text-[12px] text-zinc-400 leading-relaxed">
            <li className="flex gap-2.5">
              <span className="text-indigo-400/80 font-mono w-3 shrink-0">1</span>
              <span>Finish an exam — wrong answers get added automatically.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-indigo-400/80 font-mono w-3 shrink-0">2</span>
              <span>Come back each day and work through what&rsquo;s due.</span>
            </li>
            <li className="flex gap-2.5">
              <span className="text-indigo-400/80 font-mono w-3 shrink-0">3</span>
              <span>
                Get it right, and the interval grows: 1&nbsp;day → 3&nbsp;days →
                1&nbsp;week → 2&nbsp;weeks → &hellip; until you own it.
              </span>
            </li>
          </ol>
        </div>

        <div className="text-center">
          <Link
            href="/dashboard"
            className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            &larr; Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  // ── SESSION VIEW ──
  if (phase === "session") {
    const current = sessionItems[index];
    if (!current) {
      return (
        <div className="max-w-2xl mx-auto px-5 py-16 text-center text-zinc-500 text-[13px]">
          No review item loaded.
        </div>
      );
    }

    const { review, question } = current;
    const correctAnswer = question?.expectedAnswer ?? "(See marking guide)";
    const markingGuide = question?.markingGuide ?? "";
    const topicLabels = review.topics.map((t) => getTopicLabel(t));

    return (
      <div className="max-w-2xl mx-auto px-5 py-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setPhase("intro")}
            className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            &larr; Exit
          </button>
          <span className="text-[12px] text-zinc-500">
            {index + 1} of {sessionItems.length}
          </span>
          <span className="text-[11px] text-zinc-600">
            {review.repetitions === 0
              ? "new"
              : review.repetitions >= 5
              ? "mastered"
              : `rep ${review.repetitions}`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-indigo-500 transition-all duration-300"
            style={{ width: `${(index / sessionItems.length) * 100}%` }}
          />
        </div>

        {/* Question card */}
        <div className="border border-zinc-800 rounded-lg mb-4">
          <div className="px-4 py-3 border-b border-zinc-800/50 flex items-center justify-between">
            <span className="text-[12px] font-medium text-white">Question</span>
            <div className="flex gap-1.5 flex-wrap justify-end">
              {topicLabels.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-300/80 border border-indigo-500/15"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div className="px-4 py-4">
            {question?.image && (
              <div className="rounded-lg overflow-hidden border border-zinc-800 bg-white p-2 mb-4">
                <img
                  src={question.image}
                  alt="Question diagram"
                  className="max-w-full h-auto mx-auto max-h-[400px] object-contain"
                />
              </div>
            )}
            <p className="text-zinc-300 text-[13px] whitespace-pre-wrap leading-relaxed">
              {review.questionText.replace(/\[Diagram:[^\]]+\]/g, "").trim()}
            </p>
          </div>
        </div>

        {/* Working + answer input */}
        {!revealed && (
          <>
            <div className="border border-zinc-800 rounded-lg p-4 mb-3">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">
                Your working
              </p>
              <textarea
                value={working}
                onChange={(e) => setWorking(e.target.value)}
                placeholder="Work through the problem step by step..."
                rows={5}
                className="w-full bg-transparent border border-zinc-800 rounded-md px-3 py-2 text-white text-[13px] placeholder-zinc-700 focus:outline-none focus:border-zinc-600 resize-y"
              />
            </div>
            <div className="border border-zinc-800 rounded-lg p-4 mb-4">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">
                Your final answer
              </p>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Your answer..."
                rows={2}
                className="w-full bg-transparent border border-zinc-800 rounded-md px-3 py-2 text-white text-[13px] placeholder-zinc-700 focus:outline-none focus:border-zinc-600 resize-y"
              />
            </div>
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-3 rounded-lg bg-indigo-500 text-white font-medium text-[13px] hover:bg-indigo-400 transition-colors"
            >
              Check answer
            </button>
          </>
        )}

        {/* Revealed answer + self-grade */}
        {revealed && (
          <>
            {working && (
              <div className="border border-zinc-800 rounded-lg p-4 mb-3">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">
                  Your working
                </p>
                <p className="text-zinc-300 text-[13px] whitespace-pre-wrap leading-relaxed">
                  {working}
                </p>
              </div>
            )}
            {answer && (
              <div className="border border-zinc-800 rounded-lg p-4 mb-3">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">
                  Your answer
                </p>
                <p className="text-zinc-300 text-[13px] whitespace-pre-wrap leading-relaxed">
                  {answer}
                </p>
              </div>
            )}

            <div className="border border-emerald-800/40 bg-emerald-950/20 rounded-lg p-4 mb-3">
              <p className="text-[11px] text-emerald-400 uppercase tracking-wide mb-2 font-semibold">
                Correct answer
              </p>
              <p className="text-white text-[14px] whitespace-pre-wrap leading-relaxed font-semibold">
                {correctAnswer}
              </p>
            </div>

            {markingGuide && (
              <div className="border border-zinc-800 rounded-lg p-4 mb-5">
                <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-2">
                  Marking guide
                </p>
                <p className="text-zinc-400 text-[12px] whitespace-pre-wrap leading-relaxed">
                  {markingGuide}
                </p>
              </div>
            )}

            <p className="text-[11px] text-zinc-500 text-center mb-3">How did you do?</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleGrade(0)}
                className="py-3 rounded-lg border border-red-900/40 bg-red-950/20 text-red-300 text-[12px] font-medium hover:bg-red-950/40 transition-colors"
              >
                Got it wrong
                <span className="block text-[10px] text-red-400/60 mt-0.5">
                  back tomorrow
                </span>
              </button>
              <button
                onClick={() => handleGrade(3)}
                className="py-3 rounded-lg border border-amber-900/40 bg-amber-950/20 text-amber-300 text-[12px] font-medium hover:bg-amber-950/40 transition-colors"
              >
                Partially correct
                <span className="block text-[10px] text-amber-400/60 mt-0.5">
                  short interval
                </span>
              </button>
              <button
                onClick={() => handleGrade(5)}
                className="py-3 rounded-lg border border-emerald-900/40 bg-emerald-950/20 text-emerald-300 text-[12px] font-medium hover:bg-emerald-950/40 transition-colors"
              >
                Got it right
                <span className="block text-[10px] text-emerald-400/60 mt-0.5">
                  longer interval
                </span>
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── DONE VIEW ──
  return (
    <div className="max-w-2xl mx-auto px-5 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 mx-auto mb-5 flex items-center justify-center">
        <span className="text-emerald-400 text-[22px]">&#10003;</span>
      </div>
      <h1 className="text-[22px] font-semibold text-white mb-2 tracking-tight">
        Session complete
      </h1>
      <p className="text-zinc-500 text-[13px] mb-8">
        You reviewed {sessionCount.right + sessionCount.partial + sessionCount.wrong}{" "}
        {sessionCount.right + sessionCount.partial + sessionCount.wrong === 1
          ? "question"
          : "questions"}
        .
      </p>

      <div className="grid grid-cols-3 gap-px bg-zinc-800/50 rounded-lg overflow-hidden mb-6">
        <StatCell label="right" value={sessionCount.right} accent="emerald" />
        <StatCell label="partial" value={sessionCount.partial} accent="amber" />
        <StatCell label="wrong" value={sessionCount.wrong} accent="red" />
      </div>

      <div className="border border-zinc-800 rounded-lg p-5 mb-6 text-left">
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide mb-3">
          Your queue
        </p>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-lg font-semibold text-white">{stats.total}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">tracked</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-indigo-300">{stats.new}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">new</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-amber-300">{stats.learning}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">learning</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-emerald-300">{stats.mastered}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">mastered</p>
          </div>
        </div>
      </div>

      {nextDueDate && (
        <p className="text-zinc-500 text-[12px] mb-6">
          Next review:{" "}
          <span className="text-zinc-300">
            {nextDueDate.toLocaleDateString(undefined, {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </span>
        </p>
      )}

      <div className="flex gap-2.5 justify-center">
        {dueItems.length > 0 ? (
          <button
            onClick={startSession}
            className="bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-400 transition-colors text-[13px]"
          >
            Keep going ({dueItems.length} left)
          </button>
        ) : (
          <Link
            href="/subjects"
            className="bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-400 transition-colors text-[13px]"
          >
            Take another exam
          </Link>
        )}
        <Link
          href="/dashboard"
          className="text-zinc-400 font-medium px-5 py-2.5 rounded-lg border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 transition-colors text-[13px]"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}

// ── Small stat cell component ──
function StatCell({
  label,
  value,
  accent = "zinc",
}: {
  label: string;
  value: number;
  accent?: "zinc" | "indigo" | "amber" | "emerald" | "red";
}) {
  const accentColors: Record<string, string> = {
    zinc: "text-white",
    indigo: "text-indigo-300",
    amber: "text-amber-300",
    emerald: "text-emerald-300",
    red: "text-red-300",
  };
  return (
    <div className="bg-[#141419] p-4 text-center">
      <div className={`text-lg font-semibold ${accentColors[accent]}`}>{value}</div>
      <div className="text-[11px] text-zinc-600 mt-0.5">{label}</div>
    </div>
  );
}
