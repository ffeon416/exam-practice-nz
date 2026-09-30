"use client";

// /lesson — a review day. A lesson built from the questions the student
// dropped marks on in this subject, then straight into the short paper that
// was built on the same weakness. Cached per day so a refresh doesn't
// rebuild it.

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { display } from "@/lib/displayFont";
import { useCoachData } from "@/hooks/useCoachData";
import { recentMistakes } from "@/lib/mistakes";
import { subjectSeries, tierBreakdown, weakSpot } from "@/lib/gradeOutlook";
import { getCustomExam } from "@/lib/customExams";
import { resolveCurriculum } from "@/data/curricula";
import { localDateKey } from "@/lib/dailyTask";
import { scopedKey } from "@/lib/userScope";

const ACCENT = "#fbbf24";

// The lesson is markdown with five fixed headings. Small renderer, no deps.
function inline(s: string): ReactNode[] {
  const parts = s.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => p.startsWith("**") ? <strong key={i} className="text-white font-semibold">{p.slice(2, -2)}</strong>
    : p.startsWith("`") ? <code key={i} className="font-mono text-[0.92em] px-1 py-0.5 rounded bg-white/[0.06] text-amber-200">{p.slice(1, -1)}</code>
    : <span key={i}>{p}</span>);
}
function Lesson({ md }: { md: string }) {
  const blocks: ReactNode[] = [];
  const lines = md.split("\n");
  let list: { ordered: boolean; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(<Tag key={blocks.length} className={`${list.ordered ? "list-decimal" : "list-disc"} pl-5 space-y-2 text-zinc-300 text-[15.5px] leading-relaxed marker:text-zinc-500`}>{list.items.map((it, i) => <li key={i}>{inline(it)}</li>)}</Tag>);
    list = null;
  };
  for (const raw of lines) {
    const l = raw.trimEnd();
    const h = /^#{1,3}\s+(.*)$/.exec(l);
    const ol = /^\d+[.)]\s+(.*)$/.exec(l);
    const ul = /^[-*•]\s+(.*)$/.exec(l);
    if (h) { flush(); blocks.push(<h2 key={blocks.length} className={`${display.className} font-bold text-white text-[20px] sm:text-[22px] tracking-[-0.02em] mt-8 first:mt-0 mb-3`}>{h[1]}</h2>); }
    else if (ol) { if (!list || !list.ordered) { flush(); list = { ordered: true, items: [] }; } list.items.push(ol[1]); }
    else if (ul) { if (!list || list.ordered) { flush(); list = { ordered: false, items: [] }; } list.items.push(ul[1]); }
    else if (l.trim() === "") { flush(); }
    else { flush(); blocks.push(<p key={blocks.length} className="text-zinc-300 text-[15.5px] leading-relaxed mb-3">{inline(l)}</p>); }
  }
  flush();
  return <div>{blocks}</div>;
}

