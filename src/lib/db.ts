// High-level data access helpers backed by Supabase.
// All functions take a userId (from Clerk auth) and run server-side only.

import { getSupabase } from "./supabase";
import type { Exam, ExamAttempt, TopicScore } from "./types";
import type { Usage } from "./claude";

// ── Custom exams ──

export async function saveExam(userId: string, exam: Exam & { topic?: string | null }): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("custom_exams").upsert({
    id: exam.id,
    user_id: userId,
    title: exam.title,
    subject: exam.subject,
    level: exam.level,
    topic: exam.topic ?? null,
    questions: exam.questions,
    total_marks: exam.totalMarks ?? exam.questions.reduce((s, q) => s + q.marks, 0),
    time_minutes: exam.timeMinutes,
  });
}

export async function loadExam(userId: string, examId: string): Promise<Exam | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from("custom_exams")
    .select("*")
    .eq("user_id", userId)
    .eq("id", examId)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    title: data.title,
    level: data.level,
    standard: "PRACTICE",
    year: new Date(data.created_at).getFullYear(),
    subject: data.subject,
    timeMinutes: data.time_minutes,
    questions: data.questions,
    totalMarks: data.total_marks,
  } as Exam;
}

export async function listUserExams(userId: string): Promise<Exam[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("custom_exams")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!data) return [];

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    level: row.level,
    standard: "PRACTICE",
    year: new Date(row.created_at).getFullYear(),
    subject: row.subject,
    timeMinutes: row.time_minutes,
    questions: row.questions,
    totalMarks: row.total_marks,
  })) as Exam[];
}

export async function deleteExam(userId: string, examId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase
    .from("custom_exams")
    .delete()
    .eq("user_id", userId)
    .eq("id", examId);
}

// ── Exam attempts ──

export async function saveAttempt(userId: string, attempt: ExamAttempt & { examTitle?: string; subject?: string; level?: number }): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("exam_attempts").insert({
    user_id: userId,
    exam_id: attempt.examId,
    exam_title: attempt.examTitle ?? null,
    subject: attempt.subject ?? null,
    level: attempt.level ?? null,
    mode: attempt.mode,
    answers: attempt.answers,
    results: attempt.results,
    total_marks: attempt.totalMarks,
    max_marks: attempt.maxMarks,
    overall_grade: attempt.overallGrade,
    taken_at: attempt.date,
  });
}

export async function listAttempts(userId: string, limit = 20): Promise<ExamAttempt[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("exam_attempts")
    .select("*")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false })
    .limit(limit);

  if (!data) return [];

  // Backfill subject/level for older attempts (saved before those columns were
  // populated) from the custom paper they were generated from. This is what
  // lets the dashboard's guided weak-topic highlight resolve a subject on ANY
  // device — not just the one whose localStorage still holds the paper.
  const missingIds = [
    ...new Set(
      data.filter((r) => !r.subject && r.exam_id).map((r) => r.exam_id as string),
    ),
  ];
  const examMeta: Record<string, { subject?: string; level?: number }> = {};
  if (missingIds.length > 0) {
    const { data: exams } = await supabase
      .from("custom_exams")
      .select("id, subject, level")
      .eq("user_id", userId)
      .in("id", missingIds);
    for (const e of exams ?? []) {
      examMeta[e.id] = { subject: e.subject, level: e.level };
    }
  }

  return data.map((row) => ({
    examId: row.exam_id,
    date: row.taken_at,
    answers: row.answers,
    results: row.results,
    overallGrade: row.overall_grade,
    totalMarks: row.total_marks,
    maxMarks: row.max_marks,
    mode: row.mode,
    subject: row.subject ?? examMeta[row.exam_id]?.subject,
    level: row.level ?? examMeta[row.exam_id]?.level,
  })) as ExamAttempt[];
}

// ── Topic scores ──

export async function upsertTopicScore(userId: string, score: TopicScore): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("topic_scores").upsert({
    user_id: userId,
    topic: score.topic,
    topic_label: score.topicLabel,
    attempts: score.attempts,
    correct_rate: score.correctRate,
    trend: score.trend,
    history: score.history,
    last_attempted: score.lastAttempted,
  });
}

export async function getTopicScores(userId: string): Promise<Record<string, TopicScore>> {
  const supabase = getSupabase();
  if (!supabase) return {};

  const { data } = await supabase
    .from("topic_scores")
    .select("*")
    .eq("user_id", userId);

  if (!data) return {};

  const result: Record<string, TopicScore> = {};
  for (const row of data) {
    result[row.topic] = {
      topic: row.topic,
      topicLabel: row.topic_label ?? row.topic,
      attempts: row.attempts,
      correctRate: row.correct_rate,
      trend: row.trend,
      lastAttempted: row.last_attempted,
      history: row.history ?? [],
    };
  }
  return result;
}

// ── Reviews (spaced repetition) ──

export interface DbReview {
  questionId: string;
  examId: string;
  questionText: string;
  topics: string[];
  ease: number;
  intervalDays: number;
  repetitions: number;
  nextReview: string;
  lastReviewed: string | null;
}

export async function upsertReview(userId: string, review: DbReview): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("reviews").upsert({
    user_id: userId,
    question_id: review.questionId,
    exam_id: review.examId,
    question_text: review.questionText,
    topics: review.topics,
    ease: review.ease,
    interval_days: review.intervalDays,
    repetitions: review.repetitions,
    next_review: review.nextReview,
    last_reviewed: review.lastReviewed,
  });
}

