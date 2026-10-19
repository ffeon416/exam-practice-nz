"use client";

// ── The parent check ──
// "Is your teen on track for the grade you want?" The grade check is for the
// student; this is for the parent who pays. Same shape: a wizard of short
// questions (the teen, the subject, the grade now, the goal after StudyAce,
// the exam date, a few typed sentences on how they actually study — read by
// the model into the habits the engine needs, so the verdict can quote the
// parent back), the parent's email right before the reveal, then a
// straight verdict. Eight screens when the timezone tells us the country.
// The working is shown with the three things that would change it.
// Arithmetic on their own answers — a rule of thumb, never a promise.

import { useEffect, useRef, useState } from "react";
import { display } from "@/lib/displayFont";
import OnTrackReveal from "@/components/OnTrackReveal";
import { resolveCurriculum, COUNTRIES, curriculaForCountry, type Curriculum } from "@/data/curricula";
import { trackEvent } from "@/lib/attribution";
import DatePicker from "@/components/DatePicker";
import { assess, typicalExamDate, GOALS, GRADES, type Days, type Focus, type GoalId, type Grade, type Marking, type OnTrackResult, type Practice } from "@/lib/onTrack";

type Step = "teen" | "year" | "subject" | "current" | "goal" | "exam" | "habits" | "contact";
type Reading = { days: Days; practice: Practice; marking: Marking; focus: Focus; observations: string[]; fixes: { title: string; why: string }[]; source: "ai" | "keywords" };
const EXAMPLES = [
  "She says she revises most nights but it’s mostly re-watching videos. Nobody checks it. Sunday she crams.",
  "Two nights a week with a tutor, does the homework he sets, not much in between. Avoids the hard topics.",
  "Honestly I don’t know what he does in his room. Grades have slipped since term two.",
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;


export default function OnTrackPage() {
  const [teen, setTeen] = useState("");
  const [country, setCountry] = useState<Curriculum["country"]>("NZ");
  const [curriculumId, setCurriculumId] = useState("nz-ncea");
  const [year, setYear] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [current, setCurrent] = useState<Grade | null | "unset">("unset");
  const [goal, setGoal] = useState<GoalId | null>(null);
  const [examMonth, setExamMonth] = useState<string | null>(null);
  const [story, setStory] = useState("");
  const [reading, setReading] = useState<Reading | null>(null);
  const [readingState, setReadingState] = useState<"idle" | "reading" | "error">("idle");
  const [example] = useState(() => EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)]);
  // The four habits the engine needs come from reading what the parent typed.
  const days: Days = reading?.days ?? "2-3";
  const practice: Practice = reading?.practice ?? "unsure";
  const marking: Marking = reading?.marking ?? "sometimes";
  const focus: Focus = reading?.focus ?? "whatever";

  // Read the typed description into habits + specific observations. Falls
  // back to a rough keyword read server-side, and to the middle options here.
  async function readStory() {
    if (story.trim().length < 8) { setReadingState("error"); return; }
    setReadingState("reading");
    try {
      const res = await fetch("/api/on-track/read", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: story.trim(), teen: teen.trim(), subject: subjectLabel }) });
      const data = (await res.json().catch(() => null)) as Reading | null;
      if (res.ok && data && data.days) setReading(data); else setReading(null);
    } catch { setReading(null); }
    setReadingState("idle");
    next();
  }
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
  const name = teen.trim() ? teen.trim().charAt(0).toUpperCase() + teen.trim().slice(1) : "your teen";

  function pickCountry(code: Curriculum["country"]) {
    setCountry(code); setYear(null); setSubject(null);
    const group = curriculaForCountry(code);
    // One system → chosen; several → the state/system chips decide (year list waits).
    setCurriculumId(group.length === 1 ? group[0].id : group.some((g) => g.id === curriculumId) ? curriculumId : "");
  }
  // Timezone → country, so most parents skip a question.
  useEffect(() => {
    const id = setTimeout(() => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
      const CA_TZ = new Set(["America/Toronto", "America/Vancouver", "America/Edmonton", "America/Winnipeg", "America/Halifax", "America/St_Johns", "America/Regina", "America/Moncton"]);
      let detected: Curriculum["country"] | null = null;
      if (tz === "Pacific/Auckland" || tz === "Pacific/Chatham") detected = "NZ";
      else if (tz.startsWith("Australia/")) detected = "AU";
      else if (tz === "Europe/London") detected = "GB";
      else if (CA_TZ.has(tz)) detected = "CA";
      else if (tz.startsWith("America/")) detected = "US";
      if (detected) pickCountry(detected);
    }, 0);
    return () => clearTimeout(id);
    // Mount-only detection; pickCountry is stable per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const steps: Step[] = ["teen", "year", "subject", "current", "goal", "exam", "habits", "contact"];
  const stepIdx = Math.max(0, steps.indexOf(step));
  const next = () => setStep(steps[Math.min(steps.length - 1, stepIdx + 1)]);
  const back = () => setStep(steps[Math.max(0, stepIdx - 1)]);

  function reveal() {
    if (!goal || !examMonth || current === "unset") return;
    const r = assess({ current, goal, examMonth, days, practice, marking, focus });
    // The model's fixes are written for this teen; use them when we have them.
    if (reading?.fixes.length) r.fixes = reading.fixes.slice(0, 3).map((f, i) => ({ id: (["timed", "marked", "weakest", "days"] as const)[i] ?? "days", title: f.title, why: f.why }));
    setResult(r);
    // Bank the lead and send the parent their copy. Fire-and-forget.
    void fetch("/api/on-track/email", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), name: parentName.trim(), teen: teen.trim(), curriculum: curriculumId, subject, current, goal, examMonth, days, practice, marking, focus, verdict: r.verdict, weeks: r.weeks, requiredHours: r.requiredHours, effectiveHours: r.effectiveHours, fixes: r.fixes.map((f) => f.title), story: story.trim().slice(0, 1200), observations: reading?.observations ?? [] }),
    }).catch(() => {});
    window.scrollTo({ top: 0 });
  }

  const pill = "rounded-full text-left border transition-colors min-h-[48px] py-3 px-4 text-[14px] font-medium bg-white/[0.02] border-white/[0.08] text-zinc-200 hover:border-indigo-400/60 hover:bg-indigo-500/[0.06]";
  const pillOn = "border-indigo-400/70 bg-indigo-500/[0.12] text-white";
  const chip = "rounded-full border px-3.5 min-h-[40px] text-[13.5px] font-medium transition-colors border-white/[0.1] text-zinc-300 hover:border-white/30";
  const chipOn = "!border-indigo-400/70 bg-indigo-500/[0.14] !text-white";
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
    return (
      <OnTrackReveal
        result={result} name={name} subjectLabel={subjectLabel} system={curriculum.system}
        current={current === "unset" ? null : current} examDate={examMonth ?? typicalExamDate(country)} email={email.trim()}
        firstFix={result.fixes[0]?.title}
      />
    );
  }

  // ── THE QUESTIONS ──
  const heading: Record<Step, string> = {
    teen: "What’s your teen’s first name?",
    year: `Where is ${name} at school, and what year?`,
    subject: "Which subject are you most worried about?",
    current: `What grade is ${name} getting in ${subjectLabel} right now?`,
    goal: `Where do you want ${name} to be after StudyAce?`,
    exam: `When is the ${subjectLabel} exam?`,
    habits: `How does ${name} actually study ${subjectLabel}?`,
    contact: `Last one — where should we send ${name}’s plan?`,
  };
  const subline: Record<Step, string> = {
    teen: "Eight quick taps. You’ll get a straight answer: on track, borderline, or not — and what would change it. No card, no sign-up.",
    year: "Country, exam system, year. The goal means something different in Year 11 than in the final year.",
    subject: "One subject at a time — pick the one that decides the most.",
    current: "From the last report, mock or test. Pick the closest.",
    goal: "Be honest about the goal — the whole answer depends on it.",
    exam: "Tap the day. If there are several papers, the first one. Not sure? There’s a button for that.",
    habits: "A few honest sentences. How often, what it looks like, whether anyone checks it. The more specific you are, the more specific the answer.",
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
        {step === "year" && (
          <div className="home-rise" style={{ animationDelay: "160ms" }}>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-500 mb-2">Country</p>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((c) => <button key={c.code} onClick={() => pickCountry(c.code)} className={`${chip} ${country === c.code ? chipOn : ""}`}>{c.flag} {c.label}</button>)}
            </div>
            {systems.length > 1 && (
              <>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-500 mt-5 mb-2">{country === "AU" ? "State" : "Exam system"}</p>
                <div className="flex flex-wrap gap-2">
                  {systems.map((sys) => <button key={sys.id} onClick={() => { setCurriculumId(sys.id); setYear(null); setSubject(null); }} className={`${chip} ${curriculumId === sys.id ? chipOn : ""}`}>{sys.regionShort ? `${sys.regionShort} · ` : ""}{sys.system}</button>)}
                </div>
              </>
            )}
            <p className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-zinc-500 mt-5 mb-2">{country === "US" || country === "CA" ? "Grade" : "Year"}</p>
            {!curriculumId || countryMismatch ? (
              <p className="text-zinc-500 text-[13.5px]">Pick the {country === "AU" ? "state" : "exam system"} first.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {years.map((y) => <button key={y.value} onClick={() => { setYear(y.value); setSubject(null); next(); }} className={`${pill} text-center ${year === y.value ? pillOn : ""}`}>{y.label}</button>)}
              </div>
            )}
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
          <div className="home-rise" style={{ animationDelay: "160ms" }}>
            <DatePicker value={examMonth ?? ""} onChange={(d) => { setExamMonth(d); next(); }} />
            <button onClick={() => { setExamMonth(typicalExamDate(country)); next(); }} className={`${pill} w-full mt-3 text-zinc-400`}>
              I&apos;m not sure — use the usual exam season
              <span className="block text-zinc-600 text-[12.5px] font-normal mt-0.5">{new Date(typicalExamDate(country) + "T12:00:00").toLocaleDateString("en-GB", { month: "long", year: "numeric" })} for {COUNTRIES.find((c) => c.code === country)?.label}</span>
            </button>
          </div>
        )}
        {step === "habits" && (
          <form className="home-rise" style={{ animationDelay: "160ms" }} onSubmit={(e) => { e.preventDefault(); void readStory(); }}>
            <textarea
              autoFocus value={story} onChange={(e) => { setStory(e.target.value); if (readingState === "error") setReadingState("idle"); }} rows={5} maxLength={1200}
              placeholder={`e.g. ${example}`}
              className="w-full rounded-2xl bg-white/[0.03] border border-white/[0.1] px-5 py-4 text-[16px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/70 resize-none leading-relaxed"
            />
            {readingState === "error" && <p className="text-rose-400 text-[12.5px] mt-2">A sentence or two is enough — but we need something to go on.</p>}
            <button type="submit" disabled={readingState === "reading"} className="w-full rounded-full bg-white text-[#0a0a0f] font-bold py-4 text-[15px] mt-4 disabled:opacity-70">
              {readingState === "reading" ? <span className="inline-flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-[#0a0a0f] animate-pulse" />Reading what you wrote…</span> : "Next →"}
            </button>
            <p className="text-zinc-600 text-[12px] text-center mt-3">Things worth mentioning: days a week · videos and notes vs timed questions · who marks it · which topics they avoid.</p>
          </form>
        )}
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