function LessonInner() {
  const params = useSearchParams();
  const examId = params.get("exam");
  const subject = params.get("subject") ?? "";
  const date = params.get("date") ?? localDateKey();
  const { attempts, topicScores, subjects, curriculumId, year } = useCoachData();
  const curriculum = resolveCurriculum(curriculumId);
  const subjectLabel = curriculum.subjects.find((s) => s.value === subject)?.label ?? subject;

  const mistakes = useMemo(() => (attempts ? recentMistakes(attempts, subject, getCustomExam).slice(0, 6) : []), [attempts, subject]);
  const spot = useMemo(() => (attempts ? weakSpot(subject, tierBreakdown(subjectSeries(attempts, subject), getCustomExam), Object.values(topicScores).filter((ts) => ts.subject === subject)) : null), [attempts, subject, topicScores]);

  const [lesson, setLesson] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "failed">("loading");
  const [retry, setRetry] = useState(0);
  const cacheKey = scopedKey(`studyace-lesson-${date}-${subject}`);

  useEffect(() => {
    if (!attempts || !subject) return;
    try { const cached = localStorage.getItem(cacheKey); if (cached) { setLesson(cached); setState("ready"); return; } } catch {}
    let cancelled = false;
    setState("loading");
    fetch("/api/lesson", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ curriculum: curriculumId, year, subject, weakLabel: spot?.label ?? null, mistakes: mistakes.map(({ question, yourAnswer, feedback, correctApproach, marks }) => ({ question, yourAnswer, feedback, correctApproach, marks })) }),
    }).then(async (r) => {
      if (cancelled) return;
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.lesson) { setState("failed"); return; }
      setLesson(data.lesson); setState("ready");
      try { localStorage.setItem(cacheKey, data.lesson); } catch {}
    }).catch(() => { if (!cancelled) setState("failed"); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts, subject, cacheKey, curriculumId, year, retry]);

  const exam = examId ? getCustomExam(examId) : null;
  const qs = exam?.questions?.length ?? 6;
  if (subjects.length && !subjects.includes(subject)) {
    return <div className="max-w-3xl mx-auto px-4 pt-10 text-zinc-400">That subject isn&apos;t in your plan. <Link href="/schedule" className="text-white underline underline-offset-4">Back to your schedule</Link></div>;
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-24">
      <Link href="/schedule" className="inline-flex items-center gap-1.5 text-zinc-500 hover:text-white text-[13px] mb-6">← Schedule</Link>
      <p className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: ACCENT }}>Review lesson · {subjectLabel}</p>
      <h1 className={`${display.className} font-bold text-white text-[34px] sm:text-[44px] leading-[0.98] tracking-[-0.04em] mt-2`}>
        {spot ? <>Fixing <span style={{ color: ACCENT }}>{spot.label.toLowerCase()}</span>.</> : <>Turning your mistakes into marks.</>}
      </h1>
      <p className="text-zinc-400 text-[15px] leading-relaxed mt-3 max-w-xl">
        {mistakes.length >= 1
          ? <>Built from <span className="text-white font-semibold">{mistakes.length} question{mistakes.length === 1 ? "" : "s"}</span> you dropped marks on recently{spot ? <>, where you&apos;re getting <span className="text-white font-semibold">{spot.pct}%</span></> : null}. Read it once, properly. Then {qs} questions on exactly this.</>
          : <>Built on your weakest area in {subjectLabel}. Read it once, properly. Then {qs} questions on exactly this.</>}
      </p>

      <div className="sa-gold mt-7" style={{ "--sa-r": "26px" } as React.CSSProperties}>
        <div className="bg-[#0e0f13] p-6 sm:p-9">
          {state === "loading" && (
            <div className="py-8">
              <div className="flex items-center gap-3 mb-4">
                <span className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white/70 animate-spin" aria-hidden />
                <p className="text-white font-semibold text-[15px]">Reading your answers and writing the lesson…</p>
              </div>
              <div className="space-y-3 max-w-lg">
                {[92, 78, 85, 60].map((w, i) => <div key={i} className="h-3 rounded-full bg-white/[0.05] animate-pulse" style={{ width: `${w}%` }} />)}
              </div>
              <p className="text-zinc-500 text-[12px] mt-4">Usually under a minute.</p>
            </div>
          )}
          {state === "failed" && (
            <div className="py-6">
              <p className="text-white font-semibold">The lesson didn&apos;t build.</p>
              <p className="text-zinc-400 text-[14px] mt-1">Try again, or go straight to the questions and learn from the marking.</p>
              <button onClick={() => { try { localStorage.removeItem(cacheKey); } catch {} setRetry((n) => n + 1); }} className="mt-4 bg-white text-[#0a0a0f] font-bold text-[14px] px-6 py-3 rounded-full min-h-[46px]">Try again</button>
            </div>
          )}
          {state === "ready" && lesson && <Lesson md={lesson} />}
        </div>
      </div>

      {/* Now the paper */}
      <div className="mt-6 rounded-[26px] border p-6 sm:p-7 flex flex-wrap items-center justify-between gap-5" style={{ borderColor: `${ACCENT}40`, background: `${ACCENT}0d` }}>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: ACCENT }}>Now try it</p>
          <p className={`${display.className} text-white font-bold text-[24px] sm:text-[28px] leading-tight tracking-[-0.02em] mt-1`}>{qs} questions on exactly this</p>
          <p className="text-zinc-400 text-[13.5px] mt-1">Marked the moment you finish. This is what makes it stick.</p>
        </div>
        {exam ? (
          <Link href={`/exam/${exam.id}?mode=practice`} className="font-bold text-[16px] px-8 py-4 rounded-full min-h-[56px] inline-flex items-center text-[#07120d] transition-transform hover:scale-[1.02]" style={{ background: ACCENT, boxShadow: `0 0 36px ${ACCENT}45` }}>
            Start the questions →
          </Link>
        ) : (
          <Link href="/schedule" className="font-bold text-[15px] px-6 py-3.5 rounded-full min-h-[50px] inline-flex items-center bg-white text-[#0a0a0f]">Back to your schedule →</Link>
        )}
      </div>
    </div>
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-hidden />}>
      <LessonInner />
    </Suspense>
  );
}