export async function getDueReviews(userId: string): Promise<DbReview[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data } = await supabase
    .from("reviews")
    .select("*")
    .eq("user_id", userId)
    .lte("next_review", new Date().toISOString())
    .order("next_review", { ascending: true });

  if (!data) return [];

  return data.map((row) => ({
    questionId: row.question_id,
    examId: row.exam_id,
    questionText: row.question_text,
    topics: row.topics,
    ease: row.ease,
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    nextReview: row.next_review,
    lastReviewed: row.last_reviewed,
  }));
}

// ── API usage logging (for cost tracking / admin dashboard) ──

export type ApiFeature = "tutor" | "mark" | "generate_paper" | "essay" | "practice_question";

/**
 * Fire-and-forget: records one Claude API call's tokens + cost against a user.
 * Swallows errors so a logging failure never blocks the response to the student.
 */
export async function logApiUsage(
  userId: string | null,
  feature: ApiFeature,
  usage: Usage
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  if (usage.inputTokens === 0 && usage.outputTokens === 0) return; // fallback/skip rows

  try {
    await supabase.from("api_usage").insert({
      user_id: userId,
      feature,
      model: usage.model,
      input_tokens: usage.inputTokens,
      output_tokens: usage.outputTokens,
      cost_usd: usage.costUsd,
    });
  } catch (err) {
    console.error("logApiUsage failed:", err);
  }
}

// ── Usage tracking (for free-tier limits) ──

export async function incrementUsage(userId: string, feature: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;

  // Try to update existing row, or insert if not exists
  const { data: existing } = await supabase
    .from("usage")
    .select("count, period_start")
    .eq("user_id", userId)
    .eq("feature", feature)
    .single();

  const now = new Date();
  const periodStart = existing ? new Date(existing.period_start) : now;
  const periodAge = now.getTime() - periodStart.getTime();
  const weekMs = 7 * 24 * 60 * 60 * 1000;

  // Both "exams_generated" and "tutor_messages" reset weekly.
  const resetMs = weekMs;
  const shouldReset = periodAge > resetMs;

  const newCount = shouldReset ? 1 : (existing?.count ?? 0) + 1;
  const newStart = shouldReset ? now.toISOString() : (existing?.period_start ?? now.toISOString());

  if (existing && !shouldReset) {
    // Race-safe increment: only lands if the count is still what we read.
    // If a concurrent request bumped it first, re-read once and stack on top —
    // so parallel requests can't collapse two increments into one.
    const { data: updated } = await supabase
      .from("usage")
      .update({ count: newCount, period_start: newStart })
      .eq("user_id", userId)
      .eq("feature", feature)
      .eq("count", existing.count)
      .select("count");

    if (updated && updated.length > 0) return newCount;

    const { data: fresh } = await supabase
      .from("usage")
      .select("count")
      .eq("user_id", userId)
      .eq("feature", feature)
      .single();
    const retryCount = (fresh?.count ?? existing.count) + 1;
    await supabase
      .from("usage")
      .update({ count: retryCount, period_start: newStart })
      .eq("user_id", userId)
      .eq("feature", feature);
    return retryCount;
  }

  await supabase.from("usage").upsert({
    user_id: userId,
    feature,
    count: newCount,
    period_start: newStart,
  });

  return newCount;
}

export async function getUsage(userId: string, feature: string): Promise<{ count: number; resetsAt: string }> {
  const supabase = getSupabase();
  if (!supabase) return { count: 0, resetsAt: new Date().toISOString() };

  const { data } = await supabase
    .from("usage")
    .select("count, period_start")
    .eq("user_id", userId)
    .eq("feature", feature)
    .single();

  if (!data) return { count: 0, resetsAt: new Date().toISOString() };

  const periodStart = new Date(data.period_start);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const periodAge = Date.now() - periodStart.getTime();

  // If the stored period is stale (older than a week), the current week's
  // count is effectively 0 — the next incrementUsage call will reset it.
  // Without this, a user who used their full quota in week 1 would still
  // appear maxed-out in week 2 until they tried (and were blocked from)
  // another action, which would never trigger the reset.
  if (periodAge > weekMs) {
    return { count: 0, resetsAt: new Date(Date.now() + weekMs).toISOString() };
  }

  const resetsAt = new Date(periodStart.getTime() + weekMs).toISOString();
  return { count: data.count, resetsAt };
}

// ── Study plans ──

export interface DbStudyPlan {
  examDate: string;
  subjects: string[];
  yearLevel: number;
  weeks: unknown; // JSON blob — the full StudyWeek[] array
  createdAt: string;
}

export async function savePlanDb(userId: string, plan: DbStudyPlan): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase.from("study_plans").upsert({
    user_id: userId,
    exam_date: plan.examDate,
    subjects: plan.subjects,
    year_level: plan.yearLevel,
    weeks: plan.weeks,
    updated_at: new Date().toISOString(),
  });
}

export async function loadPlanDb(userId: string): Promise<DbStudyPlan | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data } = await supabase
    .from("study_plans")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!data) return null;

  return {
    examDate: data.exam_date,
    subjects: data.subjects,
    yearLevel: data.year_level,
    weeks: data.weeks,
    createdAt: data.created_at,
  };
}

export async function deletePlanDb(userId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  await supabase
    .from("study_plans")
    .delete()
    .eq("user_id", userId);
}
