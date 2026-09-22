"use client";

// /today — the coach app's home and the PWA start screen. The graph IS the
// page: where you are, the tasks on the line to Perfect A's, and a tracker
// that moves as you do them. Tapping a task on the line starts it.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { display } from "@/lib/displayFont";
import { loadOnboarding } from "@/lib/onboarding";
import { loadProgress, saveProgress } from "@/lib/storage";
import { adoptPaper, buildNextPaper, buildPaperFor, currentCurriculumId, fetchNextPaper } from "@/lib/nextPaper";
import type { WeakSpot } from "@/lib/gradeOutlook";
import { loadGoals, syncGoals, type SubjectGoal } from "@/lib/goals";
import GradeOutlook from "@/components/GradeOutlook";
import type { ExamAttempt, StudentProgress, TopicScore } from "@/lib/types";

export default function TodayPage() {
  const router = useRouter();
  const { user } = useUser();
  const [attempts, setAttempts] = useState<ExamAttempt[] | null>(null);
  const [topicScores, setTopicScores] = useState<Record<string, TopicScore>>({});
  const [busySubject, setBusySubject] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [curriculumId, setCurriculumId] = useState("nz-ncea");
  const [year, setYear] = useState(12);
  const [goals, setGoals] = useState<SubjectGoal[]>([]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      const ob = loadOnboarding();
      if (!ob || ob.subjects.length === 0) {
        router.replace("/welcome");
        return;
      }
      setSubjects(ob.subjects);
      setYear(ob.yearLevel);
      setCurriculumId(ob.curriculumId ?? currentCurriculumId());
      setGoals(loadGoals());
      syncGoals().then((g) => { if (!cancelled) setGoals(g); }).catch(() => {});
      try {
        const local = loadProgress();
        setAttempts(local.examAttempts ?? []);
        setTopicScores(local.topicScores ?? {});
      } catch {}

      // Server is the source of truth for papers sat (other devices count).
      fetch("/api/progress")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (cancelled || !data) return;
          const server: ExamAttempt[] = data.examAttempts ?? [];
          if (server.length > 0) {
            const local = loadProgress();
            const merged: StudentProgress = {
              examAttempts: server,
              topicScores: { ...local.topicScores, ...(data.topicScores || {}) },
              totalExamsTaken: server.length,
              streakDays: Math.max(local.streakDays, data.streakDays ?? 0),
              lastActiveDate: local.lastActiveDate,
            };
            setAttempts(server);
            setTopicScores(merged.topicScores);
            saveProgress(merged);
          }
        })
        .catch(() => {});

      // Keep tonight's paper warm in the background so a step opens fast.
      fetchNextPaper().then((w) => { if (!w) return buildNextPaper(); }).catch(() => {});
    };
    const id = setTimeout(run, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [router]);

  // Build the right paper for a subject and open it.
  async function open(subject: string, kind: "check" | "paper" | "mock" | "weak", topic?: string) {
    if (busySubject) return;
    setBusySubject(subject);
    const paper = await buildPaperFor({ subject, kind, topic }).catch(() => null);
    if (!paper) { setBusySubject(null); return; }
    adoptPaper(paper);
    router.push(`/exam/${paper.id}?mode=${kind === "mock" ? "mock" : "practice"}`);
  }
  const fixSpot = (s: WeakSpot) => open(s.subject, "weak", s.topicPrompt);

  const firstName = user?.firstName?.trim();
  const hasPapers = (attempts?.length ?? 0) > 0;

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 lg:pt-10 pb-16">
      <p className="font-mono text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
        {firstName ? `${firstName}'s` : "Your"} dashboard
      </p>
      <h1 className={`${display.className} text-[30px] sm:text-[38px] font-bold text-white tracking-[-0.03em] leading-[1.05] mb-5`}>
        {hasPapers ? "Your path" : "Start with a grade check"}
      </h1>

      {attempts && (
        <GradeOutlook
          attempts={attempts}
          topicScores={topicScores}
          curriculumId={curriculumId}
          year={year}
          subjects={subjects}
          goals={goals}
          onGoalsChange={setGoals}
          busySubject={busySubject}
          onStartCheck={(s) => open(s, "check")}
          onFixWeakSpot={fixSpot}
          onStartPaper={(s) => open(s, "paper")}
          onStartMock={(s) => open(s, "mock")}
        />
      )}
    </div>
  );
}
