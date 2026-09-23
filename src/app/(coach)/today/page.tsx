"use client";

// /today — the daily task. One paper a day, chosen and built for the
// student, dropped at midnight in their timezone. They only ever see today:
// the card, then "done for today" with a countdown. Beside it: streak and
// where they are against each goal.

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { loadOnboarding } from "@/lib/onboarding";
import { loadProgress, saveProgress } from "@/lib/storage";
import { adoptPaper, currentCurriculumId, getOrBuildToday, prebuildDay, type TodayTask } from "@/lib/nextPaper";
import { loadGoals, syncGoals, goalFor, type SubjectGoal } from "@/lib/goals";
import { dayNumber, daysUntil, kindFromTitle, localDateKey, msUntilLocalMidnight, recentDays, streakDays, taskForDay, TASK_BLURB, type TaskKind } from "@/lib/dailyTask";
import { scopedKey, setScopeUserId } from "@/lib/userScope";
import { useUser } from "@clerk/nextjs";

// What each date was assigned, so a day's task is fixed once handed out and
// tomorrow is never the same kind as today.
type TaskLog = Record<string, { subject: string; kind: TaskKind }>;
const LOG_KEY = "studyace-task-log";
function readLog(): TaskLog { try { return JSON.parse(localStorage.getItem(scopedKey(LOG_KEY)) ?? "{}") as TaskLog; } catch { return {}; } }
function writeLog(date: string, entry: { subject: string; kind: TaskKind }) {
  try { const log = readLog(); log[date] = entry; const keys = Object.keys(log).sort().slice(-30); localStorage.setItem(scopedKey(LOG_KEY), JSON.stringify(Object.fromEntries(keys.map((k) => [k, log[k]])))); } catch {}
}
function shiftDate(key: string, days: number): string { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() + days); return localDateKey(d); }
import { subjectSeries, tierBreakdown, trendPerWeek, weakSpot } from "@/lib/gradeOutlook";
import { getCustomExam } from "@/lib/customExams";
import { resolveCurriculum } from "@/data/curricula";
import { bandAt, bandsFor } from "@/lib/gradeOutlook";
import TodayCard from "@/components/TodayCard";
import StatusPanel from "@/components/StatusPanel";
import PaceChart, { type PacePoint } from "@/components/PaceChart";
import { LETTER_BANDS } from "@/data/curricula";
import type { ExamAttempt, StudentProgress, TopicScore } from "@/lib/types";

type Status = "loading" | "building" | "ready" | "done" | "failed";

