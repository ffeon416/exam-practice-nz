"use client";

// /today — the daily task, and nothing else. One paper a day, chosen and
// built for the student, dropped at midnight in their timezone. They only
// ever see today: the ticket, then "done for today" naming tomorrow's.
// Pace lives at /pace, the streak (Ace) at /streak.

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { loadOnboarding } from "@/lib/onboarding";
import { adoptPaper, getOrBuildToday, prebuildDay, type TodayTask } from "@/lib/nextPaper";
import { goalFor } from "@/lib/goals";
import { dayNumber, daysUntil, kindFromTitle, localDateKey, msUntilLocalMidnight, taskForDay, TASK_BLURB, TASK_LENGTH, TASK_TITLE, type TaskKind } from "@/lib/dailyTask";
import { scopedKey } from "@/lib/userScope";
import { useCoachData } from "@/hooks/useCoachData";

// What each date was assigned, so a day's task is fixed once handed out and
// tomorrow is never the same kind as today.
type TaskLog = Record<string, { subject: string; kind: TaskKind }>;
const LOG_KEY = "studyace-task-log";
function readLog(): TaskLog { try { return JSON.parse(localStorage.getItem(scopedKey(LOG_KEY)) ?? "{}") as TaskLog; } catch { return {}; } }
function writeLog(date: string, entry: { subject: string; kind: TaskKind }) {
  try { const log = readLog(); log[date] = entry; const keys = Object.keys(log).sort().slice(-30); localStorage.setItem(scopedKey(LOG_KEY), JSON.stringify(Object.fromEntries(keys.map((k) => [k, log[k]])))); } catch {}
}
function shiftDate(key: string, days: number): string { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() + days); return localDateKey(d); }
import { subjectSeries, tierBreakdown, weakSpot } from "@/lib/gradeOutlook";
import { getCustomExam } from "@/lib/customExams";
import { resolveCurriculum } from "@/data/curricula";
import { bandAt, bandsFor } from "@/lib/gradeOutlook";
import TodayCard from "@/components/TodayCard";
import type { ExamAttempt } from "@/lib/types";

type Status = "loading" | "building" | "ready" | "done" | "failed";

