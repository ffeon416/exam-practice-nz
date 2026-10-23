"use client";

// /hello — the kid's first screen after tapping their invite.
// Ace says hi → they tap their exams and subjects → an 8-question grade check
// (about 15 minutes, marked like the real exam) → where they stand, what's
// costing them marks, and tomorrow's task. Or "Not now, remind me at 7pm".
// Then it hands over to the normal app (/schedule) with everything set up.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AceMascot from "@/components/AceMascot";
import Graph from "@/components/Graph";
import AddToHomeScreen from "@/components/AddToHomeScreen";
import { COUNTRIES, USABLE_CURRICULA, getCurriculum, type Curriculum } from "@/data/curricula";
import { TARGET_BANDS, type PublicQuestion } from "@/lib/gradeCheck";
import type { GradeCheckSummary } from "@/lib/children";
import type { ExamAttempt } from "@/lib/types";
import { setGoal } from "@/lib/goals";
import { saveOnboarding } from "@/lib/onboarding";
import { CURRICULUM_LS_KEY } from "@/lib/nextPaper";
import { addExamAttempt } from "@/lib/storage";
import { scopedKey } from "@/lib/userScope";
import { typicalExamDate } from "@/lib/onTrack";
import { neutralizeFigureReferences } from "@/lib/questionGuard";
import { downloadIcs, next7pm, pushSupported, reminderIcs, subscribeToPush } from "@/lib/reminder";

type Me = {
  childId: string; firstName: string; country: string | null;
  curriculumId: string | null; year: number | null; subjects: string[]; checkSubject: string | null; targetBand: string | null;
  remindAt: string | null; gradeCheckDone: boolean; summary: GradeCheckSummary | null; notKid?: boolean;
};
type Step = "loading" | "hi" | "exams" | "subjects" | "ready" | "reminded" | "building" | "check" | "marking" | "result" | "error";

const ANSWERS_KEY = "studyace-gradecheck-answers";

const btn = "inline-flex min-h-[48px] w-full items-center justify-center rounded-[10px] px-5 text-[16px] font-semibold transition-colors disabled:opacity-50";
const primary = `${btn} bg-[#5B47E0] text-white hover:bg-[#4A3AC4]`;
const secondary = `${btn} border border-[#E2E2E8] bg-white text-[#15151B] hover:bg-[#F6F6F8]`;
const chip = (on: boolean) =>
  `min-h-[44px] rounded-[10px] border px-4 text-left text-[15px] font-semibold transition-colors ${on ? "border-[#5B47E0] bg-[#F4F3FD] text-[#4A3AC4]" : "border-[#E2E2E8] bg-white text-[#15151B] hover:bg-[#F6F6F8]"}`;

const isCountry = (c: string | null): c is Curriculum["country"] => !!c && COUNTRIES.some((k) => k.code === c);

