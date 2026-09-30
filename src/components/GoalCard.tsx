"use client";

// The goal behind the pace line: the grade the student chose for this
// subject, the exam date, and how many days are left. Both editable here.

import { useState } from "react";
import { display } from "@/lib/displayFont";
import { resolveCurriculum } from "@/data/curricula";
import { bandsFor } from "@/lib/gradeOutlook";
import { goalFor, setGoal, type SubjectGoal } from "@/lib/goals";
import DatePicker from "@/components/DatePicker";
import { daysUntil } from "@/lib/dailyTask";

const TONE_TEXT: Record<string, string> = { top: "text-emerald-400", high: "text-amber-400", pass: "text-sky-400", fail: "text-rose-400" };

export default function GoalCard({
  curriculumId, year, subject, goals, onGoalsChange,
}: {
  curriculumId: string;
  year: number;
  subject: string;
  goals: SubjectGoal[];
  onGoalsChange: (g: SubjectGoal[]) => void;
}) {
  const curriculum = resolveCurriculum(curriculumId);
  const bands = bandsFor(curriculumId);
  const pickable = bands.filter((b) => b.tone !== "fail");
  const label = (v: string) => curriculum.subjects.find((s) => s.value === v)?.label ?? v;
  const [nowTs] = useState(() => Date.now());

  const goal = goalFor(goals, subject);
  const goalBand = goal ? bands.find((b) => b.id === goal.goal) ?? bands[0] : null;
  const days = goal?.examDate ? daysUntil(goal.examDate) : null;
  const passed = days != null && days < 0;

  async function chooseGoal(bandId: string, examDate?: string) {
    onGoalsChange(await setGoal({ subject, goal: bandId, examDate: examDate ?? goal?.examDate ?? new Date(nowTs + 8 * 7 * 864e5).toISOString().slice(0, 10), curriculumId, year }));
  }

  const tone = days == null || passed ? "bg-[#0e0f13]" : days <= 7 ? "bg-[#1a0f12]" : days <= 21 ? "bg-[#1a160e]" : "bg-[#0e0f13]";
  const numColor = days == null || passed ? "text-white" : days <= 7 ? "text-rose-300" : days <= 21 ? "text-amber-300" : "text-white";

  return (
    <div className="sa-gold" style={{ "--sa-r": "24px" } as React.CSSProperties}>
      <div className={`p-5 sm:p-6 ${tone}`}>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500">Your exam · {label(subject)}</p>
        {days != null && !passed ? (
          <>
            <p className={`${display.className} font-bold leading-none tracking-[-0.03em] mt-1 ${numColor}`}>
              <span className="text-[44px]">{days}</span> <span className="text-[16px] text-zinc-400 font-semibold">{days === 1 ? "day" : "days"} to go</span>
            </p>
            <p className="text-zinc-500 text-[12px] mt-1.5">{new Date(goal!.examDate + "T12:00:00").toLocaleDateString("en-NZ", { weekday: "long", day: "numeric", month: "long" })}</p>
          </>
        ) : passed ? (
          <p className="text-zinc-300 text-[14px] mt-1.5 leading-relaxed">That exam date has passed. Set the next one and the line resets to it.</p>
        ) : (
          <p className="text-zinc-300 text-[14px] mt-1.5 leading-relaxed">No exam date yet. Add it and the pace line knows how fast you need to climb.</p>
        )}

        <div className="mt-5">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500 mb-2">
            Goal{goalBand ? <> · <span className={`font-semibold ${TONE_TEXT[goalBand.tone]}`}>{goalBand.label}</span></> : null}
          </p>
          <div className="flex flex-wrap gap-2">
            {pickable.map((b) => (
              <button key={b.id} onClick={() => chooseGoal(b.id)}
                className={`px-3.5 py-2 rounded-full text-[13px] font-semibold min-h-[40px] border ${goal?.goal === b.id ? "border-indigo-400/60 bg-indigo-500/[0.14] text-white" : "border-white/[0.12] text-zinc-300"}`}>{b.label}</button>
            ))}
          </div>
        </div>
        <div className="mt-4">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-zinc-500 mb-2">Exam date</p>
          <DatePicker value={goal?.examDate ?? ""} onChange={(d) => chooseGoal(goal?.goal ?? bands[0].id, d)} />
        </div>
      </div>
    </div>
  );
}
