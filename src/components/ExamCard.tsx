"use client";

import Link from "next/link";
import type { Exam } from "@/lib/types";
import { STANDARDS } from "@/data/topics";

interface ExamCardProps {
  exam: Exam;
  bestGrade: string | null;
}

export default function ExamCard({ exam, bestGrade }: ExamCardProps) {
  const standardInfo = STANDARDS[exam.standard];
  const totalMarks = exam.questions.reduce((s, q) => s + q.marks, 0);

  return (
    <div className="bg-card border border-card-border rounded-lg p-5 hover:border-blue-500/50 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-white">{exam.title}</h3>
          <p className="text-sm text-slate-400 mt-0.5">
            {standardInfo?.label ?? exam.standard} ({exam.standard})
          </p>
        </div>
        {bestGrade && (
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${
              bestGrade === "excellence"
                ? "bg-yellow-500/10 text-yellow-400"
                : bestGrade === "merit"
                ? "bg-blue-500/10 text-blue-400"
                : bestGrade === "achieved"
                ? "bg-green-500/10 text-green-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            Best: {bestGrade.charAt(0).toUpperCase() + bestGrade.slice(1)}
          </span>
        )}
      </div>

      <div className="flex gap-4 text-xs text-slate-400 mb-4">
        <span>{exam.questions.length} questions</span>
        <span>{totalMarks} marks</span>
        <span>{exam.timeMinutes} min</span>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/exam/${exam.id}?mode=practice`}
          className="flex-1 text-center py-2 rounded text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Practice
        </Link>
        <Link
          href={`/exam/${exam.id}?mode=mock`}
          className="flex-1 text-center py-2 rounded text-sm font-medium border border-slate-600 text-slate-300 hover:bg-slate-800 transition-colors"
        >
          Mock Exam
        </Link>
      </div>
    </div>
  );
}
