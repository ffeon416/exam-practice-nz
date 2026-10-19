"use client";

// ── The parent check ──
// "Is your teen on track for the grade you want?" The grade check is for the
// student; this is for the parent who pays. Same shape: a wizard of short
// questions (the teen, where they study, the subject, the grade now, the goal
// after StudyAce, the exam month, four habits that decide whether study time
// turns into marks), the parent's email right before the reveal, then a
// straight verdict with the working shown and the three things that would
// change it. Arithmetic on their own answers — a rule of thumb, never a
// promise, and the page says so.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { resolveCurriculum, COUNTRIES, curriculaForCountry, type Curriculum } from "@/data/curricula";
import { trackEvent } from "@/lib/attribution";
import { assess, examMonthOptions, DAYS, FOCUS, GOALS, GRADES, HOURS_PER_GRADE, MARKING, PRACTICE, type Days, type Focus, type GoalId, type Grade, type Marking, type OnTrackResult, type Practice } from "@/lib/onTrack";

type Step = "teen" | "country" | "system" | "year" | "subject" | "current" | "goal" | "exam" | "days" | "practice" | "marking" | "focus" | "contact";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const VERDICT = {
  on: { label: "On track", color: "#3ee6a0", line: (n: string) => `${n} is putting in enough of the right kind of work to get there. The job now is to keep it up — and to know the moment it slips.` },
  borderline: { label: "Borderline", color: "#fbbf24", line: (n: string) => `${n} could get there, but there isn’t much slack. One bad month, or study that stays as it is, and the goal slides.` },
  off: { label: "Not on track", color: "#ff6b7a", line: (n: string) => `On what you’ve told us, ${n} won’t reach that grade by the exam the way things are. That’s fixable — but not by doing more of the same.` },
  hold: { label: "Already there — now hold it", color: "#7dd3fc", line: (n: string) => `${n} is at the grade you want. The risk isn’t the gap, it’s drifting — grades slip quietly when nobody is marking the work.` },
  unknown: { label: "We can’t tell yet", color: "#a78bfa", line: (n: string) => `Without a current grade there’s no gap to measure. The habits below still say a lot — and the free grade check gives ${n} a real grade in 2 minutes.` },
} as const;

