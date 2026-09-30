"use client";

// Everything the coach pages share: who the student is set up as (subjects,
// exam system, year), the goals they chose, and every paper they've sat
// (server + this device, merged). Today, Pace and Streak all read from here.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { loadOnboarding } from "@/lib/onboarding";
import { loadProgress, saveProgress } from "@/lib/storage";
import { currentCurriculumId } from "@/lib/nextPaper";
import { loadGoals, syncGoals, type SubjectGoal } from "@/lib/goals";
import { setScopeUserId } from "@/lib/userScope";
import type { ExamAttempt, StudentProgress, TopicScore } from "@/lib/types";

export function useCoachData() {
  const router = useRouter();
  const { user, isLoaded: userLoaded } = useUser();
  const [attempts, setAttempts] = useState<ExamAttempt[] | null>(null);
  const [topicScores, setTopicScores] = useState<Record<string, TopicScore>>({});
  const [subjects, setSubjects] = useState<string[]>([]);
  const [curriculumId, setCurriculumId] = useState("nz-ncea");
  const [year, setYear] = useState(12);
  const [allGoals, setGoals] = useState<SubjectGoal[]>([]);
  const [serverChecked, setServerChecked] = useState(false);
  // Only the subjects chosen in the current onboarding count. Goals left over
  // from an earlier setup (other subjects, other exam system) are ignored.
  const goals = useMemo(() => allGoals.filter((g) => subjects.includes(g.subject)), [allGoals, subjects]);

  useEffect(() => {
    // Storage is namespaced per account. Never read it before Clerk has said
    // who this is, or a brand-new device looks "not onboarded" and bounces
    // back to /welcome.
    if (!userLoaded) return;
    setScopeUserId(user?.id ?? null);
    let cancelled = false;
    const run = () => {
      const ob = loadOnboarding();
      if (!ob || ob.subjects.length === 0) { router.replace("/welcome"); return; }
      setSubjects(ob.subjects); setYear(ob.yearLevel); setCurriculumId(ob.curriculumId ?? currentCurriculumId());
      setGoals(loadGoals());
      syncGoals().then((g) => { if (!cancelled) setGoals(g); }).catch(() => {});
      try { const local = loadProgress(); setAttempts(local.examAttempts ?? []); setTopicScores(local.topicScores ?? {}); } catch {}
      fetch("/api/progress").then((r) => (r.ok ? r.json() : null)).then((data) => {
        if (cancelled) return;
        const server: ExamAttempt[] = data?.examAttempts ?? [];
        if (server.length > 0) {
          const local = loadProgress();
          // Union, never replace: a paper marked seconds ago may not have
          // reached the server yet, and it must still count here.
          const seen = new Set(server.map((a) => `${a.examId}|${new Date(a.date).toISOString().slice(0, 16)}`));
          const extra = (local.examAttempts ?? []).filter((a) => !seen.has(`${a.examId}|${new Date(a.date).toISOString().slice(0, 16)}`));
          const all = [...server, ...extra].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          const merged: StudentProgress = { examAttempts: all, topicScores: { ...local.topicScores, ...(data.topicScores || {}) }, totalExamsTaken: all.length, streakDays: Math.max(local.streakDays, data.streakDays ?? 0), lastActiveDate: local.lastActiveDate };
          setAttempts(all); setTopicScores(merged.topicScores); saveProgress(merged);
        }
        setServerChecked(true);
      }).catch(() => { if (!cancelled) setServerChecked(true); });
    };
    const id = setTimeout(run, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [router, userLoaded, user?.id]);

  return { attempts, topicScores, subjects, curriculumId, year, goals, setGoals, serverChecked };
}
