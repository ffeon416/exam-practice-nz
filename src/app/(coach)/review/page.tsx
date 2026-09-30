"use client";

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
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

function ReviewInner() {
  // The schedule's "fix them" card lands here with ?start=1: straight into
  // the questions, no home screen.
  const autoStart = useSearchParams().get("start") === "1";
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

  useEffect(() => {
    if (!autoStart || !mounted || phase !== "home" || dueItems.length === 0) return;
    const id = setTimeout(startSession, 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, mounted, dueItems.length]);

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
            <p className="font-mono text-[11px] uppercase tracking-wider text-indigo-300 font-semibold mb-1">Pro</p>
            <p className="text-white">
              <span className="text-[28px] font-extrabold tracking-tight">NZ$49</span>
              <span className="text-zinc-400 text-[13px] ml-1">/month</span>
            </p>
            <p className="text-zinc-500 text-[11px] mt-1">Cancel anytime · or NZ$149 for the whole year</p>
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
    const topic = topicLabels[0] ?? "This one";
    const progress = (index / sessionItems.length) * 100;
    const AMBER = "#fbbf24";

    return (
      <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-24">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 mb-5">
          <div className="min-w-0">
            <p className="font-mono text-[11px] sm:text-[12px] uppercase tracking-[0.22em]" style={{ color: AMBER }}>To review · {index + 1} of {sessionItems.length}</p>
            <h1 className={`${display.className} font-bold text-white text-[30px] sm:text-[40px] leading-none tracking-[-0.035em] mt-2 truncate`}>{topic}</h1>
          </div>
          <Link href="/schedule" className="shrink-0 inline-flex items-center rounded-full border border-white/[0.14] hover:border-white/40 text-zinc-300 hover:text-white font-semibold text-[14px] px-4 py-2.5 min-h-[44px] transition-colors">Exit</Link>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden mb-6 sm:mb-8">
          <div className="h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${AMBER}, #fde68a)` }} />
        </div>

        {/* Question */}
        <div className="rounded-[28px] border border-white/[0.08] bg-[#0e0f13] p-6 sm:p-8">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-zinc-500 mb-4">You dropped marks on this one{topicLabels.length > 1 ? ` · ${topicLabels.slice(1, 3).join(" · ")}` : ""}</p>
          {question?.image && (
            <div className="rounded-2xl overflow-hidden border border-white/[0.06] bg-white p-2 mb-5">
              <img src={question.image} alt="Question diagram" className="max-w-full h-auto mx-auto max-h-[300px] object-contain" />
            </div>
          )}
          <p className="text-zinc-100 text-[16px] sm:text-[18px] whitespace-pre-wrap leading-relaxed">
            {review.questionText.replace(/\[Diagram:[^\]]+\]/g, "").trim()}
          </p>
        </div>

        {!revealed ? (
          <>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Your answer, with working…"
              rows={5}
              autoFocus
              className="mt-4 w-full rounded-[22px] bg-white/[0.03] border border-white/[0.1] px-5 py-4 text-white text-[16px] placeholder-zinc-600 focus:outline-none transition-colors resize-y"
              style={{ borderColor: answer ? `${AMBER}66` : undefined }}
              onFocus={(e) => { e.currentTarget.style.borderColor = `${AMBER}99`; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = answer ? `${AMBER}66` : ""; }}
            />
            <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
              <p className="text-zinc-500 text-[13px]">Have a real go first. Then check it.</p>
              <button onClick={() => setRevealed(true)}
                className="font-bold text-[17px] px-8 py-4 rounded-full min-h-[58px] text-[#0a0a0f] transition-transform hover:scale-[1.02]"
                style={{ background: AMBER, boxShadow: `0 0 36px ${AMBER}40` }}>
                Show the answer →
              </button>
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-3">
            {answer.trim() && (
              <div className="rounded-[22px] border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-zinc-500 mb-2">You wrote</p>
                <p className="text-zinc-300 text-[15px] whitespace-pre-wrap leading-relaxed">{answer}</p>
              </div>
            )}
            <div className="rounded-[22px] border border-emerald-400/25 bg-[#0a1712] p-5">
              <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-emerald-300 mb-2">Correct answer</p>
              <p className="text-white text-[16px] whitespace-pre-wrap leading-relaxed">{correctAnswer}</p>
              {markingGuide && (
                <details className="mt-3">
                  <summary className="text-emerald-300/80 text-[13px] font-medium cursor-pointer hover:text-emerald-200">How it&apos;s marked</summary>
                  <p className="text-zinc-400 text-[13.5px] whitespace-pre-wrap leading-relaxed mt-2">{markingGuide}</p>
                </details>
              )}
            </div>

            <p className={`${display.className} text-white font-bold text-[22px] tracking-[-0.02em] pt-4`}>How did you go?</p>
            <div className="grid grid-cols-3 gap-3">
              {([
                { q: 0 as const, label: "Wrong", sub: "See it again soon", c: "#ff6b7a", bg: "#1a0f12" },
                { q: 3 as const, label: "Close", sub: "Almost had it", c: AMBER, bg: "#1a160e" },
                { q: 5 as const, label: "Nailed it", sub: "See it later", c: "#3ee6a0", bg: "#0a1712" },
              ]).map((o) => (
                <button key={o.q} onClick={() => handleGrade(o.q)}
                  className="rounded-[22px] border p-4 sm:p-5 min-h-[84px] text-left transition-transform hover:scale-[1.02]"
                  style={{ background: o.bg, borderColor: `${o.c}40` }}>
                  <span className={`${display.className} block font-bold text-[17px] sm:text-[20px] tracking-[-0.02em]`} style={{ color: o.c }}>{o.label}</span>
                  <span className="block text-zinc-500 text-[12px] mt-1">{o.sub}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Done ──
  const totalDone = results.right + results.partial + results.wrong;
  const AMBER = "#fbbf24";

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-24">
      <p className="font-mono text-[11px] sm:text-[12px] uppercase tracking-[0.22em] text-emerald-300">Review · done</p>
      <h1 className={`${display.className} home-rise font-bold text-white text-[40px] sm:text-[56px] leading-none tracking-[-0.04em] mt-2`}>
        {results.right === totalDone && totalDone > 0 ? "All of them. Nailed." : results.right >= totalDone * 0.7 ? "Most of them stuck." : "That's the reps in."}
      </h1>
      <p className="text-zinc-400 text-[15px] sm:text-[17px] mt-3">
        {totalDone} {totalDone === 1 ? "question" : "questions"} you&apos;d dropped marks on, gone over again.
        {nextDueDate && <> Next batch due <span className="text-zinc-200">{nextDueDate.toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "short" })}</span>.</>}
      </p>

      <div className="grid grid-cols-3 gap-3 sm:gap-4 mt-7">
        {([
          { n: results.right, label: "Nailed it", c: "#3ee6a0", bg: "#0a1712" },
          { n: results.partial, label: "Close", c: AMBER, bg: "#1a160e" },
          { n: results.wrong, label: "Wrong", c: "#ff6b7a", bg: "#1a0f12" },
        ]).map((o) => (
          <div key={o.label} className="rounded-[24px] border p-5 sm:p-6 min-h-[130px] flex flex-col justify-between" style={{ background: o.bg, borderColor: `${o.c}33` }}>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.2em]" style={{ color: o.c }}>{o.label}</p>
            <p className={`${display.className} font-bold text-[44px] sm:text-[56px] leading-none tracking-[-0.04em] tabular-nums`} style={{ color: o.c }}>{o.n}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-7">
        <Link href="/schedule" className="bg-white text-[#0a0a0f] font-bold text-[16px] px-8 py-4 rounded-full min-h-[56px] inline-flex items-center transition-transform hover:scale-[1.02]">Back to my schedule →</Link>
        {dueItems.length > 0 && (
          <button onClick={startSession} className="font-bold text-[16px] px-8 py-4 rounded-full min-h-[56px] text-[#0a0a0f] transition-transform hover:scale-[1.02]" style={{ background: AMBER }}>
            Keep going · {dueItems.length} left
          </button>
        )}
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

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-hidden />}>
      <ReviewInner />
    </Suspense>
  );
}