function TodayInner() {
  const router = useRouter();
  const params = useSearchParams();
  const celebrate = params.get("done") === "1";
  const { user, isLoaded: userLoaded } = useUser();
  const [attempts, setAttempts] = useState<ExamAttempt[] | null>(null);
  const [topicScores, setTopicScores] = useState<Record<string, TopicScore>>({});
  const [subjects, setSubjects] = useState<string[]>([]);
  const [curriculumId, setCurriculumId] = useState("nz-ncea");
  const [year, setYear] = useState(12);
  const [allGoals, setGoals] = useState<SubjectGoal[]>([]);
  // Only the subjects chosen in the current onboarding count. Goals left over
  // from an earlier setup (other subjects, other exam system) are ignored.
  const goals = useMemo(() => allGoals.filter((g) => subjects.includes(g.subject)), [allGoals, subjects]);
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
  const [serverChecked, setServerChecked] = useState(false);

  // ── Load ──
  useEffect(() => {
    // Storage is namespaced per account. Never read it before Clerk has said
    // who this is, or a brand-new device looks "not onboarded" and bounces
    // back to /welcome.
    if (!userLoaded) return;
    setScopeUserId(user?.id ?? null);
    let cancelled = false;
    const run = () => {
      const ob = loadOnboarding();
      if (!ob || ob.subjects.length === 0) { router.replace("/welcome"); return; }
      setSubjects(ob.subjects); setYear(ob.yearLevel); setCurriculumId(ob.curriculumId ?? currentCurriculumId());
      setGoals(loadGoals());
      syncGoals().then((g) => { if (!cancelled) setGoals(g); }).catch(() => {});
      try { const local = loadProgress(); setAttempts(local.examAttempts ?? []); setTopicScores(local.topicScores ?? {}); } catch {}
      fetch("/api/progress").then((r) => (r.ok ? r.json() : null)).then((data) => {
        if (cancelled) return;
        const server: ExamAttempt[] = data?.examAttempts ?? [];
        if (server.length > 0) {
          const local = loadProgress();
          // Union, never replace: a paper marked seconds ago may not have
          // reached the server yet, and it must still count here.
          const seen = new Set(server.map((a) => `${a.examId}|${new Date(a.date).toISOString().slice(0, 16)}`));
          const extra = (local.examAttempts ?? []).filter((a) => !seen.has(`${a.examId}|${new Date(a.date).toISOString().slice(0, 16)}`));
          const all = [...server, ...extra].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const merged: StudentProgress = { examAttempts: all, topicScores: { ...local.topicScores, ...(data.topicScores || {}) }, totalExamsTaken: all.length, streakDays: Math.max(local.streakDays, data.streakDays ?? 0), lastActiveDate: local.lastActiveDate };
          setAttempts(all); setTopicScores(merged.topicScores); saveProgress(merged);
        }
        setServerChecked(true);
      }).catch(() => { if (!cancelled) setServerChecked(true); });
    };
    const id = setTimeout(run, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [router, userLoaded, user?.id]);

  // ── Today's task ──
  const curriculum = resolveCurriculum(curriculumId);
  const label = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;
  const planStart = useMemo(() => {
    const starts = goals.map((g) => g.startedAt).filter(Boolean).sort();
    return starts[0] ?? loadOnboarding()?.completedAt ?? new Date().toISOString();
  }, [goals]);
  const day = dayNumber(planStart, new Date(today + "T12:00:00"));
  const attemptDates = useMemo(() => (attempts ?? []).map((a) => localDateKey(new Date(a.date))), [attempts]);
  const streak = streakDays(attemptDates, today);
  const days = recentDays(attemptDates, 14, today);

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
      // Build it now, whether or not today's gets done — tomorrow must be ready
      // at midnight. Except after a grade check: tomorrow depends on that
      // result, so it's built the moment the check is marked (results page).
      if (task.kind !== "check") prebuildDay(tomorrowTask);
    } catch {}
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.subject, task?.kind, serverChecked, doneToday, today]);

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
  function retry() { setStatus("loading"); setServerChecked(false); setTimeout(() => setServerChecked(true), 0); }

  // Score label for the done state.
  const scoreLabel = useMemo(() => {
    if (!doneToday || !attempts) return null;
    const a = [...attempts].filter((x) => localDateKey(new Date(x.date)) === today && (!task || subjectOf(x) === task.subject)).sort((x, y) => (x.date < y.date ? 1 : -1))[0];
    if (!a || !a.maxMarks) return null;
    const pct = Math.round((a.totalMarks / a.maxMarks) * 100);
    return `${bandAt(bandsFor(curriculumId), pct).label} · ${pct}%`;
  }, [doneToday, attempts, today, curriculumId]);

  // Pace chart: one subject at a time, defaulting to today's.
  const [chartSubject, setChartSubject] = useState<string | null>(null);
  const paceSubject = chartSubject && subjects.includes(chartSubject) ? chartSubject : task?.subject ?? subjects[0] ?? null;
  const pace = useMemo(() => {
    if (!paceSubject || !attempts) return null;
    const g = goalFor(goals, paceSubject);
    const startIso = g?.startedAt ?? g?.updatedAt;
    // No goal yet: the card still shows, with an empty line and a nudge.
    if (!g || !startIso) return { points: [] as PacePoint[], planStart: today, examDate: null, goalPct: 80, goalLabel: "A", trend: 0, noGoal: true };
    const since = new Date(startIso).getTime() - 60_000;
    // Older attempts may lack a subject; read it off the paper they were sat on.
    const withSubject = attempts.map((a) => (a.subject ? a : { ...a, subject: getCustomExam(a.examId)?.subject ?? a.subject }));
    const series = subjectSeries(withSubject, paceSubject).filter((p) => p.t >= since);
    const byDay = new Map<string, number>();
    for (const p of series) byDay.set(localDateKey(new Date(p.t)), p.pct); // latest that day wins
    const points: PacePoint[] = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, pct]) => ({ date, pct }));
    const band = LETTER_BANDS.find((b) => b.id === g.goal) ?? LETTER_BANDS[1];
    return { points, planStart: localDateKey(new Date(startIso)), examDate: g.examDate || null, goalPct: Math.round(band.minPct * 100), goalLabel: band.label, trend: trendPerWeek(series), noGoal: false };
  }, [paceSubject, attempts, goals, today]);

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
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-16">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-8">
          {task ? (
            <TodayCard
              questionCount={examId ? getCustomExam(examId)?.questions?.length ?? null : null}
              examInDays={(() => { const g = goalFor(goals, task.subject); return g?.examDate ? daysUntil(g.examDate) : null; })()}
              day={day}
              sinceLine={sinceLine}
              whyLine={whyLine}
              celebrate={celebrate && status === "done"}
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
          {pace && paceSubject && (
            <div className="mt-6">
              <PaceChart
                subjectLabel={label(paceSubject)}
                subjects={subjects}
                activeSubject={paceSubject}
                onSubject={setChartSubject}
                subjectLabelFor={label}
                points={pace.points}
                planStart={pace.planStart}
                examDate={pace.examDate}
                goalPct={pace.goalPct}
                goalLabel={pace.goalLabel}
                trendPerWeek={pace.trend}
                today={today}
                noGoal={pace.noGoal}
              />
            </div>
          )}
        </div>
        <div className="lg:col-span-4">
          {attempts && (
            <StatusPanel attempts={attempts} topicScores={topicScores} curriculumId={curriculumId} year={year} subjects={subjects} goals={goals} onGoalsChange={setGoals} streak={streak} days={days} celebrate={celebrate && status === "done"} />
          )}
        </div>
      </div>
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
