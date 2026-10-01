"use client";

// /pace — are you on track? Where you are against the pace line to the
// grade you chose, in one sentence, one chart and four numbers.

import { useMemo, useState } from "react";
import Link from "next/link";
import { display } from "@/lib/displayFont";
import { useCoachData } from "@/hooks/useCoachData";
import { goalFor } from "@/lib/goals";
import { dayNumber, daysUntil, localDateKey } from "@/lib/dailyTask";
import { subjectSeries, tierBreakdown, trendPerWeek, weakSpot } from "@/lib/gradeOutlook";
import { paceRead, type PaceState } from "@/lib/schedule";
import { getCustomExam } from "@/lib/customExams";
import { resolveCurriculum, LETTER_BANDS } from "@/data/curricula";
import PaceLine, { type PacePoint } from "@/components/PaceLine";
import GoalCard from "@/components/GoalCard";

const STATE: Record<PaceState, { color: string; pill: string }> = {
  there: { color: "#3ee6a0", pill: "At your goal" },
  ahead: { color: "#8b8cf8", pill: "Ahead of pace" },
  track: { color: "#3ee6a0", pill: "On track" },
  behind: { color: "#fbbf24", pill: "A little behind" },
  far: { color: "#ff6b7a", pill: "Behind" },
};

export default function PacePage() {
  const { attempts, topicScores, subjects, curriculumId, year, goals, setGoals } = useCoachData();
  const curriculum = resolveCurriculum(curriculumId);
  const label = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;
  const today = localDateKey();
  const [chartSubject, setChartSubject] = useState<string | null>(null);
  const subject = chartSubject && subjects.includes(chartSubject) ? chartSubject : subjects[0] ?? null;
  const [editing, setEditing] = useState(false);

  const m = useMemo(() => {
    if (!subject || !attempts) return null;
    const g = goalFor(goals, subject);
    const startIso = g?.startedAt ?? g?.updatedAt;
    if (!g || !startIso) return { noGoal: true as const };
    const since = new Date(startIso).getTime() - 60_000;
    const withSubject = attempts.map((a) => (a.subject ? a : { ...a, subject: getCustomExam(a.examId)?.subject ?? a.subject }));
    const series = subjectSeries(withSubject, subject).filter((p) => p.t >= since);
    const byDay = new Map<string, number>();
    for (const p of series) byDay.set(localDateKey(new Date(p.t)), p.pct);
    const points: PacePoint[] = [...byDay.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, pct]) => ({ date, pct }));
    const band = LETTER_BANDS.find((b) => b.id === g.goal) ?? LETTER_BANDS[1];
    const goalPct = Math.round(band.minPct * 100);
    const planStart = localDateKey(new Date(startIso));
    const fallbackExam = (() => { const d = new Date(startIso); d.setDate(d.getDate() + 56); return localDateKey(d); })();
    const examDate = g.examDate || fallbackExam;
    const read = paceRead({ points, planStart, examDate, goalPct, today });
    const day = dayNumber(startIso, new Date(today + "T12:00:00"));
    const total = Math.max(day, dayNumber(startIso, new Date(examDate + "T12:00:00")));
    const examDays = daysUntil(examDate);
    const you = points[points.length - 1]?.pct ?? null;
    const youBand = you != null ? LETTER_BANDS.find((b) => you >= b.minPct * 100)?.label ?? "F" : null;
    const perDay = you != null && examDays > 0 ? Math.max(0, goalPct - you) / examDays : null;
    const spot = weakSpot(subject, tierBreakdown(series, getCustomExam), Object.values(topicScores).filter((ts) => ts.subject === subject));
    return { noGoal: false as const, points, planStart, examDate, goalPct, goalLabel: band.label, read, day, total, examDays, you, youBand, perDay, trend: trendPerWeek(series), spot };
  }, [subject, attempts, goals, topicScores, today]);

  const state: PaceState = m && !m.noGoal && m.read ? m.read.state : "track";
  const color = m && !m.noGoal && m.you != null ? STATE[state].color : "#a1a1aa";
  const fmt = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" });

  const headline = (() => {
    if (!m) return null;
    if (m.noGoal) return { a: "Pick a goal.", b: "Then the line appears." };
    if (m.you == null) return { a: "Your line starts", b: "with a grade check." };
    if (state === "there") return { a: `You're at ${m.youBand}.`, b: `Hold it for ${m.examDays} days.` };
    return { a: `You're at ${m.youBand === "A+" ? "an A+" : m.youBand === "A" ? "an A" : `a ${m.youBand}`}.`, b: `${m.goalLabel} is ${m.examDays} day${m.examDays === 1 ? "" : "s"} away.` };
  })();

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-16">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5 sm:mb-6">
        <div>
          <p className="font-mono text-[11px] sm:text-[12px] uppercase tracking-[0.22em] text-zinc-500">
            Pace{subject ? <> · {label(subject)}</> : null}{m && !m.noGoal ? <> · Day {m.day} of {m.total}</> : null}
          </p>
          <h1 className={`${display.className} font-bold text-white text-[34px] sm:text-[44px] leading-none tracking-[-0.04em] mt-2`}>Are you on track?</h1>
          {subjects.length > 1 && (
            <div className="flex gap-1.5 mt-3">
              {subjects.map((s) => (
                <button key={s} onClick={() => setChartSubject(s)} className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border min-h-[32px] ${s === subject ? "border-white/30 text-white bg-white/[0.06]" : "border-white/[0.08] text-zinc-500"}`}>{label(s)}</button>
              ))}
            </div>
          )}
        </div>
        {m && !m.noGoal && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.1] px-4 py-2.5 min-h-[44px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Goal</span>
              <span className={`${display.className} font-bold text-[15px] text-emerald-400`}>{m.goalLabel}</span>
            </span>
            <span className="inline-flex items-center gap-2.5 rounded-full border border-white/[0.1] px-4 py-2.5 min-h-[44px]">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">Exam</span>
              <span className={`${display.className} font-bold text-[15px] text-white`}>{fmt(m.examDate)}</span>
            </span>
            <button onClick={() => setEditing((v) => !v)} className="text-zinc-400 hover:text-white text-[14px] px-2 min-h-[44px]">{editing ? "Done" : "Change"}</button>
          </div>
        )}
      </div>

      {editing && subject && (
        <div className="mb-5 max-w-md">
          <GoalCard curriculumId={curriculumId} year={year} subject={subject} goals={goals} onGoalsChange={setGoals} />
        </div>
      )}

      {!m || !headline ? (
        <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.015] min-h-[520px] animate-pulse" />
      ) : (
        <>
          {/* The read + the line */}
          <div className="rounded-[28px] border border-white/[0.08] bg-[#0e0f13] p-6 sm:p-9 lg:p-10">
            <div className="flex items-start justify-between gap-6 flex-wrap">
              <div>
                {!m.noGoal && m.you != null && (
                  <span className="inline-flex items-center gap-2 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] px-3 py-1.5 rounded-full" style={{ color, background: `${color}1a` }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />{STATE[state].pill}
                  </span>
                )}
                <h2 className={`${display.className} font-bold text-white text-[34px] sm:text-[48px] lg:text-[56px] leading-[1.02] tracking-[-0.04em] mt-3`}>
                  {headline.a}<br />{headline.b}
                </h2>
              </div>
              <div className="text-right">
                <Link href="/schedule" className="inline-flex items-center font-bold text-[17px] sm:text-[19px] px-7 sm:px-8 py-4 rounded-full min-h-[60px] text-[#07120d] transition-transform hover:scale-[1.02]" style={{ background: "#3ee6a0", boxShadow: "0 0 36px rgba(62,230,160,0.3)" }}>
                  Tonight&apos;s paper →
                </Link>
                <p className="text-zinc-500 text-[13.5px] mt-2.5">One a day keeps you on the line</p>
              </div>
            </div>
            <div className="mt-8 sm:mt-12 -mx-2">
              {!m.noGoal ? (
                <PaceLine points={m.points} planStart={m.planStart} examDate={m.examDate} goalPct={m.goalPct} goalLabel={m.goalLabel} today={today} color={color} you={m.you} shouldBe={m.read?.shouldBe ?? null} />
              ) : (
                <p className="text-zinc-500 text-[15px] px-2">Choose the grade you want and the exam date, and the pace line appears here.</p>
              )}
            </div>
          </div>

          {/* The four numbers */}
          {!m.noGoal && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mt-4 sm:mt-5">
              <Stat value={m.read ? `${Math.abs(m.read.diff)} pts` : "—"} label={m.read ? (m.read.diff < 0 ? "behind pace today" : m.read.diff > 0 ? "ahead of pace today" : "right on pace today") : "no score yet"} color={m.read ? color : undefined} />
              <Stat value={m.perDay != null ? `+${m.perDay < 1 ? m.perDay.toFixed(1) : Math.round(m.perDay)} a day` : "—"} label="what you need to average" />
              <Stat value={m.spot ? m.spot.label.replace(/ questions$/, "") : "—"} label={m.spot ? "weakest topic · biggest win" : "no weak spot yet"} />
              <Stat value={String(m.examDays)} label={`days to ${fmt(m.examDate)}`} color="#ff6b7a" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div className="rounded-[24px] border border-white/[0.08] bg-[#0e0f13] p-5 sm:p-6 min-h-[104px] flex flex-col justify-between">
      <p className={`${display.className} font-bold text-[28px] sm:text-[36px] leading-none tracking-[-0.03em] truncate`} style={{ color: color ?? "#ffffff" }}>{value}</p>
      <p className="text-zinc-400 text-[13.5px] mt-2">{label}</p>
    </div>
  );
}
