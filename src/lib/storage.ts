import type { StudentProgress, ExamAttempt, TopicScore } from "./types";
import { scopedKey } from "./userScope";

const STORAGE_KEY = "exam-practice-nz-progress";

function defaultProgress(): StudentProgress {
  return {
    examAttempts: [],
    topicScores: {},
    totalExamsTaken: 0,
    streakDays: 0,
    lastActiveDate: "",
  };
}

export function loadProgress(): StudentProgress {
  if (typeof window === "undefined") return defaultProgress();
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_KEY));
    if (!raw) return defaultProgress();
    const parsed = JSON.parse(raw) as StudentProgress;
    // Validate structure — if corrupted, return defaults
    if (!parsed || typeof parsed !== "object") return defaultProgress();
    if (!Array.isArray(parsed.examAttempts)) parsed.examAttempts = [];
    if (!parsed.topicScores || typeof parsed.topicScores !== "object") parsed.topicScores = {};
    if (typeof parsed.totalExamsTaken !== "number") parsed.totalExamsTaken = parsed.examAttempts.length;
    if (typeof parsed.streakDays !== "number") parsed.streakDays = 0;
    if (typeof parsed.lastActiveDate !== "string") parsed.lastActiveDate = "";
    return parsed;
  } catch {
    return defaultProgress();
  }
}

export function saveProgress(progress: StudentProgress) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(scopedKey(STORAGE_KEY), JSON.stringify(progress));
  } catch {
    // Quota exceeded or storage disabled — silently ignore so user isn't blocked
  }
}

export function addExamAttempt(attempt: ExamAttempt): StudentProgress {
  const progress = loadProgress();
  progress.examAttempts.push(attempt);
  progress.totalExamsTaken = progress.examAttempts.length;

  // Update streak
  const today = new Date().toISOString().slice(0, 10);
  if (progress.lastActiveDate) {
    const lastDate = new Date(progress.lastActiveDate);
    const todayDate = new Date(today);
    const diffDays = Math.floor(
      (todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays === 1) {
      progress.streakDays += 1;
    } else if (diffDays > 1) {
      progress.streakDays = 1;
    }
  } else {
    progress.streakDays = 1;
  }
  progress.lastActiveDate = today;

  // Update topic scores from marking results
  for (const result of attempt.results) {
    for (const topic of result.topicsToReview) {
      updateTopicScore(progress, topic, result);
    }
  }

  saveProgress(progress);
  return progress;
}

function updateTopicScore(
  progress: StudentProgress,
  topicId: string,
  result: { marksAwarded: number; maxMarks: number }
) {
  const pct = result.maxMarks > 0 ? result.marksAwarded / result.maxMarks : 0;
  const existing = progress.topicScores[topicId];

  if (existing) {
    const newAttempts = existing.attempts + 1;
    const newRate =
      (existing.correctRate * existing.attempts + pct) / newAttempts;
    const history = [...existing.history.slice(-9), Math.round(pct * 100)];

    let trend: TopicScore["trend"] = "stable";
    if (history.length >= 3) {
      const recent = history.slice(-3);
      const earlier = history.slice(-6, -3);
      if (earlier.length > 0) {
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
        if (recentAvg > earlierAvg + 10) trend = "improving";
        else if (recentAvg < earlierAvg - 10) trend = "declining";
      }
    }

    progress.topicScores[topicId] = {
      ...existing,
      attempts: newAttempts,
      correctRate: newRate,
      trend,
      lastAttempted: new Date().toISOString(),
      history,
    };
  } else {
    progress.topicScores[topicId] = {
      topic: topicId,
      topicLabel: topicId,
      attempts: 1,
      correctRate: pct,
      trend: "stable",
      lastAttempted: new Date().toISOString(),
      history: [Math.round(pct * 100)],
    };
  }
}

export function getWeakTopics(
  progress: StudentProgress,
  limit = 5
): TopicScore[] {
  return Object.values(progress.topicScores)
    .filter((t) => t.attempts >= 1)
    .sort((a, b) => a.correctRate - b.correctRate)
    .slice(0, limit);
}

export function getBestGrade(
  progress: StudentProgress,
  examId: string
): string | null {
  const attempts = progress.examAttempts.filter((a) => a.examId === examId);
  if (attempts.length === 0) return null;
  const gradeOrder = ["not-achieved", "achieved", "merit", "excellence"];
  let best = 0;
  for (const a of attempts) {
    const idx = gradeOrder.indexOf(a.overallGrade);
    if (idx > best) best = idx;
  }
  return gradeOrder[best];
}
