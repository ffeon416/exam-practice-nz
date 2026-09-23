"use client";

// Beside the daily card: streak, then per subject where they are vs the
// goal they chose (editable) and the honest pace read.

import { useState } from "react";
import { display } from "@/lib/displayFont";
import { resolveCurriculum } from "@/data/curricula";
import { bandsFor } from "@/lib/gradeOutlook";
import { goalFor, setGoal, type SubjectGoal } from "@/lib/goals";
import DatePicker from "@/components/DatePicker";
import AceMascot, { ACE_MOOD, moodForStreak } from "@/components/AceMascot";
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
      {(() => { const mood = moodForStreak(streak); const m = ACE_MOOD[mood]; return (
      <div className="sa-gold" style={{ "--sa-r": "24px" } as React.CSSProperties}>
      <div className="bg-[#0e0f13] p-5">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500">Streak</p>
        <div className="flex items-center gap-4 mt-2">
          <AceMascot mood={mood} size={78} className="shrink-0" />
          <div className="min-w-0">
            <p className={`${display.className} font-bold text-[34px] leading-none tracking-[-0.02em] ${streak > 0 ? "text-white" : "text-zinc-500"}`}>{streak} <span className="text-[14px] text-zinc-500 font-semibold">day{streak === 1 ? "" : "s"}</span></p>
            <p className="text-zinc-200 text-[13.5px] font-semibold mt-1.5">{m.line}</p>
          </div>
        </div>
        <div className="flex gap-1 mt-4">
          {days.map((d) => (
            <span key={d.key} title={d.key} className={`flex-1 h-7 rounded-md ${d.done ? "bg-gradient-to-b from-indigo-400 to-violet-600 shadow-[0_0_8px_rgba(139,92,246,0.6)]" : d.isToday ? "border border-white/40" : "bg-white/[0.06]"} ${d.isToday && d.done && celebrate ? "sa-block-snap" : ""}`} />
          ))}
        </div>
        <p className="text-zinc-500 text-[12.5px] mt-3">{m.sub}</p>
      </div>
      </div>
      ); })()}
    </aside>
  );
}
