"use client";

// /welcome — a PAYING student's first five minutes (paid-only: the coach
// layout sends unpaid accounts to /start). Four screens, one at a time:
//   1. exam system + year   2. subjects   3. add to home screen   4. paper ready
// The first paper is built in the background from the moment subjects are
// chosen, so by the time they've finished step 3 it's usually waiting.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { display } from "@/lib/displayFont";
import { loadOnboarding, saveOnboarding } from "@/lib/onboarding";
import { COUNTRIES, USABLE_CURRICULA, curriculaForCountry, resolveCurriculum, type Curriculum } from "@/data/curricula";
import { CURRICULUM_LS_KEY, adoptPaper, buildNextPaper } from "@/lib/nextPaper";
import type { Exam } from "@/lib/types";

type Step = 1 | 2 | 3 | 4;

interface BIPEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> }

function isStandalone(): boolean {
  try {
    return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
  } catch { return false; }
}
function isIOS(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

export default function WelcomePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [step, setStep] = useState<Step>(1);
  const [country, setCountry] = useState<Curriculum["country"]>("NZ");
  const [curriculumId, setCurriculumId] = useState<string>("nz-ncea");
  const [year, setYear] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  const bip = useRef<BIPEvent | null>(null);
  const [canPrompt, setCanPrompt] = useState(false);

  // Background build state
  const buildRef = useRef<Promise<Exam | null> | null>(null);
  const [paper, setPaper] = useState<Exam | null>(null);
  const [buildFailed, setBuildFailed] = useState(false);

  // Already onboarded → straight to Today.
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

  function pickCountry(code: Curriculum["country"]) {
    setCountry(code); setYear(null); setSubjects([]);
    const group = curriculaForCountry(code);
    setCurriculumId(group.length === 1 ? group[0].id : "");
  }

  function toggleSubject(v: string) {
    setSubjects((prev) => prev.includes(v) ? prev.filter((s) => s !== v) : prev.length >= 3 ? prev : [...prev, v]);
  }

  function finishSubjects() {
    if (year == null || subjects.length === 0) return;
    saveOnboarding({ yearLevel: year, subjects, curriculumId });
    try { localStorage.setItem(CURRICULUM_LS_KEY, curriculumId); } catch {}
    // Start building the first paper NOW, while they do step 3.
    buildRef.current = buildNextPaper().then((e) => { if (e) setPaper(e); else setBuildFailed(true); return e; }).catch(() => { setBuildFailed(true); return null; });
    setStep(installed ? 4 : 3);
  }

  async function promptInstall() {
    const ev = bip.current;
    if (!ev) return;
    try { await ev.prompt(); const c = await ev.userChoice; if (c.outcome === "accepted") setInstalled(true); } catch {}
  }

  function startPaper() {
    if (!paper) return;
    adoptPaper(paper);
    router.push(`/exam/${paper.id}?mode=practice`);
  }

  const firstName = user?.firstName?.trim();
  const progress = (step / 4) * 100;

  return (
    <div className="max-w-lg mx-auto px-5 pt-6 sm:pt-10 pb-12">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="font-mono text-[11px] text-zinc-500">{step} / 4</span>
      </div>

      {step === 1 && (
        <>
          <p className="font-mono text-[11px] uppercase tracking-wider text-indigo-300 mb-2">
            {isLoaded && firstName ? `Welcome, ${firstName}` : "Welcome"}
          </p>
          <h1 className={`${display.className} text-[30px] sm:text-[36px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-2`}>Which exam are you sitting?</h1>
          <p className="text-zinc-400 text-[14px] mb-6">Set once. Every paper is written in this system&apos;s style.</p>

          <div className="grid grid-cols-5 gap-2 mb-5">
            {COUNTRIES.map((c) => (
              <button key={c.code} onClick={() => pickCountry(c.code)}
                className={`rounded-2xl border py-3 min-h-[56px] flex flex-col items-center justify-center gap-0.5 ${country === c.code ? "border-indigo-400/60 bg-indigo-500/[0.12] text-white" : "border-white/[0.08] bg-white/[0.02] text-zinc-400"}`}>
                <span className="text-[18px]" aria-hidden>{c.flag}</span>
                <span className="text-[10.5px] font-semibold">{c.code}</span>
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

          <button onClick={() => setStep(2)} disabled={!curriculumId || year == null}
            className="w-full bg-white text-[#0a0a0f] font-bold text-[16px] py-4 rounded-full min-h-[52px] disabled:opacity-40">
            Continue
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h1 className={`${display.className} text-[30px] sm:text-[36px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-2`}>Pick up to three subjects</h1>
          <p className="text-zinc-400 text-[14px] mb-6">Your first paper is in the first one you tap. You can add more any time.</p>
          <div className="grid grid-cols-2 gap-2 mb-7">
            {yearSubjects.map((s) => {
              const on = subjects.includes(s.value);
              const idx = subjects.indexOf(s.value);
              return (
                <button key={s.value} onClick={() => toggleSubject(s.value)}
                  className={`rounded-2xl border px-4 py-3.5 min-h-[52px] text-left flex items-center justify-between gap-2 ${on ? "border-indigo-400/60 bg-indigo-500/[0.12] text-white" : "border-white/[0.08] bg-white/[0.02] text-zinc-300"}`}>
                  <span className="text-[14px] font-semibold">{s.label}</span>
                  {on && <span className="w-6 h-6 rounded-full bg-indigo-500 text-white text-[11px] font-bold flex items-center justify-center shrink-0">{idx + 1}</span>}
                </button>
              );
            })}
          </div>
          <button onClick={finishSubjects} disabled={subjects.length === 0}
            className="w-full bg-white text-[#0a0a0f] font-bold text-[16px] py-4 rounded-full min-h-[52px] disabled:opacity-40">
            Build my first paper
          </button>
          <button onClick={() => setStep(1)} className="w-full text-zinc-500 text-[13px] py-3 mt-1">Back</button>
        </>
      )}

      {step === 3 && (
        <>
          <p className="font-mono text-[11px] uppercase tracking-wider text-indigo-300 mb-2">Your paper is being written</p>
          <h1 className={`${display.className} text-[30px] sm:text-[36px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-2`}>While it builds, put StudyAce on your home screen</h1>
          <p className="text-zinc-400 text-[14px] mb-6">It opens full-screen like an app, and it&apos;s how tonight&apos;s paper finds you.</p>

          {canPrompt ? (
            <button onClick={promptInstall} className="w-full bg-white text-[#0a0a0f] font-bold text-[16px] py-4 rounded-full min-h-[52px] mb-3">Add to home screen</button>
          ) : (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 mb-3">
              {ios ? (
                <ol className="space-y-2.5 text-[14px] text-zinc-300">
                  <li className="flex gap-3"><span className="font-mono text-indigo-300">1</span> Tap the <span className="font-semibold text-white">Share</span> button at the bottom of Safari</li>
                  <li className="flex gap-3"><span className="font-mono text-indigo-300">2</span> Scroll and tap <span className="font-semibold text-white">Add to Home Screen</span></li>
                  <li className="flex gap-3"><span className="font-mono text-indigo-300">3</span> Tap <span className="font-semibold text-white">Add</span>. Open StudyAce from there tonight.</li>
                </ol>
              ) : (
                <ol className="space-y-2.5 text-[14px] text-zinc-300">
                  <li className="flex gap-3"><span className="font-mono text-indigo-300">1</span> Open the browser menu (⋮)</li>
                  <li className="flex gap-3"><span className="font-mono text-indigo-300">2</span> Tap <span className="font-semibold text-white">Add to Home screen</span> or <span className="font-semibold text-white">Install app</span></li>
                </ol>
              )}
            </div>
          )}
          <button onClick={() => setStep(4)} className="w-full border border-white/[0.15] text-zinc-200 font-semibold text-[15px] py-3.5 rounded-full min-h-[48px]">
            {installed ? "Done, continue" : "Continue"}
          </button>
        </>
      )}

      {step === 4 && (
        <>
          {paper ? (
            <>
              <p className="font-mono text-[11px] uppercase tracking-wider text-emerald-300 mb-2">Ready</p>
              <h1 className={`${display.className} text-[30px] sm:text-[36px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-2`}>Your first paper is ready.</h1>
              <p className="text-zinc-400 text-[14px] mb-6">
                {paper.questions.length} questions, about {Math.max(10, Math.round(paper.questions.length * 2.5))} minutes. Every answer gets marked the moment you finish. Working and answer, separately, honestly.
              </p>
              <button onClick={startPaper} className="w-full bg-white text-[#0a0a0f] font-bold text-[16px] py-4 rounded-full min-h-[52px]">Start →</button>
            </>
          ) : buildFailed ? (
            <>
              <h1 className={`${display.className} text-[30px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-2`}>That build didn&apos;t finish.</h1>
              <p className="text-zinc-400 text-[14px] mb-6">Head to Today and it&apos;ll try again.</p>
              <button onClick={() => router.replace("/today")} className="w-full bg-white text-[#0a0a0f] font-bold text-[16px] py-4 rounded-full min-h-[52px]">Go to Today</button>
            </>
          ) : (
            <>
              <p className="font-mono text-[11px] uppercase tracking-wider text-indigo-300 mb-2">Almost</p>
              <h1 className={`${display.className} text-[30px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-2`}>Writing your first paper…</h1>
              <p className="text-zinc-400 text-[14px] mb-5">Usually under a minute. After this one, the next paper is built before you arrive.</p>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400 animate-pulse" />
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
