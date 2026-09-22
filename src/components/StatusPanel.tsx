"use client";

// Beside the daily card: streak, then per subject where they are vs the
// goal they chose (editable) and the honest pace read.

import { useMemo, useState } from "react";
import { display } from "@/lib/displayFont";
import { resolveCurriculum } from "@/data/curricula";
import { getCustomExam } from "@/lib/customExams";
import { bandAt, bandsFor, marksToTop, predictedPct, subjectSeries, tierBreakdown, trendPerWeek, weakSpot } from "@/lib/gradeOutlook";
import { paceFor } from "@/lib/journey";
import { goalFor, setGoal, type SubjectGoal } from "@/lib/goals";
import DatePicker from "@/components/DatePicker";
import { daysUntil } from "@/lib/dailyTask";
import type { ExamAttempt, TopicScore } from "@/lib/types";

const TONE_TEXT: Record<string, string> = { top: "text-emerald-400", high: "text-amber-400", pass: "text-sky-400", fail: "text-rose-400" };

export default function StatusPanel({
  attempts, topicScores, curriculumId, year, subjects, goals, onGoalsChange, streak, days,
}: {
  attempts: ExamAttempt[];
  topicScores: Record<string, TopicScore>;
  curriculumId: string;
  year: number;
  subjects: string[];
  goals: SubjectGoal[];
  onGoalsChange: (g: SubjectGoal[]) => void;
  streak: number;
  days: { key: string; done: boolean; isToday: boolean; label: string }[];
}) {
  const curriculum = resolveCurriculum(curriculumId);
  const bands = bandsFor(curriculumId);
  const pickable = bands.filter((b) => b.tone !== "fail");
  const label = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;
  const [active, setActive] = useState<string | null>(null);
  const subject = active && subjects.includes(active) ? active : subjects[0] ?? null;
  const [editing, setEditing] = useState(false);
  const [nowTs] = useState(() => Date.now());

  const points = useMemo(() => subjectSeries(attempts, subject), [attempts, subject]);
  const goal = subject ? goalFor(goals, subject) : null;
  const goalBand = goal ? bands.find((b) => b.id === goal.goal) ?? bands[0] : bands[0];
  const examT = goal?.examDate ? new Date(goal.examDate + "T09:00:00").getTime() : nowTs + 8 * 7 * 864e5;
  const weeksLeft = Math.max(1, Math.round((examT - nowTs) / (7 * 864e5)));
  const now = predictedPct(points);
  const nowBand = now == null ? null : bandAt(bands, now);
  const pace = now == null ? null : paceFor(now, Math.round(goalBand.minPct * 100), trendPerWeek(points), weeksLeft);
  const gap = now == null ? 0 : marksToTop(now, [goalBand]);
  const tiers = useMemo(() => tierBreakdown(points, getCustomExam), [points]);
  const spot = useMemo(() => (subject ? weakSpot(subject, tiers, Object.values(topicScores)) : null), [subject, tiers, topicScores]);
  const fallbackBand = pace?.state === "unrealistic" ? bands.find((b) => b.minPct < goalBand.minPct && b.tone !== "fail") ?? null : null;

  async function chooseGoal(bandId: string, examDate?: string) {
    if (!subject) return;
    onGoalsChange(await setGoal({ subject, goal: bandId, examDate: examDate ?? goal?.examDate ?? new Date(nowTs + 8 * 7 * 864e5).toISOString().slice(0, 10), curriculumId, year }));
  }
  if (!subject) return null;

  // Nearest exam across every subject with a date.
  const upcoming = goals
    .filter((g) => g.examDate)
    .map((g) => ({ subject: g.subject, days: daysUntil(g.examDate), date: g.examDate }))
    .filter((g) => g.days >= 0)
    .sort((a, b) => a.days - b.days);
  const nextExam = upcoming[0] ?? null;

  return (
    <aside className="space-y-4">
      {/* Exam countdown */}
      {nextExam && (
        <div className={`rounded-[24px] border p-5 ${nextExam.days <= 7 ? "border-rose-400/30 bg-rose-500/[0.06]" : nextExam.days <= 21 ? "border-amber-400/25 bg-amber-500/[0.05]" : "border-white/[0.08] bg-white/[0.015]"}`}>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500">
            {upcoming.length > 1 ? "Next exam" : "Your exam"} · {label(nextExam.subject)}
          </p>
          <p className={`${display.className} font-bold leading-none tracking-[-0.03em] mt-1 ${nextExam.days <= 7 ? "text-rose-300" : nextExam.days <= 21 ? "text-amber-300" : "text-white"}`}>
            <span className="text-[44px]">{nextExam.days}</span> <span className="text-[16px] text-zinc-400 font-semibold">{nextExam.days === 1 ? "day" : "days"} to go</span>
          </p>
          <p className="text-zinc-500 text-[12px] mt-1.5">
            {new Date(nextExam.date + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}
            {upcoming.length > 1 && <> · {upcoming.slice(1).map((u) => `${label(u.subject)} in ${u.days}`).join(", ")}</>}
          </p>
        </div>
      )}
      {/* Streak */}
      <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.015] p-5">
        <div className="flex items-end justify-between gap-3 mb-3">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500">Streak</p>
            <p className={`${display.className} font-bold text-[30px] leading-none tracking-[-0.02em] ${streak > 0 ? "text-white" : "text-zinc-500"}`}>{streak} <span className="text-[14px] text-zinc-500 font-semibold">day{streak === 1 ? "" : "s"}</span></p>
          </div>
          <p className="text-zinc-500 text-[12px] text-right">one task a day<br />keeps it alive</p>
        </div>
        <div className="flex gap-1">
          {days.map((d) => (
            <span key={d.key} title={d.key} className={`flex-1 h-7 rounded-md ${d.done ? "bg-gradient-to-b from-indigo-400 to-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.6)]" : d.isToday ? "border border-white/40" : "bg-white/[0.06]"}`} />
          ))}
        </div>
      </div>

      {/* Subject status */}
      <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.015] p-5">
        {subjects.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-3 mb-1 [scrollbar-width:none]">
            {subjects.map((s) => (
              <button key={s} onClick={() => { setActive(s); setEditing(false); }}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-semibold min-h-[32px] border ${s === subject ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : "border-white/[0.1] text-zinc-400"}`}>
                {label(s)}
              </button>
            ))}
          </div>
        )}
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500 mb-1">{label(subject)} · now</p>
        {nowBand ? (
          <p className={`${display.className} font-bold text-[28px] leading-none tracking-[-0.02em] ${TONE_TEXT[nowBand.tone]}`}>{nowBand.label} <span className="text-zinc-500 text-[13px] font-semibold">{now}%</span></p>
        ) : (
          <p className={`${display.className} font-bold text-[22px] leading-none text-zinc-500`}>Not measured yet</p>
        )}
        <div className="h-px bg-white/[0.06] my-4" />
        <button onClick={() => setEditing((e) => !e)} className="text-left group w-full">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500 mb-1">Your goal · {goal?.examDate ? `exam ${new Date(goal.examDate + "T09:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}` : "set a date"}</p>
          <p className={`${display.className} font-bold text-[22px] leading-none ${goal ? TONE_TEXT[goalBand.tone] : "text-zinc-400"} group-hover:underline`}>{goal ? goalBand.label : "Choose a goal"} <span className="text-zinc-600 text-[12px]">▾</span></p>
        </button>
        {(editing || !goal) && (
          <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5">
            <div className="flex flex-wrap gap-2 mb-3">
              {pickable.map((b) => (
                <button key={b.id} onClick={() => { chooseGoal(b.id); if (goal?.examDate) setEditing(false); }}
                  className={`px-3.5 py-2 rounded-full text-[13px] font-semibold min-h-[40px] border ${goal?.goal === b.id ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : "border-white/[0.12] text-zinc-300"}`}>{b.label}</button>
              ))}
            </div>
            <p className="text-[12px] text-zinc-500 mb-1.5">Exam date</p>
            <DatePicker value={goal?.examDate ?? ""} onChange={(d) => { chooseGoal(goal?.goal ?? bands[0].id, d); setEditing(false); }} />
          </div>
        )}
        {pace && goal && (
          <p className="text-[13px] mt-4 leading-relaxed">
            {pace.state === "there" && <><span className="text-emerald-400 font-semibold">At goal level.</span> <span className="text-zinc-400">Keep the daily task up so it holds on the day.</span></>}
            {pace.state === "on-track" && <><span className="text-emerald-400 font-semibold">On track.</span> <span className="text-zinc-400">{gap} more mark{gap === 1 ? "" : "s"} a paper, {weeksLeft} week{weeksLeft === 1 ? "" : "s"} to get there.</span></>}
            {pace.state === "behind" && <><span className="text-amber-400 font-semibold">Behind.</span> <span className="text-zinc-400">{gap} more mark{gap === 1 ? "" : "s"} a paper in {weeksLeft} week{weeksLeft === 1 ? "" : "s"}. Don&apos;t miss a day.</span></>}
            {pace.state === "unrealistic" && <><span className="text-rose-400 font-semibold">Not reachable at any sane pace.</span> <span className="text-zinc-400">{goalBand.label} needs about {Math.round(pace.neededPerWeek)} points a week for {weeksLeft} week{weeksLeft === 1 ? "" : "s"}.{fallbackBand && <> {fallbackBand.label} is realistic; keep {goalBand.label} as the stretch.</>}</span></>}
          </p>
        )}
        {spot && <p className="text-zinc-500 text-[12.5px] mt-3">Weak spot: <span className="text-zinc-300">{spot.label}</span> ({spot.pct}%). Your fix-it days target this.</p>}
      </div>
    </aside>
  );
}