function TodayInner() {
  const router = useRouter();
  const params = useSearchParams();
  const celebrate = params.get("done") === "1";
  const { attempts, topicScores, subjects, curriculumId, goals, serverChecked } = useCoachData();
  const [today, setToday] = useState(() => localDateKey());
  const [status, setStatus] = useState<Status>("loading");

  // Midnight rollover: an app left open on the home screen flips to the new
  // day on its own, and re-checks the date whenever it comes back to the front.
  useEffect(() => {
    const roll = () => { const k = localDateKey(); if (k !== today) { setToday(k); setStatus("loading"); setExamId(null); } };
    const timer = setTimeout(roll, msUntilLocalMidnight() + 1500);
    const onVis = () => { if (document.visibilityState === "visible") roll(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [today]);
  const [examId, setExamId] = useState<string | null>(null);
  const [examMode, setExamMode] = useState<"practice" | "mock">("practice");
  const [busy, setBusy] = useState(false);
  // Re-run the build effect after a failed attempt.
  const [attempt, setAttempt] = useState(0);

  // ── Today's task ──
  const curriculum = resolveCurriculum(curriculumId);
  const label = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;
  const planStart = useMemo(() => {
    const starts = goals.map((g) => g.startedAt).filter(Boolean).sort();
    return starts[0] ?? loadOnboarding()?.completedAt ?? new Date().toISOString();
  }, [goals]);
  const day = dayNumber(planStart, new Date(today + "T12:00:00"));

  const hasBaseline = (s: string) => {
    const g = goalFor(goals, s);
    const startIso = g?.startedAt ?? g?.updatedAt;
    // No goal yet → nothing counts as a baseline; the grade check comes first.
    if (!startIso) return false;
    const since = new Date(startIso).getTime() - 60_000;
    return (attempts ?? []).some((a) => a.subject === s && new Date(a.date).getTime() >= since);
  };
  const spotFor = (s: string) => weakSpot(s, tierBreakdown(subjectSeries(attempts ?? [], s), getCustomExam), Object.values(topicScores).filter((ts) => ts.subject === s));
  // Yesterday's kind: the log first, else read off yesterday's marked paper.
  const yesterdayKind = useMemo((): TaskKind | null => {
    const y = shiftDate(today, -1);
    const logged = readLog()[y]?.kind;
    if (logged) return logged;
    const a = (attempts ?? []).find((x) => localDateKey(new Date(x.date)) === y);
    return a ? kindFromTitle(getCustomExam(a.examId)?.title) : null;
  }, [attempts, today]);
  // The paper that actually came back for today, once known — the truth for what today is.
  const [resolved, setResolved] = useState<{ date: string; subject: string; kind: TaskKind } | null>(null);
  // Tomorrow's task, once we've worked it out — shown after today's is done.
  const [tomorrowTask, setTomorrowTask] = useState<{ subject: string; kind: TaskKind } | null>(null);
  const task = useMemo(() => {
    if (!attempts || !subjects.length) return null;
    if (resolved && resolved.date === today) return { subject: resolved.subject, kind: resolved.kind };
    const logged = readLog()[today];
    if (logged && subjects.includes(logged.subject)) return logged;
    return taskForDay({ day, subjects, hasBaseline, hasWeakSpot: (s) => !!spotFor(s), yesterdayKind });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts, subjects, goals, topicScores, day, yesterdayKind, resolved, today]);
  // Today's task is done only by a paper in today's subject — an extra paper
  // in another subject (or one left over from an earlier setup) doesn't count.
  const subjectOf = (a: ExamAttempt) => a.subject ?? getCustomExam(a.examId)?.subject ?? null;
  const doneToday = !!task && (attempts ?? []).some((a) => localDateKey(new Date(a.date)) === today && subjectOf(a) === task.subject);

  // Build (or fetch) today's paper once we know the task; remember tomorrow's for the overnight prebuild.
  useEffect(() => {
    if (!task || !serverChecked) return;
    if (doneToday) {
      setStatus("done");
      try {
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const next = taskForDay({ day: day + 1, subjects, hasBaseline, hasWeakSpot: (s) => !!spotFor(s), yesterdayKind: task.kind });
        writeLog(today, task);
        writeLog(localDateKey(tomorrow), { subject: next.subject, kind: next.kind });
        setTomorrowTask({ subject: next.subject, kind: next.kind });
        prebuildDay({ date: localDateKey(tomorrow), subject: next.subject, task: next.kind, topic: next.kind === "fix" ? spotFor(next.subject)?.topicPrompt : undefined });
      } catch {}
      return;
    }
    let cancelled = false;
    const t: TodayTask = { date: today, subject: task.subject, task: task.kind, topic: task.kind === "fix" ? spotFor(task.subject)?.topicPrompt : undefined };
    setStatus("building");
    getOrBuildToday(t).then((r) => {
      if (cancelled) return;
      if (!r) { setStatus("failed"); return; }
      adoptPaper(r.exam);
      // A paper built earlier (overnight) may be a different task than we'd
      // compute now; the paper wins, and the card shows what it really is.
      const realKind = kindFromTitle(r.exam.title) ?? task.kind;
      const realSubject = subjects.includes(r.exam.subject) ? r.exam.subject : task.subject;
      writeLog(today, { subject: realSubject, kind: realKind });
      if (realKind !== task.kind || realSubject !== task.subject) setResolved({ date: today, subject: realSubject, kind: realKind });
      setExamId(r.exam.id); setExamMode(realKind === "mock" ? "mock" : "practice"); setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("failed"); });
    // Tomorrow's task (assume today's subject gets its baseline today).
    try {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const next = taskForDay({ day: day + 1, subjects, hasBaseline: (s) => s === task.subject || hasBaseline(s), hasWeakSpot: (s) => !!spotFor(s), yesterdayKind: task.kind });
      const tomorrowTask: TodayTask = { date: localDateKey(tomorrow), subject: next.subject, task: next.kind, topic: next.kind === "fix" ? spotFor(next.subject)?.topicPrompt : undefined };
      localStorage.setItem("studyace-tomorrow-task", JSON.stringify(tomorrowTask));
      writeLog(tomorrowTask.date, { subject: next.subject, kind: next.kind });
      setTomorrowTask({ subject: next.subject, kind: next.kind });
      // Build it now, whether or not today's gets done — tomorrow must be ready
      // at midnight. Except after a grade check: tomorrow depends on that
      // result, so it's built the moment the check is marked (results page).
      if (task.kind !== "check") prebuildDay(tomorrowTask);
    } catch {}
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.subject, task?.kind, serverChecked, doneToday, today, attempt]);

  // A tap on the phone when the paper is ready, a double when the day is done.
  useEffect(() => {
    try {
      if (status === "ready") navigator.vibrate?.(18);
      if (status === "done" && celebrate) navigator.vibrate?.([24, 60, 24]);
    } catch {}
  }, [status, celebrate]);

  function start() {
    if (!examId || busy) return;
    setBusy(true);
    router.push(`/exam/${examId}?mode=${examMode}`);
  }
  function retry() { setStatus("loading"); setAttempt((n) => n + 1); }

  // Score label for the done state.
  const scoreLabel = useMemo(() => {
    if (!doneToday || !attempts) return null;
    const a = [...attempts].filter((x) => localDateKey(new Date(x.date)) === today && (!task || subjectOf(x) === task.subject)).sort((x, y) => (x.date < y.date ? 1 : -1))[0];
    if (!a || !a.maxMarks) return null;
    const pct = Math.round((a.totalMarks / a.maxMarks) * 100);
    return `${bandAt(bandsFor(curriculumId), pct).label} · ${pct}%`;
  }, [doneToday, attempts, today, curriculumId]);

  const dateLabel = new Date(today + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" });

  // The number that moves: first plan paper vs the latest, for today's subject.
  const sinceLine = useMemo(() => {
    if (!task || !attempts) return null;
    const g = goalFor(goals, task.subject);
    const startIso = g?.startedAt ?? g?.updatedAt;
    if (!startIso) return null;
    const since = new Date(startIso).getTime() - 60_000;
    const pts = subjectSeries(attempts, task.subject).filter((p) => p.t >= since);
    if (pts.length === 0) return null;
    const first = pts[0].pct, last = pts[pts.length - 1].pct;
    if (pts.length === 1) return `Your starting number: ${first}%`;
    const d = last - first;
    return `Day 1: ${first}% → now ${last}% · ${d >= 0 ? "up" : "down"} ${Math.abs(d)}`;
  }, [task, attempts, goals]);

  const whyLine = useMemo(() => {
    if (!task) return null;
    const g = goalFor(goals, task.subject);
    const examDays = g?.examDate ? daysUntil(g.examDate) : null;
    const spot = spotFor(task.subject);
    const subj = label(task.subject);
    switch (task.kind) {
      case "check": return hasBaseline(task.subject)
        ? `Weekly check. Eight questions, marked properly, to see how far ${subj} has moved and plan the week ahead.`
        : `Everything starts here. Eight questions, marked properly, so we know exactly where you are in ${subj}.`;
      case "fix": return spot ? `Built on ${spot.label.toLowerCase()}, where you're getting ${spot.pct}% in ${subj}. Fix it here and it stops costing you marks.` : TASK_BLURB.fix;
      case "mock": return examDays != null && examDays <= 21
        ? `Timed and full length, because your ${subj} exam is ${examDays} day${examDays === 1 ? "" : "s"} away. Practise the pressure now.`
        : `Timed and full length. No feedback until the end, like the real day.`;
      default: return `A fresh ${subj} paper in your exam's style, marked the moment you finish. Reps are what move the number.`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, goals, attempts, topicScores]);

  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-12 pb-16">
      {task ? (
        <TodayCard
          questionCount={examId ? getCustomExam(examId)?.questions?.length ?? null : null}
          examInDays={(() => { const g = goalFor(goals, task.subject); return g?.examDate ? daysUntil(g.examDate) : null; })()}
          day={day}
          sinceLine={sinceLine}
          whyLine={whyLine}
          celebrate={celebrate && status === "done"}
          tomorrow={tomorrowTask ? { title: TASK_TITLE[tomorrowTask.kind].replace("\n", " "), subject: label(tomorrowTask.subject), length: TASK_LENGTH[tomorrowTask.kind] } : null}
          dateLabel={dateLabel}
          subjectLabel={label(task.subject)}
          kind={task.kind}
          status={status}
          scoreLabel={scoreLabel}
          busy={busy}
          onStart={status === "failed" ? retry : start}
        />
      ) : (
        <div className="rounded-[30px] border border-white/[0.08] bg-white/[0.015] min-h-[280px] animate-pulse" />
      )}
    </div>
  );
}

export default function TodayPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-hidden />}>
      <TodayInner />
    </Suspense>
  );
}
