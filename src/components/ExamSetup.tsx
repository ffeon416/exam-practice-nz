"use client";

// The exam setup wizard. Used twice: a paying student's first five minutes
// (/welcome, mode "first") and setting up the NEXT exam, inline on the
// schedule page (mode "next": prefilled, no install step, plan restarts at
// day 1). Left: the steps. Right: the one you're on.
//   1 exam system + year   2 subjects   3 goal per subject + exam date
//   4 add to home screen (first only)   5 grade check, ready
// The grade check builds in the background from step 3.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { setScopeUserId, scopedKey } from "@/lib/userScope";
import { display } from "@/lib/displayFont";
import { loadOnboarding, saveOnboarding } from "@/lib/onboarding";
import { COUNTRIES, curriculaForCountry, resolveCurriculum, type Curriculum } from "@/data/curricula";
import { CURRICULUM_LS_KEY, adoptPaper, getOrBuildToday } from "@/lib/nextPaper";
import { localDateKey } from "@/lib/dailyTask";
import { setGoal } from "@/lib/goals";
import DatePicker from "@/components/DatePicker";
import type { Exam } from "@/lib/types";

type Step = 1 | 2 | 3 | 4 | 5;
interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

function isStandalone(): boolean {
  try { return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true; } catch { return false; }
}
function isIOS(): boolean { return /iPhone|iPad|iPod/.test(navigator.userAgent); }

const btn = "w-full bg-white text-[#0a0a0f] font-bold text-[16px] py-4 rounded-full min-h-[52px] disabled:opacity-40 transition-transform hover:scale-[1.01]";
const h2 = `text-[24px] sm:text-[30px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-2`;
const chip = (on: boolean) => `px-4 py-2.5 rounded-full text-[13.5px] font-semibold min-h-[44px] border transition-colors ${on ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : "border-white/[0.12] text-zinc-300 hover:border-white/30"}`;

