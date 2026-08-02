"use client";

// ── The Grade Detector ──
// Free hook: "What would you get if you sat your exam today?"
// Public page → pick country/state/year/subject → sign up (email) → 8-question
// diagnostic → honest estimated grade on the results page → paid upsell is the
// week-by-week schedule (/plan, Student+Pro).
// Signed-out flow: picks are stashed in localStorage, /sign-up runs, and this
// page (via the welcome-page redirect hook) resumes the run automatically.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import type { Exam, Question, GraphData } from "@/lib/types";
import { saveCustomExam, generateCustomExamId } from "@/lib/customExams";
import { resolveCurriculum, COUNTRIES, curriculaForCountry, type Curriculum } from "@/data/curricula";

const PENDING_KEY = "studyace-diagnostic-pending";

type ApiQuestion = {
  number: string; text: string; marks: number;
  gradeLevel: "achieved" | "merit" | "excellence";
  answerType: "text" | "number" | "multi-choice" | "working";
  options?: string[]; expectedAnswer?: string; markingGuide: string;
  graph?: GraphData; image?: string;
};

const LOADING_LINES = [
  "Building your diagnostic…",
  "Calibrating to your exam's real difficulty…",
  "Writing questions an examiner would ask…",
  "Nearly there — sharpen a pencil…",
];

