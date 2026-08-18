"use client";

// ── The Grade Detector ──
// Free hook: "What would you get if you sat your exam today?"
// Fully anonymous: pick country/state/year/subject → sit an 8-question
// diagnostic → get marked — NO account needed for any of that. The estimated
// grade itself is gated behind an email (typed in, not a full sign-up) for
// anonymous visitors; that email also receives a copy of the result. Signed-in
// users skip the email gate (we already know their address) and see the
// reveal immediately. The paid upsell is the week-by-week schedule (/plan,
// Student+Pro) — the grade is free, the path to fix it is the product.

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

type Phase = "pick" | "loading" | "test" | "marking" | "locked" | "revealed" | "error";

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
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);

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

      if (isSignedIn) {
        // We already know their email — skip the gate, reveal immediately,
        // and still fire off a copy to their inbox (best-effort).
        setPhase("revealed");
        const addr = user?.primaryEmailAddress?.emailAddress;
        if (addr) void sendEmail(addr, data.results as MarkingResult[]);
      } else {
        setPhase("locked");
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

  async function revealWithEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!results || emailStatus === "sending") return;
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
      setPhase("revealed");
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
              Sit a short diagnostic in your exact exam system — free, no sign-up. We mark it honestly and estimate your grade, then show you the path to the top one.
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
            No account, no card. We&apos;ll ask for your email only to send you the result.
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

  // ── LOCKED (anonymous — email required to reveal) ──
  // No blur, no partial grade shown — just a clean ask. The grade appears
  // on screen AND in their inbox once they submit.
  if (phase === "locked" && results) {
    return (
      <div className="max-w-md mx-auto px-5 pt-20 pb-24 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-[28px]">
          🎯
        </div>
        <h1 className="text-white font-extrabold text-[24px] mb-2">Your grade is ready</h1>
        <p className="text-zinc-400 text-[14px] mb-7">Enter your email and we&apos;ll send your estimated grade straight to your inbox.</p>
        <form onSubmit={revealWithEmail} className="space-y-3">
          <input
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3.5 text-[14px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 text-center"
          />
          {emailStatus === "error" && emailError && <p className="text-rose-400 text-[13px]">{emailError}</p>}
          <button type="submit" disabled={emailStatus === "sending"}
            className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4 text-[15px] font-extrabold text-white shadow-lg shadow-indigo-500/25 disabled:opacity-60">
            {emailStatus === "sending" ? "Sending…" : "Send me my grade →"}
          </button>
        </form>
        <p className="text-zinc-600 text-[11px] mt-4">No spam, ever — just this result and, if you want more, how to fix it.</p>
      </div>
    );
  }

  // ── REVEALED ──
  if (phase === "revealed" && results) {
    const { bandLabel, pct, weakTopics, grade } = computeSummary(results);
    const topBandLabel = curriculum.gradeBands[0]?.label ?? "the top grade";
    return (
      <div className="max-w-lg mx-auto px-5 pt-12 pb-20 text-center">
        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-400 mb-3">
          If you sat {curriculum.subjects.find((s) => s.value === subject)?.label ?? subject} today
        </p>
        <div className={`text-[72px] sm:text-[88px] font-black leading-none tracking-tight mb-2 ${gradeColor(grade)}`}>
          {bandLabel}
        </div>
        <p className="text-zinc-400 text-[13px] mb-6">
          {pct}% · honest estimate from today&apos;s 8 questions — not a promise, a starting line.
        </p>
        {weakTopics.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {weakTopics.slice(0, 3).map((t) => (
              <span key={t} className="px-3 py-1.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-300 text-[12px] font-medium">
                ⚠ {getTopicLabel(t)}
              </span>
            ))}
          </div>
        )}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.08] px-5 py-5">
          <p className="text-white font-extrabold text-[16px] mb-1.5">Get to {topBandLabel} by exam day</p>
          <p className="text-zinc-400 text-[12.5px] mb-4">
            A week-by-week schedule from this result to the top grade — practice lined up, weak spots first, all the way to your exam.
          </p>
          <Link href={isSignedIn ? "/plan" : "/sign-up"}
            className="inline-flex w-full justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-3.5 text-[14px] font-extrabold text-white shadow-lg shadow-indigo-500/25">
            {isSignedIn ? "Build my schedule →" : "Create free account & build my schedule →"}
          </Link>
          <p className="text-zinc-600 text-[11px] mt-2.5">Schedules are part of the Student plan · the grade check stays free</p>
        </div>
      </div>
    );
  }

  return null;
}
