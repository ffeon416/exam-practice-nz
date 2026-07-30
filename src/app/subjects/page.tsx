"use client";

import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Exam, Question, GraphData } from "@/lib/types";
import { saveCustomExam, generateCustomExamId } from "@/lib/customExams";
import { useTier, isUnlimited } from "@/hooks/useTier";
import UpgradeModal from "@/components/UpgradeModal";
import { loadOnboarding } from "@/lib/onboarding";
import { resolveCurriculum, USABLE_CURRICULA } from "@/data/curricula";

// Year levels + subjects are now derived from the selected curriculum (see
// the registry in src/data/curricula.ts). `ncea` is the level value sent to
// the API: for NCEA it's the legacy 0–3 index; for every other system it's
// the year/grade number itself (the server maps it back via the registry).
const CURRICULUM_LS_KEY = "studyace-curriculum";

function levelsFor(curriculumId: string) {
  const c = resolveCurriculum(curriculumId);
  return c.levels.map((l) => ({
    value: l.value,
    label: l.label,
    ncea: c.id === "nz-ncea" ? (l.value === 10 ? 0 : l.value - 10) : l.value,
  }));
}

type ApiQuestion = {
  number: string;
  text: string;
  marks: number;
  gradeLevel: "achieved" | "merit" | "excellence";
  answerType: "text" | "number" | "multi-choice" | "working";
  options?: string[];
  expectedAnswer?: string;
  markingGuide: string;
  graph?: GraphData;
  image?: string;
};

type ApiPaper = {
  title: string;
  questions: ApiQuestion[];
};

const LOADING_MESSAGES = [
  "Pulling together exam-style questions…",
  "Calibrating Achievement, Merit and Excellence…",
  "Adding worked solutions…",
  "Adding that NZ flavour…",
  "Polishing the marking guide…",
  "Almost there…",
];

const HYPE_LINES = [
  "Lock in.",
  "Time to crush it.",
  "Trust the work.",
  "You've got this.",
  "Game time.",
  "Show up. Show out.",
  "One paper closer.",
  "No room for doubt.",
];

