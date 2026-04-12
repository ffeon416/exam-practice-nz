"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Exam, Question } from "@/lib/types";
import { saveCustomExam, generateCustomExamId } from "@/lib/customExams";
import { useTier, isUnlimited } from "@/hooks/useTier";
import UpgradeModal from "@/components/UpgradeModal";

const YEAR_LEVELS = [
  { value: 10, label: "Year 10", ncea: 0 },
  { value: 11, label: "Year 11", ncea: 1 },
  { value: 12, label: "Year 12", ncea: 2 },
  { value: 13, label: "Year 13", ncea: 3 },
];

const SUBJECTS = [
  { value: "mathematics", label: "Mathematics", years: [10, 11, 12, 13] },
  { value: "science", label: "Science", years: [10, 11] },
  { value: "statistics", label: "Statistics", years: [11, 12, 13] },
  { value: "english", label: "English", years: [10, 11, 12, 13] },
  { value: "biology", label: "Biology", years: [11, 12, 13] },
  { value: "chemistry", label: "Chemistry", years: [12, 13] },
  { value: "physics", label: "Physics", years: [12, 13] },
  { value: "history", label: "History", years: [11, 13] },
  { value: "geography", label: "Geography", years: [11, 12, 13] },
  { value: "te-reo", label: "Te Reo Māori", years: [11, 12, 13] },
  { value: "economics", label: "Economics", years: [11, 12, 13] },
  { value: "accounting", label: "Accounting", years: [11, 12, 13] },
  { value: "health", label: "Health", years: [10, 11] },
  { value: "digital-tech", label: "Digital Technologies", years: [10] },
  { value: "social-studies", label: "Social Studies", years: [10] },
  { value: "media-studies", label: "Media Studies", years: [12, 13] },
  { value: "classical-studies", label: "Classical Studies", years: [12, 13] },
  { value: "art-history", label: "Art History", years: [12, 13] },
  { value: "business-studies", label: "Business Studies", years: [13] },
];

type ApiQuestion = {
  number: string;
  text: string;
  marks: number;
  gradeLevel: "achieved" | "merit" | "excellence";
  answerType: "text" | "number" | "multi-choice" | "working";
  options?: string[];
  expectedAnswer?: string;
  markingGuide: string;
};

type ApiPaper = {
  title: string;
  questions: ApiQuestion[];
};

const LOADING_MESSAGES = [
  "Reading your selection…",
  "Pulling together exam-style questions…",
  "Calibrating Achievement, Merit and Excellence…",
  "Adding worked solutions…",
  "Adding that NZ flavour…",
  "Polishing the marking guide…",
  "Almost there…",
];

