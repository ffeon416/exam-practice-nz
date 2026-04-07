"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadProgress } from "@/lib/storage";
import { gradeLabel } from "@/lib/scoring";
import type { StudentProgress } from "@/lib/types";

export default function HomePage() {
  const [progress, setProgress] = useState<StudentProgress | null>(null);

  useEffect(() => {
    setProgress(loadProgress());
  }, []);

  const hasHistory = progress && progress.totalExamsTaken > 0;

  return (
    <div className="max-w-lg mx-auto px-5 py-20">
      {/* Hero */}
      <div className="text-center mb-14">
        <h1 className="text-[28px] font-semibold text-white mb-2.5 tracking-tight leading-tight">
          Ace your NCEA exams.
        </h1>
        <p className="text-zinc-500 text-[15px] leading-relaxed mb-8">
          89 real past papers. 938 questions with answers.<br />
          Maths, Science, Economics, Accounting, Geography.
        </p>
        <div className="flex gap-2.5 justify-center">
          <Link
            href="/subjects"
            className="bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-lg hover:bg-indigo-400 transition-colors text-[13px]"
          >
            Start practising
          </Link>
          <Link
            href="/practice"
            className="text-zinc-400 font-medium px-5 py-2.5 rounded-lg border border-zinc-800 hover:border-zinc-600 hover:text-zinc-200 transition-colors text-[13px]"
          >
            Fix weak spots
          </Link>
        </div>
      </div>

      {/* Quick stats for returning users */}
      {hasHistory && (
        <div className="grid grid-cols-3 gap-px bg-zinc-800/50 rounded-lg overflow-hidden mb-14">
          <div className="bg-[#141419] p-4 text-center">
            <div className="text-lg font-semibold text-white">{progress.totalExamsTaken}</div>
            <div className="text-[11px] text-zinc-600 mt-0.5">exams done</div>
          </div>
          <div className="bg-[#141419] p-4 text-center">
            <div className="text-lg font-semibold text-white">{progress.streakDays}</div>
            <div className="text-[11px] text-zinc-600 mt-0.5">day streak</div>
          </div>
          <div className="bg-[#141419] p-4 text-center">
            <div className="text-lg font-semibold text-white">
              {progress.examAttempts.length > 0
                ? gradeLabel(progress.examAttempts[progress.examAttempts.length - 1].overallGrade)
                : "—"}
            </div>
            <div className="text-[11px] text-zinc-600 mt-0.5">last grade</div>
          </div>
        </div>
      )}

      {/* How it works */}
      <div className="space-y-3 mb-14">
        {[
          { n: "1", text: "Pick your year level, subject, and paper" },
          { n: "2", text: "Answer the questions — practice or timed mock" },
          { n: "3", text: "See what you got right, what you got wrong, and the correct answers" },
          { n: "4", text: "Learn the concepts you struggled with, then try again" },
        ].map((item) => (
          <div key={item.n} className="flex gap-3 items-start">
            <span className="text-indigo-400/80 text-[12px] font-mono mt-0.5 w-3 shrink-0">{item.n}</span>
            <span className="text-zinc-400 text-[13px] leading-relaxed">{item.text}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="text-center">
        <div className="flex flex-wrap gap-1.5 justify-center mb-6">
          {["Year 10–13", "Maths", "Science", "Economics", "Accounting", "Geography"].map((s) => (
            <span key={s} className="text-[11px] px-2.5 py-1 rounded-full bg-indigo-500/[0.08] text-indigo-300/60 border border-indigo-500/[0.1]">
              {s}
            </span>
          ))}
        </div>
        <p className="text-[11px] text-zinc-700">Free. No sign up.</p>
      </div>
    </div>
  );
}
