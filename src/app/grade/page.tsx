"use client";

// ── The Grade Detector ──
// Free hook: "What would you get if you sat your exam today?"
// The lead-capture funnel (littlenudge-style): pick country/state/year/
// subject → sit an 8-question diagnostic → while the paper is being marked,
// a step asks "where should we send your grade report?" (first name +
// email — the marking wait absorbs the ask, so it costs zero extra time)
// → the FULL result reveals: grade band, score ring, examiner-style marked
// paper. No account needed. The reveal itself is the pitch: after seeing
// exactly where they lost marks, the page pushes the Student plan
// (NZ$15/mo) with a personalised path from today's % to the top band.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { display } from "@/lib/displayFont";
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Phase = "pick" | "loading" | "test" | "email" | "marking" | "revealed" | "error";
type PickStep = "name" | "country" | "system" | "year" | "subject";

export default function GradePage() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();

  const [country, setCountry] = useState<Curriculum["country"]>("NZ");
  const [curriculumId, setCurriculumId] = useState<string>("nz-ncea");
  const [year, setYear] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);

  const [phase, setPhase] = useState<Phase>("pick");
  const [pickStep, setPickStep] = useState<PickStep>("name");
  const [error, setError] = useState<string | null>(null);
  const [paper, setPaper] = useState<{ title: string; questions: ApiQuestion[] } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [results, setResults] = useState<MarkingResult[] | null>(null);
  const [currentQ, setCurrentQ] = useState(0);

  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailError, setEmailError] = useState<string | null>(null);
  // Refs mirror the contact fields so the async marking flow (started before
  // the email step is filled in) can read their latest values.
  const emailRef = useRef("");
  const nameRef = useRef("");
  useEffect(() => { emailRef.current = email; }, [email]);
  useEffect(() => { nameRef.current = firstName; }, [firstName]);
  // Signed-in users: prefill the name step from Clerk (they just tap Next).
  useEffect(() => {
    const n = user?.firstName;
    if (n) setFirstName((v) => v || n);
  }, [user?.firstName]);
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

  // Progressive disclosure, littlenudge-style: pre-answer the questions we
  // can. Timezone → country, so most visitors land straight on year/subject.
  useEffect(() => {
    const id = setTimeout(() => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      const CA_TZ = new Set(["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax", "America/St_Johns", "America/Regina", "America/Moncton"]);
      let detected: Curriculum["country"] | null = null;
      if (tz.startsWith("Australia/")) detected = "AU";
      else if (tz === "Europe/London") detected = "GB";
      else if (CA_TZ.has(tz)) detected = "CA";
      else if (tz.startsWith("America/")) detected = "US";
      if (detected) pickCountry(detected);
    }, 0);
    return () => clearTimeout(id);
    // Mount-only country detection — pickCountry is stable per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  function pickSystem(id: string) { setCurriculumId(id); setYear(null); setSubject(null); }

  async function start(subjectOverride?: string) {
    const subj = subjectOverride ?? subject;
    if (!subj || year == null || countryMismatch) return;
    setPhase("loading");
    setError(null);
    try {
      const level = curriculum.id === "nz-ncea" ? (year === 10 ? 0 : year - 10) : year;
      const res = await fetch("/api/diagnostic/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: subj, level, curriculum: curriculumId }),
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
      setPickStep("subject");
      setPhase("error");
    }
  }

  async function submitTest() {
    if (!paper || !subject) return;
    // Anonymous visitors give their name + email WHILE the paper is being
    // marked (littlenudge-style — the ~15s marking wait absorbs the ask).
    // Signed-in users already gave theirs, so they get the plain marking
    // screen and reveal straight away.
    setPhase(isSignedIn ? "marking" : "email");
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

      // Hand the result to /pricing so the funnel never loses context — the
      // pricing page shows "{band} → {topBand} in {subject}" instead of a
      // generic pitch. Pre-auth by design (no user exists yet).
      try {
        const s = computeSummary(data.results as MarkingResult[]);
        const topBand = curriculum.gradeBands[0];
        localStorage.setItem("studyace-grade-result", JSON.stringify({
          bandLabel: s.bandLabel,
          grade: s.grade,
          pct: s.pct,
          subjectLabel: curriculum.subjects.find((x) => x.value === subject)?.label ?? subject,
          topBandLabel: topBand?.label ?? "the top grade",
          targetMonth: new Date(Date.now() + 35 * 864e5).toLocaleString("en-NZ", { month: "long" }),
          system: curriculum.system,
          ts: Date.now(),
        }));
      } catch {}
      if (isSignedIn) {
        setPhase("revealed");
        const addr = user?.primaryEmailAddress?.emailAddress;
        if (addr) {
          void sendEmail(addr, data.results as MarkingResult[]);
          setEmailStatus("sent");
        }
      }
      // Anonymous: the reveal effect below fires once the email step is done.
    } catch (e) {
      // Marking died after they may have typed their email — bank the lead
      // anyway so it still shows up in /admin.
      if (!isSignedIn && EMAIL_RE.test(emailRef.current.trim())) {
        void fetch("/api/diagnostic/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailRef.current, name: nameRef.current, curriculum: curriculumId, subject, leadOnly: true }),
        }).catch(() => {});
      }
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setPhase("error");
    }
  }

  // Anonymous reveal: needs BOTH the marked results and the email step done —
  // whichever finishes last triggers it. Sends the report to the captured
  // address (also logs the diagnostic_lead).
  useEffect(() => {
    if (phase !== "email" || !emailSubmitted || !results) return;
    setPhase("revealed");
    void sendEmail(emailRef.current, results);
    setEmailStatus("sent");
    // sendEmail is re-created per render but only depends on stable state here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, emailSubmitted, results]);

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
          name: nameRef.current,
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

  // ── PICK ── littlenudge-style wizard (modelled on littlenudge.io/start):
  // thin progress bar, ONE question per screen, tap a pill to auto-advance.
  // name → country → state/exam (when the country has several) → year →
  // subject; the subject tap launches the diagnostic immediately.
  if (phase === "pick" || phase === "error") {
    const steps: PickStep[] = [
      "name",
      "country",
      ...(systems.length > 1 ? (["system"] as PickStep[]) : []),
      "year",
      "subject",
    ];
    const stepIdx = Math.max(0, steps.indexOf(pickStep));
    const pillBase = "rounded-full text-left border transition-colors min-h-[48px] py-3 px-4 text-[14px] font-medium bg-white/[0.02] border-white/[0.08] text-zinc-200 hover:border-indigo-400/60 hover:bg-indigo-500/[0.06]";

    const heading =
      pickStep === "name" ? "What\u2019s your first name?"
      : pickStep === "country" ? (firstName.trim() ? `Where do you study, ${firstName.trim()}?` : "Where do you study?")
      : pickStep === "system" ? (country === "AU" ? "Which state are you in?" : "Which exam do you sit?")
      : pickStep === "year" ? (country === "US" || country === "CA" ? "What grade are you in?" : "What year are you in?")
      : "Last one \u2014 which subject should we check?";
    const subline =
      pickStep === "name" ? "We\u2019ll put it on your grade report. Takes about 2 minutes \u2014 no card, no signup."
      : pickStep === "country" ? "So your questions match your country\u2019s real exams."
      : pickStep === "system" ? "Every system gets its own exam style \u2014 we test you on yours."
      : pickStep === "year" ? "Questions come at your level \u2014 not too easy, not unfair."
      : "You\u2019ll sit 8 quick questions, marked honestly, and see the grade you\u2019d get today.";

    return (
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full"
            style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(79,70,229,0.14) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }} />
        </div>
        <div className="max-w-xl mx-auto px-5 pt-12 sm:pt-20 pb-24">

          {/* Progress bar — littlenudge-style thin track */}
          <div className="flex items-center gap-3 mb-10 sm:mb-14">
            {stepIdx > 0 && (
              <button onClick={() => setPickStep(steps[stepIdx - 1])}
                className="shrink-0 text-zinc-500 hover:text-zinc-300 text-[13px] font-medium transition-colors" aria-label="Back">
                ←
              </button>
            )}
            <div className="flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                style={{ width: `${((stepIdx + 1) / (steps.length + 1)) * 100}%` }} />
            </div>
            <span className="shrink-0 font-mono text-[11px] text-zinc-600">{stepIdx + 1}/{steps.length}</span>
          </div>

          {phase === "error" && error && (
            <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/25 px-4 py-3 text-rose-300 text-[13px]">{error}</div>
          )}

          <h1 key={pickStep} className={`${display.className} home-rise text-[30px] sm:text-[40px] font-bold text-white tracking-[-0.02em] leading-[1.1] mb-3`}
            style={{ textWrap: "balance" }}>
            {heading}
          </h1>
          <p className="home-rise text-zinc-400 text-[14px] sm:text-[15.5px] mb-8 max-w-md" style={{ animationDelay: "80ms" }}>
            {subline}
          </p>

          {pickStep === "name" && (
            <form className="home-rise" style={{ animationDelay: "160ms" }}
              onSubmit={(e) => { e.preventDefault(); if (firstName.trim()) setPickStep("country"); }}>
              <label className="block text-[13px] font-semibold text-zinc-300 mb-2">First name</label>
              <input
                autoFocus type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                placeholder="e.g. Katelyn" autoComplete="given-name"
                className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.1] px-5 py-4 text-[16px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/70 mb-4"
              />
              <button type="submit" disabled={!firstName.trim()}
                className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-4 text-[15px] font-extrabold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-40 disabled:shadow-none transition-all">
                Next
              </button>
              <p className="text-zinc-600 text-[12px] text-center mt-4">Free grade check · no account needed · 8 questions</p>
            </form>
          )}

          {pickStep === "country" && (
            <div className="home-rise grid grid-cols-1 sm:grid-cols-2 gap-2.5" style={{ animationDelay: "160ms" }}>
              {COUNTRIES.map((co) => (
                <button key={co.code}
                  onClick={() => {
                    pickCountry(co.code);
                    setPickStep(curriculaForCountry(co.code).length > 1 ? "system" : "year");
                  }}
                  className={`${pillBase} flex items-center gap-3`}>
                  <span className="text-[20px] leading-none" aria-hidden>{co.flag}</span>{co.label}
                </button>
              ))}
            </div>
          )}

          {pickStep === "system" && (
            <div className="home-rise grid grid-cols-1 sm:grid-cols-2 gap-2.5" style={{ animationDelay: "160ms" }}>
              {systems.map((c) => (
                <button key={c.id}
                  onClick={() => { pickSystem(c.id); setPickStep("year"); }}
                  className={`${pillBase} flex items-center gap-2`}>
                  {c.regionShort && <span className="text-zinc-500 font-semibold">{c.regionShort}</span>}
                  {c.system}
                </button>
              ))}
            </div>
          )}

          {pickStep === "year" && (
            <div className="home-rise grid grid-cols-2 gap-2.5" style={{ animationDelay: "160ms" }}>
              {years.map((y) => (
                <button key={y.value}
                  onClick={() => { setYear(y.value); setSubject(null); setPickStep("subject"); }}
                  className={`${pillBase} text-center`}>
                  {y.label}
                </button>
              ))}
            </div>
          )}

          {pickStep === "subject" && (
            <div className="home-rise grid grid-cols-1 sm:grid-cols-2 gap-2.5" style={{ animationDelay: "160ms" }}>
              {subjects.map((sub) => (
                <button key={sub.value}
                  onClick={() => { setSubject(sub.value); void start(sub.value); }}
                  className={pillBase}>
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          <p className="text-zinc-600 text-[12px] text-center mt-10">
            Already practising? <Link href="/subjects" className="text-indigo-400 hover:underline">Go to your exams</Link>
          </p>
        </div>
      </div>
    );
  }

  // ── EMAIL ── littlenudge-style contact step, shown while the paper is
  // being marked in the background. The grade reveals the moment both the
  // marking and this step are done — the ask never adds wait time.
  if (phase === "email") {
    const waiting = emailSubmitted && !results;
    return (
      <div className="max-w-md mx-auto px-5 pt-14 sm:pt-20 pb-24">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <h1 className={`${display.className} text-white font-bold text-[24px] tracking-[-0.02em] mb-2`}>
            {firstName.trim() ? `Nice work, ${firstName.trim()} — your paper is with the examiner…` : "Your paper is with the examiner…"}
          </h1>
          <p className="text-zinc-400 text-[14px]">Marked honestly — no leniency, no fake praise.</p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (EMAIL_RE.test(email.trim())) { setEmailError(null); setEmailSubmitted(true); }
            else setEmailError("Please enter a valid email address.");
          }}
          className="rounded-2xl bg-white/[0.015] border border-white/[0.07] p-5">
          <p className="text-white font-bold text-[16px] mb-1">Where should we send your grade report?</p>
          <p className="text-zinc-500 text-[12.5px] mb-4">Your grade + the full marked paper, straight to your inbox.</p>
          {!firstName.trim() && (
            <input
              type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
              placeholder="First name" autoComplete="given-name"
              className="w-full mb-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-[14px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
            />
          )}
          <input
            autoFocus
            type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address" autoComplete="email" inputMode="email"
            className="w-full mb-3 rounded-xl bg-white/[0.04] border border-white/[0.08] px-4 py-3 text-[14px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
          />
          {emailError && <p className="text-rose-400 text-[12px] mb-2">{emailError}</p>}
          <button type="submit" disabled={waiting}
            className="w-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-3.5 text-[15px] font-extrabold text-white shadow-lg shadow-indigo-500/30 disabled:opacity-70 transition-all">
            {waiting ? "Marking your paper…" : "Show my grade →"}
          </button>
          <p className="text-zinc-600 text-[11px] text-center mt-2.5">No spam — just your report and your path to the top grade.</p>
        </form>
      </div>
    );
  }

  // ── LOADING / MARKING ──
  if (phase === "loading" || phase === "marking") {
    return (
      <div className="max-w-md mx-auto px-5 pt-28 pb-24 text-center">
        <div className="w-14 h-14 mx-auto mb-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
        <h1 className={`${display.className} text-white font-bold text-[22px] tracking-[-0.02em] mb-2`}>
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
                className={`w-8 h-8 rounded-full text-[11px] font-medium transition-colors ${
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

        <div className="rounded-2xl bg-white/[0.015] border border-white/[0.07] p-4 sm:p-5">
          <p className="font-mono text-[11px] text-zinc-500 uppercase tracking-wider font-semibold mb-1.5">Question {currentQ + 1} of {paper.questions.length}</p>

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
                  className={`block w-full text-left px-4 py-3 rounded-xl border transition-colors min-h-[44px] text-[14px] ${
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
                className="rounded-full border border-white/[0.12] px-5 py-4 text-[15px] font-semibold text-zinc-300 hover:border-white/[0.3] hover:bg-white/[0.04] transition-all">
                ← Back
              </button>
            )}
            {isLast ? (
              <button onClick={submitTest}
                className="flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-4 text-[15px] font-extrabold text-white shadow-lg shadow-indigo-500/30">
                See my grade →
              </button>
            ) : (
              <button onClick={() => setCurrentQ((c) => c + 1)}
                className="flex-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-4 text-[15px] font-extrabold text-white shadow-lg shadow-indigo-500/30">
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
        className="inline-flex w-full justify-center items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-5 py-4 text-[15px] font-extrabold text-white shadow-lg shadow-indigo-500/30 hover:scale-[1.01] transition-transform">
        Start my plan — NZ$15/mo →
      </Link>
    );

    return (
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
          <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full"
            style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(79,70,229,0.16) 0%, rgba(79,70,229,0.05) 45%, transparent 70%)" }} />
        </div>
        <div className="max-w-2xl mx-auto px-5 pt-10 pb-32">

          {/* ── The reveal ── */}
          <div className="text-center mb-10">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-6">
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
            <div className={`${display.className} text-[52px] sm:text-[64px] font-bold leading-none tracking-[-0.03em] mb-2 ${gradeColor(grade)}`}>
              {bandLabel}
            </div>
            <p className="text-zinc-400 text-[13px]">
              Marked honestly, question by question — your full marked paper is below.
            </p>
          </div>

          {/* ── "You could be here in 1 month" projection ──
              4 weekly checkpoints from today's % into the top band. Rendered
              as an animated SVG line (pathLength=1 normalisation drives the
              draw-in). Explicitly labelled a training target, not a promise. */}
          {(() => {
            const target = atTop ? Math.min(pct + 5, 98) : Math.min(topPct + 4, 96);
            const g2 = target - pct;
            const vals = [pct, pct + g2 * 0.32, pct + g2 * 0.58, pct + g2 * 0.82, target];
            const X = (i: number) => 26 + i * 67;
            const Y = (v: number) => 128 - v * 1.08;
            const pts = vals.map((v, i) => `${X(i)},${Y(v)}`).join(" ");
            return (
              <div className="rounded-2xl bg-white/[0.015] border border-white/[0.07] px-5 pt-5 pb-4 mb-5">
                <p className={`${display.className} text-white font-bold text-[17px] tracking-[-0.01em] mb-0.5`}>
                  {atTop ? "One month of reps makes it unshakeable" : <>You could be here in <span className="text-indigo-300">1 month</span></>}
                </p>
                <p className="text-zinc-500 text-[12px] mb-3">
                  {atTop
                    ? "Top band today — the schedule's job is making it hold under full exam pressure."
                    : <>Today you&apos;re <span className="text-zinc-300 font-semibold">{gap} points</span> off {topBandLabel}{weakLabels.length > 0 && <> — mostly <span className="text-rose-300 font-semibold">{weakLabels.join(" and ")}</span></>}. Four weeks of 20 min/day is built to close exactly that.</>}
                </p>
                <svg viewBox="0 0 320 148" className="w-full h-auto" role="img"
                  aria-label={`Projection from ${pct}% today to the ${topBandLabel} zone in 4 weeks`}>
                  <defs>
                    <linearGradient id="projStroke" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#818cf8" /><stop offset="100%" stopColor="#e879f9" />
                    </linearGradient>
                    <linearGradient id="projFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(129,140,248,0.25)" /><stop offset="100%" stopColor="rgba(129,140,248,0)" />
                    </linearGradient>
                  </defs>
                  {/* top-band zone */}
                  <rect x="18" y={Y(100)} width="290" height={Y(topPct) - Y(100)} rx="4" fill="rgba(52,211,153,0.06)" />
                  <line x1="18" x2="308" y1={Y(topPct)} y2={Y(topPct)} stroke="rgba(52,211,153,0.35)" strokeWidth="1" strokeDasharray="4 4" />
                  <text x="22" y={Y(topPct) - 5} textAnchor="start" fill="#34d399" fontSize="9.5" fontWeight="700">{topBandLabel} zone · {topPct}%+</text>
                  {/* area + line */}
                  <polygon points={`${X(0)},${Y(0)} ${pts} ${X(4)},${Y(0)}`} fill="url(#projFill)"
                    style={{ opacity: ringOn ? 1 : 0, transition: "opacity 1s ease 800ms" }} />
                  <polyline points={pts} fill="none" stroke="url(#projStroke)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
                    pathLength={1} strokeDasharray={1}
                    style={{ strokeDashoffset: ringOn ? 0 : 1, transition: "stroke-dashoffset 1.6s ease-out 300ms" }} />
                  {/* endpoints */}
                  <circle cx={X(0)} cy={Y(vals[0])} r="5" fill="#818cf8" />
                  <circle cx={X(4)} cy={Y(vals[4])} r="6" fill="#e879f9"
                    style={{ opacity: ringOn ? 1 : 0, transition: "opacity 400ms ease 1700ms" }} />
                  <text x={X(4)} y={Math.max(Y(vals[4]) - 14, 12)} textAnchor="end" fill="#e879f9" fontSize="10" fontWeight="800"
                    style={{ opacity: ringOn ? 1 : 0, transition: "opacity 400ms ease 1700ms" }}>{targetMonth} · you</text>
                  {/* week ticks — slot 0 doubles as the "you today" label so it
                      can never collide with the line, whatever the score */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <text key={i} x={X(i)} y="146" textAnchor="middle"
                      fill={i === 0 ? "#d4d4d8" : "#52525b"} fontSize={i === 0 ? "9.5" : "9"} fontWeight={i === 0 ? 800 : 400}>
                      {i === 0 ? `You · ${pct}%` : `wk ${i}`}
                    </text>
                  ))}
                </svg>
                <p className="text-zinc-600 text-[10.5px] mt-1.5">Training target on 20 min/day — not a promise. The plan below is how it&apos;s reached.</p>
              </div>
            );
          })()}

          {/* ── The pitch ── */}
          <div className="relative rounded-2xl overflow-hidden mb-10">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/25 via-violet-600/15 to-violet-600/[0.08]" aria-hidden />
            <div className="relative border border-indigo-500/25 rounded-2xl px-5 py-6">
              <p className={`${display.className} text-white font-bold text-[20px] tracking-[-0.01em] mb-2 leading-snug`}>
                {atTop
                  ? <>Keep this grade locked in by {targetMonth}.</>
                  : <>{bandLabel} today doesn&apos;t have to be {bandLabel} in {targetMonth}.</>}
              </p>
              <p className="text-zinc-300 text-[13.5px] leading-relaxed mb-4">
                {!atTop && <>Jumping {gap} points doesn&apos;t come from rereading notes — it comes from reps that get marked. </>}
                The Student plan gives you unlimited {curriculum.system}-style exams with this same honest marking on
                every answer{weakLabels.length > 0 && <>, starting with <span className="font-semibold text-white">{weakLabels.join(" and ")}</span></>},
                plus a week-by-week schedule built from this exact result.
                20 minutes a day is the whole habit — <span className="text-white font-semibold">{atTop ? `walking into exam day at ${topBandLabel} level` : `sitting in the ${topBandLabel} zone by the end of ${targetMonth}`}</span>{" "}is
                the target it&apos;s built around. Not a promise — a training plan.
              </p>
              {/* The fork: make doing nothing feel like the expensive option. */}
              <p className="font-mono text-[11px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Two ways this goes</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5">
                <div className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3.5">
                  <p className="text-zinc-400 font-bold text-[13px] mb-1">✗ Close this tab</p>
                  <p className="text-zinc-500 text-[12px] leading-relaxed">
                    Nothing changes. You sit the real exam {atTop ? "hoping today wasn't a fluke" : <>still at <span className="text-rose-400 font-semibold">{bandLabel}</span>, hoping it goes differently on the day</>}. It usually doesn&apos;t.
                  </p>
                </div>
                <div className="rounded-xl border border-indigo-400/40 bg-indigo-500/[0.08] px-4 py-3.5">
                  <p className="text-white font-bold text-[13px] mb-1">✓ Train 20 min/day</p>
                  <p className="text-zinc-300 text-[12px] leading-relaxed">
                    Unlimited marked exams, weakest topics first, schedule on the wall — walking in {atTop ? `certain of ${topBandLabel}` : <>aiming <span className="text-emerald-400 font-semibold">{topBandLabel}</span></>}. NZ$15/mo.
                  </p>
                </div>
              </div>
              {pitchCta}
              <p className="text-zinc-500 text-[11px] mt-2.5 text-center">NZ$15/month · cancel anytime · cheaper than 15 minutes of tutoring</p>
            </div>
          </div>

          {/* ── The schedule preview ──
              A real look at the 4-week plan built from THIS result. Week 1 is
              fully visible (proof it's concrete, not vague promises); weeks
              2–4 show their mission but lock the day-by-day behind Student. */}
          {(() => {
            const w1 = weakLabels[0] ?? "your weakest topic";
            const w2 = weakLabels[1] ?? "your next weakest topic";
            const weeks: { title: string; mission: string; days?: string[] }[] = atTop
              ? [
                  { title: "Full paper under real time", mission: "Pressure-proof the top band", days: ["Mon · 20 min — timed mixed set, no notes", "Wed · 20 min — hardest question types only", "Fri · 20 min — timed mixed set, beat Monday", "Sun · full practice exam, marked honestly"] },
                  { title: "Kill the silly marks", mission: "Working shown on every answer" },
                  { title: "Speed + accuracy", mission: "Same score, two-thirds the time" },
                  { title: "Exam simulation week", mission: `Walk in already knowing you're ${topBandLabel}` },
                ]
              : [
                  { title: `Fix ${w1}`, mission: `Your biggest leak, plugged first`, days: [`Mon · 20 min — ${w1} fundamentals set`, `Wed · 20 min — ${w1} exam-style questions`, `Fri · 20 min — mixed set, ${w1} weighted`, "Sun · mini-exam, marked honestly like today"] },
                  { title: `Fix ${w2}`, mission: "Second leak, same treatment" },
                  { title: "Full paper under real time", mission: "Both fixes, under pressure" },
                  { title: "Exam simulation week", mission: `Sit it like the real thing — aiming ${topBandLabel} zone` },
                ];
            return (
              <div className="mb-10">
                <h2 className={`${display.className} text-white font-bold text-[22px] tracking-[-0.02em] mb-1`}>Your 4-week schedule</h2>
                <p className="text-zinc-500 text-[12.5px] mb-4">Built from this exact result — week 1 is exactly this concrete for all four weeks.</p>
                <div className="space-y-2.5">
                  {weeks.map((w, i) => (
                    <div key={i} className={`rounded-xl border px-4 py-3.5 ${i === 0 ? "bg-indigo-500/[0.06] border-indigo-500/25" : "bg-white/[0.02] border-white/[0.08]"}`}>
                      <div className="flex items-center gap-3">
                        <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-black ${i === 0 ? "bg-indigo-500 text-white" : "bg-white/[0.05] text-zinc-400 border border-white/[0.08]"}`}>
                          W{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-bold text-[14px] leading-tight">{w.title}</p>
                          <p className="text-zinc-500 text-[11.5px]">{w.mission}</p>
                        </div>
                        {i > 0 && <span className="text-zinc-600 text-[15px]" aria-hidden>🔒</span>}
                      </div>
                      {w.days ? (
                        <ul className="mt-3 space-y-1.5 pl-12">
                          {w.days.map((d) => (
                            <li key={d} className="text-zinc-300 text-[12.5px] flex items-start gap-2">
                              <span className="text-indigo-400 mt-px" aria-hidden>▸</span>{d}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2.5 pl-12 text-zinc-600 text-[12px]">Day-by-day plan unlocks with Student</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4">{pitchCta}</div>
              </div>
            );
          })()}

          {/* ── The marked paper ── */}
          <div className="mb-10">
            <h2 className={`${display.className} text-white font-bold text-[22px] tracking-[-0.02em] mb-1`}>Your marked paper</h2>
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
                          <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Your answer</p>
                          {yourWorking && <p className="text-zinc-400 text-[13px] whitespace-pre-wrap mb-1">{yourWorking}</p>}
                          <p className="text-zinc-200 text-[13px] whitespace-pre-wrap">{yourAnswer || <em className="text-zinc-500">final answer left blank</em>}</p>
                        </div>
                      ) : (
                        <p className="text-zinc-500 text-[13px] italic">Left blank — 0 marks by default.</p>
                      )}
                      <div>
                        <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-zinc-500 mb-1">Examiner&apos;s note</p>
                        <p className="text-zinc-300 text-[13px] leading-relaxed">{r.feedback}</p>
                      </div>
                      {!full && r.correctApproach && (
                        <div className="rounded-lg bg-emerald-500/[0.06] border border-emerald-500/20 px-3.5 py-3">
                          <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-emerald-400 mb-1">The full-marks approach</p>
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
              <p className={`${display.className} text-white font-bold text-[17px] tracking-[-0.01em] mb-1.5`}>
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
                  placeholder="Email me this report"
                  className="flex-1 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50"
                />
                <button type="submit" disabled={emailStatus === "sending"}
                  className="rounded-full border border-white/[0.12] px-4 py-2.5 text-[13px] font-semibold text-zinc-300 hover:border-white/[0.3] hover:bg-white/[0.04] disabled:opacity-60 transition-all">
                  {emailStatus === "sending" ? "Sending…" : "Send it"}
                </button>
              </form>
            )}
            {emailStatus === "error" && emailError && <p className="text-rose-400 text-[12px] mt-2">{emailError}</p>}
          </div>

          <p className="text-zinc-600 text-[12px] text-center">
            Want to retake it first? <button onClick={() => { setPhase("pick"); setResults(null); setPaper(null); setEmailStatus("idle"); }} className="text-indigo-400 hover:underline">Run another grade check</button>
          </p>
        </div>

        {/* ── Sticky plan bar — the offer stays on screen the whole way down ── */}
        <div className="fixed bottom-0 inset-x-0 z-20 bg-[#06060a]/95 backdrop-blur-md border-t border-white/[0.08] px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <div className="hidden sm:block flex-1 min-w-0">
              <p className="text-white font-bold text-[13px] leading-tight truncate">
                {atTop ? <>{bandLabel} — now make it stick</> : <><span className={gradeColor(grade)}>{bandLabel}</span> <span className="text-zinc-500">→</span> <span className="text-emerald-400">{topBandLabel}</span></>}
              </p>
              <p className="text-zinc-500 text-[11px] truncate">target by end of {targetMonth} · 20 min/day</p>
            </div>
            <Link href="/pricing"
              className="flex-1 sm:flex-none inline-flex justify-center items-center rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 px-6 py-3 text-[14px] font-extrabold text-white shadow-lg shadow-indigo-500/30">
              Start my plan — NZ$15/mo →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