export default function ExamSetup({ mode, intro }: { mode: "first" | "next"; intro?: string }) {
  const router = useRouter();
  const nextExam = mode === "next";
  const { user, isLoaded } = useUser();
  const [step, setStep] = useState<Step>(1);
  const [country, setCountry] = useState<Curriculum["country"]>("NZ");
  const [curriculumId, setCurriculumId] = useState<string>("nz-ncea");
  const [year, setYear] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [goals, setGoals] = useState<Record<string, string>>({});
  const [examDate, setExamDate] = useState<string>("");
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const bip = useRef<BIPEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);
  const [paper, setPaper] = useState<Exam | null>(null);
  const [buildFailed, setBuildFailed] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      if (isLoaded) setScopeUserId(user?.id ?? null);
      const ob = loadOnboarding();
      if (ob?.subjects.length && !nextExam) { router.replace("/schedule"); return; }
      if (ob && nextExam) {
        // Prefill from the current setup; they usually only change the date.
        const c = resolveCurriculum(ob.curriculumId);
        setCountry(c.country); setCurriculumId(c.id); setYear(ob.yearLevel); setSubjects(ob.subjects);
      }
      setInstalled(isStandalone());
      setIos(isIOS());
    }, 0);
    const onBip = (e: Event) => { e.preventDefault(); bip.current = e as BIPEvent; setCanPrompt(true); };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => { clearTimeout(id); window.removeEventListener("beforeinstallprompt", onBip); };
  }, [router, nextExam, isLoaded, user?.id]);

  const curriculum = resolveCurriculum(curriculumId);
  const systems = curriculaForCountry(country);
  const yearSubjects = year != null ? curriculum.subjects.filter((s) => s.years.includes(year)) : [];
  const bands = [...curriculum.gradeBands].sort((a, b) => b.minPct - a.minPct).filter((b) => b.tone !== "fail");
  const label = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;
  const [minDate] = useState(() => new Date(Date.now() + 864e5).toISOString().slice(0, 10));

  function pickCountry(code: Curriculum["country"]) {
    setCountry(code); setYear(null); setSubjects([]);
    const group = curriculaForCountry(code);
    setCurriculumId(group.length === 1 ? group[0].id : "");
  }
  function toggleSubject(v: string) {
    setSubjects((prev) => prev.includes(v) ? prev.filter((s) => s !== v) : prev.length >= 3 ? prev : [...prev, v]);
  }
  function goToGoals() {
    setGoals((g) => Object.fromEntries(subjects.map((s) => [s, g[s] ?? bands[0].id])));
    setStep(3);
  }
  async function finishGoals() {
    if (year == null || subjects.length === 0 || !examDate) return;
    if (isLoaded) setScopeUserId(user?.id ?? null);
    saveOnboarding({ yearLevel: year, subjects, curriculumId });
    try { localStorage.setItem(CURRICULUM_LS_KEY, curriculumId); } catch {}
    // A new exam = a new plan: day 1 is today, the old task log is gone.
    for (const s of subjects) await setGoal({ subject: s, goal: goals[s] ?? bands[0].id, examDate, curriculumId, year }, { restart: nextExam });
    if (nextExam) { try { localStorage.removeItem(scopedKey("studyace-task-log")); localStorage.removeItem("studyace-tomorrow-task"); } catch {} }
    // The grade check IS day 1's task, so it's built under today's date.
    getOrBuildToday({ date: localDateKey(), subject: subjects[0], task: "check" })
      .then((r) => { if (r) setPaper(r.exam); else setBuildFailed(true); })
      .catch(() => setBuildFailed(true));
    setStep(installed || nextExam ? 5 : 4);
  }
  async function promptInstall() {
    const ev = bip.current; if (!ev) return;
    try { await ev.prompt(); const c = await ev.userChoice; if (c.outcome === "accepted") setInstalled(true); } catch {}
  }
  function startPaper() {
    if (!paper) return;
    adoptPaper(paper);
    router.push(`/exam/${paper.id}?mode=practice`);
  }

  const firstName = user?.firstName?.trim();
  const steps: { n: Step; title: string; done: string }[] = [
    { n: 1, title: "Your exam", done: curriculumId && year != null ? `${curriculum.system} · ${curriculum.levels.find((l) => l.value === year)?.label ?? ""}` : "" },
    { n: 2, title: "Subjects", done: subjects.map(label).join(", ") },
    { n: 3, title: "Goal and date", done: examDate ? `${subjects.map((s) => bands.find((b) => b.id === goals[s])?.label ?? "").filter(Boolean).join(" · ")} · ${new Date(examDate + "T12:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}` : "" },
    ...(nextExam ? [] : [{ n: 4 as Step, title: "Home screen", done: installed ? "Installed" : "" }]),
    { n: 5, title: "Grade check", done: paper ? "Ready" : "" },
  ];
  const pos = steps.findIndex((s) => s.n === step);

  return (
    <div className="grid grid-cols-1 md:grid-cols-[230px_1fr] gap-8 md:gap-12">
      {/* Steps */}
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-indigo-300">{nextExam ? "Your next exam" : isLoaded && firstName ? `Welcome, ${firstName}` : "Welcome"}</p>
        <p className={`${display.className} text-white font-bold text-[26px] sm:text-[30px] leading-[1] tracking-[-0.03em] mt-2`}>{nextExam ? "Set it up in five." : "Five quick steps."}</p>
        {intro && <p className="text-zinc-400 text-[13.5px] leading-relaxed mt-3">{intro}</p>}
        <ol className="mt-6 hidden md:block">
          {steps.map((s, i) => {
            const state = i < pos ? "done" : i === pos ? "now" : "todo";
            return (
              <li key={s.n} className="relative flex gap-3.5 pb-5 last:pb-0">
                {i < steps.length - 1 && <span className={`absolute left-[11px] top-6 bottom-0 w-px ${state === "done" ? "bg-indigo-400/60" : "bg-white/[0.08]"}`} aria-hidden />}
                <span className={`relative z-10 w-[23px] h-[23px] rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${state === "done" ? "bg-indigo-400 text-[#0a0a0f]" : state === "now" ? "bg-white text-[#0a0a0f]" : "border border-white/[0.15] text-zinc-500"}`}>
                  {state === "done" ? <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg> : i + 1}
                </span>
                <span className="min-w-0">
                  <span className={`block text-[14px] font-semibold leading-tight ${state === "todo" ? "text-zinc-500" : "text-white"}`}>{s.title}</span>
                  {state === "done" && s.done && <span className="block text-[11.5px] text-zinc-500 truncate mt-0.5">{s.done}</span>}
                </span>
              </li>
            );
          })}
        </ol>
        <div className="md:hidden flex items-center gap-3 mt-4">
          <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all duration-500" style={{ width: `${((pos + 1) / steps.length) * 100}%` }} /></div>
          <span className="font-mono text-[11px] text-zinc-500">{pos + 1} / {steps.length}</span>
        </div>
      </div>

      {/* The step */}
      <div className="min-w-0">
        {step === 1 && (
          <>
            <h2 className={`${display.className} ${h2}`}>{nextExam ? "Which exam is next?" : "Which exam are you sitting?"}</h2>
            <p className="text-zinc-400 text-[14px] mb-6">{nextExam ? "Check these are still right. Every paper is written in this system's style." : "Set once. Every paper is written in this system's style."}</p>
            <div className="grid grid-cols-5 gap-2 mb-5">
              {COUNTRIES.map((c) => (
                <button key={c.code} onClick={() => pickCountry(c.code)}
                  className={`rounded-2xl border py-3 min-h-[56px] flex flex-col items-center justify-center gap-0.5 transition-colors ${country === c.code ? "border-indigo-400/60 bg-indigo-500/[0.12] text-white" : "border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:border-white/25"}`}>
                  <span className="text-[18px]" aria-hidden>{c.flag}</span><span className="text-[10.5px] font-semibold">{c.code}</span>
                </button>
              ))}
            </div>
            {systems.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {systems.map((s) => (
                  <button key={s.id} onClick={() => { setCurriculumId(s.id); setYear(null); setSubjects([]); }} className={chip(curriculumId === s.id)}>
                    {s.system}{s.regionShort ? ` · ${s.regionShort}` : ""}
                  </button>
                ))}
              </div>
            )}
            {curriculumId && (
              <>
                <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-2">Year</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-7">
                  {curriculum.levels.map((l) => (
                    <button key={l.value} onClick={() => { setYear(l.value); setSubjects([]); }}
                      className={`rounded-2xl border px-4 py-3.5 min-h-[52px] text-left transition-colors ${year === l.value ? "border-indigo-400/60 bg-indigo-500/[0.12]" : "border-white/[0.08] bg-white/[0.02] hover:border-white/25"}`}>
                      <span className="block text-white font-semibold text-[15px]">{l.label}</span>
                      <span className="block text-zinc-500 text-[11.5px] truncate">{l.titlePrefix}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <button onClick={() => setStep(2)} disabled={!curriculumId || year == null} className={btn}>Continue</button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className={`${display.className} ${h2}`}>Pick up to three subjects</h2>
            <p className="text-zinc-400 text-[14px] mb-6">Your grade check is in the first one you tap.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-7">
              {yearSubjects.map((s) => {
                const on = subjects.includes(s.value); const idx = subjects.indexOf(s.value);
                return (
                  <button key={s.value} onClick={() => toggleSubject(s.value)}
                    className={`rounded-2xl border px-4 py-3.5 min-h-[52px] text-left flex items-center justify-between gap-2 transition-colors ${on ? "border-indigo-400/60 bg-indigo-500/[0.12] text-white" : "border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:border-white/25"}`}>
                    <span className="text-[14px] font-semibold">{s.label}</span>
                    {on && <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={goToGoals} disabled={subjects.length === 0} className={btn}>Continue</button>
            <button onClick={() => setStep(1)} className="w-full text-zinc-500 hover:text-zinc-300 text-[13px] py-3 mt-1">Back</button>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className={`${display.className} ${h2}`}>What grade, and when?</h2>
            <p className="text-zinc-400 text-[14px] mb-6">Be honest, not modest. Your schedule is built backwards from the date so you land on the grade on the day, and it tells you straight if the pace isn&apos;t realistic.</p>
            <div className="space-y-4 mb-6">
              {subjects.map((s) => (
                <div key={s}>
                  <p className="text-white font-semibold text-[14px] mb-2">{label(s)}</p>
                  <div className="flex flex-wrap gap-2">
                    {bands.map((b) => (
                      <button key={b.id} onClick={() => setGoals((g) => ({ ...g, [s]: b.id }))} className={chip(goals[s] === b.id)}>{b.label}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mb-7">
              <p className="text-white font-semibold text-[14px] mb-2">{nextExam ? "When is the exam?" : "When are your exams?"}</p>
              <DatePicker value={examDate} min={minDate} onChange={setExamDate} />
              <p className="text-zinc-500 text-[12px] mt-2">
                {examDate ? <>Exam on <span className="text-zinc-300">{new Date(examDate + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}</span>. You can set a date per subject later on the Pace page.</> : "Start of your exam period is fine. You can set a date per subject later on the Pace page."}
              </p>
            </div>
            <button onClick={finishGoals} disabled={!examDate || subjects.some((s) => !goals[s])} className={btn}>{nextExam ? "Build my schedule" : "Set my goals"}</button>
            <button onClick={() => setStep(2)} className="w-full text-zinc-500 hover:text-zinc-300 text-[13px] py-3 mt-1">Back</button>
          </>
        )}

        {step === 4 && (
          <>
            <p className="font-mono text-[11px] uppercase tracking-wider text-indigo-300 mb-2">Your first grade check is being written</p>
            <h2 className={`${display.className} ${h2}`}>While it builds, put StudyAce on your home screen</h2>
            <p className="text-zinc-400 text-[14px] mb-6">It opens full-screen like an app. That&apos;s where your schedule lives.</p>
            {canPrompt ? (
              <button onClick={promptInstall} className={`${btn} mb-3`}>Add to home screen</button>
            ) : (
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 mb-3">
                {ios ? (
                  <ol className="space-y-2.5 text-[14px] text-zinc-300">
                    <li className="flex gap-3"><span className="font-mono text-indigo-300">1</span> Tap the <span className="font-semibold text-white">Share</span> button at the bottom of Safari</li>
                    <li className="flex gap-3"><span className="font-mono text-indigo-300">2</span> Scroll and tap <span className="font-semibold text-white">Add to Home Screen</span></li>
                    <li className="flex gap-3"><span className="font-mono text-indigo-300">3</span> Tap <span className="font-semibold text-white">Add</span></li>
                  </ol>
                ) : (
                  <ol className="space-y-2.5 text-[14px] text-zinc-300">
                    <li className="flex gap-3"><span className="font-mono text-indigo-300">1</span> Open the browser menu (⋮)</li>
                    <li className="flex gap-3"><span className="font-mono text-indigo-300">2</span> Tap <span className="font-semibold text-white">Add to Home screen</span> or <span className="font-semibold text-white">Install app</span></li>
                  </ol>
                )}
              </div>
            )}
            <button onClick={() => setStep(5)} className="w-full border border-white/[0.15] text-zinc-200 font-semibold text-[15px] py-3.5 rounded-full min-h-[48px]">{installed ? "Done, continue" : "Continue"}</button>
          </>
        )}

        {step === 5 && (
          paper ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-300 mb-2">Ready</p>
              <h2 className={`${display.className} ${h2}`}>Your {label(subjects[0])} grade check is ready.</h2>
              <p className="text-zinc-400 text-[14px] mb-6">{paper.questions.length} questions, about {Math.max(10, Math.round(paper.questions.length * 2.5))} minutes, marked honestly the moment you finish. {nextExam ? "Day 1 of your new schedule starts from this number." : "This sets your starting point."}</p>
              <button onClick={startPaper} className={btn}>Start →</button>
            </>
          ) : buildFailed ? (
            <>
              <h2 className={`${display.className} ${h2}`}>That build didn&apos;t finish.</h2>
              <p className="text-zinc-400 text-[14px] mb-6">Head to your schedule and start the grade check from there.</p>
              <button onClick={() => (nextExam ? window.location.reload() : router.replace("/schedule"))} className={btn}>Go to my schedule</button>
            </>
          ) : (
            <>
              <p className="font-mono text-[11px] uppercase tracking-wider text-indigo-300 mb-2">Almost</p>
              <h2 className={`${display.className} ${h2}`}>Writing your grade check…</h2>
              <p className="text-zinc-400 text-[14px] mb-5">Usually under a minute.</p>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 animate-pulse" /></div>
            </>
          )
        )}
      </div>
    </div>
  );
}
