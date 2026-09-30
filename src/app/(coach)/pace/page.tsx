"use client";

// /pace — are you on track for the grade you chose? One subject at a time:
// the pace line from your first score to the goal on exam day, your scores
// against it, and where your current rate lands. The goal and exam date
// that drive the line are edited beside it.

import { useMemo, useState } from "react";
import { display } from "@/lib/displayFont";
import { useCoachData } from "@/hooks/useCoachData";
import { goalFor } from "@/lib/goals";
import { localDateKey } from "@/lib/dailyTask";
import { subjectSeries, trendPerWeek } from "@/lib/gradeOutlook";
import { getCustomExam } from "@/lib/customExams";
import { resolveCurriculum, LETTER_BANDS } from "@/data/curricula";
import PaceChart, { type PacePoint } from "@/components/PaceChart";
import GoalCard from "@/components/GoalCard";

export default function PacePage() {
  const { attempts, subjects, curriculumId, year, goals, setGoals } = useCoachData();
  const curriculum = resolveCurriculum(curriculumId);
  const label = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;
  const today = localDateKey();

  const [chartSubject, setChartSubject] = useState<string | null>(null);
  const subject = chartSubject && subjects.includes(chartSubject) ? chartSubject : subjects[0] ?? null;

  const pace = useMemo(() => {
    if (!subject || !attempts) return null;
    const g = goalFor(goals, subject);
    const startIso = g?.startedAt ?? g?.updatedAt;
    // No goal yet: the card still shows, with an empty line and a nudge.
    if (!g || !startIso) return { points: [] as PacePoint[], planStart: today, examDate: null, goalPct: 80, goalLabel: "A", trend: 0, noGoal: true };
    const since = new Date(startIso).getTime() - 60_000;
    // Older attempts may lack a subject; read it off the paper they were sat on.
    const withSubject = attempts.map((a) => (a.subject ? a : { ...a, subject: getCustomExam(a.examId)?.subject ?? a.subject }));
    const series = subjectSeries(withSubject, subject).filter((p) => p.t >= since);
    const byDay = new Map<string, number>();
    for (const p of series) byDay.set(localDateKey(new Date(p.t)), p.pct); // latest that day wins
    const points: PacePoint[] = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, pct]) => ({ date, pct }));
    const band = LETTER_BANDS.find((b) => b.id === g.goal) ?? LETTER_BANDS[1];
    return { points, planStart: localDateKey(new Date(startIso)), examDate: g.examDate || null, goalPct: Math.round(band.minPct * 100), goalLabel: band.label, trend: trendPerWeek(series), noGoal: false };
  }, [subject, attempts, goals, today]);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-16">
      <div className="mb-5 sm:mb-6">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.2em] text-zinc-500">Pace</p>
        <h1 className={`${display.className} font-bold text-white text-[28px] sm:text-[34px] leading-none tracking-[-0.03em] mt-1`}>Are you on track?</h1>
      </div>
      {pace && subject ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          <div className="lg:col-span-8">
            <PaceChart
              subjectLabel={label(subject)}
              subjects={subjects}
              activeSubject={subject}
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
          <div className="lg:col-span-4">
            <GoalCard curriculumId={curriculumId} year={year} subject={subject} goals={goals} onGoalsChange={setGoals} />
          </div>
        </div>
      ) : (
        <div className="rounded-[30px] border border-white/[0.08] bg-white/[0.015] min-h-[360px] animate-pulse" />
      )}
    </div>
  );
}
