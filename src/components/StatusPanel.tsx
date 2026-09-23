"use client";

// Beside the daily card: streak, then per subject where they are vs the
// goal they chose (editable) and the honest pace read.

import { useState } from "react";
import { display } from "@/lib/displayFont";
import { resolveCurriculum } from "@/data/curricula";
import { bandsFor } from "@/lib/gradeOutlook";
import { goalFor, setGoal, type SubjectGoal } from "@/lib/goals";
import DatePicker from "@/components/DatePicker";
import AceMascot, { ACE_MOOD, MOOD_COLOR, moodForStreak, nextMoodStep } from "@/components/AceMascot";
import { daysUntil } from "@/lib/dailyTask";

const TONE_TEXT: Record<string, string> = { top: "text-emerald-400", high: "text-amber-400", pass: "text-sky-400", fail: "text-rose-400" };

export default function StatusPanel({
  curriculumId, year, subjects, goals, onGoalsChange, streak, days, celebrate,
}: {
  celebrate?: boolean;
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
  const [poked, setPoked] = useState(false);
  const [nowTs] = useState(() => Date.now());

  const goal = subject ? goalFor(goals, subject) : null;
  const goalBand = goal ? bands.find((b) => b.id === goal.goal) ?? bands[0] : bands[0];

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
        <div className="sa-gold" style={{ "--sa-r": "24px" } as React.CSSProperties}>
        <div className={`p-5 ${nextExam.days <= 7 ? "bg-[#1a0f12]" : nextExam.days <= 21 ? "bg-[#1a160e]" : "bg-[#0e0f13]"}`}>
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
          <button onClick={() => setEditing((e) => !e)} className="mt-3 text-[12px] text-zinc-400 hover:text-white underline-offset-4 hover:underline">
            Goal{goal ? <> · <span className={`font-semibold ${TONE_TEXT[goalBand.tone]}`}>{goalBand.label}</span> in {label(subject)}</> : null} · change
          </button>
          {editing && (
            <div className="mt-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3.5">
              {subjects.length > 1 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {subjects.map((s) => (
                    <button key={s} onClick={() => setActive(s)} className={`px-3 py-1.5 rounded-full text-[12px] font-semibold min-h-[32px] border ${s === subject ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : "border-white/[0.1] text-zinc-400"}`}>{label(s)}</button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2 mb-3">
                {pickable.map((b) => (
                  <button key={b.id} onClick={() => chooseGoal(b.id)}
                    className={`px-3.5 py-2 rounded-full text-[13px] font-semibold min-h-[40px] border ${goal?.goal === b.id ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : "border-white/[0.12] text-zinc-300"}`}>{b.label}</button>
                ))}
              </div>
              <p className="text-[12px] text-zinc-500 mb-1.5">Exam date</p>
              <DatePicker value={goal?.examDate ?? ""} onChange={(d) => { chooseGoal(goal?.goal ?? bands[0].id, d); setEditing(false); }} />
            </div>
          )}
        </div>
        </div>
      )}
      {!nextExam && (
        <div className="sa-gold" style={{ "--sa-r": "24px" } as React.CSSProperties}>
        <div className="bg-[#0e0f13] p-5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500 mb-2">Your goal · {label(subject)}</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {pickable.map((b) => (
              <button key={b.id} onClick={() => chooseGoal(b.id)}
                className={`px-3.5 py-2 rounded-full text-[13px] font-semibold min-h-[40px] border ${goal?.goal === b.id ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : "border-white/[0.12] text-zinc-300"}`}>{b.label}</button>
            ))}
          </div>
          <p className="text-[12px] text-zinc-500 mb-1.5">Exam date</p>
          <DatePicker value={goal?.examDate ?? ""} onChange={(d) => chooseGoal(goal?.goal ?? bands[0].id, d)} />
        </div>
        </div>
      )}
      {/* Streak — Ace is only as healthy as it */}
      {(() => {
        const mood = moodForStreak(streak); const m = ACE_MOOD[mood]; const c = MOOD_COLOR[mood]; const step = nextMoodStep(streak);
        const nextName = step.next != null ? ACE_MOOD[moodForStreak(step.next)].name : null;
        return (
      <div className="sa-gold" style={{ "--sa-r": "24px" } as React.CSSProperties}>
      <div className="relative bg-[#0e0f13] p-5 overflow-hidden">
        {/* mood wash */}
        <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(70% 55% at 50% 38%, ${c}${mood === 0 ? "14" : "2e"} 0%, transparent 70%)` }} aria-hidden />
        <div className="relative">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500">Streak</p>
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] px-2.5 py-1 rounded-full" style={{ color: c, background: `${c}1f` }}>{m.name}</span>
          </div>
          {/* stage */}
          <div className="relative flex justify-center pt-4 pb-2">
            <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 w-[210px] h-[210px] rounded-full pointer-events-none sa-stage" style={{ background: `radial-gradient(circle, ${c}${mood === 0 ? "22" : "55"} 0%, transparent 62%)` }} aria-hidden />
            <div className="absolute left-1/2 bottom-3 -translate-x-1/2 w-[120px] h-[14px] rounded-[50%] pointer-events-none" style={{ background: "radial-gradient(ellipse, rgba(0,0,0,0.6) 0%, transparent 70%)" }} aria-hidden />
            <div className={poked ? "sa-ace-poke" : ""} onAnimationEnd={() => setPoked(false)}>
              <AceMascot mood={mood} size={196} onPoke={() => setPoked(true)} />
            </div>
          </div>
          <div className="text-center mt-1">
            <p className={`${display.className} font-bold leading-none tracking-[-0.04em] ${streak > 0 ? "text-white" : "text-zinc-500"}`}>
              <span className="text-[72px]">{streak}</span> <span className="text-[16px] text-zinc-400 font-semibold tracking-normal">day{streak === 1 ? "" : "s"}</span>
            </p>
            <p className={`${display.className} font-bold text-[20px] tracking-[-0.01em] mt-2`} style={{ color: c }}>{m.line}</p>
            <p className="text-zinc-400 text-[13px] mt-1">{m.sub}</p>
          </div>
          {/* next mood */}
          <div className="mt-5">
            <div className="flex items-center justify-between text-[12px] mb-1.5">
              <span className="text-zinc-400">{nextName ? <>Next: <span className="text-white font-semibold">{nextName}</span></> : <span className="text-white font-semibold">Peak Ace</span>}</span>
              <span className="font-mono text-[11px] text-zinc-500">{step.next != null ? `${step.toGo} day${step.toGo === 1 ? "" : "s"} to go` : `${streak} days`}</span>
            </div>
            <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${Math.round(step.progress * 100)}%`, background: `linear-gradient(90deg, ${c}, #fff2c4)`, boxShadow: `0 0 12px ${c}88` }} />
            </div>
          </div>
          <div className="flex gap-1 mt-4">
            {days.map((d) => (
              <span key={d.key} title={d.key} className={`flex-1 h-5 rounded-md ${d.done ? "bg-gradient-to-b from-indigo-400 to-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.6)]" : d.isToday ? "border border-white/40" : "bg-white/[0.06]"} ${d.isToday && d.done && celebrate ? "sa-block-snap" : ""}`} />
            ))}
          </div>
        </div>
      </div>
      </div>
      ); })()}
    </aside>
  );
}
