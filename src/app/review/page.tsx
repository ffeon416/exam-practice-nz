"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useTier } from "@/hooks/useTier";
import { display } from "@/lib/displayFont";
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
import { getCustomExam, isCustomExamId } from "@/lib/customExams";
import { getTopicLabel } from "@/data/topics";
import type { Question } from "@/lib/types";

interface EnrichedItem {
  review: ReviewItem;
  question: Question | null;
}

function enrich(review: ReviewItem): EnrichedItem {
  // Static exams are gone — only resolve reviews from custom (AI-generated) exams.
  const exam = isCustomExamId(review.examId) ? getCustomExam(review.examId) : null;
  const question = exam?.questions.find((q) => q.id === review.questionId) ?? null;
  return { review, question };
}

type Phase = "home" | "session" | "done";

/* Shared Soar-style ambient ground — one radial glow, no blur blobs */
function PageGlow() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      <div
        className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full"
        style={{ background: "radial-gradient(50% 50% at 50% 42%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }}
      />
    </div>
  );
}

export default function ReviewPage() {
  const { limits, loading: tierLoading } = useTier();
  const [phase, setPhase] = useState<Phase>("home");
  const [sessionItems, setSessionItems] = useState<EnrichedItem[]>([]);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState({ right: 0, partial: 0, wrong: 0 });

  const version = useSyncExternalStore(subscribeReviews, getReviewsVersion, getServerReviewsVersion);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  void version;
  const stats = mounted ? getReviewStats() : { total: 0, due: 0, mastered: 0, learning: 0, new: 0 };
  const dueItems: EnrichedItem[] = mounted ? getDueReviews().map(enrich) : [];

  let nextDueDate: Date | null = null;
  if (mounted) {
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
    setRevealed(false);
    setResults({ right: 0, partial: 0, wrong: 0 });
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

    // Sync to database
    {
      const r = current.review;
      const now = new Date();
      let ease = r.ease;
      let intervalDays = r.interval;
      let repetitions = r.repetitions;

      if (quality < 3) {
        repetitions = 0;
        intervalDays = 0;
      } else if (quality === 3) {
        repetitions = Math.max(repetitions, 1);
        intervalDays = 1;
      } else {
        if (repetitions === 0) intervalDays = 3;
        else if (repetitions === 1) intervalDays = 7;
        else intervalDays = Math.round(r.interval * ease);
        repetitions += 1;
        ease = Math.max(1.3, ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
      }

      const nextReview =
        intervalDays === 0
          ? new Date(now.getTime() - 1000).toISOString()
          : new Date(now.getTime() + intervalDays * 86400000).toISOString();

      fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          review: {
            questionId: r.questionId,
            examId: r.examId,
            questionText: r.questionText,
            topics: r.topics,
            ease,
            intervalDays,
            repetitions,
            nextReview,
            lastReviewed: now.toISOString(),
          },
        }),
      }).catch(() => {});
    }

    setResults((c) => ({
      right: c.right + (quality === 5 ? 1 : 0),
      partial: c.partial + (quality === 3 ? 1 : 0),
      wrong: c.wrong + (quality === 0 ? 1 : 0),
    }));

    if (index + 1 < sessionItems.length) {
      setIndex(index + 1);
      setAnswer("");
      setRevealed(false);
    } else {
      setPhase("done");
    }
  }

  // Hold the gate decision until the tier is known — otherwise free users see
  // the unlocked review UI flash before snapping to the upgrade gate.
  // (Same pattern as /plan; paid users still never flash the gate.)
  if (tierLoading) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center text-zinc-500 text-sm">
        Loading...
      </div>
    );
  }

  // ── Upgrade gate ──
  if (!limits.spacedRepetition) {
    return (
      <div className="relative overflow-hidden">
        <PageGlow />

        <div className="max-w-md mx-auto px-5 pt-8 sm:pt-14 pb-16 sm:pb-20">
          {/* Hero: forgetting-curve chart */}
          <div className="home-rise relative mx-auto mb-6 w-full max-w-[280px]">
            <div className="relative rounded-2xl bg-gradient-to-br from-indigo-500/[0.12] to-violet-500/[0.05] border border-indigo-500/20 p-4 pb-3">
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-indigo-500 to-violet-500 px-2 py-0.5 rounded-md shadow-md">
                Student
              </span>

              <svg viewBox="0 0 240 110" className="w-full h-auto" aria-hidden="true">
                <defs>
                  <linearGradient id="spacedLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#818cf8" />
                  </linearGradient>
                  <linearGradient id="spacedFill" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {/* Grid */}
                <line x1="10" y1="30" x2="230" y2="30" stroke="white" strokeOpacity="0.04" strokeDasharray="2 3" />
                <line x1="10" y1="60" x2="230" y2="60" stroke="white" strokeOpacity="0.04" strokeDasharray="2 3" />
                <line x1="10" y1="90" x2="230" y2="90" stroke="white" strokeOpacity="0.04" strokeDasharray="2 3" />

                {/* Without review (exponential decay) */}
                <path
                  d="M 10,22 C 30,30 45,60 70,78 C 100,95 150,100 230,102"
                  fill="none"
                  stroke="#ef4444"
                  strokeOpacity="0.5"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeDasharray="4 3"
                />

                {/* With spaced review (sawtooth, staying high) + area fill */}
                <path
                  d="M 10,22 L 38,42 L 42,20 L 78,38 L 82,18 L 125,32 L 129,15 L 178,26 L 182,12 L 230,20 L 230,105 L 10,105 Z"
                  fill="url(#spacedFill)"
                />
                <path
                  d="M 10,22 L 38,42 L 42,20 L 78,38 L 82,18 L 125,32 L 129,15 L 178,26 L 182,12 L 230,20"
                  fill="none"
                  stroke="url(#spacedLineGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Review markers */}
                <circle cx="42" cy="20" r="2.5" fill="#818cf8" />
                <circle cx="82" cy="18" r="2.5" fill="#818cf8" />
                <circle cx="129" cy="15" r="2.5" fill="#818cf8" />
                <circle cx="182" cy="12" r="2.5" fill="#818cf8" />
              </svg>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 mt-1 text-[10px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-[2px] rounded-full bg-gradient-to-r from-emerald-400 to-indigo-400" />
                  <span className="text-zinc-400">With review</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-[2px] rounded-full bg-red-500/60 [border-top:1px_dashed]" style={{ background: "repeating-linear-gradient(to right, rgb(239 68 68 / 0.6) 0 3px, transparent 3px 5px)" }} />
                  <span className="text-zinc-500">Without</span>
                </span>
              </div>
            </div>
          </div>

          <h1
            className={`${display.className} home-rise text-[26px] sm:text-[32px] font-bold text-white tracking-[-0.02em] text-center mb-3 leading-tight`}
            style={{ animationDelay: "80ms", textWrap: "balance" }}
          >
            Remember what you got wrong.
          </h1>
          <p
            className="home-rise text-zinc-400 text-[14px] sm:text-[15px] text-center mb-7 leading-relaxed max-w-sm mx-auto"
            style={{ animationDelay: "160ms" }}
          >
            You forget <span className="text-white font-semibold">70% of what you learn within 24 hours</span>. Spaced review brings each question back right before you&apos;re about to forget — and locks it in for exam day.
          </p>

          {/* Benefits */}
          <ul className="space-y-2.5 mb-6">
            <ReviewBenefit text="Wrong answers queue up automatically — zero setup" />
            <ReviewBenefit text="Algorithm picks the perfect moment to test you again" />
            <ReviewBenefit text="Track which topics are mastered vs. still shaky" />
            <ReviewBenefit text="Walk into the exam with every weak spot already fixed" />
          </ul>

          {/* Price card */}
          <div className="rounded-2xl bg-indigo-500/[0.08] border border-indigo-500/20 px-5 py-4 mb-5 text-center">
            <p className="font-mono text-[11px] uppercase tracking-wider text-indigo-300 font-semibold mb-1">Student plan</p>
            <p className="text-white">
              <span className="text-[28px] font-extrabold tracking-tight">$15</span>
              <span className="text-zinc-400 text-[13px] ml-1">/month</span>
            </p>
            <p className="text-zinc-500 text-[11px] mt-1">Cancel anytime · All subjects unlocked</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <Link
              href="/pricing"
              className="w-full py-3 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-extrabold text-[14px] text-center transition-all shadow-lg shadow-indigo-500/30"
            >
              Start remembering everything
            </Link>
            <Link
              href="/dashboard"
              className="w-full py-3 rounded-full text-zinc-500 font-medium text-[13px] hover:text-zinc-300 transition-colors text-center"
            >
              Maybe later
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Home ──
  if (phase === "home") {
    const dueCount = dueItems.length;
    const totalReviewed = stats.mastered + stats.learning;

    return (
      <div className="relative overflow-hidden">
        <PageGlow />

        <div className="max-w-xl mx-auto px-5 pt-6 sm:pt-14 pb-16 sm:pb-20">
          <div className="mb-6 sm:mb-8">
            <h1
              className={`${display.className} home-rise text-[26px] sm:text-[36px] font-bold text-white tracking-[-0.02em] mb-1`}
              style={{ textWrap: "balance" }}
            >
              Review
            </h1>
            <p className="home-rise text-zinc-500 text-[14px]" style={{ animationDelay: "80ms" }}>
              Questions you got wrong come back until you nail them.
            </p>
          </div>

          {/* Main action */}
          {dueCount > 0 ? (
            <button
              onClick={startSession}
              className="w-full group flex items-center gap-5 rounded-2xl bg-gradient-to-r from-indigo-500/[0.12] to-violet-500/[0.06] border border-indigo-500/20 p-6 mb-6 hover:border-indigo-500/40 transition-all text-left"
            >
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                <span className="text-indigo-300 text-[22px] font-bold">{dueCount}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[16px]">
                  {dueCount === 1 ? "1 question" : `${dueCount} questions`} ready
                </p>
                <p className="text-zinc-400 text-[13px]">Tap to start your review session</p>
              </div>
              <svg className="w-5 h-5 text-zinc-500 shrink-0 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          ) : stats.total === 0 ? (
            <div className="rounded-[32px] bg-white/[0.015] border border-white/[0.07] p-8 text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-indigo-500/10 border border-indigo-500/20 mx-auto mb-4 flex items-center justify-center">
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </div>
              <h2 className="text-white font-semibold text-[16px] mb-2">No questions yet</h2>
              <p className="text-zinc-500 text-[13px] mb-5 max-w-xs mx-auto">
                Take a practice exam first — any questions you get wrong will show up here for review.
              </p>
              <Link
                href="/subjects"
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-extrabold px-5 py-2.5 shadow-lg shadow-indigo-500/30 transition-all text-[13px]"
              >
                Take an exam
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          ) : (
            <div className="rounded-2xl bg-gradient-to-r from-emerald-500/[0.08] to-green-500/[0.04] border border-emerald-500/20 p-6 text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-white font-semibold text-[16px] mb-1">All caught up!</p>
              <p className="text-zinc-400 text-[13px]">
                {nextDueDate
                  ? `Next review: ${nextDueDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "short" })}`
                  : "Come back later for more reviews."}
              </p>
            </div>
          )}

          {/* Progress */}
          {stats.total > 0 && (
            <div className="rounded-2xl bg-white/[0.015] border border-white/[0.07] p-5 mb-6">
              <h2 className="font-mono text-[12px] uppercase tracking-wider text-zinc-500 font-semibold mb-4">Your progress</h2>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 bg-white/[0.06] rounded-full h-3 overflow-hidden flex">
                  {stats.mastered > 0 && (
                    <div
                      className="bg-emerald-500 h-full transition-all duration-700"
                      style={{ width: `${(stats.mastered / stats.total) * 100}%` }}
                    />
                  )}
                  {stats.learning > 0 && (
                    <div
                      className="bg-amber-500 h-full transition-all duration-700"
                      style={{ width: `${(stats.learning / stats.total) * 100}%` }}
                    />
                  )}
                  {stats.new > 0 && (
                    <div
                      className="bg-zinc-600 h-full transition-all duration-700"
                      style={{ width: `${(stats.new / stats.total) * 100}%` }}
                    />
                  )}
                </div>
                <span className="text-zinc-500 text-[12px] shrink-0 tabular-nums">{stats.total}</span>
              </div>
              <div className="flex items-center gap-5 text-[12px]">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-zinc-400">Mastered {stats.mastered}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-zinc-400">Learning {stats.learning}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                  <span className="text-zinc-400">New {stats.new}</span>
                </span>
              </div>
            </div>
          )}

          {/* How it works */}
          {stats.total === 0 && (
            <div className="rounded-2xl bg-white/[0.015] border border-white/[0.07] p-5">
              <h2 className="font-mono text-[12px] uppercase tracking-wider text-zinc-500 font-semibold mb-3">How it works</h2>
              <div className="space-y-3 text-[13px] text-zinc-400">
                <div className="flex gap-3">
                  <span className="font-mono text-indigo-400 text-[12px] font-bold shrink-0 mt-0.5 w-6">01</span>
                  <p>Take a practice exam — wrong answers get added here automatically</p>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-indigo-400 text-[12px] font-bold shrink-0 mt-0.5 w-6">02</span>
                  <p>Come back and review what&apos;s due — try the question again</p>
                </div>
                <div className="flex gap-3">
                  <span className="font-mono text-indigo-400 text-[12px] font-bold shrink-0 mt-0.5 w-6">03</span>
                  <p>Get it right and it comes back later. Get it wrong and it comes back sooner. Until you master it.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Session ──
  if (phase === "session") {
    const current = sessionItems[index];
    if (!current) return null;

    const { review, question } = current;
    const correctAnswer = question?.expectedAnswer ?? "(See marking guide)";
    const markingGuide = question?.markingGuide ?? "";
    const topicLabels = review.topics.map((t) => getTopicLabel(t));
    const progress = ((index) / sessionItems.length) * 100;

    return (
      <div className="relative overflow-hidden">
        <PageGlow />

        <div className="max-w-xl mx-auto px-5 pt-6 pb-20">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setPhase("home")}
              className="text-[12px] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              Exit
            </button>
            <span className="font-mono text-[12px] text-zinc-400 font-medium tabular-nums">
              {index + 1} / {sessionItems.length}
            </span>
            <div className="w-10" /> {/* spacer */}
          </div>

          {/* Progress bar */}
          <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden mb-8">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Topic tags */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            {topicLabels.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300/80 border border-indigo-500/15"
              >
                {t}
              </span>
            ))}
          </div>

          {/* Question */}
          <div className="rounded-2xl bg-white/[0.015] border border-white/[0.07] p-5 mb-5">
            {question?.image && (
              <div className="rounded-xl overflow-hidden border border-white/[0.06] bg-white p-2 mb-4">
                <img
                  src={question.image}
                  alt="Question diagram"
                  className="max-w-full h-auto mx-auto max-h-[300px] object-contain"
                />
              </div>
            )}
            <p className="text-zinc-200 text-[14px] whitespace-pre-wrap leading-relaxed">
              {review.questionText.replace(/\[Diagram:[^\]]+\]/g, "").trim()}
            </p>
          </div>

          {/* Answer input */}
          {!revealed && (
            <>
              <textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your answer..."
                rows={4}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-[14px] placeholder-zinc-600 focus:border-indigo-500 focus:outline-none transition-colors resize-y mb-4"
              />
              <button
                onClick={() => setRevealed(true)}
                className="w-full py-3.5 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-extrabold text-[14px] shadow-lg shadow-indigo-500/30 transition-all"
              >
                Show answer
              </button>
            </>
          )}

          {/* Revealed */}
          {revealed && (
            <>
              {/* Student's answer */}
              {answer.trim() && (
                <div className="rounded-xl bg-white/[0.015] border border-white/[0.07] p-4 mb-3">
                  <p className="font-mono text-zinc-500 text-[11px] uppercase tracking-wider font-medium mb-1.5">You wrote</p>
                  <p className="text-zinc-300 text-[13px] whitespace-pre-wrap">{answer}</p>
                </div>
              )}

              {/* Correct answer */}
              <div className="rounded-xl bg-emerald-500/[0.06] border border-emerald-500/20 p-4 mb-3">
                <p className="font-mono text-emerald-400 text-[11px] uppercase tracking-wider font-semibold mb-1.5">Correct answer</p>
                <p className="text-white text-[14px] whitespace-pre-wrap leading-relaxed">{correctAnswer}</p>
              </div>

              {/* Marking guide */}
              {markingGuide && (
                <details className="rounded-xl bg-white/[0.015] border border-white/[0.07] mb-5">
                  <summary className="px-4 py-3 text-zinc-500 text-[12px] font-medium cursor-pointer hover:text-zinc-300 transition-colors">
                    Marking guide
                  </summary>
                  <div className="px-4 pb-4">
                    <p className="text-zinc-400 text-[12px] whitespace-pre-wrap leading-relaxed">{markingGuide}</p>
                  </div>
                </details>
              )}

              {/* Grade buttons */}
              <p className="text-zinc-500 text-[13px] text-center mb-3">How did you go?</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleGrade(0)}
                  className="py-4 rounded-2xl bg-red-500/[0.08] border border-red-500/20 hover:bg-red-500/[0.15] transition-all text-center min-h-[60px]"
                >
                  <span className="text-red-400 text-[14px] font-semibold block">Wrong</span>
                  <span className="text-red-400/50 text-[11px] block mt-0.5">See it again soon</span>
                </button>
                <button
                  onClick={() => handleGrade(3)}
                  className="py-4 rounded-2xl bg-amber-500/[0.08] border border-amber-500/20 hover:bg-amber-500/[0.15] transition-all text-center min-h-[60px]"
                >
                  <span className="text-amber-400 text-[14px] font-semibold block">Close</span>
                  <span className="text-amber-400/50 text-[11px] block mt-0.5">Almost had it</span>
                </button>
                <button
                  onClick={() => handleGrade(5)}
                  className="py-4 rounded-2xl bg-emerald-500/[0.08] border border-emerald-500/20 hover:bg-emerald-500/[0.15] transition-all text-center min-h-[60px]"
                >
                  <span className="text-emerald-400 text-[14px] font-semibold block">Nailed it</span>
                  <span className="text-emerald-400/50 text-[11px] block mt-0.5">See it later</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Done ──
  const totalDone = results.right + results.partial + results.wrong;

  return (
    <div className="relative overflow-hidden">
      <PageGlow />

      <div className="max-w-xl mx-auto px-5 pt-10 sm:pt-16 pb-16 sm:pb-20 text-center">
        {/* Celebration */}
        <div className="home-rise w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-5">
          <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h1
          className={`${display.className} home-rise text-[26px] sm:text-[32px] font-bold text-white tracking-[-0.02em] mb-2`}
          style={{ animationDelay: "80ms", textWrap: "balance" }}
        >
          {results.right === totalDone ? "Perfect session!" :
           results.right >= totalDone * 0.7 ? "Great session!" :
           "Session complete"}
        </h1>
        <p className="home-rise text-zinc-500 text-[14px] mb-8" style={{ animationDelay: "160ms" }}>
          You reviewed {totalDone} {totalDone === 1 ? "question" : "questions"}
        </p>

        {/* Results */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="text-center">
            <div className="text-[28px] font-bold text-emerald-400">{results.right}</div>
            <div className="font-mono text-zinc-500 text-[11px] uppercase tracking-wider mt-0.5">Nailed it</div>
          </div>
          <div className="w-px h-10 bg-white/[0.06]" />
          <div className="text-center">
            <div className="text-[28px] font-bold text-amber-400">{results.partial}</div>
            <div className="font-mono text-zinc-500 text-[11px] uppercase tracking-wider mt-0.5">Close</div>
          </div>
          <div className="w-px h-10 bg-white/[0.06]" />
          <div className="text-center">
            <div className="text-[28px] font-bold text-red-400">{results.wrong}</div>
            <div className="font-mono text-zinc-500 text-[11px] uppercase tracking-wider mt-0.5">Wrong</div>
          </div>
        </div>

        {/* Next review */}
        {nextDueDate && (
          <p className="text-zinc-500 text-[13px] mb-8">
            Next review:{" "}
            <span className="text-zinc-300">
              {nextDueDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "short" })}
            </span>
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          {dueItems.length > 0 ? (
            <button
              onClick={startSession}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-extrabold px-6 py-3 shadow-lg shadow-indigo-500/30 transition-all text-[14px]"
            >
              Keep going ({dueItems.length} left)
            </button>
          ) : (
            <Link
              href="/subjects"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-extrabold px-6 py-3 shadow-lg shadow-indigo-500/30 transition-all text-[14px]"
            >
              Take another exam
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          )}
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center rounded-full text-white font-semibold px-6 py-3 border border-white/[0.12] hover:border-white/[0.3] hover:bg-white/[0.04] transition-all text-[14px]"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ReviewBenefit({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg
        className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      <span className="text-[13px] text-zinc-300 leading-snug">{text}</span>
    </li>
  );
}
