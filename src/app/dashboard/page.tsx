"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { loadProgress, getWeakTopics } from "@/lib/storage";
import { loadOnboarding } from "@/lib/onboarding";
import { gradeLabel, gradeColor } from "@/lib/scoring";
import { getTopicLabel } from "@/data/topics";
import { getExam } from "@/data/exams";
import {
  listCustomExams,
  deleteCustomExam,
  getCustomExam,
  isCustomExamId,
  type CustomExamMeta,
} from "@/lib/customExams";
import {
  getReviewStats,
  getReviewsVersion,
  getServerReviewsVersion,
  subscribeReviews,
} from "@/lib/spacedRepetition";
import {
  getCurrentWeek,
  getPlanVersion,
  getServerPlanVersion,
  loadPlan,
  markTaskComplete,
  subscribePlan,
  getDaysUntilExam,
  type StudyTask,
  type StudyWeek,
} from "@/lib/studyPlanner";
import type { StudentProgress } from "@/lib/types";
import { useTier, isUnlimited } from "@/hooks/useTier";
import { TIER_LABELS } from "@/lib/tierLimits";

const SUBJECT_LABELS: Record<string, string> = {
  mathematics: "Mathematics",
  english: "English",
  science: "Science",
  statistics: "Statistics",
  biology: "Biology",
  chemistry: "Chemistry",
  physics: "Physics",
  history: "History",
  geography: "Geography",
  "te-reo": "Te Reo Māori",
  economics: "Economics",
  accounting: "Accounting",
  health: "Health",
  "digital-tech": "Digital Technologies",
  "social-studies": "Social Studies",
  "media-studies": "Media Studies",
  "classical-studies": "Classical Studies",
  "art-history": "Art History",
  "business-studies": "Business Studies",
};

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getMotivation(avgPct: number, streak: number, total: number): string {
  if (total === 0) return "Let's get started!";
  if (streak >= 7) return "A whole week straight — legend.";
  if (streak >= 3) return "You're on a roll. Keep it up!";
  if (avgPct >= 80) return "You're crushing it.";
  if (avgPct >= 60) return "Solid progress. Keep pushing.";
  if (total >= 5) return "The more you practise, the easier it gets.";
  return "Great start. Every exam counts.";
}

type WelcomeFeature = { title: string; sub: string; href: string; icon: React.ReactNode };

