"use client";

// The heartbeat card. Per subject: the goal the student chose, where they
// are now, an honest read on the pace, and the journey line with the
// current sprint's tasks on it. Subjects without a grade check yet get the
// button to sit one; subjects without a goal get the goal pills.

import { useMemo, useState } from "react";
import { display } from "@/lib/displayFont";
import { resolveCurriculum } from "@/data/curricula";
import { getCustomExam } from "@/lib/customExams";
import { bandAt, bandsFor, marksToTop, predictedPct, subjectSeries, tierBreakdown, trendPerWeek, weakSpot, type WeakSpot } from "@/lib/gradeOutlook";
import { paceFor, type Step } from "@/lib/journey";
import { goalFor, setGoal, type SubjectGoal } from "@/lib/goals";
import JourneyPath from "@/components/JourneyPath";
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
  const bands = bandsFor(curriculumId); // highest first
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

  async function chooseGoal(bandId: string, examDate?: string) {
    if (!active) return;
    const next = await setGoal({ subject: active, goal: bandId, examDate: examDate ?? goal?.examDate ?? defaultExamDate(), curriculumId, year });
    onGoalsChange(next);
  }

  if (!active) return null;

  return (
    <section className="rounded-[28px] border border-white/[0.08] bg-white/[0.015] p-4 sm:p-6 lg:p-8">
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

      {/* Headline: where you are → the goal you chose */}
      <div className="flex flex-wrap items-end justify-between gap-3 mb-1">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-1">{label(active)} · now</p>
          {checked && nowBand ? (
            <p className={`${display.className} font-bold text-[28px] sm:text-[34px] leading-none tracking-[-0.02em] ${TONE_TEXT[nowBand.tone]}`}>
              {nowBand.label} <span className="text-zinc-500 text-[15px] font-semibold">{now}%</span>
            </p>
          ) : (
            <p className={`${display.className} font-bold text-[28px] sm:text-[34px] leading-none tracking-[-0.02em] text-zinc-500`}>Not measured yet</p>
          )}
        </div>
        <button onClick={() => setEditing((e) => !e)} className="text-right group">
          <p className="font-mono text-[10.5px] uppercase tracking-wider text-zinc-500 mb-1">Your goal · {goal?.examDate ? `exam ${new Date(goal.examDate + "T09:00:00").toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}` : "set a date"}</p>
          <p className={`${display.className} font-bold text-[22px] sm:text-[26px] leading-none ${goal ? TONE_TEXT[goalBand.tone] : "text-zinc-400"} group-hover:underline`}>
            {goal ? goalBand.label : "Choose a goal"} <span className="text-zinc-600 text-[14px]">▾</span>
          </p>
        </button>
      </div>

      {(editing || !goal) && (
        <div className="mt-3 mb-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
          <p className="text-zinc-400 text-[13px] mb-3">What grade do you want in {label(active)} at your next exam?</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {pickable.map((b) => (
              <button key={b.id} onClick={() => { chooseGoal(b.id); setEditing(false); }}
                className={`px-4 py-2.5 rounded-full text-[13.5px] font-semibold min-h-[44px] border ${goal?.goal === b.id ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : "border-white/[0.12] text-zinc-300 hover:border-indigo-400/40"}`}>
                {b.label}
              </button>
            ))}
          </div>
          <label className="flex flex-wrap items-center gap-3 text-[13px] text-zinc-400">
            Exam date
            <input type="date" defaultValue={goal?.examDate ?? ""} min={new Date(nowTs).toISOString().slice(0, 10)}
              onChange={(e) => { if (e.target.value) chooseGoal(goal?.goal ?? bands[0].id, e.target.value); }}
              className="bg-white/[0.04] border border-white/[0.1] rounded-lg px-3 py-2 text-white text-[14px] min-h-[44px]" />
          </label>
        </div>
      )}

      {/* Honest pace line */}
      {checked && pace && goal && (
        <p className="text-[13.5px] mt-2 mb-3">
          {pace.state === "there" && <><span className="text-emerald-400 font-semibold">You&apos;re scoring at {goalBand.label} level.</span> <span className="text-zinc-400">Keep sitting papers so it holds on the day.</span></>}
          {pace.state === "on-track" && <><span className="text-emerald-400 font-semibold">On track.</span> <span className="text-zinc-400">{gap} more mark{gap === 1 ? "" : "s"} a paper to {goalBand.label}, {weeksLeft} week{weeksLeft === 1 ? "" : "s"} to do it. Keep to {pace.papersPerWeek} papers a week.</span></>}
          {pace.state === "behind" && <><span className="text-amber-400 font-semibold">Behind the line.</span> <span className="text-zinc-400">{gap} more mark{gap === 1 ? "" : "s"} a paper in {weeksLeft} week{weeksLeft === 1 ? "" : "s"}. That needs {pace.papersPerWeek} papers a week from here, starting tonight.</span></>}
          {pace.state === "unrealistic" && <><span className="text-rose-400 font-semibold">Not reachable at any sane pace.</span> <span className="text-zinc-400">{goalBand.label} needs about {Math.round(pace.neededPerWeek)} points a week for {weeksLeft} week{weeksLeft === 1 ? "" : "s"}.{fallbackBand && <> {fallbackBand.label} is realistic for this exam; keep {goalBand.label} as the stretch.</>}</span></>}
        </p>
      )}

      {!checked ? (
        <div className="mt-4 py-2">
          <p className={`${display.className} text-white font-bold text-[24px] leading-tight tracking-[-0.01em] mb-2`}>Start with a grade check</p>
          <p className="text-zinc-400 text-[13.5px] mb-5">Eight questions, marked properly. It sets your starting point, and the path to {goal ? goalBand.label : "your goal"} appears from there.</p>
          <button onClick={() => onStartCheck(active)} disabled={busySubject === active}
            className="w-full sm:w-auto bg-white text-[#0a0a0f] font-bold text-[15px] px-8 py-3.5 rounded-full min-h-[50px] disabled:opacity-60">
            {busySubject === active ? "Building your grade check…" : `Check my grade in ${label(active)} →`}
          </button>
        </div>
      ) : (
        <JourneyPath
          baseline={points[0].t}
          now={nowTs}
          exam={examT}
          completed={Math.max(0, points.length - 1)}
          hasWeakSpot={!!spot}
          goalLabel={goalBand.label}
          busy={busySubject === active}
          onStep={(step: Step) => {
            if (step.kind === "fix" && spot) onFixWeakSpot(spot);
            else if (step.kind === "mock") onStartMock(active);
            else if (step.kind === "check") onStartCheck(active);
            else onStartPaper(active);
          }}
        />
      )}
      {checked && spot && (
        <p className="text-zinc-500 text-[12.5px] mt-2">Weak spot right now: <span className="text-zinc-300">{spot.label}</span> ({spot.pct}%). It&apos;s on the line.</p>
      )}
    </section>
  );
}

function defaultExamDate(): string {
  return new Date(Date.now() + 8 * 7 * 864e5).toISOString().slice(0, 10);
}
