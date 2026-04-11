"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ALL_EXAMS } from "@/data/exams";
import { STANDARDS } from "@/data/topics";
import { loadProgress, getBestGrade } from "@/lib/storage";
import { gradeLabel, gradeColor } from "@/lib/scoring";
import type { StudentProgress, Grade } from "@/lib/types";

const YEAR_LEVELS = [
  { value: 10, label: "Year 10", ncea: 0 },
  { value: 11, label: "Year 11", ncea: 1 },
  { value: 12, label: "Year 12", ncea: 2 },
  { value: 13, label: "Year 13", ncea: 3 },
];

const SUBJECTS = [
  { value: "mathematics", label: "Mathematics", available: true, years: [10, 11, 12, 13] },
  { value: "science", label: "Science", available: true, years: [10, 11] },
  { value: "statistics", label: "Statistics", available: true, years: [11, 12, 13] },
  { value: "english", label: "English", available: true, years: [10, 11, 12, 13] },
  { value: "biology", label: "Biology", available: true, years: [11, 12, 13] },
  { value: "chemistry", label: "Chemistry", available: true, years: [12, 13] },
  { value: "physics", label: "Physics", available: true, years: [12, 13] },
  { value: "history", label: "History", available: true, years: [11, 13] },
  { value: "geography", label: "Geography", available: true, years: [11, 12, 13] },
  { value: "te-reo", label: "Te Reo Māori", available: true, years: [11, 12, 13] },
  { value: "economics", label: "Economics", available: true, years: [11, 12, 13] },
  { value: "accounting", label: "Accounting", available: true, years: [11, 12, 13] },
  { value: "health", label: "Health", available: true, years: [10, 11] },
  { value: "digital-tech", label: "Digital Technologies", available: true, years: [10] },
  { value: "social-studies", label: "Social Studies", available: true, years: [10] },
  { value: "media-studies", label: "Media Studies", available: true, years: [12, 13] },
  { value: "classical-studies", label: "Classical Studies", available: true, years: [12, 13] },
  { value: "art-history", label: "Art History", available: true, years: [12, 13] },
  { value: "business-studies", label: "Business Studies", available: true, years: [13] },
];