function PaymentWelcome({
  tier,
  firstName,
  onClose,
}: {
  tier: "free" | "student" | "pro";
  firstName: string | null;
  onClose: () => void;
}) {
  const isPro = tier === "pro";
  const isFree = tier === "free";
  const accent =
    tier === "pro"
      ? "from-fuchsia-500 via-pink-500 to-amber-400"
      : tier === "student"
      ? "from-indigo-500 via-violet-500 to-sky-400"
      : "from-emerald-500 via-teal-500 to-cyan-400";
  const glow =
    tier === "pro"
      ? "shadow-pink-500/30"
      : tier === "student"
      ? "shadow-violet-500/30"
      : "shadow-emerald-500/30";

  const features: WelcomeFeature[] = isFree
    ? [
        {
          title: "Take a real exam",
          sub: "Past NZQA papers, AI marks every answer.",
          href: "/subjects",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          title: "Quick demo",
          sub: "3 questions, no commitment.",
          href: "/demo",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
        },
        {
          title: "Unlock everything",
          sub: "All 19 subjects, AI tutor, unlimited papers.",
          href: "/pricing",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          ),
        },
      ]
    : isPro
    ? [
        {
          title: "Study Ace tutor",
          sub: "Get help mid-exam, instantly.",
          href: "/subjects",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 21l1.4-4.2A8.18 8.18 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          ),
        },
        {
          title: "Fix Weak Spots",
          sub: "Drill the topics holding you back.",
          href: "/practice",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 17l6-6 4 4 8-8" />
            </svg>
          ),
        },
        {
          title: "Unlimited exams",
          sub: "Practice as much as you want, every day.",
          href: "/subjects",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          ),
        },
        {
          title: "Study planner",
          sub: "Week-by-week plan to your exam.",
          href: "/plan",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
      ]
    : [
        {
          title: "All 19 subjects",
          sub: "Every NCEA subject, Y10 to L3.",
          href: "/subjects",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          ),
        },
        {
          title: "Study planner",
          sub: "Week-by-week plan to your exam.",
          href: "/plan",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ),
        },
        {
          title: "Deep essay marking",
          sub: "4-pass English marking with real feedback.",
          href: "/subjects",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          ),
        },
        {
          title: "Spaced review",
          sub: "Wrong answers come back so they stick.",
          href: "/review",
          icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          ),
        },
      ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-8 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className={`relative w-full max-w-md rounded-3xl bg-[#0a0a12] border border-white/10 shadow-2xl ${glow} my-auto`}>
        <div className={`absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br ${accent} opacity-20 blur-2xl`} />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-white p-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="px-6 pt-10 pb-6 text-center">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br ${accent} shadow-lg mb-5`}>
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className={`text-xs font-bold uppercase tracking-[0.18em] bg-gradient-to-r ${accent} bg-clip-text text-transparent mb-2`}>
            {isFree ? "Hey there" : "You're in"}
          </p>
          <h2 className="text-[28px] sm:text-[32px] font-extrabold text-white tracking-tight leading-tight">
            {isFree
              ? <>Welcome to Study Ace{firstName ? `, ${firstName}` : ""}</>
              : <>Welcome to {TIER_LABELS[tier]}{firstName ? `, ${firstName}` : ""}</>}
          </h2>
          <p className="text-zinc-400 text-[14px] mt-2">
            {isFree
              ? "Here's how to get started. Tap anything to jump in."
              : "Here's everything you just unlocked. Tap anything to jump in."}
          </p>
        </div>

        <div className="px-6 pb-6 grid gap-2.5">
          {features.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className="group flex items-center gap-3.5 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.05] px-4 py-3.5 transition-all"
            >
              <div className={`shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${accent} bg-opacity-20 flex items-center justify-center text-white shadow-md`}>
                {f.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-[14px]">{f.title}</p>
                <p className="text-zinc-500 text-[12px] leading-snug">{f.sub}</p>
              </div>
              <svg className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>

        <div className="px-6 pb-8">
          <button
            onClick={onClose}
            className={`w-full rounded-xl bg-gradient-to-r ${accent} text-white font-bold text-[15px] py-3.5 shadow-lg hover:opacity-95 transition-opacity`}
          >
            Let&apos;s go
          </button>
          <p className="text-center text-zinc-600 text-[11px] mt-3">
            {isFree ? "Upgrade any time for more." : "30-day money back if you change your mind."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [customExams, setCustomExams] = useState<CustomExamMeta[]>([]);
  const [onboarding, setOnboarding] = useState<ReturnType<typeof loadOnboarding>>(null);
  const [showPaymentSuccess, setShowPaymentSuccess] = useState(false);
  const [previewTier, setPreviewTier] = useState<"free" | "student" | "pro" | null>(null);
  const { tier, limits, usage, loading: tierLoading, refresh: refreshTier } = useTier();
  const tierRef = useRef(tier);
  tierRef.current = tier;
  const [mounted, setMounted] = useState(false);

  const reviewsVersion = useSyncExternalStore(subscribeReviews, getReviewsVersion, getServerReviewsVersion);
  const reviewStats = (() => {
    void reviewsVersion;
    if (!mounted) return { total: 0, due: 0, mastered: 0, learning: 0, new: 0 };
    return getReviewStats();
  })();

  const planVersion = useSyncExternalStore(subscribePlan, getPlanVersion, getServerPlanVersion);
  const plan = (() => {
    void planVersion;
    if (!mounted) return null;
    return loadPlan();
  })();
  const currentWeek: StudyWeek | null = (() => {
    if (!mounted) return null;
    return getCurrentWeek();
  })();
  const daysLeft = plan ? getDaysUntilExam(plan) : null;

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const preview = params.get("preview-welcome");
    if (preview === "free" || preview === "student" || preview === "pro") {
      setPreviewTier(preview);
      window.history.replaceState({}, "", "/dashboard");
      return;
    }
    if (params.get("payment") === "success") {
      setShowPaymentSuccess(true);
      window.history.replaceState({}, "", "/dashboard");

      // Stripe redirect can beat the webhook. Poll until tier flips to a paid plan.
      let cancelled = false;
      const poll = async () => {
        for (let i = 0; i < 10 && !cancelled; i++) {
          refreshTier();
          await new Promise((r) => setTimeout(r, 1500));
          if (tierRef.current !== "free") return;
        }
      };
      poll();

      return () => {
        cancelled = true;
      };
    }
  }, [refreshTier]);

  // Auto-show welcome once per tier — covers fresh signups (free) and
  // anyone who upgraded but missed the post-checkout redirect. The flag
  // is set in the close handler, not here, so a redirect to /welcome
  // mid-render doesn't burn the user's one shot at seeing it.
  useEffect(() => {
    // Don't wait for /api/user — show on mount with default tier ("free");
    // re-renders to the correct accent if the user turns out to be paid.
    const key = `studyace-welcome-seen-v3-${tier}`;
    if (localStorage.getItem(key)) return;
    setShowPaymentSuccess(true);
  }, [tier]);

  function dismissWelcome() {
    const key = `studyace-welcome-seen-v3-${tier}`;
    localStorage.setItem(key, new Date().toISOString());
    setShowPaymentSuccess(false);
  }

  useEffect(() => {
    setMounted(true);
    const existingProgress = loadProgress();
    const existingOnboarding = loadOnboarding();
    setProgress(existingProgress);
    setCustomExams(listCustomExams());
    setOnboarding(existingOnboarding);

    // First-time user with no data and no onboarding: send them to /welcome
    if (!existingOnboarding && existingProgress.totalExamsTaken === 0) {
      router.replace("/welcome");
      return;
    }

    fetch("/api/progress")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || (!data.examAttempts?.length && !Object.keys(data.topicScores || {}).length)) return;
        const local = loadProgress();
        const dbAttempts = data.examAttempts ?? [];
        if (dbAttempts.length > local.examAttempts.length) {
          setProgress({
            examAttempts: dbAttempts,
            topicScores: { ...local.topicScores, ...data.topicScores },
            totalExamsTaken: dbAttempts.length,
            streakDays: Math.max(local.streakDays, data.streakDays ?? 0),
            lastActiveDate: local.lastActiveDate,
          });
        }
      })
      .catch(() => {});
  }, []);

  function handleDeleteCustom(id: string) {
    if (!confirm("Delete this paper?")) return;
    deleteCustomExam(id);
    setCustomExams(listCustomExams());
  }

  const firstName = user?.firstName?.trim() || null;

  if (!progress) return (
    <div className="max-w-xl mx-auto px-5 pt-16 pb-20 bg-[#06060a] min-h-screen">
      {showPaymentSuccess && (
        <PaymentWelcome tier={tier} firstName={firstName} onClose={dismissWelcome} />
      )}
      {previewTier && (
        <PaymentWelcome tier={previewTier} firstName={firstName} onClose={() => setPreviewTier(null)} />
      )}
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-white/[0.04] rounded-lg w-48" />
        <div className="h-4 bg-white/[0.04] rounded-lg w-64" />
        <div className="h-32 bg-white/[0.04] rounded-2xl w-full mt-8" />
        <div className="h-20 bg-white/[0.04] rounded-2xl w-full" />
      </div>
    </div>
  );

  const hasData = progress.totalExamsTaken > 0;
  const weakTopics = getWeakTopics(progress, 3);

  // Check if streak should be reset (student missed a day)
  const displayStreak = (() => {
    if (!progress.lastActiveDate || progress.streakDays === 0) return 0;
    const last = new Date(progress.lastActiveDate);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
    // 0 = today, 1 = yesterday (streak still alive), >1 = broken
    if (diff > 1) return 0;
    return progress.streakDays;
  })();

  const avgPct =
    progress.examAttempts.length > 0
      ? Math.round(
          (progress.examAttempts.reduce(
            (s, a) => s + (a.maxMarks > 0 ? a.totalMarks / a.maxMarks : 0),
            0
          ) / progress.examAttempts.length) * 100
        )
      : 0;

  const recentAttempts = [...progress.examAttempts].reverse().slice(0, 5);
  const lastGrade = recentAttempts[0]?.overallGrade;

  return (
    <div className="relative overflow-hidden bg-[#06060a]">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.07] blur-[120px] rounded-full" />
        <div className="absolute top-[200px] right-0 w-[500px] h-[400px] bg-purple-500/[0.05] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-xl mx-auto px-5 pt-6 sm:pt-14 pb-16 sm:pb-20">
        {/* Welcome modal — paid users get a celebration, free users get an intro */}
        {showPaymentSuccess && (
          <PaymentWelcome tier={tier} firstName={firstName} onClose={dismissWelcome} />
        )}
        {previewTier && (
          <PaymentWelcome tier={previewTier} firstName={firstName} onClose={() => setPreviewTier(null)} />
        )}

        {/* Greeting */}
        <div className="mb-8">
          <h1 className="text-[24px] sm:text-[32px] font-extrabold text-white tracking-tight mb-1">
            {firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
          </h1>
          <p className="text-zinc-500 text-[14px]">
            {getMotivation(avgPct, displayStreak, progress.totalExamsTaken)}
          </p>
        </div>

        {/* Hero action — what to do right now */}
        {!hasData ? (
          // First time — rich empty state
          <FirstTimeDashboard
            onboarding={onboarding}
            tier={tier}
            tierLoading={tierLoading}
            examsUsed={usage.examsThisWeek}
            examsLimit={limits.examsPerWeek}
          />
        ) : reviewStats.due > 0 ? (
          // Reviews due
          <Link
            href="/review"
            className="group flex items-center gap-5 rounded-2xl bg-gradient-to-r from-amber-500/[0.12] to-orange-500/[0.06] border border-amber-500/25 p-6 mb-6 hover:border-amber-500/40 transition-all shadow-lg shadow-amber-500/[0.05]"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shrink-0 shadow-lg shadow-amber-500/20">
              <span className="text-white text-[20px] font-extrabold">{reviewStats.due}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-[16px]">Review time</p>
              <p className="text-zinc-400 text-[13px]">
                {reviewStats.due === 1 ? "1 question" : `${reviewStats.due} questions`} ready to review — keep it fresh.
              </p>
            </div>
            <svg className="w-5 h-5 text-zinc-500 shrink-0 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ) : (
          // Default: do another exam
          <Link
            href="/subjects"
            className="group flex items-center gap-5 rounded-2xl bg-gradient-to-r from-indigo-500/[0.15] to-purple-500/[0.08] border border-indigo-500/25 p-6 mb-6 hover:border-indigo-500/40 transition-all shadow-lg shadow-indigo-500/[0.05]"
          >
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-[16px]">Practise another exam</p>
              <p className="text-zinc-400 text-[13px]">
                {weakTopics.length > 0
                  ? `Try focusing on ${getTopicLabel(weakTopics[0].topic)} — it's your weakest area.`
                  : "Keep building your skills across all topics."}
              </p>
            </div>
            <svg className="w-5 h-5 text-zinc-500 shrink-0 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}

        {/* Stats strip */}
        {hasData && (
          <div className="grid grid-cols-3 gap-2 mb-6">
            <div className="text-center rounded-2xl bg-gradient-to-br from-indigo-500/[0.15] to-indigo-600/[0.05] border border-indigo-500/20 px-2 py-4">
              <div className="text-[28px] sm:text-[22px] font-extrabold text-white">{progress.totalExamsTaken}</div>
              <div className="text-indigo-300/60 text-[10px] uppercase tracking-wider mt-0.5">Exams</div>
            </div>
            <div className="text-center rounded-2xl bg-gradient-to-br from-emerald-500/[0.12] to-yellow-500/[0.05] border border-emerald-500/15 px-2 py-4">
              <div className={`text-[28px] sm:text-[22px] font-extrabold ${avgPct >= 70 ? "text-emerald-400" : avgPct >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                {avgPct}%
              </div>
              <div className="text-zinc-500 text-[10px] uppercase tracking-wider mt-0.5">Average</div>
            </div>
            <div className="text-center rounded-2xl bg-gradient-to-br from-orange-500/[0.12] to-amber-500/[0.05] border border-orange-500/15 px-2 py-4">
              <div className={`text-[28px] sm:text-[22px] font-extrabold ${displayStreak >= 3 ? "text-orange-400" : displayStreak >= 1 ? "text-white" : "text-zinc-600"}`}>
                {displayStreak > 0 ? `${displayStreak}d` : "\u2014"}
              </div>
              <div className="text-orange-300/50 text-[10px] uppercase tracking-wider mt-0.5">
                {displayStreak >= 3 ? "Streak!" : "Streak"}
              </div>
            </div>
          </div>
        )}
        {hasData && lastGrade && (
          <div className="flex items-center justify-center gap-2 mb-6 -mt-3">
            <span className="text-zinc-600 text-[11px]">Last grade:</span>
            <span className={`text-[13px] font-bold ${gradeColor(lastGrade)}`}>
              {gradeLabel(lastGrade)}
            </span>
          </div>
        )}

        {/* Exam countdown */}
        {plan && daysLeft !== null && daysLeft > 0 && (
          <Link
            href="/plan"
            className="flex items-center gap-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] px-5 py-4 mb-6 hover:bg-white/[0.04] transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
              <span className="text-indigo-300 text-[14px] font-bold">{daysLeft}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-[14px] font-medium">
                {daysLeft} {daysLeft === 1 ? "day" : "days"} until your exam
              </p>
              <p className="text-zinc-600 text-[12px]">
                {currentWeek ? `This week: ${currentWeek.focus}` : "View your study plan"}
              </p>
            </div>
            <svg className="w-4 h-4 text-zinc-600 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}

        {/* This week's tasks */}
        {currentWeek && currentWeek.tasks.some((t) => !t.completed) && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-6">
            <h2 className="text-white font-extrabold text-[14px] mb-3">This week&apos;s tasks</h2>
            <div className="space-y-2">
              {currentWeek.tasks.filter((t) => !t.completed).map((task) => (
                <TaskRow key={task.id} task={task} />
              ))}
            </div>
          </div>
        )}

        {/* Weak spots */}
        {weakTopics.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-white font-extrabold text-[14px]">Focus on these</h2>
              <Link href="/practice" className="text-indigo-400 text-[12px] font-medium hover:text-indigo-300 transition-colors">
                Practise &rarr;
              </Link>
            </div>
            <div className="space-y-2">
              {weakTopics.map((t) => {
                const pct = Math.round(t.correctRate * 100);
                return (
                  <div key={t.topic} className={`flex items-center gap-3 pl-3 border-l-2 ${pct >= 40 ? "border-yellow-500" : "border-red-500"}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="text-zinc-300 truncate">{getTopicLabel(t.topic)}</span>
                        <span className={`font-bold ${pct >= 40 ? "text-yellow-400" : "text-red-400"}`}>{pct}%</span>
                      </div>
                      <div className="w-full bg-white/[0.06] rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-700 ${pct >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent exams */}
        {recentAttempts.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-6">
            <h2 className="text-white font-extrabold text-[14px] mb-3">Recent</h2>
            <div className="space-y-2">
              {recentAttempts.map((attempt, i) => {
                const pct = attempt.maxMarks > 0 ? Math.round((attempt.totalMarks / attempt.maxMarks) * 100) : 0;
                // Look up the real title
                let title: string;
                if (isCustomExamId(attempt.examId)) {
                  const custom = getCustomExam(attempt.examId);
                  title = custom?.title ?? "Practice exam";
                } else {
                  const catalog = getExam(attempt.examId);
                  title = catalog?.title ?? attempt.examId;
                }
                return (
                  <Link
                    key={i}
                    href={`/exam/${attempt.examId}/results`}
                    className={`flex items-center justify-between py-2 hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors border-l-2 pl-3 ${
                      attempt.overallGrade === "excellence" ? "border-yellow-500" :
                      attempt.overallGrade === "merit" ? "border-blue-500" :
                      attempt.overallGrade === "achieved" ? "border-green-500" :
                      "border-red-500"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] text-zinc-300 truncate">{title}</p>
                      <p className="text-[11px] text-zinc-600">
                        {new Date(attempt.date).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[12px] text-zinc-500 tabular-nums">{pct}%</span>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${
                        attempt.overallGrade === "excellence" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" :
                        attempt.overallGrade === "merit" ? "text-blue-400 bg-blue-500/10 border-blue-500/30" :
                        attempt.overallGrade === "achieved" ? "text-green-400 bg-green-500/10 border-green-500/30" :
                        "text-red-400 bg-red-500/10 border-red-500/30"
                      }`}>
                        {gradeLabel(attempt.overallGrade)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Saved papers */}
        {customExams.length > 0 && (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-6">
            <h2 className="text-white font-extrabold text-[14px] mb-3">Your papers</h2>
            <div className="space-y-2">
              {customExams.slice(0, 4).map((ex) => (
                <div key={ex.id} className="flex items-center justify-between py-1.5">
                  <p className="text-[13px] text-zinc-300 truncate flex-1 min-w-0 mr-3">{ex.title}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      href={`/exam/${ex.id}?mode=practice`}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1] transition-colors"
                    >
                      Start
                    </Link>
                    <button
                      onClick={() => handleDeleteCustom(ex.id)}
                      className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Plan CTA */}
        {!plan && hasData && (
          <Link
            href="/plan"
            className="group flex items-center gap-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-6 hover:bg-white/[0.04] transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-white text-[14px] font-medium">Set up your exam countdown</p>
              <p className="text-zinc-500 text-[12px]">We&apos;ll plan your revision week by week.</p>
            </div>
            <svg className="w-4 h-4 text-zinc-600 shrink-0 group-hover:text-indigo-400 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        )}

        {/* Tier badge — minimal */}
        {!tierLoading && tier === "free" && hasData && (
          <Link
            href="/pricing"
            className="flex items-center justify-center gap-2 text-zinc-600 text-[12px] hover:text-zinc-400 transition-colors py-3"
          >
            Free plan — upgrade for more features
          </Link>
        )}
      </div>
    </div>
  );
}

/* ━━━ Task row ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TaskRow({ task }: { task: StudyTask }) {
  const href = task.examId
    ? `/exam/${task.examId}?mode=practice`
    : task.type === "review"
    ? "/review"
    : task.subject
    ? `/subjects?subject=${task.subject}`
    : "/subjects";

  return (
    <div className="flex items-center gap-3 py-0.5">
      <button
        type="button"
        onClick={() => {
          markTaskComplete(task.id);
          const updatedPlan = loadPlan();
          if (updatedPlan) {
            fetch("/api/plan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plan: updatedPlan }),
            }).catch(() => {});
          }
        }}
        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
          task.completed ? "bg-indigo-500 border-indigo-500" : "border-zinc-700 hover:border-indigo-400"
        }`}
      >
        {task.completed && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <Link
        href={href}
        className={`text-[13px] flex-1 min-w-0 truncate transition-colors ${
          task.completed ? "line-through text-zinc-600" : "text-zinc-300 hover:text-indigo-300"
        }`}
      >
        {task.description}
      </Link>
    </div>
  );
}

/* ━━━ First-time dashboard (empty state) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function FirstTimeDashboard({
  onboarding,
  tier,
  tierLoading,
  examsUsed,
  examsLimit,
}: {
  onboarding: ReturnType<typeof loadOnboarding>;
  tier: "free" | "student" | "pro";
  tierLoading: boolean;
  examsUsed: number;
  examsLimit: number;
}) {
  const pickedSubjects = onboarding?.subjects ?? [];
  const yearLevel = onboarding?.yearLevel ?? null;

  return (
    <div className="space-y-6 mb-6">
      {/* Primary CTA: start first exam (deep-linked if onboarded) */}
      <Link
        href={
          pickedSubjects.length > 0 && yearLevel != null
            ? `/subjects?subject=${pickedSubjects[0]}&year=${yearLevel}`
            : "/subjects"
        }
        className="group flex items-center gap-5 rounded-2xl bg-gradient-to-r from-indigo-500/[0.15] to-purple-500/[0.08] border border-indigo-500/25 p-6 hover:border-indigo-500/40 transition-all shadow-lg shadow-indigo-500/[0.05]"
      >
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/20">
          <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-[16px]">Take your first exam</p>
          <p className="text-zinc-400 text-[13px]">
            {pickedSubjects.length > 0
              ? `We'll build a ${SUBJECT_LABELS[pickedSubjects[0]] ?? "practice"} paper just for you.`
              : "Pick a subject and we'll generate a practice paper for you."}
          </p>
        </div>
        <svg className="w-5 h-5 text-zinc-500 shrink-0 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition-all" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </Link>

      {/* How it works — 3-step reassurance strip */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <h2 className="text-white font-extrabold text-[14px] mb-4">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <HowStep
            n={1}
            title="Pick a subject"
            body="Choose your year level and what to practise."
          />
          <HowStep
            n={2}
            title="Get a real-style paper"
            body="AI builds a fresh NZQA-style paper in seconds."
          />
          <HowStep
            n={3}
            title="Learn from feedback"
            body="Your answers get marked, weak spots get surfaced."
          />
        </div>
      </div>

      {/* Your subjects (quick launch) */}
      {pickedSubjects.length > 0 && yearLevel != null && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-extrabold text-[14px]">Your subjects</h2>
            <span className="text-[11px] text-zinc-500">Year {yearLevel}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {pickedSubjects.map((s) => (
              <Link
                key={s}
                href={`/subjects?subject=${s}&year=${yearLevel}`}
                className="flex items-center justify-between px-3.5 py-3 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-indigo-500/30 transition-all group"
              >
                <span className="text-[13px] text-zinc-200 font-medium truncate">
                  {SUBJECT_LABELS[s] ?? s}
                </span>
                <svg
                  className="w-3.5 h-3.5 text-zinc-600 group-hover:text-indigo-400 shrink-0 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Tier / usage card */}
      {!tierLoading && (
        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-white font-bold text-[14px]">{TIER_LABELS[tier]} plan</span>
                {tier === "free" && (
                  <span className="text-[10px] uppercase tracking-wider text-indigo-300 bg-indigo-500/15 border border-indigo-500/25 px-2 py-0.5 rounded-full">
                    Free
                  </span>
                )}
              </div>
              <p className="text-zinc-500 text-[12px]">
                {tier === "free"
                  ? "Upgrade for unlimited exams and more."
                  : "Thanks for supporting StudyAce."}
              </p>
            </div>
            {tier === "free" && (
              <Link
                href="/pricing"
                className="shrink-0 text-[12px] font-semibold text-indigo-300 hover:text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/25 px-3 py-1.5 rounded-lg transition-colors"
              >
                Upgrade
              </Link>
            )}
          </div>
          {!isUnlimited(examsLimit) && (
            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1.5">
                <span>Exams this week</span>
                <span className="text-zinc-300 tabular-nums font-medium">
                  {examsUsed} / {examsLimit}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (examsUsed / examsLimit) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* What's next checklist */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <h2 className="text-white font-extrabold text-[14px] mb-3">What&apos;s next</h2>
        <ul className="space-y-2.5">
          <ChecklistItem
            done={onboarding !== null}
            label="Tell us your year and subjects"
          />
          <ChecklistItem done={false} label="Take your first practice exam" />
          <ChecklistItem done={false} label="Review your marked answers" />
          <ChecklistItem
            done={false}
            label="Set up a study plan for your exam date"
          />
        </ul>
      </div>
    </div>
  );
}

function HowStep({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex sm:flex-col gap-3 sm:gap-2">
      <div className="w-7 h-7 rounded-lg bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center shrink-0">
        <span className="text-indigo-300 text-[12px] font-bold">{n}</span>
      </div>
      <div className="min-w-0">
        <p className="text-white font-semibold text-[13px] mb-0.5">{title}</p>
        <p className="text-zinc-500 text-[12px] leading-snug">{body}</p>
      </div>
    </div>
  );
}

function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <div
        className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
          done
            ? "bg-indigo-500 border-indigo-500"
            : "border-zinc-700"
        }`}
      >
        {done && (
          <svg
            className="w-3 h-3 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span
        className={`text-[13px] ${
          done ? "line-through text-zinc-600" : "text-zinc-300"
        }`}
      >
        {label}
      </span>
    </li>
  );
}
