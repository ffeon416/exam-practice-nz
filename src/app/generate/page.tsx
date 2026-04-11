"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Exam, Question } from "@/lib/types";
import { saveCustomExam, generateCustomExamId } from "@/lib/customExams";

type SubjectOption = { value: string; label: string; years: number[] };

const SUBJECTS: SubjectOption[] = [
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

type YearOption = { value: number; label: string; ncea: number };

const YEAR_LEVELS: YearOption[] = [
  { value: 10, label: "Year 10", ncea: 0 },
  { value: 11, label: "Year 11 (NCEA L1)", ncea: 1 },
  { value: 12, label: "Year 12 (NCEA L2)", ncea: 2 },
  { value: 13, label: "Year 13 (NCEA L3)", ncea: 3 },
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
  "Summoning NZQA examiners...",
  "Crafting exam questions...",
  "Writing marking schedules...",
  "Adding that kiwi flavour...",
  "Calibrating Achievement / Merit / Excellence...",
  "Almost there...",
];

export default function GeneratePage() {
  const router = useRouter();
  const [yearLevel, setYearLevel] = useState<number>(11);
  const [subject, setSubject] = useState<string>("mathematics");
  const [topic, setTopic] = useState<string>("");
  const [questionCount, setQuestionCount] = useState<number>(8);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const availableSubjects = SUBJECTS.filter((s) => s.years.includes(yearLevel));
  const yearMeta = YEAR_LEVELS.find((y) => y.value === yearLevel)!;

  // Cycle loading messages while generating
  function startLoadingCycle() {
    setLoadingMsgIdx(0);
    let idx = 0;
    const iv = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsgIdx(idx);
    }, 3500);
    return () => clearInterval(iv);
  }

  async function handleGenerate() {
    setError(null);
    setLoading(true);
    const stopCycle = startLoadingCycle();

    try {
      // If a subject that's only available at certain levels is stale, pick first available
      const activeSubject = availableSubjects.find((s) => s.value === subject)
        ? subject
        : availableSubjects[0]?.value ?? "mathematics";

      const res = await fetch("/api/generate-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeSubject,
          level: yearMeta.ncea,
          topic: topic.trim() || undefined,
          questionCount,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const data = (await res.json()) as { paper: ApiPaper };
      const paper = data.paper;
      if (!paper || !Array.isArray(paper.questions) || paper.questions.length === 0) {
        throw new Error("The generator returned an empty paper. Please try again.");
      }

      const id = generateCustomExamId();

      // Normalize API questions into full Question shape (add id, topics)
      const questions: Question[] = paper.questions.map((q, i) => ({
        id: `${id}-q${i + 1}`,
        number: q.number ?? String(i + 1),
        text: q.text,
        marks: typeof q.marks === "number" ? q.marks : 2,
        gradeLevel: q.gradeLevel ?? "achieved",
        topics: topic.trim() ? [topic.trim()] : [activeSubject],
        answerType: q.answerType ?? "working",
        options: q.options,
        expectedAnswer: q.expectedAnswer,
        markingGuide: q.markingGuide ?? "",
      }));

      const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

      const exam: Exam & { createdAt: string; topic?: string | null; isCustom: true } = {
        id,
        title: paper.title ?? `Custom ${activeSubject} Paper`,
        level: (yearMeta.ncea as 0 | 1 | 2 | 3),
        standard: "CUSTOM",
        year: new Date().getFullYear(),
        subject: activeSubject as Exam["subject"],
        timeMinutes: Math.max(30, questions.length * 6),
        questions,
        totalMarks,
        createdAt: new Date().toISOString(),
        topic: topic.trim() || null,
        isCustom: true,
      };

      saveCustomExam(exam);
      stopCycle();
      router.push(`/exam/${id}?mode=practice`);
    } catch (err) {
      stopCycle();
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-5 py-20">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/30 mb-6">
            <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">
            Generating your paper...
          </h1>
          <p className="text-zinc-400 text-sm mb-1 min-h-[20px]">
            {LOADING_MESSAGES[loadingMsgIdx]}
          </p>
          <p className="text-zinc-600 text-xs mt-4">
            This can take 10&ndash;30 seconds. Please don&rsquo;t close the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-5 py-12">
      <Link
        href="/subjects"
        className="text-[12px] text-zinc-500 hover:text-white transition-colors mb-6 inline-flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Subjects
      </Link>

      <h1 className="text-3xl font-bold text-white mb-2">Generate Practice Paper</h1>
      <p className="text-zinc-400 text-sm mb-10">
        AI will build a fresh NCEA-style paper tailored to exactly what you want to practise.
      </p>

      {/* Year level */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-zinc-300 mb-2">Year level</label>
        <div className="grid grid-cols-2 gap-2">
          {YEAR_LEVELS.map((yl) => (
            <button
              key={yl.value}
              onClick={() => {
                setYearLevel(yl.value);
                // Reset subject if it's no longer available
                if (!SUBJECTS.find((s) => s.value === subject)?.years.includes(yl.value)) {
                  const first = SUBJECTS.find((s) => s.years.includes(yl.value));
                  if (first) setSubject(first.value);
                }
              }}
              className={`py-3 rounded-lg text-sm font-medium transition-colors border ${
                yearLevel === yl.value
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
              }`}
            >
              {yl.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div className="mb-8">
        <label htmlFor="subject-select" className="block text-sm font-medium text-zinc-300 mb-2">
          Subject
        </label>
        <select
          id="subject-select"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
        >
          {availableSubjects.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Topic (optional) */}
      <div className="mb-8">
        <label htmlFor="topic-input" className="block text-sm font-medium text-zinc-300 mb-2">
          What topic do you want to focus on? <span className="text-zinc-500 font-normal">(optional)</span>
        </label>
        <input
          id="topic-input"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. quadratic equations, photosynthesis, market failure..."
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
        />
        <p className="text-[11px] text-zinc-500 mt-1.5">Leave blank for a mixed paper across the whole subject.</p>
      </div>

      {/* Question count */}
      <div className="mb-10">
        <label htmlFor="qcount-slider" className="flex items-center justify-between text-sm font-medium text-zinc-300 mb-2">
          <span>Number of questions</span>
          <span className="text-indigo-400 tabular-nums">{questionCount}</span>
        </label>
        <input
          id="qcount-slider"
          type="range"
          min={4}
          max={12}
          step={1}
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          className="w-full accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
          <span>4</span>
          <span>8</span>
          <span>12</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        className="w-full py-3.5 rounded-lg text-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
      >
        Generate Paper
      </button>

      <p className="text-center text-[11px] text-zinc-600 mt-4">
        Generated papers are saved locally to your browser.
      </p>
    </div>
  );
}