export default function SubjectsPage() {
  const router = useRouter();
  const { limits, usage, loading: tierLoading, refresh } = useTier();
  // Selected exam system. Defaults to NCEA; restored from URL/localStorage on
  // mount. Everything below (levels, subjects, free gate, prompts) derives
  // from this via the curriculum registry.
  const [curriculumId, setCurriculumId] = useState<string>("nz-ncea");
  const [yearLevel, setYearLevel] = useState<number | null>(null);
  const [subject, setSubject] = useState<string | null>(null);

  const curriculum = resolveCurriculum(curriculumId);
  const YEAR_LEVELS = levelsFor(curriculumId);
  const SUBJECTS = curriculum.subjects;
  const FREE_SUBJECT_SET = new Set<string>(curriculum.freeSubjects);

  // Restore curriculum from ?curriculum= (e.g. arriving from /global) or the
  // last-used one in localStorage.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("curriculum");
    const stored = typeof window !== "undefined" ? localStorage.getItem(CURRICULUM_LS_KEY) : null;
    const wanted = fromUrl ?? stored;
    if (wanted && wanted !== "nz-ncea" && USABLE_CURRICULA.some((c) => c.id === wanted)) {
      setCurriculumId(wanted);
    }
  }, []);

  function switchCurriculum(id: string) {
    if (id === curriculumId) return;
    setCurriculumId(id);
    setYearLevel(null);
    setSubject(null);
    try {
      localStorage.setItem(CURRICULUM_LS_KEY, id);
    } catch {}
  }
  // The year buttons are native radios (highlight is painted by the browser's
  // :checked state, instantly, with no React in the paint path). This ref lets
  // the prefill effect tick the right radio imperatively, since they're
  // uncontrolled (a controlled `checked` would re-introduce the React-render
  // wait we're deliberately avoiding).
  const yearGroupRef = useRef<HTMLDivElement>(null);

  // Pre-fill from onboarding on first load (reads from URL first, then localStorage)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // In the guided weak-topic flow we deliberately leave year + subject
    // unselected so the student picks their own year level and is then guided
    // to the highlighted subject. That flow does its own prefill below.
    if (params.get("guide")) return;
    const urlSubject = params.get("subject");
    const urlYear = params.get("year");
    const onboarding = loadOnboarding();

    const preYear = urlYear ? Number(urlYear) : onboarding?.yearLevel ?? null;
    if (preYear && YEAR_LEVELS.some((y) => y.value === preYear)) {
      setYearLevel(preYear);
      // Radios are uncontrolled — tick the matching one imperatively so a
      // prefilled year shows selected on arrival.
      const input = yearGroupRef.current?.querySelector<HTMLInputElement>(
        `input[value="${preYear}"]`,
      );
      if (input) input.checked = true;
    }

    // Prefer the first onboarding subject the user is actually allowed to pick
    // (so free users don't land on a locked subject as the default).
    const candidates = [
      urlSubject,
      ...(onboarding?.subjects ?? []),
    ].filter((s): s is string => !!s);

    for (const candidate of candidates) {
      const match = SUBJECTS.find(
        (s) => s.value === candidate && preYear && s.years.includes(preYear)
      );
      if (!match) continue;
      if (!limits.allSubjects && !FREE_SUBJECT_SET.has(match.value)) continue;
      setSubject(match.value);
      break;
    }
  }, [limits.allSubjects]);
  const [topic, setTopic] = useState<string>("");
  // Subject to visually highlight (guide) when a student arrives from the
  // dashboard's "Focus on these" weak-topic link. Highlight only — never
  // auto-selected. Stays null on every normal /subjects visit.
  const [highlightSubject, setHighlightSubject] = useState<string | null>(null);
  const maxQ = limits.maxQuestions;
  const [questionCount, setQuestionCount] = useState<number>(Math.min(10, maxQ));

  // Keep questionCount within the live tier cap whenever maxQ changes (e.g.
  // user upgrades / downgrades or tier loads after mount). Without this, the
  // displayed "{questionCount} questions" label can drift above the server's
  // capped value, so the user would see a paper shorter than the label
  // promised. Clamping here keeps display = sent = received.
  useEffect(() => {
    setQuestionCount((current) => {
      const clamped = Math.max(4, Math.min(current, maxQ));
      return clamped === current ? current : clamped;
    });
  }, [maxQ]);
  const [loading, setLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [hypeIdx, setHypeIdx] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState<null | "exams" | "subject">(null);

  // Tapping a year updates `yearLevel` (urgent → the year button highlights in
  // the very next paint) but the subject grid — up to ~13 gradient/shadow
  // buttons that are fully swapped out on every year change — is the expensive
  // part of the re-render. Deriving the grid from a DEFERRED copy of the year
  // lets React commit the year-button highlight first and re-render the grid in
  // a following, non-blocking pass. This is what makes the highlight feel
  // instant, especially when rapidly switching years on mobile. (Previously the
  // highlight couldn't paint until the whole grid had re-rendered in the same
  // commit — that was the delay.)
  const deferredYear = useDeferredValue(yearLevel);
  const availableSubjects = deferredYear != null
    ? SUBJECTS.filter((s) => s.years.includes(deferredYear))
    : [];

  const canStart = yearLevel !== null && subject !== null;

  function startLoadingCycle() {
    setLoadingMsgIdx(0);
    setHypeIdx(Math.floor(Math.random() * HYPE_LINES.length));
    let idx = 0;
    let hi = Math.floor(Math.random() * HYPE_LINES.length);
    const statusIv = setInterval(() => {
      idx = (idx + 1) % LOADING_MESSAGES.length;
      setLoadingMsgIdx(idx);
    }, 4000);
    const hypeIv = setInterval(() => {
      hi = (hi + 1) % HYPE_LINES.length;
      setHypeIdx(hi);
    }, 2200);
    return () => {
      clearInterval(statusIv);
      clearInterval(hypeIv);
    };
  }

  async function fetchPaperWithRetry(
    activeSubject: string,
    ncea: number,
    requestedCount: number,
  ): Promise<ApiPaper> {
    let lastErr: Error | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const res = await fetch("/api/generate-paper", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Disable any intermediate caching of the generation result.
            "Cache-Control": "no-cache, no-store",
          },
          body: JSON.stringify({
            subject: activeSubject,
            level: ncea,
            topic: topic.trim() || undefined,
            questionCount: requestedCount,
            curriculum: curriculumId,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const data = (await res.json()) as { paper: ApiPaper; requested?: number };
        if (!data.paper || !Array.isArray(data.paper.questions) || data.paper.questions.length === 0) {
          throw new Error("Empty paper");
        }
        // Count guard — if the server returned a different count than we
        // asked for (or echoed back a different `requested` because of a
        // tier-cap drift between client and server), treat it as a failed
        // attempt and retry. Better to retry than to ever ship the wrong count.
        const serverRequested = typeof data.requested === "number" ? data.requested : requestedCount;
        if (data.paper.questions.length !== requestedCount) {
          throw new Error(
            `Count mismatch: asked for ${requestedCount}, got ${data.paper.questions.length} (server reported requested=${serverRequested})`,
          );
        }
        return data.paper;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        if (attempt < 3) {
          await new Promise((r) => setTimeout(r, attempt * 2000));
        }
      }
    }
    throw lastErr ?? new Error("Failed to generate paper");
  }

  async function handleStart() {
    if (!canStart || yearLevel == null || subject == null) return;

    // Check exam limit
    if (!isUnlimited(limits.examsPerWeek) && usage.examsThisWeek >= limits.examsPerWeek) {
      setShowUpgrade("exams");
      return;
    }

    // Check subject is available for this tier (belt-and-braces; UI should already have gated)
    if (!limits.allSubjects && subject && !FREE_SUBJECT_SET.has(subject)) {
      setShowUpgrade("subject");
      return;
    }

    setError(null);
    setLoading(true);
    // Warm the exam route's JS chunk during the ~35s generation wait so it's
    // already downloaded when we navigate — the paper is instant from
    // localStorage, so the route code shouldn't be the thing you wait on.
    router.prefetch("/exam/prefetch");
    const stopCycle = startLoadingCycle();

    try {
      const yearMeta = YEAR_LEVELS.find((y) => y.value === yearLevel)!;
      // Single source of truth for the requested count: clamp once here, then
      // pass the same number to the server, use the same number for the post-
      // generation check, and use the same number when verifying the saved
      // exam. Eliminates any drift between display, request, and verification.
      const requestedCount = Math.max(4, Math.min(questionCount, limits.maxQuestions));
      const paper = await fetchPaperWithRetry(subject, yearMeta.ncea, requestedCount);

      if (paper.questions.length !== requestedCount) {
        throw new Error(
          `Generator returned ${paper.questions.length} questions, expected ${requestedCount}. Please try again.`,
        );
      }

      const id = generateCustomExamId();
      const questions: Question[] = paper.questions.map((q, i) => ({
        id: `${id}-q${i + 1}`,
        number: String(i + 1),
        text: q.text,
        marks: (q.answerType ?? "working") === "multi-choice" ? 1 : 2,
        gradeLevel: q.gradeLevel ?? "achieved",
        topics: topic.trim() ? [topic.trim()] : [subject],
        answerType: q.answerType ?? "working",
        options: q.options,
        expectedAnswer: q.expectedAnswer,
        markingGuide: q.markingGuide ?? "",
        graph: q.graph,
        image: q.image,
      }));

      const totalMarks = questions.reduce((s, q) => s + q.marks, 0);
      const exam: Exam & { createdAt: string; topic?: string | null; isCustom: true } = {
        id,
        title: paper.title ?? `${SUBJECTS.find((s) => s.value === subject)?.label} Practice Exam`,
        level: (yearMeta.ncea as 0 | 1 | 2 | 3),
        standard: "PRACTICE",
        year: new Date().getFullYear(),
        subject: subject as Exam["subject"],
        timeMinutes: Math.max(30, questions.length * 6),
        questions,
        totalMarks,
        createdAt: new Date().toISOString(),
        topic: topic.trim() || null,
        isCustom: true,
        // Which exam system generated this paper — carried through to marking
        // so the right examiner persona and grade scale are used.
        curriculumId,
      };

      saveCustomExam(exam);

      // Final post-save verification — read the exam back from the store and
      // confirm the question count matches what we asked for. If saveCustomExam
      // ever silently drops anything (it now throws BrokenExamError instead,
      // but defence in depth), this catches it before the user is navigated
      // to a wrong-count paper.
      const { getCustomExam } = await import("@/lib/customExams");
      const persisted = getCustomExam(id);
      if (!persisted || persisted.questions.length !== requestedCount) {
        throw new Error(
          `Saved exam has ${persisted?.questions.length ?? 0} questions, expected ${requestedCount}. Please try again.`,
        );
      }

      // Fire-and-forget: save to database for cross-device sync
      fetch("/api/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam }),
      }).catch(() => {});

      refresh(); // Update usage cache after generating
      stopCycle();
      router.push(`/exam/${id}?mode=practice`);
    } catch (err) {
      stopCycle();
      setError(err instanceof Error ? err.message : "Something went wrong. Try again in a moment.");
      setLoading(false);
    }
  }

  // Guided weak-topic flow (dashboard "Focus on these" link). The link carries
  // `?topic=…&guide=<subject>`. We prefill the focus topic and mark the matching
  // subject to be *highlighted* — we never press it or auto-generate. The
  // student still chooses their own year level, after which the highlighted
  // subject guides them to what to tap next. Gated on `guide`, so it only ever
  // runs for this feature — a normal /subjects visit is completely unaffected.
  const guideAppliedRef = useRef(false);
  useEffect(() => {
    if (guideAppliedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const urlTopic = params.get("topic");
    const guideSubject = params.get("guide");
    if (!urlTopic && !guideSubject) return;
    guideAppliedRef.current = true;
    // Prefill the focus topic whenever it's supplied (works for older weak
    // topics that don't know their subject yet). Highlight the subject only
    // when we know which one it is (`guide`) — that's the guided visit.
    if (urlTopic) setTopic(urlTopic);
    if (guideSubject) setHighlightSubject(guideSubject);
  }, []);

  // ── Loading screen ──
  if (loading) {
    const subjectLabel = subject
      ? subject.charAt(0).toUpperCase() + subject.slice(1).replace(/-/g, " ")
      : "your paper";
    return (
      <div className="relative bg-[#06060a] min-h-screen overflow-hidden flex items-center justify-center px-5">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-indigo-500/[0.12] blur-[140px] rounded-full animate-pulse" />
          <div className="absolute top-1/2 right-0 w-[500px] h-[400px] bg-fuchsia-500/[0.10] blur-[140px] rounded-full" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-amber-500/[0.07] blur-[140px] rounded-full" />
        </div>

        <div className="text-center max-w-md mx-auto -mt-12">
          {/* Subject pill */}
          <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500 font-bold mb-6">
            {yearLevel ? `Year ${yearLevel}` : ""} {yearLevel && subject ? "·" : ""} {subjectLabel}
          </p>

          {/* Animated icon stack */}
          <div className="relative inline-flex items-center justify-center w-24 h-24 mb-10">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-fuchsia-500 opacity-30 blur-xl animate-pulse" />
            <div className="absolute inset-2 rounded-full border-2 border-indigo-500/30 animate-ping" />
            <div className="absolute inset-4 rounded-full border-2 border-fuchsia-500/40" style={{ animation: "spin 3s linear infinite" }} />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-400 flex items-center justify-center shadow-2xl shadow-fuchsia-500/40">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>

          {/* Hype headline */}
          <h1 className="text-[40px] sm:text-[56px] font-extrabold tracking-tight leading-[1.05] mb-4 bg-gradient-to-br from-white via-white to-zinc-400 bg-clip-text text-transparent">
            {HYPE_LINES[hypeIdx]}
          </h1>

          {/* Subhead */}
          <p className="text-zinc-300 text-[15px] mb-2 font-medium">
            Cooking up your {subjectLabel} paper.
          </p>

          {/* Status (smaller, secondary) */}
          <p className="text-zinc-500 text-[13px] mb-10 min-h-[18px]">
            {LOADING_MESSAGES[loadingMsgIdx]}
          </p>

          {/* Real animated progress bar — fills over ~60s */}
          <div className="max-w-xs mx-auto">
            <div className="w-full h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-amber-400 rounded-full"
                style={{
                  animation: "loadingFill 60s cubic-bezier(0.2, 0.8, 0.4, 1) forwards",
                }}
              />
            </div>
            <p className="text-[11px] text-zinc-600 mt-3">
              30–90 seconds. Don&apos;t close this tab.
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes loadingFill {
            0% { width: 0%; }
            70% { width: 88%; }
            100% { width: 95%; }
          }
        `}</style>
      </div>
    );
  }

  // ── Main form ──
  return (
    <div className="relative max-w-lg mx-auto px-5 pt-6 sm:pt-12 pb-16 sm:pb-20 bg-[#06060a] min-h-screen">
      {/* transform-gpu promotes each blob to its own compositor layer so it's
          rasterised ONCE. Without this, many mobile browsers re-run the (very
          expensive) blur on every DOM change above — which is what froze the
          main thread for ~400ms each time the subject grid re-rendered and made
          the whole picker feel laggy. contain:paint on the wrapper keeps these
          repaints from ever escaping the background layer. */}
      <div className="absolute inset-0 -z-10 [contain:paint]" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-indigo-500/[0.06] blur-[90px] rounded-full transform-gpu [will-change:transform]" />
        <div className="absolute top-[300px] right-0 w-[500px] h-[400px] bg-purple-500/[0.05] blur-[90px] rounded-full transform-gpu [will-change:transform]" />
      </div>
      <h1 className="text-[24px] sm:text-[34px] font-extrabold text-white tracking-tight text-center mb-2">
        Practise an exam
      </h1>
      <p className="text-zinc-500 text-center text-[14px] mb-8 sm:mb-12">
        Tell us what to test you on. We&apos;ll build a fresh paper in seconds.
      </p>

      {/* Guided weak-topic hint — only shown when arriving from "Focus on these" */}
      {highlightSubject && (
        <div className="-mt-4 mb-8 rounded-xl border border-indigo-400/30 bg-indigo-500/[0.08] px-4 py-3 text-center">
          <p className="text-[13px] text-indigo-100 font-medium">
            Let&apos;s work on <span className="font-bold">{topic || "your weak spot"}</span>. Pick your year level, then tap the highlighted subject.
          </p>
        </div>
      )}

      {/* Exam system (StudyAce Global) */}
      <div className="mb-6 sm:mb-8">
        <label className="block text-[12px] font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Exam system
        </label>
        <div className="flex gap-2 overflow-x-auto pb-1 sa-no-record" role="radiogroup" aria-label="Exam system">
          {USABLE_CURRICULA.map((c) => {
            const active = c.id === curriculumId;
            return (
              <button
                key={c.id}
                onClick={() => switchCurriculum(c.id)}
                aria-pressed={active}
                className={`shrink-0 inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-2 rounded-lg text-[12px] font-semibold border transition-colors ${
                  active
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                    : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/[0.2] hover:bg-white/[0.04]"
                }`}
              >
                <span aria-hidden>{c.flag}</span>
                {c.system}
                {c.status === "early-access" && (
                  <span className={`text-[9px] font-bold uppercase tracking-wide rounded px-1 py-0.5 ${active ? "bg-white/20 text-white" : "bg-amber-500/15 text-amber-400"}`}>
                    Beta
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {curriculum.status === "early-access" && (
          <p className="mt-2 text-[11px] text-amber-400/80">
            {curriculum.system} practice is in early access — question style is still being tuned. Found something off? <Link href="/contact" className="underline">Tell us</Link>.
          </p>
        )}
      </div>

      {/* Year level */}
      <div className="mb-6 sm:mb-8">
        <label className="block text-[12px] font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          {curriculum.country === "US" || curriculum.country === "CA" ? "Grade" : "Year level"}
        </label>
        {/* Native radios: the highlight is the browser's own :checked state,
            painted the instant the tap lands — it never waits on a React
            re-render (which is what made this feel delayed). onChange still
            updates React state for the subject grid / Start button; that can
            lag freely now without affecting the highlight. */}
        {/* key={curriculumId}: the radios are uncontrolled, so remount them on
            system switch to clear any stale :checked highlight. */}
        <div key={curriculumId} ref={yearGroupRef} role="radiogroup" aria-label="Year level" className="grid grid-cols-4 gap-2">
          {YEAR_LEVELS.map((yl) => (
            <label key={yl.value} className="group cursor-pointer select-none touch-manipulation">
              <input
                type="radio"
                name="year-level"
                value={yl.value}
                defaultChecked={yearLevel === yl.value}
                onChange={() => { setYearLevel(yl.value); setSubject(null); }}
                className="peer sr-only"
              />
              <span className="flex items-center justify-center min-h-[44px] py-3 rounded-lg text-[13px] font-medium border border-white/[0.08] bg-white/[0.02] text-zinc-300 transition-colors group-hover:border-white/[0.2] group-hover:bg-white/[0.04] peer-checked:bg-gradient-to-r peer-checked:from-indigo-500 peer-checked:to-purple-600 peer-checked:border-indigo-500 peer-checked:text-white peer-checked:shadow-lg peer-checked:shadow-indigo-500/25">
                {yl.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Subject */}
      <div className="mb-6 sm:mb-8">
        <label className="block text-[12px] font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Subject
        </label>
        {deferredYear === null ? (
          <div className="rounded-lg border border-dashed border-white/[0.1] bg-white/[0.02] px-4 py-6 text-center">
            <p className="text-[13px] text-zinc-500">Pick a year level first ↑</p>
          </div>
        ) : (
          // sa-no-record: this grid's children are fully replaced on every year
          // change. Left visible to the session recorder, rrweb re-serialises
          // the whole subtree per click and input latency compounds badly
          // (~750ms by the 40th click in testing). Blocking it keeps rapid year
          // switching smooth; we lose only replay fidelity of the picker.
          <div className="grid grid-cols-2 gap-2 sa-no-record">
            {availableSubjects.map((s) => {
              // Until tier resolves, render all subjects as unlocked so a Pro
              // user doesn't see padlocks flash on every non-free subject.
              const locked = !tierLoading && !limits.allSubjects && !FREE_SUBJECT_SET.has(s.value);
              // Guided highlight: the weak-topic flow flags this subject to draw
              // the eye. Only while it isn't the one the student has picked yet.
              const isSuggested = highlightSubject === s.value && subject !== s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => {
                    if (locked) {
                      setShowUpgrade("subject");
                      return;
                    }
                    setSubject(s.value);
                  }}
                  className={`min-h-[44px] py-3 px-4 rounded-lg text-[13px] text-left transition-all border relative ${
                    subject === s.value
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                      : locked
                      ? "bg-white/[0.02] border-white/[0.06] text-zinc-500 hover:border-indigo-500/30 hover:bg-indigo-500/[0.04]"
                      : "bg-white/[0.02] border-white/[0.08] text-zinc-300 hover:border-white/[0.2] hover:bg-white/[0.04]"
                  } ${isSuggested ? "ring-2 ring-indigo-400 shadow-lg shadow-indigo-500/30 animate-pulse" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{s.label}</span>
                    {isSuggested && !locked && (
                      <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider text-indigo-100 bg-indigo-500/25 border border-indigo-400/50 px-1.5 py-0.5 rounded">
                        Suggested
                      </span>
                    )}
                    {locked && (
                      <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-indigo-300/80 bg-indigo-500/10 border border-indigo-500/25 px-1.5 py-0.5 rounded">
                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                        </svg>
                        Student
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Topic (optional) */}
      <div className="mb-6 sm:mb-8">
        <label htmlFor="topic-input" className="block text-[12px] font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          Specific topic? <span className="text-zinc-600 normal-case font-normal tracking-normal">(optional)</span>
        </label>
        <input
          id="topic-input"
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="e.g. quadratic equations, photosynthesis, Treaty of Waitangi…"
          className="w-full bg-white/[0.02] border border-white/[0.08] rounded-lg px-4 py-3 text-white text-[14px] placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.04] transition-colors"
        />
        <p className="text-[11px] text-zinc-600 mt-2">Leave blank for a mixed paper across the whole subject.</p>
      </div>

      {/* Question count */}
      <div className="mb-6 sm:mb-10">
        <label htmlFor="qcount-slider" className="flex items-center justify-between text-[12px] font-semibold text-zinc-300 mb-3 uppercase tracking-wider">
          <span>Length</span>
          <span className="text-indigo-400 tabular-nums normal-case tracking-normal">{Math.max(4, Math.min(questionCount, maxQ))} questions</span>
        </label>
        <input
          id="qcount-slider"
          type="range"
          min={4}
          max={maxQ}
          step={1}
          value={Math.min(questionCount, maxQ)}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
          className="sa-range"
          style={{
            // Fill the track up to the current value with indigo (see .sa-range).
            "--sa-pct": `${maxQ > 4 ? ((Math.max(4, Math.min(questionCount, maxQ)) - 4) / (maxQ - 4)) * 100 : 0}%`,
          } as React.CSSProperties}
        />
        {/* The middle tick shows the range's exact midpoint value, which sits
            at precisely 50% of the track (the thumb's 9px end-inset cancels out
            at the centre) — exactly where justify-between places it. So a 4→20
            bar shows "Standard (12)" dead centre, perfectly under the thumb. */}
        <div className="flex justify-between text-[10px] text-zinc-600 mt-1.5">
          <span>Short (4)</span>
          {maxQ > 10 && <span>Standard ({(maxQ + 4) / 2})</span>}
          <span>Max ({maxQ})</span>
        </div>
        {maxQ < 20 && (
          <p className="text-[11px] text-indigo-400/70 mt-1.5">
            Upgrade to {maxQ < 12 ? "Student" : "Pro"} for up to {maxQ < 12 ? 12 : 20} questions per exam.
          </p>
        )}

        {/* Why longer is better */}
        <div className="mt-4 p-3.5 rounded-lg bg-indigo-500/[0.06] border border-indigo-500/15">
          <p className="text-[11px] font-semibold text-indigo-300 mb-1.5 uppercase tracking-wider">Tip — more questions = better results</p>
          <p className="text-[12px] text-zinc-400 leading-relaxed">
            The more questions you practise on, the more topics you cover and the better prepared you&apos;ll be for your real exam.
            <span className="text-zinc-300"> Aim for 15–20 questions when you can</span> — it&apos;s the closest to a real NCEA exam and gives you the most chances to spot weak areas before exam day.
          </p>
        </div>
      </div>

      {/* Free / Student tier usage indicator — hidden until tier resolves so
          Pro users never see a "2/2 exams used" flash on hard refresh. */}
      {!tierLoading && !isUnlimited(limits.examsPerWeek) && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[12px] text-zinc-400">
          <span className="text-zinc-300 font-medium">{usage.examsThisWeek}/{limits.examsPerWeek}</span> exams used this week
          {usage.examsThisWeek >= limits.examsPerWeek && (
            <span className="text-amber-400 ml-2">— limit reached</span>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-[13px] text-red-300">
          {error}
        </div>
      )}

      {/* Upgrade modal */}
      {showUpgrade === "exams" && (
        <UpgradeModal
          message={`You've used your ${limits.examsPerWeek} free exams this week. Upgrade to keep practising — or invite a friend for 5 bonus exams.`}
          onClose={() => setShowUpgrade(null)}
          showReferral
        />
      )}
      {showUpgrade === "subject" && (
        <UpgradeModal
          message="This subject is available on the Student and Pro plans. Upgrade to practise every subject."
          onClose={() => setShowUpgrade(null)}
        />
      )}

      {/* Start button */}
      <button
        onClick={handleStart}
        disabled={!canStart}
        className={`w-full py-4 rounded-xl text-[16px] font-bold transition-all ${
          canStart
            ? "bg-white text-[#06060a] hover:bg-zinc-100 hover:scale-[1.01] shadow-2xl shadow-white/10"
            : "bg-white/[0.04] text-zinc-600 cursor-not-allowed"
        }`}
      >
        {canStart ? "Build my exam \u2192" : "Pick a year and subject"}
      </button>

      <div className="mt-6 text-center">
        <Link href="/dashboard" className="text-[12px] text-zinc-600 hover:text-zinc-400 transition-colors">
          See my past exams →
        </Link>
      </div>
    </div>
  );
}