export default function SubjectsPage() {
  const router = useRouter();
  const { tier, limits, usage, refresh } = useTier();
  const [yearLevel, setYearLevel] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [topic, setTopic] = useState<string>("");
  const maxQ = limits.maxQuestions;
  const [questionCount, setQuestionCount] = useState<number>(Math.min(10, maxQ));
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const availableSubjects = yearLevel != null
    ? SUBJECTS.filter((s) => s.years.includes(yearLevel))
    : [];

  const canStart = yearLevel !== null && subject !== null;

  function startLoadingCycle() {
    setLoadingMsgIdx(0);
    let idx = 0;
    const iv = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsgIdx(idx);
    }, 4000);
    return () => clearInterval(iv);
  }

  async function fetchPaperWithRetry(activeSubject: string, ncea: number): Promise<ApiPaper> {
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch("/api/generate-paper", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: activeSubject,
            level: ncea,
            topic: topic.trim() || undefined,
            questionCount,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as { paper: ApiPaper };
        if (!data.paper || !Array.isArray(data.paper.questions) || data.paper.questions.length === 0) {
          throw new Error("Empty paper");
        }
        return data.paper;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }
    throw lastErr ?? new Error("Failed to generate paper");
  }

  async function handleStart() {
    if (!canStart || yearLevel == null || subject == null) return;

    // Check exam limit
    if (!isUnlimited(limits.examsPerWeek) && usage.examsThisWeek >= limits.examsPerWeek) {
      setShowUpgrade(true);
      return;
    }

    setError(null);
    setLoading(true);
    const stopCycle = startLoadingCycle();

    try {
      const yearMeta = YEAR_LEVELS.find((y) => y.value === yearLevel)!;
      const paper = await fetchPaperWithRetry(subject, yearMeta.ncea);

      const id = generateCustomExamId();
      const questions: Question[] = paper.questions.map((q, i) => ({
        id: `${id}-q${i + 1}`,
        number: q.number ?? String(i + 1),
        text: q.text,
        marks: typeof q.marks === "number" ? q.marks : 2,
        gradeLevel: q.gradeLevel ?? "achieved",
        topics: topic.trim() ? [topic.trim()] : [subject],
        answerType: q.answerType ?? "working",
        options: q.options,
        expectedAnswer: q.expectedAnswer,
        markingGuide: q.markingGuide ?? "",
      }));

      const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
      const exam: Exam & { createdAt: string; topic?: string | null; isCustom: true } = {
        id,
        title: paper.title ?? `${SUBJECTS.find((s) => s.value === subject)?.label} Practice Exam`,
        level: (yearMeta.ncea as 0 | 1 | 2 | 3),
        standard: "PRACTICE",
        year: new Date().getFullYear(),
        subject: subject as Exam["subject"],
        timeMinutes: Math.max(30, questions.length * 6),
        questions,
        totalMarks,
        createdAt: new Date().toISOString(),
        topic: topic.trim() || null,
        isCustom: true,
      };

      saveCustomExam(exam);

      // Fire-and-forget: save to database for cross-device sync
      fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam }),
      }).catch(() => {});

      refresh(); // Update usage cache after generating
      stopCycle();
      router.push(`/exam/${id}?mode=practice`);
    } catch (err) {
      stopCycle();
      setError(err instanceof Error ? err.message : "Something went wrong. Try again in a moment.");
      setLoading(false);
    }
  }

  // ── Loading screen ──
  if (loading) {
    return (
      <div className="max-w-md mx-auto px-5 py-24">
        <div className="text-center">
          <div className="relative inline-flex items-center justify-center w-20 h-20 mb-8">
            <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
            <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-2xl shadow-indigo-500/30">
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
              </svg>
            </div>
          </div>
          <h1 className="text-[24px] font-bold text-white mb-3">Building your exam…</h1>
          <p className="text-zinc-400 text-[14px] mb-8 min-h-[20px]">
            {LOADING_MESSAGES[loadingMsgIdx]}
          </p>

          <div className="space-y-2 max-w-xs mx-auto">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span>Estimated time</span>
              <span className="text-zinc-300 font-medium">30–90 seconds</span>
            </div>
            <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse" style={{ width: "60%" }} />
            </div>
          </div>

          <p className="text-zinc-600 text-[11px] mt-8">
            Please don&apos;t close this page.
          </p>
        </div>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="max-w-lg mx-auto px-5 py-12">
      <h1 className="text-[28px] sm:text-[34px] font-bold text-white tracking-tight text-center mb-2">
        Practise an exam
      </h1>
      <p className="text-zinc-500 text-center text-[14px] mb-12">
        Tell us what to test you on. We&apos;ll build a fresh paper in seconds.
      </p>

      {/* Year level */}
      <div className="mb-8">
        <label className="block text-[12px] font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Year level
        </label>
        <div className="grid grid-cols-4 gap-2">
          {YEAR_LEVELS.map((yl) => (
            <button
              key={yl.value}
              onClick={() => { setYearLevel(yl.value); setSubject(null); }}
              className={`min-h-[44px] py-3 rounded-lg text-[13px] font-medium transition-all border ${
                yearLevel === yl.value
                  ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/[0.2] hover:bg-white/[0.04]"
              }`}
            >
              {yl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div className="mb-8">
        <label className="block text-[12px] font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Subject
        </label>
        {yearLevel === null ? (
          <div className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-6 text-center">
            <p className="text-[13px] text-zinc-500">Pick a year level first ↑</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {availableSubjects.map((s) => (
              <button
                key={s.value}
                onClick={() => setSubject(s.value)}
                className={`min-h-[44px] py-3 px-4 rounded-lg text-[13px] text-left transition-all border ${
                  subject === s.value
                    ? "bg-indigo-500 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                    : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/[0.2] hover:bg-white/[0.04]"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Topic (optional) */}
      <div className="mb-8">
        <label htmlFor="topic-input" className="block text-[12px] font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Specific topic? <span className="text-zinc-600 normal-case font-normal tracking-normal">(optional)</span>
        </label>
        <input
          id="topic-input"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. quadratic equations, photosynthesis, Treaty of Waitangi…"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-4 py-3 text-white text-[14px] placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] transition-colors"
        />
        <p className="text-[11px] text-zinc-600 mt-2">Leave blank for a mixed paper across the whole subject.</p>
      </div>

      {/* Question count */}
      <div className="mb-10">
        <label htmlFor="qcount-slider" className="flex items-center justify-between text-[12px] font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          <span>Length</span>
          <span className="text-indigo-400 tabular-nums normal-case tracking-normal">{questionCount} questions</span>
        </label>
        <input
          id="qcount-slider"
          type="range"
          min={4}
          max={maxQ}
          step={1}
          value={Math.min(questionCount, maxQ)}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
          <span>Short (4)</span>
          {maxQ >= 10 && <span>Standard (10)</span>}
          <span>Max ({maxQ})</span>
        </div>
        {maxQ < 20 && (
          <p className="text-[11px] text-indigo-400/70 mt-1.5">
            Upgrade to {maxQ < 12 ? "Student" : "Pro"} for up to {maxQ < 12 ? 12 : 20} questions per exam.
          </p>
        )}

        {/* Why longer is better */}
        <div className="mt-4 p-3.5 rounded-lg bg-indigo-500/[0.06] border border-indigo-500/15">
          <p className="text-[11px] font-semibold text-indigo-300 mb-1.5 uppercase tracking-wider">Tip — more questions = better results</p>
          <p className="text-[12px] text-zinc-400 leading-relaxed">
            The more questions you practise on, the more topics you cover and the better prepared you&apos;ll be for your real exam.
            <span className="text-zinc-300"> Aim for 15–20 questions when you can</span> — it&apos;s the closest to a real NCEA exam and gives you the most chances to spot weak areas before exam day.
          </p>
        </div>
      </div>

      {/* Free tier usage indicator */}
      {!isUnlimited(limits.examsPerWeek) && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[12px] text-zinc-400">
          <span className="text-zinc-300 font-medium">{usage.examsThisWeek}/{limits.examsPerWeek}</span> exams used this week
          {usage.examsThisWeek >= limits.examsPerWeek && (
            <span className="text-amber-400 ml-2">— limit reached</span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-[13px] text-red-300">
          {error}
        </div>
      )}

      {/* Upgrade modal */}
      {showUpgrade && (
        <UpgradeModal
          message={`You've used your ${limits.examsPerWeek} free exams this week. Upgrade to keep practising.`}
          onClose={() => setShowUpgrade(false)}
        />
      )}

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={!canStart}
        className={`w-full py-4 rounded-lg text-[15px] font-semibold transition-all ${
          canStart
            ? "bg-indigo-500 text-white hover:bg-indigo-400 hover:scale-[1.01] shadow-lg shadow-indigo-500/20"
            : "bg-white/[0.04] text-zinc-600 cursor-not-allowed"
        }`}
      >
        {canStart ? "Build my exam →" : "Pick a year and subject"}
      </button>

      <div className="mt-6 text-center">
        <Link href="/dashboard" className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors">
          See my past exams →
        </Link>
      </div>
    </div>
  );
}
