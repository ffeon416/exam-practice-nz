"use client";

// Once every exam date has gone by, there is no schedule to follow, so the
// app has one job: get the next exam set up. Pace, Streak and Practise send
// the student back to /schedule, which turns into the setup wizard. The
// dashboard (/profile: billing, sign out) and exam day itself stay open.

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { loadOnboarding } from "@/lib/onboarding";
import { goalFor, loadGoals, syncGoals, type SubjectGoal } from "@/lib/goals";
import { daysUntil } from "@/lib/dailyTask";
import { setScopeUserId } from "@/lib/userScope";

const GATED = /^\/(pace|streak|subjects)(\/|$)/;

/** True when the student has exam dates and every one of them is in the past. */
export function allExamsPassed(subjects: string[], goals: SubjectGoal[]): boolean {
  if (subjects.length === 0) return false;
  return subjects.every((s) => { const g = goalFor(goals, s); return !!g?.examDate && daysUntil(g.examDate) < 0; });
}

/** True from exam day onwards: every exam date is today or behind them, so it's time to set the next one. */
export function examDue(subjects: string[], goals: SubjectGoal[]): boolean {
  if (subjects.length === 0) return false;
  return subjects.every((s) => { const g = goalFor(goals, s); return !!g?.examDate && daysUntil(g.examDate) <= 0; });
}

/** For the nav: is it time to set the next exam? Re-checked on every page change. */
export function useExamDue(): boolean {
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const [due, setDue] = useState(false);
  useEffect(() => {
    if (!isLoaded || !user) return;
    setScopeUserId(user.id);
    let cancelled = false;
    const id = setTimeout(() => {
      const subjects = loadOnboarding()?.subjects ?? [];
      setDue(examDue(subjects, loadGoals()));
      syncGoals().then((goals) => { if (!cancelled) setDue(examDue(subjects, goals)); }).catch(() => {});
    }, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [pathname, isLoaded, user]);
  return due;
}

export default function ExamGate() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user || !GATED.test(pathname)) return;
    setScopeUserId(user.id);
    let cancelled = false;
    const id = setTimeout(() => {
      const subjects = loadOnboarding()?.subjects ?? [];
      // Decide from the server's copy of the goals, never a stale local one:
      // a new date set on another device must not bounce them here.
      syncGoals().catch(() => loadGoals()).then((goals) => {
        if (!cancelled && allExamsPassed(subjects, goals)) router.replace("/schedule");
      });
    }, 0);
    return () => { cancelled = true; clearTimeout(id); };
  }, [pathname, isLoaded, user, router]);

  return null;
}
