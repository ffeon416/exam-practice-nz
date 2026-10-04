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
  const scored = !!m && !m.noGoal && m.you != null;
  // No score yet → the card wears the goal's green; after that, the state colour.
  const color = scored ? STATE[state].color : "#3ee6a0";
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
          <div className="relative rounded-[28px] border-2 bg-[#0e0f13] p-6 sm:p-9 lg:p-10 overflow-clip"
            style={{
              borderColor: `${color}66`,
              backgroundImage: `linear-gradient(135deg, ${color}1f 0%, ${color}08 34%, transparent 62%), linear-gradient(315deg, #8b8cf81a 0%, transparent 45%)`,
              boxShadow: `0 0 0 1px ${color}14, 0 28px 90px -28px ${color}59`,
            }}>
            {/* faint grid + corner glow: gradients only, no blur filters */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.5]" aria-hidden
              style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)", backgroundSize: "44px 44px", maskImage: "radial-gradient(ellipse at 70% 0%, #000 0%, transparent 70%)", WebkitMaskImage: "radial-gradient(ellipse at 70% 0%, #000 0%, transparent 70%)" }} />
            <div className="absolute -top-32 -right-32 w-[520px] h-[520px] rounded-full pointer-events-none" aria-hidden style={{ background: `radial-gradient(circle, ${color}2b 0%, transparent 65%)` }} />
            <div className="relative flex items-start justify-between gap-6 flex-wrap">
              <div className="home-rise">
                {!m.noGoal && (
                  <span className="inline-flex items-center gap-2 font-mono font-bold text-[11px] sm:text-[12px] uppercase tracking-[0.18em] px-3.5 py-1.5 rounded-full text-[#0a0a0f]" style={{ background: color }}>
                    <span className="w-2 h-2 rounded-full bg-[#0a0a0f]/70 animate-pulse" />{scored ? STATE[state].pill : "Not on the map yet"}
                  </span>
                )}
                <h2 className={`${display.className} font-bold text-white text-[38px] sm:text-[54px] lg:text-[64px] leading-[1] tracking-[-0.045em] mt-4`}>
                  {headline.a}<br />
                  <span className="bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(90deg, ${color} 0%, #8b8cf8 100%)` }}>{headline.b}</span>
                </h2>
              </div>
              <div className="sm:text-right">
                <Link href="/schedule" className="inline-flex items-center font-bold text-[17px] sm:text-[19px] px-7 sm:px-8 py-4 rounded-full min-h-[60px] text-[#07120d] transition-transform hover:scale-[1.04]" style={{ background: "#3ee6a0", boxShadow: "0 0 44px rgba(62,230,160,0.45)" }}>
                  {scored ? <>Tonight&apos;s paper →</> : <>Start my line →</>}
                </Link>
                <p className="text-zinc-400 text-[13.5px] mt-2.5">{scored ? "One a day keeps you on the line" : "One grade check puts you on the map"}</p>
              </div>
            </div>
            <div className="relative mt-8 sm:mt-10 -mx-2">
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
              <Stat eyebrow="Pace" value={m.read ? `${Math.abs(m.read.diff)} pts` : null} label={m.read ? (m.read.diff < 0 ? "behind pace today" : m.read.diff > 0 ? "ahead of pace today" : "right on pace today") : "shows after your first score"} color={m.read ? color : "#3ee6a0"} />
              <Stat eyebrow="Daily climb" value={m.perDay != null ? `+${m.perDay < 1 ? m.perDay.toFixed(1) : Math.round(m.perDay)} a day` : null} label={m.perDay != null ? "what you need to average" : "shows after your first score"} color="#8b8cf8" />
              <Stat eyebrow="Weak spot" value={m.spot ? m.spot.label.replace(/ questions$/, "") : null} label={m.spot ? "weakest topic · biggest win" : "found once you've sat a paper"} color="#fbbf24" />
              <Stat eyebrow="Countdown" value={String(m.examDays)} label={`days to ${fmt(m.examDate)}`} color="#ff6b7a" progress={m.total > 0 ? Math.min(1, m.day / m.total) : undefined} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ eyebrow, value, label, color, progress }: { eyebrow: string; value: string | null; label: string; color: string; progress?: number }) {
  // value null = not known yet: a dim "?" in the card's colour, never a made-up number.
  return (
    <div className="relative rounded-[24px] border bg-[#0e0f13] p-5 sm:p-6 min-h-[132px] flex flex-col justify-between overflow-clip transition-transform hover:-translate-y-0.5"
      style={{ borderColor: `${color}40`, backgroundImage: `linear-gradient(160deg, ${color}1c 0%, transparent 55%)` }}>
      <span className="absolute left-5 right-5 top-0 h-[3px] rounded-b-full" style={{ background: color, boxShadow: `0 0 16px ${color}` }} aria-hidden />
      <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color }}>{eyebrow}</p>
      <div>
        <p className={`${display.className} font-bold text-[30px] sm:text-[38px] leading-none tracking-[-0.03em] truncate mt-3`} style={{ color: value == null ? `${color}80` : "#ffffff" }}>{value ?? "?"}</p>
        <p className="text-zinc-400 text-[13.5px] mt-2">{label}</p>
        {progress != null && (
          <div className="h-1.5 rounded-full bg-white/[0.07] overflow-hidden mt-3"><div className="h-full rounded-full" style={{ width: `${Math.round(progress * 100)}%`, background: color }} /></div>
        )}
      </div>
    </div>
  );
}