export default function GradePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const [country, setCountry] = useState<Curriculum["country"]>("NZ");
  const [curriculumId, setCurriculumId] = useState<string>("nz-ncea");
  const [year, setYear] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [phase, setPhase] = useState<"pick" | "loading" | "error">("pick");
  const [loadIdx, setLoadIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const systems = curriculaForCountry(country);
  const curriculum = resolveCurriculum(curriculumId);
  const countryMismatch = curriculum.country !== country;
  const years = countryMismatch ? [] : curriculum.levels.map((l) => ({ value: l.value, label: l.label }));
  const subjects = countryMismatch || year == null ? [] : curriculum.subjects.filter((s) => s.years.includes(year));

  // Resume after sign-up: picks were stashed before the auth detour.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || startedRef.current) return;
    try {
      const raw = localStorage.getItem(PENDING_KEY);
      if (!raw) return;
      const p = JSON.parse(raw) as { curriculumId: string; year: number; subject: string };
      if (!p?.curriculumId || !p?.subject || !p?.year) return;
      localStorage.removeItem(PENDING_KEY);
      startedRef.current = true;
      setCurriculumId(p.curriculumId);
      setCountry(resolveCurriculum(p.curriculumId).country);
      setYear(p.year);
      setSubject(p.subject);
      void runDiagnostic(p.curriculumId, p.year, p.subject);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  function pickCountry(code: Curriculum["country"]) {
    setCountry(code); setYear(null); setSubject(null);
    const group = curriculaForCountry(code);
    if (group.length === 1) setCurriculumId(group[0].id);
  }
  function pickSystem(id: string) { setCurriculumId(id); setYear(null); setSubject(null); }

  async function start() {
    if (year == null || !subject || countryMismatch) return;
    if (!isSignedIn) {
      try { localStorage.setItem(PENDING_KEY, JSON.stringify({ curriculumId, year, subject })); } catch {}
      router.push("/sign-up");
      return;
    }
    void runDiagnostic(curriculumId, year, subject);
  }

  async function runDiagnostic(cid: string, yr: number, subj: string) {
    setPhase("loading");
    setError(null);
    const iv = setInterval(() => setLoadIdx((i) => (i + 1) % LOADING_LINES.length), 7000);
    try {
      const c = resolveCurriculum(cid);
      const level = c.id === "nz-ncea" ? (yr === 10 ? 0 : yr - 10) : yr;
      let paper: { title: string; questions: ApiQuestion[] } | null = null;
      let lastErr = "";
      for (let attempt = 1; attempt <= 2 && !paper; attempt++) {
        const res = await fetch("/api/generate-paper", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Cache-Control": "no-cache" },
          body: JSON.stringify({ subject: subj, level, questionCount: 8, curriculum: cid, diagnostic: true }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.paper?.questions?.length) { paper = data.paper; break; }
        lastErr = data.message ?? data.error ?? `Request failed (${res.status})`;
        if (data.error === "limit_reached" || data.error === "subject_locked") break;
      }
      if (!paper) throw new Error(lastErr || "Couldn't build your diagnostic. Please try again.");

      const id = generateCustomExamId();
      const questions: Question[] = paper.questions.map((q, i) => ({
        id: `${id}-q${i + 1}`,
        number: String(i + 1),
        text: q.text,
        marks: (q.answerType ?? "working") === "multi-choice" ? 1 : 2,
        gradeLevel: q.gradeLevel ?? "achieved",
        topics: [subj],
        answerType: q.answerType ?? "working",
        options: q.options,
        expectedAnswer: q.expectedAnswer,
        markingGuide: q.markingGuide ?? "",
        graph: q.graph,
        image: q.image,
      }));
      const exam: Exam & { createdAt: string; isCustom: true; curriculumId: string; diagnostic: true } = {
        id,
        title: paper.title ?? "Grade Check",
        level,
        standard: "DIAGNOSTIC",
        year: new Date().getFullYear(),
        subject: subj,
        timeMinutes: Math.max(20, questions.length * 5),
        questions,
        totalMarks: questions.reduce((s, q) => s + q.marks, 0),
        createdAt: new Date().toISOString(),
        isCustom: true,
        curriculumId: cid,
        diagnostic: true,
      };
      saveCustomExam(exam);
      fetch("/api/exams", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exam }) }).catch(() => {});
      router.push(`/exam/${id}`);
    } catch (e) {
      clearInterval(iv);
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setPhase("error");
      startedRef.current = false;
      return;
    }
    clearInterval(iv);
  }

  const canStart = !countryMismatch && year != null && !!subject;

  if (phase === "loading") {
    return (
      <div className="max-w-md mx-auto px-5 pt-28 pb-24 text-center">
        <div className="w-14 h-14 mx-auto mb-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <h1 className="text-white font-extrabold text-[22px] mb-2">Reading your exam…</h1>
        <p className="text-zinc-400 text-[14px]">{LOADING_LINES[loadIdx]}</p>
        <p className="text-zinc-600 text-[12px] mt-6">8 questions · ~15 minutes · marked honestly</p>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10" aria-hidden>
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[640px] h-[480px] bg-indigo-500/[0.08] blur-[120px] rounded-full" />
        <div className="absolute top-96 -right-24 w-[400px] h-[400px] bg-fuchsia-500/[0.06] blur-[120px] rounded-full" />
      </div>

      <div className="max-w-lg mx-auto px-5 pt-10 sm:pt-16 pb-20">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-zinc-400 mb-5">
            🎯 Free · 8 questions · honest estimate
          </div>
          <h1 className="text-[30px] sm:text-[42px] font-extrabold text-white tracking-tight leading-[1.05] mb-3">
            What would you get if you{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              sat your exam today?
            </span>
          </h1>
          <p className="text-zinc-400 text-[14px] sm:text-[16px] max-w-md mx-auto">
            Sit a short diagnostic in your exact exam system. We mark it honestly and estimate your grade — then show you the path to the top one.
          </p>
        </div>

        {phase === "error" && (
          <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/25 px-4 py-3 text-rose-300 text-[13px]">{error}</div>
        )}

        {/* Country */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Your country</label>
          <div className="grid grid-cols-5 gap-2">
            {COUNTRIES.map((co) => (
              <button key={co.code} onClick={() => pickCountry(co.code)} aria-pressed={co.code === country}
                className={`flex flex-col items-center gap-0.5 min-h-[50px] py-2 rounded-lg text-[10.5px] font-semibold border transition-colors ${
                  co.code === country
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-500 text-white"
                    : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/[0.2]"
                }`}>
                <span className="text-[16px] leading-none" aria-hidden>{co.flag}</span>{co.label}
              </button>
            ))}
          </div>
        </div>

        {/* System / state */}
        {systems.length > 1 && (
          <div className="mb-5">
            <label className="block text-[11px] font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
              {country === "AU" ? "Your state" : "Your exam"}
            </label>
            <div className="flex flex-wrap gap-2">
              {systems.map((c) => {
                const active = !countryMismatch && c.id === curriculumId;
                return (
                  <button key={c.id} onClick={() => pickSystem(c.id)} aria-pressed={active}
                    className={`inline-flex items-center gap-1.5 min-h-[36px] px-3 py-2 rounded-lg text-[12px] font-semibold border transition-colors ${
                      active
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-500 text-white"
                        : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/[0.2]"
                    }`}>
                    {c.regionShort ? <><span className={active ? "text-white/80" : "text-zinc-500"}>{c.regionShort}</span><span aria-hidden>·</span>{c.system}</> : c.system}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Year */}
        <div className="mb-5">
          <label className="block text-[11px] font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
            {country === "US" || country === "CA" ? "Grade" : "Year level"}
          </label>
          {years.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-4 text-center text-[13px] text-zinc-500">
              Pick your {country === "AU" ? "state" : "exam"} first ↑
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {years.map((y) => (
                <button key={y.value} onClick={() => { setYear(y.value); setSubject(null); }} aria-pressed={year === y.value}
                  className={`min-h-[42px] py-2.5 rounded-lg text-[13px] font-medium border transition-colors ${
                    year === y.value
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-500 text-white"
                      : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/[0.2]"
                  }`}>
                  {y.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Subject — no padlocks here: the first diagnostic is free in any subject */}
        <div className="mb-7">
          <label className="block text-[11px] font-semibold text-zinc-400 mb-2 uppercase tracking-wider">Subject</label>
          {subjects.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-4 text-center text-[13px] text-zinc-500">
              Pick a year level first ↑
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {subjects.map((s) => (
                <button key={s.value} onClick={() => setSubject(s.value)} aria-pressed={subject === s.value}
                  className={`min-h-[42px] py-2.5 px-3.5 rounded-lg text-[13px] text-left border transition-colors ${
                    subject === s.value
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-500 text-white"
                      : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/[0.2]"
                  }`}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button onClick={start} disabled={!canStart}
          className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4 text-[15px] font-extrabold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-40 disabled:shadow-none transition-all">
          {isSignedIn ? "Reveal my grade →" : "Check my grade — free →"}
        </button>
        <p className="text-zinc-600 text-[11.5px] text-center mt-3">
          Free account needed so your results save. No card, ever, for the grade check.
        </p>

        <p className="text-zinc-600 text-[12px] text-center mt-8">
          Already practising? <Link href="/subjects" className="text-indigo-400 hover:underline">Go to your exams</Link>
        </p>
      </div>
    </div>
  );
}
