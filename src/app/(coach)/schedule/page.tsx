"use client";

// /schedule — the heart of the app. One task a day, chosen for the student
// and built before they open the app, dropped at midnight in their timezone.
// Every week opens with a grade check; how they did against the pace line
// to their goal decides the six days after it (see lib/schedule.ts).
// This page: the week at a glance, why it's shaped that way, today's ticket.

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { loadOnboarding } from "@/lib/onboarding";
import { adoptPaper, getOrBuildToday, prebuildDay, type TodayTask } from "@/lib/nextPaper";
import { goalFor } from "@/lib/goals";
import { dayNumber, daysUntil, kindFromTitle, localDateKey, msUntilLocalMidnight, normalizeKind, TASK_BLURB, TASK_LENGTH, TASK_TITLE, type TaskKind } from "@/lib/dailyTask";
import { FOCUS_LABEL, paceRead, taskForDay, weekFocus, weekLine, weekOf, weekStartDay, type WeekFocus } from "@/lib/schedule";
import { recentMistakes } from "@/lib/mistakes";
import { scopedKey } from "@/lib/userScope";
import { useCoachData } from "@/hooks/useCoachData";
import { subjectSeries, tierBreakdown, weakSpot } from "@/lib/gradeOutlook";
import { getCustomExam } from "@/lib/customExams";
import { resolveCurriculum, LETTER_BANDS } from "@/data/curricula";
import { bandAt, bandsFor } from "@/lib/gradeOutlook";
import TodayCard from "@/components/TodayCard";
import WeekStrip, { KIND_ACCENT, type WeekDay } from "@/components/WeekStrip";
import type { ExamAttempt } from "@/lib/types";

// What each date was assigned, so a day's task is fixed once handed out and
// tomorrow is never the same kind as today.
type TaskLog = Record<string, { subject: string; kind: TaskKind }>;
const LOG_KEY = "studyace-task-log";
function readLog(): TaskLog {
  try {
    const raw = JSON.parse(localStorage.getItem(scopedKey(LOG_KEY)) ?? "{}") as Record<string, { subject: string; kind: string }>;
    const out: TaskLog = {};
    for (const [k, v] of Object.entries(raw)) { const kind = normalizeKind(v?.kind); if (kind && v?.subject) out[k] = { subject: v.subject, kind }; }
    return out;
  } catch { return {}; }
}
function writeLog(date: string, entry: { subject: string; kind: TaskKind }) {
  try { const log = readLog(); log[date] = entry; const keys = Object.keys(log).sort().slice(-60); localStorage.setItem(scopedKey(LOG_KEY), JSON.stringify(Object.fromEntries(keys.map((k) => [k, log[k]])))); } catch {}
}
function shiftDate(key: string, days: number): string { const d = new Date(key + "T12:00:00"); d.setDate(d.getDate() + days); return localDateKey(d); }

type Status = "loading" | "building" | "ready" | "done" | "failed";

