"use client";

// /today — the daily task. One paper a day, chosen and built for the
// student, dropped at midnight in their timezone. They only ever see today:
// the card, then "done for today" with a countdown. Beside it: streak and
// where they are against each goal.

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { display } from "@/lib/displayFont";
import { loadOnboarding } from "@/lib/onboarding";
import { loadProgress, saveProgress } from "@/lib/storage";
import { adoptPaper, currentCurriculumId, getOrBuildToday, type TodayTask } from "@/lib/nextPaper";
import { loadGoals, syncGoals, goalFor, type SubjectGoal } from "@/lib/goals";
import { dayNumber, daysUntil, localDateKey, recentDays, streakDays, taskForDay } from "@/lib/dailyTask";
import { subjectSeries, tierBreakdown, weakSpot } from "@/lib/gradeOutlook";
import { getCustomExam } from "@/lib/customExams";
import { resolveCurriculum } from "@/data/curricula";
import { bandAt, bandsFor } from "@/lib/gradeOutlook";
import TodayCard from "@/components/TodayCard";
import StatusPanel from "@/components/StatusPanel";
import type { ExamAttempt, StudentProgress, TopicScore } from "@/lib/types";

type Status = "loading" | "building" | "ready" | "done" | "failed";

export default function TodayPage() {
  const router = useRouter();
  const { user } = useUser();
  const [attempts, setAttempts] = useState<ExamAttempt[] | null>(null);
  const [topicScores, setTopicScores] = useState<Record<string, TopicScore>>({});
  const [subjects, setSubjects] = useState<string[]>([]);
  const [curriculumId, setCurriculumId] = useState("nz-ncea");
  const [year, setYear] = useState(12);
  const [goals, setGoals] = useState<SubjectGoal[]>([]);
  const [today] = useState(() => localDateKey());
  const [status, setStatus] = useState<Status>("loading");
  const [examId, setExamId] = useState<string | null>(null);
  const [examMode, setExamMode] = useState<"practice" | "mock">("practice");
  const [busy, setBusy] = useState(false);
  const [serverChecked, setServerChecked] = useState(false);

  // ── Load ──
  useEffect(() => {
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
          const merged: StudentProgress = { examAttempts: server, topicScores: { ...local.topicScores, ...(data.topicScores || {}) }, totalExamsTaken: server.length, streakDays: Math.max(local.streakDays, data.streakDays ?? 0), lastActiveDate: local.lastActiveDate };
          setAttempts(server); setTopicScores(merged.topicScores); saveProgress(merged);
        }
        setServerChecked(true);
      }).catch(() => { if (!cancelled) setServerChecked(true); });
    };
    const id = setTimeout(run, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [router]);

  // ── Today's task ──
  const curriculum = resolveCurriculum(curriculumId);
  const label = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;
  const planStart = useMemo(() => {
    const starts = goals.map((g) => g.startedAt).filter(Boolean).sort();
    return starts[0] ?? loadOnboarding()?.completedAt ?? new Date().toISOString();
  }, [goals]);
  const day = dayNumber(planStart);
  const attemptDates = useMemo(() => (attempts ?? []).map((a) => localDateKey(new Date(a.date))), [attempts]);
  const doneToday = attemptDates.includes(today);
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
  const spotFor = (s: string) => weakSpot(s, tierBreakdown(subjectSeries(attempts ?? [], s), getCustomExam), Object.values(topicScores));
  const task = useMemo(() => {
    if (!attempts || !subjects.length) return null;
    return taskForDay({ day, subjects, hasBaseline, hasWeakSpot: (s) => !!spotFor(s) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempts, subjects, goals, topicScores, day]);

  // Build (or fetch) today's paper once we know the task; remember tomorrow's for the overnight prebuild.
  useEffect(() => {
    if (!task || !serverChecked) return;
    if (doneToday) { setStatus("done"); return; }
    let cancelled = false;
    const t: TodayTask = { date: today, subject: task.subject, task: task.kind, topic: task.kind === "fix" ? spotFor(task.subject)?.topicPrompt : undefined };
    setStatus("building");
    getOrBuildToday(t).then((r) => {
      if (cancelled) return;
      if (!r) { setStatus("failed"); return; }
      adoptPaper(r.exam);
      setExamId(r.exam.id); setExamMode(task.kind === "mock" ? "mock" : "practice"); setStatus("ready");
    }).catch(() => { if (!cancelled) setStatus("failed"); });
    // Tomorrow's task (assume today's subject gets its baseline today).
    try {
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const next = taskForDay({ day: day + 1, subjects, hasBaseline: (s) => s === task.subject || hasBaseline(s), hasWeakSpot: (s) => !!spotFor(s) });
      localStorage.setItem("studyace-tomorrow-task", JSON.stringify({ date: localDateKey(tomorrow), subject: next.subject, task: next.kind, topic: next.kind === "fix" ? spotFor(next.subject)?.topicPrompt : undefined }));
    } catch {}
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task?.subject, task?.kind, serverChecked, doneToday, today]);

  function start() {
    if (!examId || busy) return;
    setBusy(true);
    router.push(`/exam/${examId}?mode=${examMode}`);
  }
  function retry() { setStatus("loading"); setServerChecked(false); setTimeout(() => setServerChecked(true), 0); }

  // Score label for the done state.
  const scoreLabel = useMemo(() => {
    if (!doneToday || !attempts) return null;
    const a = [...attempts].filter((x) => localDateKey(new Date(x.date)) === today).sort((x, y) => (x.date < y.date ? 1 : -1))[0];
    if (!a || !a.maxMarks) return null;
    const pct = Math.round((a.totalMarks / a.maxMarks) * 100);
    return `${bandAt(bandsFor(curriculumId), pct).label} · ${pct}%`;
  }, [doneToday, attempts, today, curriculumId]);

  const dateLabel = new Date(today + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-16">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <div className="lg:col-span-8">
          {task ? (
            <TodayCard
              firstName={user?.firstName?.trim() || null}
              examInDays={(() => { const g = goalFor(goals, task.subject); return g?.examDate ? daysUntil(g.examDate) : null; })()}
              day={day}
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
        <div className="lg:col-span-4">
          {attempts && (
            <StatusPanel attempts={attempts} topicScores={topicScores} curriculumId={curriculumId} year={year} subjects={subjects} goals={goals} onGoalsChange={setGoals} streak={streak} days={days} />
          )}
        </div>
      </div>
    </div>
  );
}
