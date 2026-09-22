"use client";

// /welcome — a paying student's first five minutes. Paid-only (the coach
// layout sends unpaid accounts to /start). Screens, one at a time:
//   1 exam system + year   2 subjects   3 goal grade per subject + exam date
//   4 add to home screen   5 first grade check, ready
// The first grade check builds in the background from screen 3, so it's
// usually waiting by the time they've finished screen 4.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
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
const btn = "w-full bg-white text-[#0a0a0f] font-bold text-[16px] py-4 rounded-full min-h-[52px] disabled:opacity-40";
const h1 = `text-[30px] sm:text-[36px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-2`;

export default function WelcomePage() {
  const router = useRouter();
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
      if (loadOnboarding()?.subjects.length) router.replace("/today");
      setInstalled(isStandalone());
      setIos(isIOS());
    }, 0);
    const onBip = (e: Event) => { e.preventDefault(); bip.current = e as BIPEvent; setCanPrompt(true); };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => { clearTimeout(id); window.removeEventListener("beforeinstallprompt", onBip); };
  }, [router]);

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
    // Default every subject to the top band; they can lower it.
    setGoals((g) => Object.fromEntries(subjects.map((s) => [s, g[s] ?? bands[0].id])));
    setStep(3);
  }
  async function finishGoals() {
    if (year == null || subjects.length === 0 || !examDate) return;
    saveOnboarding({ yearLevel: year, subjects, curriculumId });
    try { localStorage.setItem(CURRICULUM_LS_KEY, curriculumId); } catch {}
    for (const s of subjects) await setGoal({ subject: s, goal: goals[s] ?? bands[0].id, examDate, curriculumId, year });
    // First grade check builds now, while they do the home-screen step.
    // This IS day 1's task, so build it under today's date — Today will find it waiting.
    getOrBuildToday({ date: localDateKey(), subject: subjects[0], task: "check" })
      .then((r) => { if (r) setPaper(r.exam); else setBuildFailed(true); })
      .catch(() => setBuildFailed(true));
    setStep(installed ? 5 : 4);
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

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 sm:pt-10 pb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all duration-500" style={{ width: `${(step / 5) * 100}%` }} />
        </div>
        <span className="font-mono text-[11px] text-zinc-500">{step} / 5</span>
      </div>

      {step === 1 && (
        <>
          <p className="font-mono text-[11px] uppercase tracking-wider text-indigo-300 mb-2">{isLoaded && firstName ? `Welcome, ${firstName}` : "Welcome"}</p>
          <h1 className={`${display.className} ${h1}`}>Which exam are you sitting?</h1>
          <p className="text-zinc-400 text-[14px] mb-6">Set once. Every paper is written in this system&apos;s style.</p>
          <div className="grid grid-cols-5 gap-2 mb-5">
            {COUNTRIES.map((c) => (
              <button key={c.code} onClick={() => pickCountry(c.code)}
                className={`rounded-2xl border py-3 min-h-[56px] flex flex-col items-center justify-center gap-0.5 ${country === c.code ? "border-indigo-400/60 bg-indigo-500/[0.12] text-white" : "border-white/[0.08] bg-white/[0.02] text-zinc-400"}`}>
                <span className="text-[18px]" aria-hidden>{c.flag}</span><span className="text-[10.5px] font-semibold">{c.code}</span>
              </button>
            ))}
          </div>
          {systems.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {systems.map((s) => (
                <button key={s.id} onClick={() => { setCurriculumId(s.id); setYear(null); setSubjects([]); }}
                  className={`px-4 py-2.5 rounded-full text-[13px] font-semibold min-h-[44px] border ${curriculumId === s.id ? "border-indigo-400/60 bg-indigo-500/[0.12] text-white" : "border-white/[0.1] text-zinc-300"}`}>
                  {s.system}{s.regionShort ? ` · ${s.regionShort}` : ""}
                </button>
              ))}
            </div>
          )}
          {curriculumId && (
            <>
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-2">Year</p>
              <div className="grid grid-cols-2 gap-2 mb-7">
                {curriculum.levels.map((l) => (
                  <button key={l.value} onClick={() => { setYear(l.value); setSubjects([]); }}
                    className={`rounded-2xl border px-4 py-3.5 min-h-[52px] text-left ${year === l.value ? "border-indigo-400/60 bg-indigo-500/[0.12]" : "border-white/[0.08] bg-white/[0.02]"}`}>
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
          <h1 className={`${display.className} ${h1}`}>Pick up to three subjects</h1>
          <p className="text-zinc-400 text-[14px] mb-6">Your first grade check is in the first one you tap.</p>
          <div className="grid grid-cols-2 gap-2 mb-7">
            {yearSubjects.map((s) => {
              const on = subjects.includes(s.value); const idx = subjects.indexOf(s.value);
              return (
                <button key={s.value} onClick={() => toggleSubject(s.value)}
                  className={`rounded-2xl border px-4 py-3.5 min-h-[52px] text-left flex items-center justify-between gap-2 ${on ? "border-indigo-400/60 bg-indigo-500/[0.12] text-white" : "border-white/[0.08] bg-white/[0.02] text-zinc-300"}`}>
                  <span className="text-[14px] font-semibold">{s.label}</span>
                  {on && <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>}
                </button>
              );
            })}
          </div>
          <button onClick={goToGoals} disabled={subjects.length === 0} className={btn}>Continue</button>
          <button onClick={() => setStep(1)} className="w-full text-zinc-500 text-[13px] py-3 mt-1">Back</button>
        </>
      )}

      {step === 3 && (
        <>
          <h1 className={`${display.className} ${h1}`}>What grades do you want?</h1>
          <p className="text-zinc-400 text-[14px] mb-6">Be honest, not modest. StudyAce maps the path from where you are to each one, and tells you straight if the pace isn&apos;t realistic.</p>
          <div className="space-y-4 mb-6">
            {subjects.map((s) => (
              <div key={s}>
                <p className="text-white font-semibold text-[14px] mb-2">{label(s)}</p>
                <div className="flex flex-wrap gap-2">
                  {bands.map((b) => (
                    <button key={b.id} onClick={() => setGoals((g) => ({ ...g, [s]: b.id }))}
                      className={`px-4 py-2.5 rounded-full text-[13.5px] font-semibold min-h-[44px] border ${goals[s] === b.id ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : "border-white/[0.12] text-zinc-300"}`}>
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mb-7">
            <p className="text-white font-semibold text-[14px] mb-2">When are your exams?</p>
            <DatePicker value={examDate} min={minDate} onChange={setExamDate} />
            <p className="text-zinc-500 text-[12px] mt-2">
              {examDate ? <>Exams start <span className="text-zinc-300">{new Date(examDate + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}</span>. You can set a date per subject later.</> : "Start of your exam period is fine. You can set a date per subject later."}
            </p>
          </div>
          <button onClick={finishGoals} disabled={!examDate || subjects.some((s) => !goals[s])} className={btn}>Set my goals</button>
          <button onClick={() => setStep(2)} className="w-full text-zinc-500 text-[13px] py-3 mt-1">Back</button>
        </>
      )}

      {step === 4 && (
        <>
          <p className="font-mono text-[11px] uppercase tracking-wider text-indigo-300 mb-2">Your first grade check is being written</p>
          <h1 className={`${display.className} ${h1}`}>While it builds, put StudyAce on your home screen</h1>
          <p className="text-zinc-400 text-[14px] mb-6">It opens full-screen like an app. That&apos;s where your path lives.</p>
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
            <h1 className={`${display.className} ${h1}`}>Your {label(subjects[0])} grade check is ready.</h1>
            <p className="text-zinc-400 text-[14px] mb-6">{paper.questions.length} questions, about {Math.max(10, Math.round(paper.questions.length * 2.5))} minutes, marked honestly the moment you finish. This sets your starting point on the path.</p>
            <button onClick={startPaper} className={btn}>Start →</button>
          </>
        ) : buildFailed ? (
          <>
            <h1 className={`${display.className} ${h1}`}>That build didn&apos;t finish.</h1>
            <p className="text-zinc-400 text-[14px] mb-6">Head to your dashboard and start the grade check from there.</p>
            <button onClick={() => router.replace("/today")} className={btn}>Go to my dashboard</button>
          </>
        ) : (
          <>
            <p className="font-mono text-[11px] uppercase tracking-wider text-indigo-300 mb-2">Almost</p>
            <h1 className={`${display.className} ${h1}`}>Writing your first grade check…</h1>
            <p className="text-zinc-400 text-[14px] mb-5">Usually under a minute.</p>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 animate-pulse" /></div>
          </>
        )
      )}
    </div>
  );
}