function ScheduleInner() {
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

  // ── Who, where, what day ──
  const curriculum = resolveCurriculum(curriculumId);
  const label = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;
  const planStart = useMemo(() => {
    const starts = goals.map((g) => g.startedAt).filter(Boolean).sort();
    return starts[0] ?? loadOnboarding()?.completedAt ?? new Date().toISOString();
  }, [goals]);
  const day = dayNumber(planStart, new Date(today + "T12:00:00"));
  const week = weekOf(day);

  const subjectOf = (a: ExamAttempt) => a.subject ?? getCustomExam(a.examId)?.subject ?? null;
  const hasBaseline = (s: string) => {
    const g = goalFor(goals, s);
    const startIso = g?.startedAt ?? g?.updatedAt;
    // No goal yet → nothing counts as a baseline; the grade check comes first.
    if (!startIso) return false;
    const since = new Date(startIso).getTime() - 60_000;
    return (attempts ?? []).some((a) => subjectOf(a) === s && new Date(a.date).getTime() >= since);
  };
  const spotFor = (s: string) => weakSpot(s, tierBreakdown(subjectSeries(attempts ?? [], s), getCustomExam), Object.values(topicScores).filter((ts) => ts.subject === s));
  const mistakesFor = (s: string) => recentMistakes(attempts ?? [], s, getCustomExam);
  // Enough to teach from: a few dropped questions, or a clear weak spot.
  const hasReviewMaterial = (s: string) => mistakesFor(s).length >= 3 || !!spotFor(s);

  // Where each subject sits against its pace line — this is what shapes the week.
  const paceOf = (s: string) => {
    const g = goalFor(goals, s);
    const startIso = g?.startedAt ?? g?.updatedAt;
    if (!g || !startIso || !attempts) return null;
    const since = new Date(startIso).getTime() - 60_000;
    const withSubject = attempts.map((a) => (a.subject ? a : { ...a, subject: getCustomExam(a.examId)?.subject ?? a.subject }));
    const series = subjectSeries(withSubject, s).filter((p) => p.t >= since);
    const byDay = new Map<string, number>();
    for (const p of series) byDay.set(localDateKey(new Date(p.t)), p.pct);
    const points = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, pct]) => ({ date, pct }));
    const band = LETTER_BANDS.find((b) => b.id === g.goal) ?? LETTER_BANDS[1];
    return { read: paceRead({ points, planStart: localDateKey(new Date(startIso)), examDate: g.examDate || null, goalPct: Math.round(band.minPct * 100), today }), goalLabel: band.label, examDays: g.examDate ? daysUntil(g.examDate) : null };
  };
  const focusFor = (s: string): WeekFocus => { const p = paceOf(s); return weekFocus({ pace: p?.read?.state ?? null, examDays: p?.examDays ?? null }); };

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
  const pick = (d: number, prev: TaskKind | null, baselineAlso?: (s: string) => boolean) =>
    taskForDay({ day: d, subjects, hasBaseline: (s) => hasBaseline(s) || !!baselineAlso?.(s), hasReviewMaterial, focusFor, yesterdayKind: prev });
  const task = useMemo(() => {
    if (!attempts || !subjects.length) return null;
    if (resolved && resolved.date === today) return { subject: resolved.subject, kind: resolved.kind };
    const logged = readLog()[today];
    if (logged && subjects.includes(logged.subject)) return logged;
    return pick(day, yesterdayKind);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts, subjects, goals, topicScores, day, yesterdayKind, resolved, today]);
  // Today's task is done only by a paper in today's subject — an extra paper
  // in another subject (or one left over from an earlier setup) doesn't count.
  const doneToday = !!task && (attempts ?? []).some((a) => localDateKey(new Date(a.date)) === today && subjectOf(a) === task.subject);

  // A schedule only exists between now and an exam. No date, or every date
  // gone by → the page becomes the place to set the next one.
  const nextExam = useMemo(() => {
    const dated = subjects.map((s) => goalFor(goals, s)).filter((g): g is NonNullable<typeof g> => !!g?.examDate)
      .map((g) => ({ subject: g.subject, date: g.examDate, days: daysUntil(g.examDate) })).sort((a, b) => a.days - b.days);
    const upcoming = dated.filter((g) => g.days >= 0);
    return { upcoming: upcoming[0] ?? null, passed: upcoming.length === 0 ? dated[dated.length - 1] ?? null : null, none: dated.length === 0 };
  }, [subjects, goals]);
  const needsSetup = attempts != null && subjects.length > 0 && !nextExam.upcoming;
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });

  // Build (or fetch) today's paper once we know the task; remember tomorrow's for the overnight prebuild.
  useEffect(() => {
    // No upcoming exam → no plan to build for; the page is asking for the next exam instead.
    if (!task || !serverChecked || needsSetup) return;
    const topicFor = (s: string, k: TaskKind) => (k === "review" ? spotFor(s)?.topicPrompt ?? mistakesFor(s)[0]?.question.slice(0, 100) : undefined);
    if (doneToday) {
      setStatus("done");
      try {
        const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
        const next = pick(day + 1, task.kind);
        writeLog(today, task);
        writeLog(localDateKey(tomorrow), { subject: next.subject, kind: next.kind });
        setTomorrowTask({ subject: next.subject, kind: next.kind });
        prebuildDay({ date: localDateKey(tomorrow), subject: next.subject, task: next.kind, topic: topicFor(next.subject, next.kind) });
      } catch {}
      return;
    }
    let cancelled = false;
    const t: TodayTask = { date: today, subject: task.subject, task: task.kind, topic: topicFor(task.subject, task.kind) };
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
      const next = pick(day + 1, task.kind, (s) => s === task.subject);
      const tomorrowTask: TodayTask = { date: localDateKey(tomorrow), subject: next.subject, task: next.kind, topic: topicFor(next.subject, next.kind) };
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
  }, [task?.subject, task?.kind, serverChecked, doneToday, today, attempt, needsSetup]);

  // A tap on the phone when the paper is ready, a double when the day is done.
  useEffect(() => {
    try {
      if (status === "ready") navigator.vibrate?.(18);
      if (status === "done" && celebrate) navigator.vibrate?.([24, 60, 24]);
    } catch {}
  }, [status, celebrate]);

  function start() {
    if (!examId || busy || !task) return;
    setBusy(true);
    // A review day is a lesson first, then the paper.
    if (task.kind === "review") router.push(`/lesson?exam=${encodeURIComponent(examId)}&subject=${encodeURIComponent(task.subject)}&date=${today}`);
    else router.push(`/exam/${examId}?mode=${examMode}`);
  }
  function retry() { setStatus("loading"); setAttempt((n) => n + 1); }

  // Score label for the done state.
  const scoreLabel = useMemo(() => {
    if (!doneToday || !attempts) return null;
    const a = [...attempts].filter((x) => localDateKey(new Date(x.date)) === today && (!task || subjectOf(x) === task.subject)).sort((x, y) => (x.date < y.date ? 1 : -1))[0];
    if (!a || !a.maxMarks) return null;
    const pct = Math.round((a.totalMarks / a.maxMarks) * 100);
    return `${bandAt(bandsFor(curriculumId), pct).label} · ${pct}%`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        ? `Weekly check. Eight questions, marked properly, to see how far ${subj} has moved and set the shape of this week.`
        : `Everything starts here. Eight questions, marked properly, so we know exactly where you are in ${subj}.`;
      case "review": {
        const n = mistakesFor(task.subject).length;
        return `${n >= 3 ? `Built from ${n} questions you dropped marks on in ${subj}` : `Built on ${subj}`}${spot ? `, mostly ${spot.label.toLowerCase()}` : ""}. A short lesson first, then six questions to prove it stuck.`;
      }
      case "mock": return examDays != null && examDays <= 21 && examDays >= 0
        ? `Timed and full length, because your ${subj} exam is ${examDays === 0 ? "today" : examDays === 1 ? "tomorrow" : `${examDays} days away`}. Practise the pressure now.`
        : `Timed and full length. No feedback until the end, like the real day.`;
      default: return `A fresh ${subj} paper in your exam's style, marked the moment you finish. Reps are what move the number.`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, goals, attempts, topicScores]);

  // ── The week at a glance ──
  const weekDays = useMemo((): WeekDay[] => {
    if (!task || !attempts) return [];
    const log = readLog();
    const start = weekStartDay(week);
    const out: WeekDay[] = [];
    let prev: TaskKind | null = null;
    const checked = new Set<string>();
    for (let i = 0; i < 7; i++) {
      const d = start + i;
      const date = shiftDate(today, d - day);
      const dt = new Date(date + "T12:00:00");
      let entry: { subject: string; kind: TaskKind } | null = null;
      if (d === day) entry = task;
      else if (log[date] && subjects.includes(log[date].subject)) entry = log[date];
      else if (d < day) {
        const a = attempts.find((x) => localDateKey(new Date(x.date)) === date);
        const k = a ? kindFromTitle(getCustomExam(a.examId)?.title) : null;
        entry = a && k && subjectOf(a) ? { subject: subjectOf(a)!, kind: k } : pick(d, prev, (s) => checked.has(s));
      } else entry = pick(d, prev, (s) => checked.has(s));
      if (entry.kind === "check") checked.add(entry.subject);
      const done = attempts.some((x) => localDateKey(new Date(x.date)) === date && subjectOf(x) === entry!.subject);
      out.push({
        day: d, weekday: dt.toLocaleDateString("en-NZ", { weekday: "short" }), dateNum: dt.getDate(), kind: entry.kind,
        subject: d <= day ? label(entry.subject) : null,
        state: d === day ? "today" : d < day ? (done ? "done" : "missed") : "upcoming",
      });
      prev = entry.kind;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, attempts, subjects, goals, topicScores, day, week, today]);

  const line = useMemo(() => {
    if (!task) return null;
    const p = paceOf(task.subject);
    const focus = focusFor(task.subject);
    return { focus, ...weekLine({ focus, pace: p?.read ?? null, hasBaseline: hasBaseline(task.subject), subjectLabel: label(task.subject), goalLabel: p?.goalLabel ?? "A", reviewLabel: spotFor(task.subject)?.label.toLowerCase() ?? null, examDays: p?.examDays ?? null, kinds: weekDays.map((d) => d.kind) }) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task, weekDays, goals, attempts]);

  const accent = task ? KIND_ACCENT[task.kind] : "#a78bfa";


  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-16">
      {/* Header: which week, why it's shaped this way */}
      <div className="mb-5 sm:mb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-zinc-500">Schedule · Week {String(week).padStart(2, "0")} · Day {String(day).padStart(2, "0")}</p>
          <div className="flex items-center gap-2.5 flex-wrap">
            {line && !needsSetup && (
              <span className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] px-3 py-1.5 rounded-full" style={{ color: accent, background: `${accent}18` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: accent }} />{FOCUS_LABEL[line.focus]}
              </span>
            )}
            {nextExam.upcoming && (
              <Link href="/welcome?next=1" className="inline-flex items-center gap-2 text-[12px] text-zinc-400 hover:text-white border border-white/[0.1] hover:border-white/30 rounded-full px-3 py-1.5 transition-colors">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-zinc-500">Exam</span>
                <span className="text-zinc-200 font-semibold">{fmt(nextExam.upcoming.date)}</span>
                <span className="text-zinc-500">· change</span>
              </Link>
            )}
          </div>
        </div>
        {needsSetup ? (
          <>
            <h1 className={`${display.className} font-bold text-white text-[30px] sm:text-[40px] leading-[1.02] tracking-[-0.035em] mt-2`}>{nextExam.passed ? "That exam's done. What's next?" : "When's your next exam?"}</h1>
            <p className="text-zinc-400 text-[14.5px] sm:text-[16px] leading-relaxed max-w-2xl mt-2">
              {nextExam.passed
                ? <>Your {label(nextExam.passed.subject)} exam was on {fmt(nextExam.passed.date)}. Set the next one and StudyAce rebuilds your whole schedule backwards from that date, starting with a fresh grade check.</>
                : <>Your schedule is built backwards from your exam date: what to do each day so you land on your goal grade on the day. Set it and everything here is personalised to you.</>}
            </p>
          </>
        ) : line ? (
          <>
            <h1 className={`${display.className} font-bold text-white text-[30px] sm:text-[40px] leading-[1.02] tracking-[-0.035em] mt-2`}>{line.title}</h1>
            <p className="text-zinc-400 text-[14.5px] sm:text-[16px] leading-relaxed max-w-2xl mt-2">{line.sub}</p>
          </>
        ) : (
          <div className="h-[72px] rounded-2xl bg-white/[0.02] animate-pulse mt-2" />
        )}
      </div>

      {needsSetup && (
        <div className="sa-gold" style={{ "--sa-r": "28px" } as React.CSSProperties}>
          <div className="bg-[#0e0f13] p-7 sm:p-10 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-indigo-300">Set up your next exam</p>
              <p className={`${display.className} text-white font-bold text-[28px] sm:text-[36px] leading-[1] tracking-[-0.03em] mt-2`}>Five quick questions.</p>
              <ol className="mt-4 space-y-1.5 text-zinc-300 text-[14.5px]">
                {["Your exam system and year", "Up to three subjects", "The grade you want in each", "When the exam is", "A grade check to find your starting point"].map((t, i) => (
                  <li key={t} className="flex items-center gap-3"><span className="font-mono text-[11px] text-zinc-500 w-4">{i + 1}</span>{t}</li>
                ))}
              </ol>
              <p className="text-zinc-500 text-[12.5px] mt-4">Takes about two minutes. Then a task a day, built for you, until exam day.</p>
            </div>
            <Link href="/welcome?next=1" className="bg-white text-[#0a0a0f] font-bold text-[16px] px-8 py-4 rounded-full min-h-[58px] inline-flex items-center justify-center transition-transform hover:scale-[1.02] whitespace-nowrap">
              Set my next exam →
            </Link>
          </div>
        </div>
      )}

      {/* The week */}
      <div className={`mb-5 sm:mb-6 ${needsSetup ? "hidden" : ""}`}>
        {weekDays.length ? <WeekStrip days={weekDays} /> : <div className="h-[104px] rounded-2xl bg-white/[0.02] animate-pulse" />}
      </div>

      {/* Today's ticket */}
      {needsSetup ? null : task ? (
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
      {task && !doneToday && <p className="text-zinc-600 text-[12px] mt-4 text-center">{TASK_BLURB[task.kind]}</p>}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-hidden />}>
      <ScheduleInner />
    </Suspense>
  );
}
