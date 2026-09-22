"use client";

// The heartbeat, Duolingo-style. Left: the daily path (one thing to do per
// task day, in order, weekly grade check re-plans the next week). Right (or
// above on phones): where you are vs the goal you chose, the honest pace
// read, and the weak spot. Grade check first — nothing else opens before it.

import { useMemo, useState } from "react";
import { display } from "@/lib/displayFont";
import { resolveCurriculum } from "@/data/curricula";
import { getCustomExam } from "@/lib/customExams";
import { bandAt, bandsFor, marksToTop, predictedPct, subjectSeries, tierBreakdown, trendPerWeek, weakSpot, type WeakSpot } from "@/lib/gradeOutlook";
import { paceFor } from "@/lib/journey";
import { buildDailyPlan, type DayNode } from "@/lib/dailyPlan";
import { goalFor, setGoal, type SubjectGoal } from "@/lib/goals";
import DailyPath from "@/components/DailyPath";
import type { ExamAttempt, TopicScore } from "@/lib/types";

const TONE_TEXT: Record<string, string> = { top: "text-emerald-400", high: "text-amber-400", pass: "text-sky-400", fail: "text-rose-400" };

export default function GradeOutlook({
  attempts, topicScores, curriculumId, year, subjects, goals, onGoalsChange, busySubject, onStartCheck, onFixWeakSpot, onStartPaper, onStartMock,
}: {
  attempts: ExamAttempt[];
  topicScores: Record<string, TopicScore>;
  curriculumId: string;
  year: number;
  subjects: string[];
  goals: SubjectGoal[];
  onGoalsChange: (goals: SubjectGoal[]) => void;
  busySubject?: string | null;
  onStartCheck: (subject: string) => void;
  onFixWeakSpot: (spot: WeakSpot) => void;
  onStartPaper: (subject: string) => void;
  onStartMock: (subject: string) => void;
}) {
  const curriculum = resolveCurriculum(curriculumId);
  const bands = bandsFor(curriculumId);
  const pickable = bands.filter((b) => b.tone !== "fail");
  const label = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;

  const seen = useMemo(() => new Set(attempts.filter((a) => a.subject).map((a) => a.subject!)), [attempts]);
  const order = useMemo(() => [...subjects, ...[...seen].filter((s) => !subjects.includes(s))], [subjects, seen]);
  const [subject, setSubject] = useState<string | null>(null);
  const active = subject && order.includes(subject) ? subject : order[0] ?? null;
  const [nowTs] = useState(() => Date.now());
  const [editing, setEditing] = useState(false);

  const points = useMemo(() => subjectSeries(attempts, active), [attempts, active]);
  const checked = points.length > 0;
  const goal = active ? goalFor(goals, active) : null;
  const goalBand = goal ? bands.find((b) => b.id === goal.goal) ?? bands[0] : bands[0];
  const goalPct = Math.round(goalBand.minPct * 100);
  const examT = goal?.examDate ? new Date(goal.examDate + "T09:00:00").getTime() : nowTs + 8 * 7 * 864e5;
  const weeksLeft = Math.max(1, Math.round((examT - nowTs) / (7 * 864e5)));

  const now = predictedPct(points);
  const nowBand = now == null ? null : bandAt(bands, now);
  const slope = trendPerWeek(points);
  const pace = now == null ? null : paceFor(now, goalPct, slope, weeksLeft);
  const gap = now == null ? 0 : marksToTop(now, [goalBand]);
  const tiers = useMemo(() => tierBreakdown(points, getCustomExam), [points]);
  const spot = useMemo(() => (active ? weakSpot(active, tiers, Object.values(topicScores)) : null), [active, tiers, topicScores]);
  const fallbackBand = pace?.state === "unrealistic" ? bands.find((b) => b.minPct < goalBand.minPct && b.tone !== "fail") ?? null : null;

  const plan = useMemo(() => buildDailyPlan({
    now: nowTs, exam: examT, completed: Math.max(0, points.length - 1), hasBaseline: checked,
    pace: pace?.state ?? "on-track", hasWeakSpot: !!spot,
  }), [nowTs, examT, points.length, checked, pace?.state, spot]);
  // Show the current week in full and the next week locked.
  const shownWeeks = useMemo(() => {
    const idx = plan.weeks.findIndex((w) => w.state === "current");
    const from = Math.max(0, idx);
    return plan.weeks.slice(from, from + 2);
  }, [plan]);

  async function chooseGoal(bandId: string, examDate?: string) {
    if (!active) return;
    const next = await setGoal({ subject: active, goal: bandId, examDate: examDate ?? goal?.examDate ?? defaultExamDate(), curriculumId, year });
    onGoalsChange(next);
  }
  function doNode(n: DayNode) {
    if (!active) return;
    if (n.kind === "check") onStartCheck(active);
    else if (n.kind === "fix" && spot) onFixWeakSpot(spot);
    else if (n.kind === "mock") onStartMock(active);
    else onStartPaper(active);
  }

  if (!active) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
      {/* ── Status (top on phones, right on desktop) ── */}
      <aside className="lg:col-span-4 lg:order-2 lg:sticky lg:top-8">
        {order.length > 1 && (
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-3 [scrollbar-width:none]">
            {order.map((s) => (
              <button key={s} onClick={() => { setSubject(s); setEditing(false); }}
                className={`shrink-0 px-3.5 py-2 rounded-full text-[12.5px] font-semibold min-h-[36px] border ${s === active ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : seen.has(s) ? "border-white/[0.1] text-zinc-300" : "border-dashed border-white/[0.12] text-zinc-500"}`}>
                {label(s)}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-[24px] border border-white/[0.08] bg-white/[0.015] p-5">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-1">{label(active)} · now</p>
          {checked && nowBand ? (
            <p className={`${display.className} font-bold text-[30px] leading-none tracking-[-0.02em] ${TONE_TEXT[nowBand.tone]}`}>
              {nowBand.label} <span className="text-zinc-500 text-[14px] font-semibold">{now}%</span>
            </p>
          ) : (
            <p className={`${display.className} font-bold text-[24px] leading-none tracking-[-0.02em] text-zinc-500`}>Not measured yet</p>
          )}

          <div className="h-px bg-white/[0.06] my-4" />

          <button onClick={() => setEditing((e) => !e)} className="text-left group w-full">
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-1">Your goal · {goal?.examDate ? `exam ${new Date(goal.examDate + "T09:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}` : "set a date"}</p>
            <p className={`${display.className} font-bold text-[24px] leading-none ${goal ? TONE_TEXT[goalBand.tone] : "text-zinc-400"} group-hover:underline`}>
              {goal ? goalBand.label : "Choose a goal"} <span className="text-zinc-600 text-[13px]">▾</span>
            </p>
          </button>

          {(editing || !goal) && (
            <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5">
              <p className="text-zinc-400 text-[12.5px] mb-2.5">What grade do you want in {label(active)}?</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {pickable.map((b) => (
                  <button key={b.id} onClick={() => { chooseGoal(b.id); setEditing(false); }}
                    className={`px-3.5 py-2 rounded-full text-[13px] font-semibold min-h-[40px] border ${goal?.goal === b.id ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : "border-white/[0.12] text-zinc-300 hover:border-indigo-400/40"}`}>
                    {b.label}
                  </button>
                ))}
              </div>
              <label className="block text-[12.5px] text-zinc-400">
                Exam date
                <input type="date" defaultValue={goal?.examDate ?? ""} min={new Date(nowTs).toISOString().slice(0, 10)}
                  onChange={(e) => { if (e.target.value) chooseGoal(goal?.goal ?? bands[0].id, e.target.value); }}
                  className="mt-1 w-full bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-[14px] min-h-[42px]" />
              </label>
            </div>
          )}

          {checked && pace && goal && (
            <p className="text-[13px] mt-4 leading-relaxed">
              {pace.state === "there" && <><span className="text-emerald-400 font-semibold">At goal level.</span> <span className="text-zinc-400">Keep sitting papers so it holds on the day.</span></>}
              {pace.state === "on-track" && <><span className="text-emerald-400 font-semibold">On track.</span> <span className="text-zinc-400">{gap} more mark{gap === 1 ? "" : "s"} a paper, {weeksLeft} week{weeksLeft === 1 ? "" : "s"} to get there.</span></>}
              {pace.state === "behind" && <><span className="text-amber-400 font-semibold">Behind.</span> <span className="text-zinc-400">{gap} more mark{gap === 1 ? "" : "s"} a paper in {weeksLeft} week{weeksLeft === 1 ? "" : "s"}. This week is heavier because of it.</span></>}
              {pace.state === "unrealistic" && <><span className="text-rose-400 font-semibold">Not reachable at any sane pace.</span> <span className="text-zinc-400">{goalBand.label} needs about {Math.round(pace.neededPerWeek)} points a week for {weeksLeft} week{weeksLeft === 1 ? "" : "s"}.{fallbackBand && <> {fallbackBand.label} is realistic; keep {goalBand.label} as the stretch.</>}</span></>}
            </p>
          )}
          {checked && spot && (
            <p className="text-zinc-500 text-[12.5px] mt-3">Weak spot: <span className="text-zinc-300">{spot.label}</span> ({spot.pct}%). It&apos;s on your path.</p>
          )}
          {checked && (
            <p className="text-zinc-600 text-[11.5px] mt-3">{plan.totalWeeks} week{plan.totalWeeks === 1 ? "" : "s"} to the exam. Every Sunday&apos;s grade check re-plans the week after it.</p>
          )}
        </div>
      </aside>

      {/* ── The path ── */}
      <div className="lg:col-span-8 lg:order-1">
        <DailyPath weeks={shownWeeks} busy={busySubject === active} onNode={doNode} />
      </div>
    </div>
  );
}

function defaultExamDate(): string {
  return new Date(Date.now() + 8 * 7 * 864e5).toISOString().slice(0, 10);
}