export default function OnTrackPage() {
  const [teen, setTeen] = useState("");
  const [country, setCountry] = useState<Curriculum["country"]>("NZ");
  const [curriculumId, setCurriculumId] = useState("nz-ncea");
  const [year, setYear] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [current, setCurrent] = useState<Grade | null | "unset">("unset");
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [examMonth, setExamMonth] = useState<string | null>(null);
  const [days, setDays] = useState<Days | null>(null);
  const [practice, setPractice] = useState<Practice | null>(null);
  const [marking, setMarking] = useState<Marking | null>(null);
  const [focus, setFocus] = useState<Focus | null>(null);
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("teen");
  const [result, setResult] = useState<OnTrackResult | null>(null);

  const curriculum = resolveCurriculum(curriculumId);
  const systems = curriculaForCountry(country);
  const countryMismatch = curriculum.country !== country;
  const years = countryMismatch ? [] : curriculum.levels;
  const subjects = countryMismatch || year == null ? [] : curriculum.subjects.filter((s) => s.years.includes(year));
  const subjectLabel = curriculum.subjects.find((s) => s.value === subject)?.label ?? "the subject";
  const name = teen.trim() || "your teen";

  function pickCountry(code: Curriculum["country"]) {
    setCountry(code); setYear(null); setSubject(null);
    const group = curriculaForCountry(code);
    if (group.length === 1) setCurriculumId(group[0].id);
  }
  // Timezone → country, so most parents skip a question.
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
  }, []);

  // Funnel: one event per step reached (deduped), and the verdict.
  const logged = useRef("");
  useEffect(() => {
    const key = result ? "result" : step;
    if (logged.current === key) return;
    logged.current = key;
    if (result) trackEvent("ontrack_result", { verdict: result.verdict, curriculum: curriculumId, subject, goal, current: current === "unset" ? null : current });
    else trackEvent("ontrack_step", { step, curriculum: curriculumId, subject });
    // Only a new step or the result should log; the rest are read for context.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, result]);

  const steps: Step[] = ["teen", "country", ...(systems.length > 1 ? (["system"] as Step[]) : []), "year", "subject", "current", "goal", "exam", "days", "practice", "marking", "focus", "contact"];
  const stepIdx = Math.max(0, steps.indexOf(step));
  const next = () => setStep(steps[Math.min(steps.length - 1, stepIdx + 1)]);
  const back = () => setStep(steps[Math.max(0, stepIdx - 1)]);

  function reveal() {
    if (!goal || !examMonth || !days || !practice || !marking || !focus || current === "unset") return;
    const r = assess({ current, goal, examMonth, days, practice, marking, focus });
    setResult(r);
    // Bank the lead and send the parent their copy. Fire-and-forget.
    void fetch("/api/on-track/email", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), name: parentName.trim(), teen: teen.trim(), curriculum: curriculumId, subject, current, goal, examMonth, days, practice, marking, focus, verdict: r.verdict, weeks: r.weeks, requiredHours: r.requiredHours, effectiveHours: r.effectiveHours, fixes: r.fixes.map((f) => f.title) }),
    }).catch(() => {});
    window.scrollTo({ top: 0 });
  }

  const pill = "rounded-full text-left border transition-colors min-h-[48px] py-3 px-4 text-[14px] font-medium bg-white/[0.02] border-white/[0.08] text-zinc-200 hover:border-indigo-400/60 hover:bg-indigo-500/[0.06]";
  const pillOn = "border-indigo-400/70 bg-indigo-500/[0.12] text-white";
  const Options = <T extends string>({ items, value, onPick }: { items: { id: T; label: string; detail?: string }[]; value: T | null; onPick: (v: T) => void }) => (
    <div className="home-rise grid grid-cols-1 gap-2.5" style={{ animationDelay: "160ms" }}>
      {items.map((it) => (
        <button key={it.id} onClick={() => { onPick(it.id); next(); }} className={`${pill} ${value === it.id ? pillOn : ""}`}>
          <span className="block">{it.label}</span>
          {it.detail && <span className="block text-zinc-500 text-[12.5px] font-normal mt-0.5">{it.detail}</span>}
        </button>
      ))}
    </div>
  );

  // ── THE REVEAL ──
  if (result) {
    const v = VERDICT[result.verdict];
    const currentLabel = current === "unset" || current === null ? "?" : current;
    return (
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 pointer-events-none" aria-hidden>
          <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full" style={{ background: `radial-gradient(50% 50% at 50% 50%, ${v.color}22 0%, ${v.color}08 45%, transparent 70%)` }} />
        </div>
        <div className="max-w-xl mx-auto px-5 pt-10 sm:pt-16 pb-24">
          <p className="home-rise font-mono text-[11px] uppercase tracking-[0.22em] text-zinc-500 mb-4">{name} · {subjectLabel} · goal {result.goalGrade}</p>
          <div className="home-rise rounded-[28px] border-2 bg-[#0e0f13] p-7 sm:p-9 overflow-clip" style={{ borderColor: `${v.color}80`, boxShadow: `0 30px 90px -30px ${v.color}66`, backgroundImage: `radial-gradient(90% 80% at 50% 0%, ${v.color}1f 0%, transparent 70%)` }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: v.color }}>The verdict</p>
            <h1 className={`${display.className} text-white font-bold text-[40px] sm:text-[56px] tracking-[-0.03em] leading-[1] mt-2`}>{v.label}</h1>
            <p className="text-zinc-300 text-[15.5px] sm:text-[17px] leading-relaxed mt-4">{v.line(name)}</p>
          </div>

          {/* The working */}
          <div className="home-rise grid grid-cols-3 gap-2.5 mt-3" style={{ animationDelay: "120ms" }}>
            {[
              { e: "Grade", v: <>{currentLabel} <span className="text-zinc-500">→</span> {result.goalGrade}</>, l: result.verdict === "unknown" ? "current grade unknown" : result.steps === 0 ? "already at the goal" : `${result.steps} grade${result.steps > 1 ? "s" : ""} to climb` },
              { e: "Time", v: `${result.weeks} wk`, l: "until the exam" },
              { e: "Needs", v: result.verdict === "unknown" ? "?" : `${result.requiredHours}h`, l: `a week of marked practice · doing about ${result.effectiveHours}h that counts` },
            ].map((s) => (
              <div key={s.e} className="rounded-[20px] border border-white/[0.08] bg-[#0e0f13] p-3.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500">{s.e}</p>
                <p className={`${display.className} text-white font-bold text-[24px] sm:text-[28px] tracking-[-0.03em] leading-none mt-1.5`}>{s.v}</p>
                <p className="text-zinc-500 text-[11.5px] leading-snug mt-1.5">{s.l}</p>
              </div>
            ))}
          </div>
          <p className="home-rise text-zinc-600 text-[12px] leading-relaxed mt-3" style={{ animationDelay: "160ms" }}>
            How we got there: {result.verdict === "unknown" ? "no current grade, so no gap to measure" : `${result.steps || "0"} grade${result.steps === 1 ? "" : "s"} × about ${HOURS_PER_GRADE} focused hours each, spread over ${result.weeks} weeks`}. Time only counts when it’s timed questions, marked honestly, on the weak topics — so the {DAYS.find((d) => d.id === days)?.hours ?? 0}h a week of study you described is worth about {result.effectiveHours}h. A rule of thumb from what you told us, not a measurement, and no app can promise a grade.
          </p>

          {/* The fixes */}
          {result.fixes.length > 0 && (
            <div className="home-rise mt-8" style={{ animationDelay: "220ms" }}>
              <h2 className={`${display.className} text-white font-bold text-[24px] sm:text-[28px] tracking-[-0.02em]`}>{result.verdict === "on" ? "What keeps it that way" : "What changes the answer"}</h2>
              <ul className="mt-4 space-y-2.5">
                {result.fixes.map((f, i) => (
                  <li key={f.id} className="rounded-[20px] border border-white/[0.08] bg-[#0e0f13] p-4 flex gap-3.5">
                    <span className={`${display.className} shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-[14px] font-bold text-[#0a0a0f]`} style={{ background: v.color }}>{i + 1}</span>
                    <div><p className="text-white text-[15px] font-semibold">{f.title}</p><p className="text-zinc-400 text-[13.5px] leading-relaxed mt-1">{f.why}</p></div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.fixes.length === 0 && (
            <p className="home-rise text-zinc-300 text-[15px] leading-relaxed mt-8" style={{ animationDelay: "220ms" }}>The habits are right: regular, timed, marked, on the weak topics. {result.verdict === "off" ? "The gap is just bigger than the time left — so every session has to count, and the exam date has to be the one on the calendar, not a hope." : "Keep the routine and keep the marking honest."}</p>
          )}

          {/* The pitch */}
          <div className="home-rise rounded-[28px] border border-white/[0.1] bg-[#0e0f13] p-6 sm:p-8 mt-8" style={{ animationDelay: "300ms" }}>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#3ee6a0] font-bold">What StudyAce does about it</p>
            <h2 className={`${display.className} text-white font-bold text-[26px] sm:text-[32px] tracking-[-0.02em] leading-[1.1] mt-2`}>Every one of those fixes, every day, for {name}.</h2>
            <ul className="mt-4 space-y-2 text-zinc-300 text-[14.5px] leading-relaxed">
              <li>· A plan from today to the {subjectLabel} exam, 20 minutes a day, weakest topics first.</li>
              <li>· Exam-style questions in {curriculum.system} format, timed.</li>
              <li>· Every answer marked honestly, like an examiner would — no soft marks.</li>
              <li>· A pace line that shows whether {name} is heading for {result.goalGrade}, so you see it before the report does.</li>
            </ul>
            <Link href="/pricing" onClick={() => trackEvent("cta_click", { cta: "ontrack-pitch", page: "/on-track" })} className="mt-6 inline-flex w-full justify-center items-center gap-2 rounded-full bg-[#3ee6a0] px-5 py-4 text-[15px] font-extrabold text-[#0a0a0f] hover:brightness-105 transition">Start {name}’s plan — NZ$49/mo →</Link>
            <p className="text-zinc-500 text-[12.5px] text-center mt-3">Cancel any time. Less than one hour with a tutor.</p>
          </div>

          <div className="home-rise rounded-[22px] border border-white/[0.08] p-5 mt-4 flex items-center justify-between gap-4" style={{ animationDelay: "360ms" }}>
            <div><p className="text-white text-[14.5px] font-semibold">{result.verdict === "unknown" ? `Get ${name}’s real grade first` : "Check the grade you entered"}</p><p className="text-zinc-500 text-[12.5px] mt-0.5">{name} sits 8 real {subjectLabel} questions, marked honestly. 2 minutes, free.</p></div>
            <Link href="/grade" className="shrink-0 rounded-full border border-white/[0.14] text-white text-[13px] font-semibold px-4 py-2.5">Grade check →</Link>
          </div>
          <p className="text-zinc-600 text-[12px] text-center mt-6">A copy of this is on its way to {email.trim()}.</p>
        </div>
      </div>
    );
  }

  // ── THE QUESTIONS ──
  const heading: Record<Step, string> = {
    teen: "What’s your teen’s first name?",
    country: `Where does ${name} go to school?`,
    system: country === "AU" ? "Which state?" : "Which exam system?",
    year: country === "US" || country === "CA" ? `What grade is ${name} in?` : `What year is ${name} in?`,
    subject: "Which subject are you most worried about?",
    current: `What grade is ${name} getting in ${subjectLabel} right now?`,
    goal: `Where do you want ${name} to be after StudyAce?`,
    exam: `When is the ${subjectLabel} exam?`,
    days: `How many days a week does ${name} actually study ${subjectLabel}?`,
    practice: `When ${name} studies, what does it mostly look like?`,
    marking: `Does anyone mark ${name}’s practice work?`,
    focus: `What does ${name} spend study time on?`,
    contact: `Last one — where should we send ${name}’s plan?`,
  };
  const subline: Record<Step, string> = {
    teen: "Nine quick questions. You’ll get a straight answer: on track, borderline, or not — and what would change it. No card, no sign-up.",
    country: "So the grades and exam dates match the system they’re in.",
    system: "Each system has its own exams and grading.",
    year: "The goal means something different in Year 11 than in the final year.",
    subject: "One subject at a time — pick the one that decides the most.",
    current: "From the last report, mock or test. Pick the closest.",
    goal: "Be honest about the goal — the whole answer depends on it.",
    exam: "The month is enough. If there are several papers, the first one.",
    days: "Not homework — actual revision or practice for this subject.",
    practice: "This is the question that decides most grades.",
    marking: "Marked by someone other than themselves.",
    focus: "There’s no wrong answer, but there is a telling one.",
    contact: "The verdict shows here the moment you tap — and a copy goes to your inbox.",
  };

  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute -top-[10%] left-1/2 -translate-x-1/2 w-[1100px] h-[700px] rounded-full" style={{ background: "radial-gradient(50% 50% at 50% 50%, rgba(62,230,160,0.10) 0%, rgba(79,70,229,0.06) 45%, transparent 70%)" }} />
      </div>
      <div className="max-w-xl mx-auto px-5 pt-12 sm:pt-20 pb-24">
        <div className="flex items-center gap-3 mb-10 sm:mb-14">
          {stepIdx > 0 && <button onClick={back} className="shrink-0 text-zinc-500 hover:text-zinc-300 text-[13px] font-medium transition-colors" aria-label="Back">←</button>}
          <div className="flex-1 h-1 rounded-full bg-white/[0.07] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-[#3ee6a0] to-indigo-500 transition-all duration-300" style={{ width: `${((stepIdx + 1) / (steps.length + 1)) * 100}%` }} /></div>
          <span className="shrink-0 font-mono text-[11px] text-zinc-600">{stepIdx + 1}/{steps.length}</span>
        </div>
        {step === "teen" && <p className="home-rise font-mono text-[11px] uppercase tracking-[0.22em] text-[#3ee6a0] mb-4">For parents · Is your teen on track?</p>}
        <h1 key={step} className={`${display.className} home-rise text-[30px] sm:text-[40px] font-bold text-white tracking-[-0.02em] leading-[1.1] mb-3`} style={{ textWrap: "balance" }}>{heading[step]}</h1>
        <p className="home-rise text-zinc-400 text-[14px] sm:text-[15.5px] mb-8 max-w-md" style={{ animationDelay: "80ms" }}>{subline[step]}</p>

        {step === "teen" && (
          <form className="home-rise" style={{ animationDelay: "160ms" }} onSubmit={(e) => { e.preventDefault(); if (teen.trim()) next(); }}>
            <label className="block text-[13px] font-semibold text-zinc-300 mb-2">Their first name</label>
            <input autoFocus type="text" value={teen} onChange={(e) => setTeen(e.target.value)} placeholder="e.g. Maia" autoComplete="off" className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.1] px-5 py-4 text-[16px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/70 mb-4" />
            <button type="submit" disabled={!teen.trim()} className="w-full rounded-full bg-white text-[#0a0a0f] font-bold py-4 text-[15px] disabled:opacity-40">Next →</button>
          </form>
        )}
        {step === "country" && (
          <div className="home-rise grid grid-cols-1 sm:grid-cols-2 gap-2.5" style={{ animationDelay: "160ms" }}>
            {/* The step list depends on the country just picked (one system or
                several), so go to the right next step explicitly. */}
            {COUNTRIES.map((c) => <button key={c.code} onClick={() => { pickCountry(c.code); setStep(curriculaForCountry(c.code).length > 1 ? "system" : "year"); }} className={`${pill} ${country === c.code ? pillOn : ""}`}>{c.flag} {c.label}</button>)}
          </div>
        )}
        {step === "system" && (
          <div className="home-rise grid grid-cols-1 sm:grid-cols-2 gap-2.5" style={{ animationDelay: "160ms" }}>
            {systems.map((s) => <button key={s.id} onClick={() => { setCurriculumId(s.id); setYear(null); setSubject(null); next(); }} className={`${pill} ${curriculumId === s.id ? pillOn : ""}`}>{s.regionShort ? `${s.regionShort} · ` : ""}{s.system}</button>)}
          </div>
        )}
        {step === "year" && (
          <div className="home-rise grid grid-cols-2 sm:grid-cols-3 gap-2.5" style={{ animationDelay: "160ms" }}>
            {years.map((y) => <button key={y.value} onClick={() => { setYear(y.value); setSubject(null); next(); }} className={`${pill} text-center ${year === y.value ? pillOn : ""}`}>{y.label}</button>)}
          </div>
        )}
        {step === "subject" && (
          <div className="home-rise grid grid-cols-1 sm:grid-cols-2 gap-2.5" style={{ animationDelay: "160ms" }}>
            {subjects.map((s) => <button key={s.value} onClick={() => { setSubject(s.value); next(); }} className={`${pill} ${subject === s.value ? pillOn : ""}`}>{s.label}</button>)}
          </div>
        )}
        {step === "current" && (
          <div className="home-rise" style={{ animationDelay: "160ms" }}>
            <div className="grid grid-cols-3 gap-2.5">
              {[...GRADES].reverse().map((g) => <button key={g} onClick={() => { setCurrent(g); next(); }} className={`${pill} text-center ${display.className} text-[20px] font-bold ${current === g ? pillOn : ""}`}>{g}</button>)}
            </div>
            <button onClick={() => { setCurrent(null); next(); }} className={`${pill} w-full mt-2.5 text-zinc-400 ${current === null ? pillOn : ""}`}>I honestly don’t know</button>
          </div>
        )}
        {step === "goal" && <Options items={GOALS.map((g) => ({ id: g.id, label: `${g.label} · ${g.grade}`, detail: g.detail }))} value={goal} onPick={setGoal} />}
        {step === "exam" && (
          <div className="home-rise grid grid-cols-2 sm:grid-cols-3 gap-2.5" style={{ animationDelay: "160ms" }}>
            {examMonthOptions().slice(0, 15).map((m) => <button key={m.value} onClick={() => { setExamMonth(m.value); next(); }} className={`${pill} text-center text-[13.5px] ${examMonth === m.value ? pillOn : ""}`}>{m.label}</button>)}
          </div>
        )}
        {step === "days" && <Options items={DAYS} value={days} onPick={setDays} />}
        {step === "practice" && <Options items={PRACTICE} value={practice} onPick={setPractice} />}
        {step === "marking" && <Options items={MARKING} value={marking} onPick={setMarking} />}
        {step === "focus" && <Options items={FOCUS} value={focus} onPick={setFocus} />}
        {step === "contact" && (
          <form className="home-rise" style={{ animationDelay: "160ms" }} onSubmit={(e) => { e.preventDefault(); if (!EMAIL_RE.test(email.trim())) { setEmailError("Please enter a valid email address."); return; } setEmailError(null); reveal(); }}>
            <label className="block text-[13px] font-semibold text-zinc-300 mb-2">Your first name</label>
            <input autoFocus type="text" value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="e.g. Sarah" autoComplete="given-name" className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.1] px-5 py-4 text-[16px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/70 mb-4" />
            <label className="block text-[13px] font-semibold text-zinc-300 mb-2">Your email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" inputMode="email" className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.1] px-5 py-4 text-[16px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/70 mb-2" />
            {emailError && <p className="text-rose-400 text-[12px] mb-2">{emailError}</p>}
            <button type="submit" className="w-full rounded-full bg-[#3ee6a0] text-[#0a0a0f] font-extrabold py-4 text-[15px] mt-2">Show me {name}’s verdict →</button>
            <p className="text-zinc-600 text-[12px] text-center mt-3">We’ll send the verdict and plan. No spam, unsubscribe in one tap.</p>
          </form>
        )}
      </div>
    </div>
  );
}