export default function SubjectsPage() {
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [school, setSchool] = useState("");
  const [yearLevel, setYearLevel] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [step, setStep] = useState<"setup" | "exams">("setup");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(loadProgress());
  }, []);

  // Setup form — school, year, subject on one page
  if (step === "setup") {
    const canContinue = school.trim().length > 0 && yearLevel !== null && subject !== null;

    return (
      <div className="max-w-lg mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          Find Your Exams
        </h1>
        <p className="text-slate-400 text-center mb-6">
          Tell us about yourself and we&apos;ll get you practicing.
        </p>

        {/* Generate custom paper CTA */}
        <Link
          href="/generate"
          className="group block mb-10 rounded-xl border border-indigo-500/40 bg-gradient-to-br from-indigo-600/20 to-indigo-500/5 px-5 py-4 hover:from-indigo-600/30 hover:to-indigo-500/10 hover:border-indigo-400/60 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="shrink-0 w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white text-lg font-bold group-hover:scale-105 transition-transform">
              +
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-semibold text-white">Generate a Custom Paper</p>
              <p className="text-[12px] text-indigo-200/70">AI-built, matched to exactly what you want to practise</p>
            </div>
            <svg className="w-4 h-4 text-indigo-300 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </Link>

        {/* School */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Your school
          </label>
          <input
            type="text"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="e.g. Mount Maunganui College"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Year level */}
        <div className="mb-8">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Year level
          </label>
          <div className="grid grid-cols-5 gap-2">
            {YEAR_LEVELS.map((yl) => (
              <button
                key={yl.value}
                onClick={() => { setYearLevel(yl.value); setSubject(null); }}
                className={`py-3 rounded-lg text-sm font-medium transition-colors border ${
                  yearLevel === yl.value
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                }`}
              >
                {yl.label}
              </button>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="mb-10">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Subject
          </label>
          {yearLevel === null ? (
            <div className="rounded-lg border border-blue-400/60 bg-slate-900/50 px-4 py-4 text-center shadow-[0_0_12px_rgba(59,130,246,0.3)]">
              <p className="text-sm text-slate-400">Select a year level to see subjects</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {SUBJECTS.filter((s) => s.available && s.years.includes(yearLevel)).map((s) => (
                <button
                  key={s.value}
                  onClick={() => setSubject(s.value)}
                  className={`py-3 px-4 rounded-lg text-sm text-left transition-colors border ${
                    subject === s.value
                      ? "bg-blue-600 border-blue-600 text-white"
                      : "bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Continue */}
        <button
          onClick={() => canContinue && setStep("exams")}
          disabled={!canContinue}
          className={`w-full py-3.5 rounded-lg text-lg font-semibold transition-colors ${
            canContinue
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-slate-800 text-slate-500 cursor-not-allowed"
          }`}
        >
          Show Me Past Papers
        </button>
      </div>
    );
  }

  // Exams list
  const ncealLevel = YEAR_LEVELS.find((y) => y.value === yearLevel)?.ncea;

  const exams = ncealLevel != null
    ? [...ALL_EXAMS]
        .filter((e) => e.level === ncealLevel && e.subject === subject)
        .sort((a, b) => a.year - b.year)
    : [];

  const getAttemptCount = (examId: string) =>
    progress?.examAttempts.filter((a) => a.examId === examId).length ?? 0;

  const nextExamId =
    exams.find((e) => getAttemptCount(e.id) === 0)?.id ?? exams[0]?.id;

  const selectedYearLabel =
    YEAR_LEVELS.find((y) => y.value === yearLevel)?.label ?? "";
  const selectedSubjectLabel =
    SUBJECTS.find((s) => s.value === subject)?.label ?? "";

  // Group exams by standard
  const standardGroups: Record<string, typeof exams> = {};
  for (const exam of exams) {
    if (!standardGroups[exam.standard]) standardGroups[exam.standard] = [];
    standardGroups[exam.standard].push(exam);
  }

  // Short labels for section headers
  const SHORT_LABELS: Record<string, { name: string; color: string; icon: string }> = {
    "32406": { name: "CAA Numeracy", color: "slate", icon: "+" },
    "91577": { name: "Complex Numbers", color: "slate", icon: "i" },
    "91578": { name: "Differentiation", color: "slate", icon: "dy" },
    "91579": { name: "Integration", color: "slate", icon: "\u222B" },
    "91947": { name: "Reasoning", color: "slate", icon: "f(x)" },
    "91946": { name: "Statistics", color: "slate", icon: "%" },
    "91261": { name: "Algebra", color: "slate", icon: "x\u00B2" },
    "91262": { name: "Calculus", color: "slate", icon: "\u222B" },
    "91922": { name: "Science Ideas", color: "slate", icon: "S" },
    "91923": { name: "Science Claims", color: "slate", icon: "?" },
    "91930": { name: "Soils", color: "slate", icon: "Ag" },
    "91931": { name: "Sustainability", color: "slate", icon: "Ag" },
    "92022": { name: "Genetics", color: "slate", icon: "DNA" },
    "92023": { name: "Materials", color: "slate", icon: "Ch" },
    "92046": { name: "Earth & Space", color: "slate", icon: "ES" },
    "92047": { name: "Energy & Physics", color: "slate", icon: "E" },
    "91156": { name: "Life Processes & Ecology", color: "slate", icon: "Bio" },
    "91157": { name: "Genetic Variation", color: "slate", icon: "DNA" },
    "91164": { name: "Chemical Reactivity", color: "slate", icon: "Ch" },
    "91165": { name: "Chemical Bonding", color: "slate", icon: "Ch" },
    "91166": { name: "Chemical Reactions", color: "slate", icon: "Ch" },
    "91170": { name: "Wave Behaviour", color: "slate", icon: "Ph" },
    "91171": { name: "Mechanics", color: "slate", icon: "Ph" },
    "91173": { name: "Electricity", color: "slate", icon: "Ph" },
    "91603": { name: "Animal Behaviour", color: "slate", icon: "Bio" },
    "91605": { name: "Evolution", color: "slate", icon: "Bio" },
    "91390": { name: "Thermochemistry", color: "slate", icon: "Ch" },
    "91391": { name: "Organic Chemistry", color: "slate", icon: "Ch" },
    "91392": { name: "Equilibrium", color: "slate", icon: "Ch" },
    "91523": { name: "Wave Systems", color: "slate", icon: "Ph" },
    "91524": { name: "Mechanical Systems", color: "slate", icon: "Ph" },
    "91526": { name: "Electrical Systems", color: "slate", icon: "Ph" },
    "91174": { name: "Financial Statements", color: "slate", icon: "$" },
    "91176": { name: "Decision Making", color: "slate", icon: "$" },
    "91404": { name: "Company Analysis", color: "slate", icon: "$" },
    "91406": { name: "Cost-Volume-Profit", color: "slate", icon: "$" },
    "91222": { name: "Market", color: "slate", icon: "Ec" },
    "91223": { name: "Inflation", color: "slate", icon: "Ec" },
    "91224": { name: "Growth", color: "slate", icon: "Ec" },
    "91399": { name: "Demand & Supply", color: "slate", icon: "Ec" },
    "91400": { name: "Market Failure", color: "slate", icon: "Ec" },
    "91403": { name: "Macro-economics", color: "slate", icon: "Ec" },
    "91240": { name: "Natural Environment", color: "slate", icon: "Ge" },
    "91242": { name: "Geographic Concepts", color: "slate", icon: "Ge" },
    "91243": { name: "Geographic Skills", color: "slate", icon: "Ge" },
    "91426": { name: "Natural Landscapes", color: "slate", icon: "Ge" },
    "91427": { name: "Cultural Environment", color: "slate", icon: "Ge" },
    "91429": { name: "Geographic Research", color: "slate", icon: "Ge" },
    "91098": { name: "Written Texts", color: "slate", icon: "En" },
    "91099": { name: "Visual/Oral Texts", color: "slate", icon: "En" },
    "91100": { name: "Unfamiliar Texts", color: "slate", icon: "En" },
    "91472": { name: "Written Text(s)", color: "slate", icon: "En" },
    "91473": { name: "Visual/Oral Text(s)", color: "slate", icon: "En" },
    "91474": { name: "Unfamiliar Texts (L3)", color: "slate", icon: "En" },
    "Y10-ENG-READ": { name: "Reading Comprehension", color: "slate", icon: "En" },
    "Y10-ENG-WRITE": { name: "Writing Skills", color: "slate", icon: "En" },
    "Y10-SCI-BIO": { name: "Biology", color: "slate", icon: "Bio" },
    "Y10-SCI-CHEM": { name: "Chemistry", color: "slate", icon: "Ch" },
    "Y10-SCI-PHYS": { name: "Physics", color: "slate", icon: "Ph" },
    "91925": { name: "Studied Text", color: "slate", icon: "En" },
    "91927": { name: "Unfamiliar Texts", color: "slate", icon: "En" },
    "Y10-HEALTH": { name: "Health", color: "slate", icon: "He" },
    "Y10-DTECH": { name: "Digital Technologies", color: "slate", icon: "DT" },
    "Y10-SOC": { name: "Social Studies", color: "slate", icon: "SS" },
    "91438": { name: "Causes & Consequences", color: "slate", icon: "Hi" },
    "91087": { name: "Pānui (Reading)", color: "slate", icon: "TR" },
    "91088": { name: "Tuhituhi (Writing)", color: "slate", icon: "TR" },
    "91286": { name: "Pānui (Reading)", color: "slate", icon: "TR" },
    "91287": { name: "Tuhituhi (Writing)", color: "slate", icon: "TR" },
    "91652": { name: "Pānui (Reading)", color: "slate", icon: "TR" },
    "91653": { name: "Tuhituhi (Writing)", color: "slate", icon: "TR" },
    "91251": { name: "Media Genre", color: "slate", icon: "Ms" },
    "91493": { name: "Genre & Society", color: "slate", icon: "Ms" },
    "91200": { name: "Ideas & Values", color: "slate", icon: "Cl" },
    "91201": { name: "Classical Art Works", color: "slate", icon: "Cl" },
    "91394": { name: "Analyse Ideas & Values", color: "slate", icon: "Cl" },
    "91395": { name: "Analyse Classical Art", color: "slate", icon: "Cl" },
    "91180": { name: "Formal Elements", color: "slate", icon: "AH" },
    "91482": { name: "Style in Art Works", color: "slate", icon: "AH" },
    "91483": { name: "Meanings in Art Works", color: "slate", icon: "AH" },
    "91381": { name: "Global Business", color: "slate", icon: "BS" },
    "91267": { name: "Probability Methods", color: "slate", icon: "St" },
    "91584": { name: "Statistical Reports", color: "slate", icon: "St" },
    "91585": { name: "Probability Concepts", color: "slate", icon: "St" },
    "91586": { name: "Probability Distributions", color: "slate", icon: "St" },
    "91934H": { name: "Well-being", color: "slate", icon: "He" },
    "91944S": { name: "Data & Probability", color: "slate", icon: "St" },
    "91928B": { name: "Life Processes", color: "slate", icon: "Bio" },
    "91924E": { name: "Economics Concepts", color: "slate", icon: "Ec" },
    "91924A": { name: "Accounting Concepts", color: "slate", icon: "$" },
    "91932": { name: "Natural Environment", color: "slate", icon: "Ge" },
    "91932B": { name: "Geographic Skills", color: "slate", icon: "Ge" },
    "91933": { name: "Historical Perspectives", color: "slate", icon: "Hi" },
    "91933B": { name: "Using Historical Sources", color: "slate", icon: "Hi" },
  };

  return (
    <div className="max-w-lg mx-auto px-5 py-10">
      {/* Header */}
      <button
        onClick={() => setStep("setup")}
        className="text-[12px] text-zinc-500 hover:text-white transition-colors mb-8 inline-flex items-center gap-1"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
        {selectedYearLabel}
      </button>

      <h1 className="text-[22px] font-semibold text-white tracking-tight mb-1">{selectedSubjectLabel}</h1>
      <p className="text-zinc-500 text-[13px] mb-10">
        {ncealLevel != null && ncealLevel > 0
          ? `Level ${ncealLevel} — ${exams.length} past papers`
          : ncealLevel === 0
          ? `Year 10 — ${exams.length} past papers`
          : `${exams.length} past papers`}
      </p>

      {exams.length === 0 ? (
        <div className="bg-[#141419] border border-zinc-800/60 rounded-lg p-10 text-center">
          <p className="text-[15px] font-medium text-white mb-1">No papers yet</p>
          <p className="text-zinc-500 text-[13px]">
            {selectedSubjectLabel} papers for this level are coming soon.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {Object.entries(standardGroups).map(([standard, groupExams]) => {
            const meta = SHORT_LABELS[standard] ?? { name: standard, color: "slate", icon: "#" };

            return (
              <div key={standard}>
                {/* Section label */}
                <p className="text-[11px] uppercase tracking-wider text-zinc-600 font-medium mb-2 mt-6 first:mt-0">{meta.name}</p>

                {groupExams.map((exam, i) => {
                  const bestGrade = progress
                    ? getBestGrade(progress, exam.id)
                    : null;
                  const attempts = getAttemptCount(exam.id);
                  const isNext = exam.id === nextExamId;
                  const totalMarks = exam.questions.reduce(
                    (s, q) => s + q.marks,
                    0
                  );

                  return (
                    <div
                      key={exam.id}
                      className="flex items-center gap-5 px-6 py-6 rounded-xl mb-2 transition-all border border-zinc-800/40 bg-transparent hover:bg-white/[0.02]"
                    >
                      {/* Left: status dot + year */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          bestGrade ? "bg-green-400" : "bg-zinc-700"
                        }`} />
                        <span className="text-[16px] font-semibold text-white tabular-nums tracking-tight">{exam.year}</span>
                      </div>

                      {/* Middle: details */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] text-zinc-500 leading-relaxed">
                          {exam.questions.length} questions · {totalMarks} marks · {exam.timeMinutes} min
                          {bestGrade && (
                            <span className="ml-2">
                              <span className={`font-medium ${gradeColor(bestGrade as Grade)}`}>{gradeLabel(bestGrade as Grade)}</span>
                              <span className="text-zinc-700 ml-1">({attempts}x)</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        <Link
                          href={`/exam/${exam.id}?mode=mock`}
                          className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
                        >
                          Mock
                        </Link>
                        <Link
                          href={`/exam/${exam.id}?mode=practice`}
                          className="px-5 py-2 rounded-lg text-[13px] font-medium transition-all bg-white/[0.06] text-zinc-300 hover:bg-white/[0.1] hover:text-white"
                        >
                          {attempts > 0 ? "Redo" : "Start"}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          <div className="pt-6">
            <Link
              href="/practice"
              className="block text-center text-[12px] text-zinc-600 hover:text-indigo-400 transition-colors"
            >
              Practice weak spots &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