export default function HelloPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("loading");
  const [me, setMe] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [country, setCountry] = useState<Curriculum["country"] | null>(null);
  const [curriculumId, setCurriculumId] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [checkSubject, setCheckSubject] = useState<string | null>(null);
  const [target, setTarget] = useState<string>("a");

  const [questions, setQuestions] = useState<PublicQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<GradeCheckSummary | null>(null);
  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [remindNote, setRemindNote] = useState<{ at: string; push: boolean } | null>(null);
  const [busy, setBusy] = useState(false);

  const curriculum = curriculumId ? getCurriculum(curriculumId) ?? null : null;
  const systems = useMemo(() => (country ? USABLE_CURRICULA.filter((c) => c.country === country) : []), [country]);
  const yearSubjects = useMemo(() => (curriculum && year ? curriculum.subjects.filter((s) => s.years.includes(year)) : []), [curriculum, year]);
  const name = me?.firstName ?? "";

  // ── Load ──
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/kid", { cache: "no-store" });
        const data = (await res.json()) as Me;
        if (data.notKid) { router.replace("/schedule"); return; }
        if (!res.ok) throw new Error();
        setMe(data);
        setCountry(isCountry(data.country) ? data.country : null);
        setCurriculumId(data.curriculumId);
        setYear(data.year);
        setSubjects(data.subjects ?? []);
        setCheckSubject(data.checkSubject);
        if (data.targetBand) setTarget(data.targetBand);
        if (data.gradeCheckDone && data.summary) { setSummary(data.summary); setStep("result"); return; }
        setStep(data.checkSubject ? "ready" : "hi");
      } catch {
        setError("We couldn't load your account. Tap your invite link again."); setStep("error");
      }
    })();
  }, [router]);

  // Answers survive a reload or a closed tab (scoped to this kid).
  useEffect(() => {
    if (step !== "check") return;
    try { localStorage.setItem(scopedKey(ANSWERS_KEY), JSON.stringify(answers)); } catch { /* storage blocked */ }
  }, [answers, step]);

  const saveSetup = useCallback(async () => {
    const res = await fetch("/api/kid", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ curriculumId, year, subjects, checkSubject, targetBand: target, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    });
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save.");
  }, [curriculumId, year, subjects, checkSubject, target]);

  // Set the app up exactly as its own first-run would (goal, subject, system),
  // BEFORE the check, so the check counts as the plan's starting point.
  function setUpApp() {
    if (!curriculum || !year || !checkSubject) return;
    try { localStorage.setItem(CURRICULUM_LS_KEY, curriculum.id); } catch { /* ignore */ }
    saveOnboarding({ yearLevel: year, subjects: [checkSubject], curriculumId: curriculum.id });
    void setGoal({ subject: checkSubject, goal: target, examDate: typicalExamDate(curriculum.country), curriculumId: curriculum.id, year });
  }

  async function startCheck() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await saveSetup();
      setUpApp();
      setStep("building");
      const res = await fetch("/api/kid/grade-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start" }) });
      const data = (await res.json()) as { questions?: PublicQuestion[]; done?: boolean; summary?: GradeCheckSummary; error?: string };
      if (data.done && data.summary) { setSummary(data.summary); setStep("result"); return; }
      if (!res.ok || !data.questions) throw new Error(data.error ?? "Your check didn't build.");
      let saved: Record<string, string> = {};
      try { saved = JSON.parse(localStorage.getItem(scopedKey(ANSWERS_KEY)) ?? "{}"); } catch { /* ignore */ }
      setQuestions(data.questions);
      setAnswers(saved);
      setCurrent(0);
      setStep("check");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong."); setStep("ready");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (busy) return;
    setBusy(true); setError(null); setStep("marking");
    try {
      const res = await fetch("/api/kid/grade-check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "submit", answers }) });
      const data = (await res.json()) as { summary?: GradeCheckSummary; attempt?: ExamAttempt; error?: string };
      if (!res.ok || !data.summary) throw new Error(data.error ?? "Marking didn't finish.");
      setSummary(data.summary);
      if (data.attempt) setAttempt(data.attempt);
      try { localStorage.removeItem(scopedKey(ANSWERS_KEY)); } catch { /* ignore */ }
      setStep("result");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Marking didn't finish. Tap submit again."); setStep("check");
    } finally {
      setBusy(false);
    }
  }

  async function remindMe() {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      await saveSetup();
      setUpApp();
      const at = next7pm();
      const subscription = pushSupported() ? await subscribeToPush() : null;
      const res = await fetch("/api/kid/remind", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ at: at.toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, subscription }),
      });
      const data = (await res.json().catch(() => ({}))) as { push?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Couldn't set the reminder.");
      setRemindNote({ at: at.toISOString(), push: !!data.push });
      setStep("reminded");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't set the reminder.");
    } finally {
      setBusy(false);
    }
  }

  function addToCalendar() {
    const at = remindNote ? new Date(remindNote.at) : next7pm();
    downloadIcs(reminderIcs({ at, url: `${window.location.origin}/hello`, uid: `remind-${me?.childId ?? "kid"}-${at.getTime()}` }));
  }

  function goToPlan() {
    if (attempt) { try { addExamAttempt(attempt); } catch { /* local progress only */ } }
    router.push("/schedule");
  }

  // ── Screens ──
  const shell = (children: React.ReactNode) => (
    <div className="min-h-[calc(100vh-3rem)] bg-white px-4 pb-16 pt-10 text-[#15151B]">
      <div className="mx-auto max-w-[520px]">{children}</div>
    </div>
  );
  const err = error ? <p className="mt-3 text-[15px] text-[#A2381B]" role="alert">{error}</p> : null;

  if (step === "loading" || step === "building" || step === "marking") {
    const t = step === "building" ? ["Building your grade check…", "8 questions, written for your exams. This can take a minute."]
      : step === "marking" ? ["Marking it like the real exam…", "Working and answer, both checked. About a minute."]
      : ["One moment…", ""];
    return shell(
      <div className="py-16 text-center" role="status">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-[#ECECF0] border-t-[#5B47E0]" aria-hidden />
        <p className="text-[17px] font-semibold">{t[0]}</p>
        {t[1] && <p className="mt-1 text-[15px] text-[#62646D]">{t[1]}</p>}
      </div>
    );
  }

  if (step === "error") return shell(<><h1 className="text-[26px] font-bold">That didn&rsquo;t work</h1>{err}</>);

  if (step === "hi") {
    return shell(
      <>
        <AceMascot mood={3} size={88} />
        <h1 className="mt-4 text-[28px] font-bold leading-tight">Hi {name}. I&rsquo;m Ace.</h1>
        <p className="mt-3 text-[17px] leading-relaxed text-[#4D4F58]">
          I&rsquo;ll help you get the grades you want, 20 minutes a night. First, a quick check of where you are now.
        </p>
        <button type="button" onClick={() => setStep("exams")} className={`${primary} mt-8`}>Let&rsquo;s go</button>
      </>
    );
  }

  if (step === "exams") {
    return shell(
      <>
        <h1 className="text-[26px] font-bold leading-tight">Which exams are you doing?</h1>
        {!country ? (
          <>
            <p className="mt-2 text-[16px] text-[#4D4F58]">Where do you go to school?</p>
            <div className="mt-4 grid gap-2">
              {COUNTRIES.map((c) => <button key={c.code} type="button" className={chip(false)} onClick={() => setCountry(c.code)}>{c.label}</button>)}
            </div>
          </>
        ) : (
          <>
            <div className="mt-4 grid gap-2">
              {systems.map((c) => (
                <button key={c.id} type="button" className={chip(curriculumId === c.id)}
                  onClick={() => { setCurriculumId(c.id); setYear(null); setSubjects([]); setCheckSubject(null); }}>
                  {c.system}
                  {c.status !== "live" && <span className="ml-2 rounded-full bg-[#F6F6F8] px-2 py-0.5 text-[12px] font-semibold text-[#62646D]">Early access</span>}
                </button>
              ))}
            </div>
            <button type="button" onClick={() => { setCountry(null); setCurriculumId(null); }} className="mt-3 min-h-[44px] text-[15px] font-semibold text-[#4A3AC4] underline underline-offset-2">
              Not in {COUNTRIES.find((c) => c.code === country)?.label}?
            </button>
            {curriculum && (
              <>
                <h2 className="mt-6 text-[18px] font-bold">Which year?</h2>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {curriculum.levels.map((l) => (
                    <button key={l.value} type="button" className={chip(year === l.value)} onClick={() => { setYear(l.value); setSubjects([]); setCheckSubject(null); }}>{l.label}</button>
                  ))}
                </div>
              </>
            )}
            {curriculum?.status === "early-access" && (
              <p className="mt-4 rounded-[10px] bg-[#F6F6F8] px-3 py-2.5 text-[14px] text-[#4D4F58]">
                {curriculum.system} is in early access: the questions are written for your exams and marked the same honest way, and we&rsquo;re still fine-tuning them.
              </p>
            )}
            <button type="button" disabled={!curriculum || !year} onClick={() => setStep("subjects")} className={`${primary} mt-8`}>Next</button>
          </>
        )}
      </>
    );
  }

  if (step === "subjects") {
    const toggle = (v: string) => {
      setSubjects((s) => {
        const next = s.includes(v) ? s.filter((x) => x !== v) : [...s, v];
        if (!next.includes(checkSubject ?? "")) setCheckSubject(next[0] ?? null);
        return next;
      });
    };
    return shell(
      <>
        <h1 className="text-[26px] font-bold leading-tight">Tap your subjects</h1>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {yearSubjects.map((s) => <button key={s.value} type="button" className={chip(subjects.includes(s.value))} onClick={() => toggle(s.value)}>{s.label}</button>)}
        </div>
        {subjects.length > 1 && (
          <>
            <h2 className="mt-6 text-[18px] font-bold">Grade check first in</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {subjects.map((v) => <button key={v} type="button" className={chip(checkSubject === v)} onClick={() => setCheckSubject(v)}>{yearSubjects.find((s) => s.value === v)?.label ?? v}</button>)}
            </div>
          </>
        )}
        {subjects.length > 0 && (
          <>
            <h2 className="mt-6 text-[18px] font-bold">What grade do you want{checkSubject ? ` in ${yearSubjects.find((s) => s.value === checkSubject)?.label}` : ""}?</h2>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {TARGET_BANDS.map((b) => <button key={b.id} type="button" className={`${chip(target === b.id)} text-center`} onClick={() => setTarget(b.id)}>{b.label}</button>)}
            </div>
          </>
        )}
        <button type="button" disabled={!subjects.length || !checkSubject} onClick={() => setStep("ready")} className={`${primary} mt-8`}>Next</button>
        <button type="button" onClick={() => setStep("exams")} className="mt-2 min-h-[44px] w-full text-[15px] font-semibold text-[#62646D]">Back</button>
      </>
    );
  }

  if (step === "ready" || step === "reminded") {
    const subjectLabel = curriculum?.subjects.find((s) => s.value === checkSubject)?.label ?? "your subject";
    return shell(
      <>
        <AceMascot mood={3} size={64} />
        <h1 className="mt-3 text-[26px] font-bold leading-tight">Your {subjectLabel} grade check</h1>
        <p className="mt-2 text-[16px] leading-relaxed text-[#4D4F58]">
          8 questions, about 15 minutes. Marked like the real exam: a mark for your working, a mark for your answer.
        </p>
        {step === "reminded" && remindNote ? (
          <div className="mt-6 rounded-2xl border border-[#E2E2E8] bg-[#F6F6F8] p-4">
            <p className="text-[16px] font-semibold">
              {remindNote.push ? "We'll remind you at 7pm." : "Add it to your calendar so you don't forget."}
            </p>
            <button type="button" onClick={addToCalendar} className={`${secondary} mt-3`}>Add 7pm to my calendar</button>
          </div>
        ) : null}
        <button type="button" onClick={startCheck} disabled={busy} className={`${primary} mt-8`}>{step === "reminded" ? "Actually, start now" : "Start my grade check"}</button>
        {step === "ready" && (
          <button type="button" onClick={remindMe} disabled={busy} className={`${secondary} mt-2`}>Not now, remind me at 7pm</button>
        )}
        {err}
        <button type="button" onClick={() => setStep("subjects")} className="mt-2 min-h-[44px] w-full text-[15px] font-semibold text-[#62646D]">Change subjects</button>
      </>
    );
  }

  if (step === "check") {
    const q = questions[current];
    const id = q.id;
    const isLast = current === questions.length - 1;
    const answered = (i: number) => !!(answers[questions[i].id] ?? "").trim();
    return shell(
      <>
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-[#62646D]">Question {current + 1} of {questions.length}</p>
          <p className="text-[14px] text-[#62646D]">{questions.filter((_, i) => answered(i)).length} answered</p>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-[#ECECF0]" aria-hidden>
          <div className="h-1.5 rounded-full bg-[#5B47E0] transition-[width]" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
        </div>

        <div className="mt-5 rounded-2xl border border-[#E2E2E8] p-4">
          {q.graph && <Graph data={q.graph} />}
          <p className="whitespace-pre-wrap text-[16px] leading-relaxed">{neutralizeFigureReferences(q.text)}</p>
          <p className="mt-1 text-[13px] text-[#62646D]">{q.marks} mark{q.marks === 1 ? "" : "s"}</p>

          {q.answerType === "multi-choice" && q.options ? (
            <div className="mt-4 grid gap-2">
              {q.options.map((opt) => (
                <button key={opt} type="button" className={chip(answers[id] === opt)} onClick={() => setAnswers((a) => ({ ...a, [id]: opt }))}>{opt}</button>
              ))}
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              <label className="text-[14px] font-semibold">
                Working <span className="font-normal text-[#62646D]">(1 mark)</span>
                <textarea value={answers[`${id}_working`] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [`${id}_working`]: e.target.value }))}
                  rows={q.answerType === "working" ? 5 : 3}
                  className="mt-1 w-full rounded-[10px] border border-[#E2E2E8] p-3 text-[16px] font-normal focus:border-[#5B47E0] focus:outline-none" />
              </label>
              <label className="text-[14px] font-semibold">
                Answer <span className="font-normal text-[#62646D]">(1 mark)</span>
                <textarea value={answers[id] ?? ""} onChange={(e) => setAnswers((a) => ({ ...a, [id]: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full rounded-[10px] border border-[#E2E2E8] p-3 text-[16px] font-normal focus:border-[#5B47E0] focus:outline-none" />
              </label>
            </div>
          )}
        </div>

        {err}
        <div className="mt-5 flex gap-2">
          {current > 0 && <button type="button" onClick={() => setCurrent((c) => c - 1)} className={`${secondary} w-auto`}>Back</button>}
          {isLast ? (
            <button type="button" onClick={submit} disabled={busy} className={primary}>See where I stand</button>
          ) : (
            <button type="button" onClick={() => setCurrent((c) => c + 1)} className={primary}>Next</button>
          )}
        </div>
      </>
    );
  }

  // ── Result ──
  if (step === "result" && summary) {
    const onTarget = TARGET_BANDS.findIndex((b) => b.id === summary.bandId) !== -1 &&
      TARGET_BANDS.findIndex((b) => b.id === summary.bandId) <= TARGET_BANDS.findIndex((b) => b.id === summary.targetBandId);
    return shell(
      <>
        <p className="text-[14px] font-semibold text-[#62646D]">{summary.subjectLabel} grade check</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-2xl border border-[#E2E2E8] p-4">
            <p className="text-[14px] text-[#62646D]">You&rsquo;re on</p>
            <p className="mt-1 text-[40px] font-bold leading-none">{summary.bandLabel}</p>
            <p className="mt-1 text-[14px] text-[#62646D]">{summary.pct}% of the marks</p>
          </div>
          <div className={`rounded-2xl border p-4 ${onTarget ? "border-[#1F8A55]/30 bg-[#EEF8F2]" : "border-[#E2E2E8] bg-[#F4F3FD]"}`}>
            <p className="text-[14px] text-[#62646D]">Your target</p>
            <p className={`mt-1 text-[40px] font-bold leading-none ${onTarget ? "text-[#1F8A55]" : "text-[#4A3AC4]"}`}>{summary.targetLabel}</p>
            <p className="mt-1 text-[14px] text-[#62646D]">{onTarget ? "You're there. Now keep it." : "The plan closes the gap."}</p>
          </div>
        </div>

        {summary.costing.length > 0 && (
          <>
            <h2 className="mt-8 text-[18px] font-bold">What&rsquo;s costing you marks</h2>
            <ol className="mt-3 grid gap-2">
              {summary.costing.map((c, i) => (
                <li key={c.topic} className="rounded-2xl border border-[#E2E2E8] p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[16px] font-semibold">{i + 1}. {c.topic}</p>
                    <p className="shrink-0 text-[14px] font-semibold text-[#A2381B]">−{c.lost} mark{c.lost === 1 ? "" : "s"}</p>
                  </div>
                  {c.why && <p className="mt-1 text-[15px] text-[#4D4F58]">{c.why}</p>}
                </li>
              ))}
            </ol>
          </>
        )}

        <h2 className="mt-8 text-[18px] font-bold">Tomorrow&rsquo;s task</h2>
        <div className="mt-3 rounded-2xl bg-[#F4F3FD] p-4">
          <p className="text-[16px] font-semibold text-[#4A3AC4]">{summary.tomorrow.title}</p>
          <p className="mt-1 text-[15px] text-[#4D4F58]">{summary.tomorrow.detail}</p>
        </div>

        <div className="mt-6"><AddToHomeScreen /></div>

        <p className="mt-6 text-[15px] text-[#62646D]">Your parent gets a short summary of this.</p>
        <button type="button" onClick={goToPlan} className={`${primary} mt-4`}>Go to my plan</button>
      </>
    );
  }

  return shell(null);
}
