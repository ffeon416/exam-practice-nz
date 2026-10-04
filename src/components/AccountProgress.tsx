"use client";

// The progress half of the dashboard (/profile): four numbers, the topics
// costing the most marks, recent papers and saved papers. Moved here from
// the old /dashboard page when the account page became the one dashboard.
// Loads its own data and never redirects, so it is safe on any account.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { display } from "@/lib/displayFont";
import { loadProgress, saveProgress, getWeakTopics } from "@/lib/storage";
import { setScopeUserId } from "@/lib/userScope";
import { gradeLabel } from "@/lib/scoring";
import { getTopicLabel } from "@/data/topics";
import { localDateKey, streakDays } from "@/lib/dailyTask";
import { listCustomExams, deleteCustomExam, getCustomExam, isCustomExamId, type CustomExamMeta } from "@/lib/customExams";
import type { ExamAttempt, StudentProgress } from "@/lib/types";

const CARD = "rounded-[28px] border border-white/[0.08] bg-[#0e0f13] p-5 sm:p-7";
const EYEBROW = "font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500";
const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, " ");
const pctOf = (a: ExamAttempt) => (a.maxMarks > 0 ? Math.round((a.totalMarks / a.maxMarks) * 100) : 0);

export default function AccountProgress() {
  const { user, isLoaded } = useUser();
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  const [serverChecked, setServerChecked] = useState(false);
  const [papers, setPapers] = useState<CustomExamMeta[]>([]);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    // Storage is namespaced per account: set the scope before any read.
    if (!isLoaded || !user) return;
    setScopeUserId(user.id);
    let cancelled = false;
    const id = setTimeout(() => {
      const local = loadProgress();
      setProgress(local);
      setPapers(listCustomExams());
      fetch("/api/progress").then((r) => (r.ok ? r.json() : null)).then((data) => {
        if (cancelled) return;
        const server: ExamAttempt[] = data?.examAttempts ?? [];
        if (server.length > 0) {
          // Union, never replace: a paper marked seconds ago may not be on the server yet.
          const key = (a: ExamAttempt) => `${a.examId}|${new Date(a.date).toISOString().slice(0, 16)}`;
          const seen = new Set(server.map(key));
          const all = [...server, ...(local.examAttempts ?? []).filter((a) => !seen.has(key(a)))];
          const merged: StudentProgress = { examAttempts: all, topicScores: { ...local.topicScores, ...(data.topicScores || {}) }, totalExamsTaken: all.length, streakDays: Math.max(local.streakDays, data.streakDays ?? 0), lastActiveDate: local.lastActiveDate };
          setProgress(merged); saveProgress(merged);
        }
        setServerChecked(true);
      }).catch(() => { if (!cancelled) setServerChecked(true); });
    }, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [isLoaded, user]);

  // Neutral skeleton until the server has answered, so a returning student on
  // a new device never sees a flash of "no papers yet".
  if (!progress || (progress.examAttempts.length === 0 && !serverChecked)) {
    return <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.015] min-h-[420px] animate-pulse" />;
  }

  const attempts = [...progress.examAttempts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  if (attempts.length === 0) {
    return (
      <div className={CARD}>
        <p className={EYEBROW}>Progress</p>
        <h2 className={`${display.className} font-bold text-white text-[28px] sm:text-[36px] leading-tight tracking-[-0.03em] mt-3`}>Nothing marked yet.</h2>
        <p className="text-zinc-400 text-[15px] mt-2 max-w-md">Your papers, average and weak spots show up here after your first marked paper.</p>
        <Link href="/schedule" className="inline-flex items-center font-bold text-[16px] px-7 rounded-full min-h-[52px] mt-5 text-[#07120d] bg-[#3ee6a0] transition-transform hover:scale-[1.03]">Go to today&apos;s task →</Link>
      </div>
    );
  }

  const avg = Math.round(attempts.reduce((s, a) => s + pctOf(a), 0) / attempts.length);
  const streak = streakDays(attempts.map((a) => localDateKey(new Date(a.date))), localDateKey());
  const last = attempts[0];
  const weak = getWeakTopics(progress, 3).filter((t) => t.correctRate < 0.7);
  // Which subject each topic was practised under, for the "practise this" link.
  const topicSubject = new Map<string, string>();
  for (const a of [...attempts].reverse()) {
    const subj = a.subject ?? (isCustomExamId(a.examId) ? getCustomExam(a.examId)?.subject : undefined);
    if (subj) for (const r of a.results ?? []) for (const tp of r.topicsToReview ?? []) topicSubject.set(tp, subj);
  }

  const stats: { eyebrow: string; value: string; label: string; color: string }[] = [
    { eyebrow: "Papers", value: String(attempts.length), label: "marked so far", color: "#8b8cf8" },
    { eyebrow: "Average", value: `${avg}%`, label: "across every paper", color: avg >= 65 ? "#3ee6a0" : avg >= 50 ? "#fbbf24" : "#ff6b7a" },
    { eyebrow: "Streak", value: streak > 0 ? `${streak}` : "0", label: streak === 1 ? "night in a row" : "nights in a row", color: "#a78bfa" },
    { eyebrow: "Last grade", value: gradeLabel(last.overallGrade, pctOf(last)), label: new Date(last.date).toLocaleDateString("en-NZ", { day: "numeric", month: "short" }), color: "#7dd3fc" },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Four numbers */}
      <div className="grid grid-cols-2 gap-4 sm:gap-5">
        {stats.map((s) => (
          <div key={s.eyebrow} className="relative rounded-[24px] border bg-[#0e0f13] p-5 sm:p-6 overflow-clip" style={{ borderColor: `${s.color}40`, backgroundImage: `linear-gradient(160deg, ${s.color}1c 0%, transparent 55%)` }}>
            <span className="absolute left-5 right-5 top-0 h-[3px] rounded-b-full" style={{ background: s.color, boxShadow: `0 0 16px ${s.color}` }} aria-hidden />
            <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] font-bold" style={{ color: s.color }}>{s.eyebrow}</p>
            <p className={`${display.className} font-bold text-white text-[34px] sm:text-[44px] leading-none tracking-[-0.03em] mt-3 truncate`}>{s.value}</p>
            <p className="text-zinc-400 text-[13.5px] mt-2">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Weak spots */}
      {weak.length > 0 && (
        <div className={CARD}>
          <div className="flex items-center justify-between mb-4">
            <p className={EYEBROW}>Focus on these</p>
            <span className="text-zinc-500 text-[12.5px]">Tap to practise</span>
          </div>
          <div className="space-y-2.5">
            {weak.map((t) => {
              const pct = Math.round(t.correctRate * 100);
              const raw = getTopicLabel(t.topic);
              const label = /^[a-z0-9]+(-[a-z0-9]+)+$/.test(raw) ? titleCase(raw) : raw; // generated topics come back as slugs
              const subj = t.subject ?? topicSubject.get(t.topic);
              const params = new URLSearchParams({ topic: label });
              if (subj) params.set("guide", subj);
              const color = pct < 40 ? "#ff6b7a" : "#fbbf24";
              return (
                <Link key={t.topic} href={`/subjects?${params.toString()}`} className="group block rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.14] px-4 py-3.5 transition-colors">
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <p className="text-[15px] font-semibold text-white truncate min-w-0">{label}{subj && <span className="text-zinc-500 font-normal"> · {titleCase(subj)}</span>}</p>
                    <span className="shrink-0 text-[16px] font-extrabold tabular-nums" style={{ color }}>{pct}% <span className="text-zinc-600 group-hover:text-white transition-colors">→</span></span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.max(pct, 4)}%`, background: color }} /></div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent papers */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <p className={EYEBROW}>Recent papers</p>
          <span className="text-zinc-500 text-[12.5px]">Tap to see your marks</span>
        </div>
        <div className="space-y-2.5">
          {attempts.slice(0, 6).map((a, i) => {
            const pct = pctOf(a);
            const custom = isCustomExamId(a.examId) ? getCustomExam(a.examId) : null;
            const subj = a.subject ? titleCase(a.subject) : null;
            const title = custom?.title ?? (subj ? `${subj} practice` : "Practice paper");
            const color = pct >= 80 ? "#3ee6a0" : pct >= 65 ? "#7dd3fc" : pct >= 50 ? "#fbbf24" : "#ff6b7a";
            return (
              <Link key={`${a.examId}-${i}`} href={`/exam/${a.examId}/results`} className="group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.14] px-4 py-3 min-h-[64px] transition-colors">
                <span className={`${display.className} shrink-0 w-12 text-center font-bold text-[22px] leading-none`} style={{ color }}>{gradeLabel(a.overallGrade, pct)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-white truncate">{title}</span>
                  <span className="block text-[12.5px] text-zinc-500">{new Date(a.date).toLocaleDateString("en-NZ", { weekday: "short", day: "numeric", month: "short" })} · {a.totalMarks}/{a.maxMarks} marks</span>
                </span>
                <span className="shrink-0 text-[15px] font-bold tabular-nums text-zinc-300">{pct}% <span className="text-zinc-600 group-hover:text-white transition-colors">→</span></span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Saved papers */}
      {papers.length > 0 && (
        <div className={CARD}>
          <p className={`${EYEBROW} mb-3`}>Your papers</p>
          <div className="divide-y divide-white/[0.06]">
            {papers.slice(0, 5).map((ex) => (
              <div key={ex.id} className="flex items-center justify-between gap-3 py-2.5">
                <p className="text-[14.5px] text-zinc-200 truncate min-w-0">{ex.title}</p>
                <div className="flex items-center gap-2 shrink-0">
                  {confirmDelete === ex.id ? (
                    <>
                      <button onClick={() => { deleteCustomExam(ex.id); setPapers(listCustomExams()); setConfirmDelete(null); }} className="text-[13px] font-semibold px-3.5 min-h-[40px] rounded-full bg-rose-500/15 text-rose-300 hover:bg-rose-500/25">Delete</button>
                      <button onClick={() => setConfirmDelete(null)} className="text-[13px] px-3 min-h-[40px] text-zinc-400 hover:text-white">Keep</button>
                    </>
                  ) : (
                    <>
                      <Link href={`/exam/${ex.id}?mode=practice`} className="inline-flex items-center text-[13px] font-semibold px-4 min-h-[40px] rounded-full border border-white/[0.14] hover:border-white/40 text-white">Start</Link>
                      <button onClick={() => setConfirmDelete(ex.id)} aria-label={`Delete ${ex.title}`} className="w-10 h-10 flex items-center justify-center text-zinc-600 hover:text-rose-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
