"use client";

// ── The Grade Detector ──
// Free hook: "What would you get if you sat your exam today?"
// Fully anonymous end to end: pick country/state/year/subject → sit an
// 8-question diagnostic → see the FULL result immediately — grade band,
// score ring, and an examiner-style per-question marked paper. Nothing is
// gated: no account, no email wall (email is an optional "send me this
// report" field that still captures leads). The reveal itself is the pitch:
// after seeing exactly where they lost marks, the page pushes the Student
// plan (NZ$15/mo) with a personalised path from today's % to the top band.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { resolveCurriculum, COUNTRIES, curriculaForCountry, type Curriculum } from "@/data/curricula";
import { getTopicLabel } from "@/data/topics";
import type { GraphData, MarkingResult } from "@/lib/types";
import { gradeColor, gradeLabel, curriculumBand, bandToneGrade } from "@/lib/scoring";
import { neutralizeFigureReferences } from "@/lib/questionGuard";
import Graph from "@/components/Graph";

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

type Phase = "pick" | "loading" | "test" | "marking" | "revealed" | "error";

export default function GradePage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const [country, setCountry] = useState<Curriculum["country"]>("NZ");
  const [curriculumId, setCurriculumId] = useState<string>("nz-ncea");
  const [year, setYear] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("pick");
  const [error, setError] = useState<string | null>(null);
  const [paper, setPaper] = useState<{ title: string; questions: ApiQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<MarkingResult[] | null>(null);
  const [currentQ, setCurrentQ] = useState(0);

  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  // Drives the score-ring sweep + staggered reveal animations.
  const [ringOn, setRingOn] = useState(false);
  useEffect(() => {
    if (phase !== "revealed") { setRingOn(false); return; }
    const id = setTimeout(() => setRingOn(true), 150);
    return () => clearTimeout(id);
  }, [phase]);

  // Paper generation takes ~25–30s; advance the status line every 6s so the
  // wait never looks stalled (holds on the last line once exhausted).
  const [loadingLine, setLoadingLine] = useState(0);
  useEffect(() => {
    if (phase !== "loading") {
      setLoadingLine(0);
      return;
    }
    const id = setInterval(
      () => setLoadingLine((i) => Math.min(i + 1, LOADING_LINES.length - 1)),
      6000
    );
    return () => clearInterval(id);
  }, [phase]);

  const systems = curriculaForCountry(country);
  const curriculum = resolveCurriculum(curriculumId);
  const countryMismatch = curriculum.country !== country;
  const years = countryMismatch ? [] : curriculum.levels.map((l) => ({ value: l.value, label: l.label }));
  const subjects = countryMismatch || year == null ? [] : curriculum.subjects.filter((s) => s.years.includes(year));
  const canStart = !countryMismatch && year != null && !!subject;

  function pickCountry(code: Curriculum["country"]) {
    setCountry(code); setYear(null); setSubject(null);
    const group = curriculaForCountry(code);
    if (group.length === 1) setCurriculumId(group[0].id);
  }
  function pickSystem(id: string) { setCurriculumId(id); setYear(null); setSubject(null); }

  async function start() {
    if (!canStart || !subject || year == null) return;
    setPhase("loading");
    setError(null);
    try {
      const level = curriculum.id === "nz-ncea" ? (year === 10 ? 0 : year - 10) : year;
      const res = await fetch("/api/diagnostic/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, level, curriculum: curriculumId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.paper?.questions?.length) {
        throw new Error(data.message ?? data.error ?? "Couldn't build your diagnostic. Please try again.");
      }
      setPaper(data.paper);
      setAnswers({});
      setCurrentQ(0);
      setPhase("test");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setPhase("error");
    }
  }

  async function submitTest() {
    if (!paper || !subject) return;
    setPhase("marking");
    try {
      const res = await fetch("/api/diagnostic/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          curriculum: curriculumId,
          questions: paper.questions.map((q, i) => ({
            id: `q${i + 1}`,
            text: q.text,
            markingGuide: q.markingGuide,
            topics: [subject],
            answerType: q.answerType,
          })),
          answers,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !Array.isArray(data.results)) throw new Error("Marking failed. Please try again.");
      setResults(data.results as MarkingResult[]);

      // Everyone sees the full result immediately — no gate. Signed-in users
      // also get a copy in their inbox (best-effort); anonymous visitors get
      // an optional "email me this report" field on the results page.
      setPhase("revealed");
      if (isSignedIn) {
        const addr = user?.primaryEmailAddress?.emailAddress;
        if (addr) void sendEmail(addr, data.results as MarkingResult[]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setPhase("error");
    }
  }

  function computeSummary(rs: MarkingResult[]) {
    const totalMarks = rs.reduce((s, r) => s + r.marksAwarded, 0);
    const maxMarks = rs.reduce((s, r) => s + r.maxMarks, 0);
    const pct = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;
    const band = curriculumBand(curriculumId, rs);
    const grade = band ? bandToneGrade(band) : (pct >= 85 ? "excellence" : pct >= 65 ? "merit" : pct >= 40 ? "achieved" : "not-achieved");
    const bandLabel = band ? band.label : gradeLabel(grade);
    const weakTopics = Array.from(new Set(rs.flatMap((r) => r.topicsToReview ?? [])));
    return { pct, grade, bandLabel, weakTopics };
  }

  async function sendEmail(addr: string, rs: MarkingResult[]) {
    const { pct, bandLabel, weakTopics } = computeSummary(rs);
    try {
      await fetch("/api/diagnostic/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: addr,
          curriculum: curriculumId,
          subject,
          bandLabel,
          pct,
          weakTopics: weakTopics.map((t) => getTopicLabel(t)),
        }),
      }).then((r) => r.json());
    } catch {}
  }

  // Optional lead capture on the results page — sends the report, never gates it.
  async function sendReport(e: React.FormEvent) {
    e.preventDefault();
    if (!results || emailStatus === "sending" || emailStatus === "sent") return;
    setEmailStatus("sending");
    setEmailError(null);
    try {
      const res = await fetch("/api/diagnostic/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          curriculum: curriculumId,
          subject,
          ...computeSummary(results),
          weakTopics: computeSummary(results).weakTopics.map((t) => getTopicLabel(t)),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Please enter a valid email address.");
      setEmailStatus("sent");
    } catch (e) {
      setEmailError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setEmailStatus("error");
    }
  }

  // ── PICK ──
  if (phase === "pick" || phase === "error") {
    return (
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" aria-hidden>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[640px] h-[480px] bg-indigo-500/[0.08] blur-[120px] rounded-full" />
          <div className="absolute top-96 -right-24 w-[400px] h-[400px] bg-fuchsia-500/[0.06] blur-[120px] rounded-full" />
        </div>
        <div className="max-w-lg mx-auto px-5 pt-10 sm:pt-16 pb-20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-[11px] text-zinc-400 mb-5">
              🎯 Free · no account needed · 8 questions
            </div>
            <h1 className="text-[30px] sm:text-[42px] font-extrabold text-white tracking-tight leading-[1.05] mb-3">
              What would you get if you{" "}
              <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                sat your exam today?
              </span>
            </h1>
            <p className="text-zinc-400 text-[14px] sm:text-[16px] max-w-md mx-auto">
              Sit a short diagnostic in your exact exam system — free, no sign-up. We mark every answer honestly, show you the marked paper, and tell you your grade. Then we show you the path to the top one.
            </p>
          </div>

          {phase === "error" && error && (
            <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/25 px-4 py-3 text-rose-300 text-[13px]">{error}</div>
          )}

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
            Start my free grade check →
          </button>
          <p className="text-zinc-600 text-[11.5px] text-center mt-3">
            No account, no card, no email wall. Your grade and marked paper appear right here.
          </p>
          <p className="text-zinc-600 text-[12px] text-center mt-8">
            Already practising? <Link href="/subjects" className="text-indigo-400 hover:underline">Go to your exams</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── LOADING / MARKING ──
  if (phase === "loading" || phase === "marking") {
    return (
      <div className="max-w-md mx-auto px-5 pt-28 pb-24 text-center">
        <div className="w-14 h-14 mx-auto mb-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <h1 className="text-white font-extrabold text-[22px] mb-2">
          {phase === "loading" ? "Reading your exam…" : "Marking honestly…"}
        </h1>
        <p className="text-zinc-400 text-[14px]">
          {phase === "loading" ? LOADING_LINES[loadingLine] : "No leniency, no fake praise — just the truth."}
        </p>
      </div>
    );
  }

  // ── TEST ── one question at a time, same pattern as the real exam page
  // (/exam/[examId]): graph/image render above the question, text runs
  // through neutralizeFigureReferences so "the graph below" never appears
  // without a graph, and a dot navigator lets you jump between questions.
  if (phase === "test" && paper) {
    const answeredCount = paper.questions.filter((_, i) => (answers[`q${i + 1}`] ?? "").trim().length > 0).length;
    const q = paper.questions[currentQ];
    const id = `q${currentQ + 1}`;
    const isLast = currentQ === paper.questions.length - 1;
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-5 pt-6 pb-28">
        <div className="mb-6 sticky top-[68px] z-10 bg-[#06060a]/90 backdrop-blur-md py-3 -mx-4 px-4 sm:-mx-5 sm:px-5 border-b border-white/[0.06]">
          <p className="text-white font-bold text-[15px]">{paper.title}</p>
          <p className="text-zinc-500 text-[12px] mb-3">{answeredCount} of {paper.questions.length} answered · no sign-up needed</p>
          <div className="flex gap-1.5 flex-wrap">
            {paper.questions.map((_, i) => (
              <button key={i} onClick={() => setCurrentQ(i)}
                className={`w-8 h-8 rounded text-[11px] font-medium transition-colors ${
                  i === currentQ
                    ? "bg-indigo-500 text-white"
                    : (answers[`q${i + 1}`] ?? "").trim()
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : "bg-white/[0.04] text-zinc-500 hover:bg-white/[0.08]"
                }`}>
                {i + 1}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] p-4 sm:p-5">
          <p className="text-[11px] text-zinc-500 font-semibold mb-1.5">Question {currentQ + 1} of {paper.questions.length}</p>

          {q.graph && <Graph data={q.graph} />}
          {q.image && (
            <div className="mb-4 rounded-lg overflow-hidden border border-white/[0.06] bg-white p-2">
              <img src={q.image} alt={`Diagram for Question ${currentQ + 1}`}
                className="max-w-full h-auto mx-auto max-h-[500px] object-contain" />
            </div>
          )}

          <p className="text-white text-[15px] mb-4 whitespace-pre-wrap">{neutralizeFigureReferences(q.text)}</p>

          {q.answerType === "multi-choice" && q.options ? (
            <div className="space-y-2">
              {q.options.map((opt) => (
                <button key={opt} onClick={() => setAnswers((prev) => ({ ...prev, [id]: opt }))}
                  className={`block w-full text-left px-4 py-3 rounded-lg border transition-colors min-h-[44px] text-[14px] ${
                    answers[id] === opt ? "border-indigo-500 bg-indigo-500/10 text-white" : "border-zinc-800 text-zinc-300 hover:border-zinc-600"
                  }`}>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <textarea
                value={answers[`${id}_working`] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [`${id}_working`]: e.target.value }))}
                placeholder="Working out (1 mark)…"
                rows={q.answerType === "working" ? 5 : 3}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-y text-sm"
              />
              <textarea
                value={answers[id] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [id]: e.target.value }))}
                placeholder="Final answer (1 mark)…"
                rows={2}
                className="w-full bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 resize-y text-sm"
              />
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-[#06060a]/95 backdrop-blur-md border-t border-white/[0.08] p-4">
          <div className="max-w-2xl mx-auto flex gap-3">
            {currentQ > 0 && (
              <button onClick={() => setCurrentQ((c) => c - 1)}
                className="rounded-xl border border-white/[0.1] px-5 py-4 text-[15px] font-semibold text-zinc-300 hover:border-white/[0.2] transition-colors">
                ← Back
              </button>
            )}
            {isLast ? (
              <button onClick={submitTest}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4 text-[15px] font-extrabold text-white shadow-lg shadow-indigo-500/25">
                See my grade →
              </button>
            ) : (
              <button onClick={() => setCurrentQ((c) => c + 1)}
                className="flex-1 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4 text-[15px] font-extrabold text-white shadow-lg shadow-indigo-500/25">
                Next →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── REVEALED ──
  // The whole result, ungated: animated grade reveal → personalised path to
  // the top band → Student-plan pitch → examiner-style marked paper (the
  // proof of quality) → second pitch → optional email report.
  if (phase === "revealed" && results && paper) {
    const { bandLabel, pct, weakTopics, grade } = computeSummary(results);
    const topBand = curriculum.gradeBands[0];
    const topBandLabel = topBand?.label ?? "the top grade";
    const topPct = Math.round((topBand?.minPct ?? 0.85) * 100);
    const gap = Math.max(0, topPct - pct);
    const atTop = gap === 0;
    const subjectLabel = curriculum.subjects.find((s) => s.value === subject)?.label ?? subject;
    // "by the end of <month ~5 weeks out>" — a concrete, near, believable target.
    const targetMonth = new Date(Date.now() + 35 * 864e5).toLocaleString("en-NZ", { month: "long" });
    const weakLabels = weakTopics.slice(0, 2).map((t) => getTopicLabel(t));
    const totalAwarded = results.reduce((s, r) => s + r.marksAwarded, 0);
    const totalMax = results.reduce((s, r) => s + r.maxMarks, 0);
    // Score ring geometry (r=64 → C≈402).
    const RING_C = 2 * Math.PI * 64;

    const pitchCta = (
      <Link href="/pricing"
        className="inline-flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4 text-[15px] font-extrabold text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.01] transition-transform">
        Start my plan — NZ$15/mo →
      </Link>
    );

    return (
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" aria-hidden>
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[640px] h-[480px] bg-indigo-500/[0.08] blur-[120px] rounded-full" />
        </div>
        <div className="max-w-2xl mx-auto px-5 pt-10 pb-20">

          {/* ── The reveal ── */}
          <div className="text-center mb-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-6">
              If you sat {subjectLabel} today
            </p>
            <div className="relative w-[160px] h-[160px] mx-auto mb-4">
              <svg viewBox="0 0 144 144" className="w-full h-full -rotate-90">
                <circle cx="72" cy="72" r="64" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
                <circle cx="72" cy="72" r="64" fill="none" strokeWidth="10" strokeLinecap="round"
                  className={`${gradeColor(grade)} transition-[stroke-dashoffset] duration-[1400ms] ease-out`}
                  stroke="currentColor"
                  strokeDasharray={RING_C}
                  strokeDashoffset={ringOn ? RING_C * (1 - pct / 100) : RING_C}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-white font-black text-[40px] leading-none tracking-tight">{pct}%</span>
                <span className="text-zinc-500 text-[11px] mt-1">{totalAwarded}/{totalMax} marks</span>
              </div>
            </div>
            <div className={`text-[52px] sm:text-[64px] font-black leading-none tracking-tight mb-2 ${gradeColor(grade)}`}>
              {bandLabel}
            </div>
            <p className="text-zinc-400 text-[13px]">
              Marked honestly, question by question — your full marked paper is below.
            </p>
          </div>

          {/* ── Path to the top band ── */}
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.08] px-5 py-5 mb-5">
            <div className="flex items-baseline justify-between mb-2.5">
              <span className="text-[12px] font-bold text-zinc-300">Today · {pct}%</span>
              <span className="text-[12px] font-bold text-indigo-300">{topBandLabel} · {topPct}%+</span>
            </div>
            <div className="relative h-2.5 rounded-full bg-white/[0.05] overflow-hidden mb-3">
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-[width] duration-[1400ms] ease-out"
                style={{ width: ringOn ? `${Math.min(pct, 100)}%` : "0%" }} />
              <div className="absolute inset-y-0 border-l-2 border-dashed border-indigo-300/50" style={{ left: `${topPct}%` }} />
            </div>
            <p className="text-zinc-400 text-[13px]">
              {atTop
                ? <>You&apos;re in the top band on today&apos;s 8 questions. The job now is making that hold under full exam pressure — length, time limits, every topic.</>
                : <>You&apos;re <span className="text-white font-bold">{gap} percentage points</span> from {topBandLabel}. That gap has names{weakLabels.length > 0 && <>: <span className="text-rose-300 font-semibold">{weakLabels.join(" and ")}</span></>} — and topic gaps are exactly what daily practice closes.</>}
            </p>
          </div>

          {/* ── The pitch ── */}
          <div className="relative rounded-2xl overflow-hidden mb-10">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-purple-600/15 to-pink-600/10" aria-hidden />
            <div className="relative border border-indigo-500/25 rounded-2xl px-5 py-6">
              <p className="text-white font-extrabold text-[19px] mb-2 leading-snug">
                {atTop
                  ? <>Keep this grade locked in by {targetMonth}.</>
                  : <>{bandLabel} today doesn&apos;t have to be {bandLabel} in {targetMonth}.</>}
              </p>
              <p className="text-zinc-300 text-[13.5px] leading-relaxed mb-4">
                The Student plan gives you unlimited {curriculum.system}-style exams with this same honest marking on
                every answer{weakLabels.length > 0 && <>, starting with <span className="font-semibold text-white">{weakLabels.join(" and ")}</span></>},
                plus a week-by-week schedule built from this exact result.
                20 minutes a day is the whole habit — <span className="text-white font-semibold">{atTop ? `walking into exam day at ${topBandLabel} level` : `sitting in the ${topBandLabel} zone by the end of ${targetMonth}`}</span> is
                the target it&apos;s built around. Not a promise — a training plan.
              </p>
              <ul className="space-y-1.5 mb-5">
                {["Unlimited full practice exams in your exact system", "Every answer marked like today — honestly, with the fix", `A schedule that attacks your weakest topics first`].map((li) => (
                  <li key={li} className="flex items-start gap-2 text-[13px] text-zinc-300">
                    <span className="text-emerald-400 mt-px">✓</span>{li}
                  </li>
                ))}
              </ul>
              {pitchCta}
              <p className="text-zinc-500 text-[11px] mt-2.5 text-center">NZ$15/month · cancel anytime · cheaper than 15 minutes of tutoring</p>
            </div>
          </div>

          {/* ── The marked paper ── */}
          <div className="mb-10">
            <h2 className="text-white font-extrabold text-[20px] mb-1">Your marked paper</h2>
            <p className="text-zinc-500 text-[12.5px] mb-4">Every question, marked the way an examiner would — tap one to see exactly where the marks went.</p>
            <div className="space-y-2.5">
              {paper.questions.map((q, i) => {
                const r = results.find((x) => x.questionId === `q${i + 1}`) ?? results[i];
                if (!r) return null;
                const full = r.marksAwarded === r.maxMarks;
                const zero = r.marksAwarded === 0;
                const tone = full ? "emerald" : zero ? "rose" : "amber";
                const yourAnswer = (answers[`q${i + 1}`] ?? "").trim();
                const yourWorking = (answers[`q${i + 1}_working`] ?? "").trim();
                return (
                  <details key={i} className="group rounded-xl bg-white/[0.02] border border-white/[0.08] open:border-white/[0.15]">
                    <summary className="flex items-center gap-3 px-4 py-3.5 cursor-pointer list-none [&::-webkit-details-marker]:hidden min-h-[44px]">
                      <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[13px] font-black ${
                        tone === "emerald" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : tone === "rose" ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        : "bg-amber-500/15 text-amber-400 border border-amber-500/30"}`}>
                        {r.marksAwarded}/{r.maxMarks}
                      </span>
                      <span className="flex-1 text-[13px] text-zinc-300 line-clamp-2">
                        <span className="font-bold text-zinc-500 mr-1.5">Q{i + 1}</span>
                        {neutralizeFigureReferences(q.text)}
                      </span>
                      <span className="text-zinc-600 text-[12px] group-open:rotate-180 transition-transform" aria-hidden>▼</span>
                    </summary>
                    <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.06]">
                      {(yourAnswer || yourWorking) ? (
                        <div>
                          <p className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Your answer</p>
                          {yourWorking && <p className="text-zinc-400 text-[13px] whitespace-pre-wrap mb-1">{yourWorking}</p>}
                          <p className="text-zinc-200 text-[13px] whitespace-pre-wrap">{yourAnswer || <em className="text-zinc-500">final answer left blank</em>}</p>
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-[13px] italic">Left blank — 0 marks by default.</p>
                      )}
                      <div>
                        <p className="text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Examiner&apos;s note</p>
                        <p className="text-zinc-300 text-[13px] leading-relaxed">{r.feedback}</p>
                      </div>
                      {!full && r.correctApproach && (
                        <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-3.5 py-3">
                          <p className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-400 mb-1">The full-marks approach</p>
                          <p className="text-zinc-300 text-[13px] leading-relaxed">{r.correctApproach}</p>
                        </div>
                      )}
                      {r.examTip && (
                        <p className="text-indigo-300/90 text-[12.5px]">💡 {r.examTip}</p>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          </div>

          {/* ── Second pitch — after they've seen the lost marks ── */}
          {!atTop && (
            <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] px-5 py-5 mb-10 text-center">
              <p className="text-white font-extrabold text-[16px] mb-1.5">
                Those {totalMax - totalAwarded} lost marks are the difference.
              </p>
              <p className="text-zinc-400 text-[13px] mb-4">
                Every one of them is a fixable habit, not a talent problem. NZ$15/month buys the reps that fix them.
              </p>
              {pitchCta}
            </div>
          )}

          {/* ── Optional email report ── */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.015] px-4 py-4 mb-8">
            {emailStatus === "sent" ? (
              <p className="text-emerald-400 text-[13px] text-center font-semibold">✓ Report sent — check your inbox.</p>
            ) : (
              <form onSubmit={sendReport} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email me this report (optional)"
                  className="flex-1 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                />
                <button type="submit" disabled={emailStatus === "sending"}
                  className="rounded-lg border border-white/[0.12] px-4 py-2.5 text-[13px] font-semibold text-zinc-300 hover:border-white/[0.25] disabled:opacity-60 transition-colors">
                  {emailStatus === "sending" ? "Sending…" : "Send it"}
                </button>
              </form>
            )}
            {emailStatus === "error" && emailError && <p className="text-rose-400 text-[12px] mt-2">{emailError}</p>}
          </div>

          <p className="text-zinc-600 text-[12px] text-center">
            Want to retake it first? <button onClick={() => { setPhase("pick"); setResults(null); setPaper(null); }} className="text-indigo-400 hover:underline">Run another grade check</button>
          </p>
        </div>
      </div>
    );
  }

  return null;
}
