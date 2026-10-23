// Nightly grade forecast snapshots — what makes "Updated every night" true,
// and the history behind 6-week trend lines. Server-only.
//
// The live forecast in the app (/pace) already moves after every marked paper;
// this records it once a night per student per subject, at about 2am the
// student's time, into forecast_snapshots. Same maths as the app
// (lib/gradeOutlook.ts): "now" = recency-weighted mean of the last six papers,
// trend = least-squares slope over the last eight, "heading for" = now + trend
// projected to their exam date (only when they've set one).

import { getSupabase } from "./supabase";
import { predictedPct, projectedPct, subjectSeries, trendPerWeek } from "./gradeOutlook";
import type { ExamAttempt } from "./types";

const DAY_MS = 864e5;
export const SNAPSHOT_LOCAL_HOUR = 2;

export type Forecast = { nowPct: number; trendPerWeek: number; headingForPct: number | null; papers: number };

/** Pure: the forecast for one subject's attempts. null if there are none. */
export function forecastFor(attempts: ExamAttempt[], subject: string, examDate: string | null, now = Date.now()): Forecast | null {
  const points = subjectSeries(attempts, subject).filter((p) => p.t <= now);
  const nowPct = predictedPct(points);
  if (nowPct == null) return null;
  const trend = Math.round(trendPerWeek(points) * 10) / 10;
  let headingForPct: number | null = null;
  if (examDate) {
    const exam = new Date(`${examDate}T00:00:00Z`).getTime();
    if (Number.isFinite(exam) && exam > now) headingForPct = projectedPct(nowPct, trend, (exam - now) / (7 * DAY_MS));
  }
  return { nowPct, trendPerWeek: trend, headingForPct, papers: points.length };
}

/** The student's local calendar date and hour, in their time zone. */
export function localClock(timeZone: string | null, now = new Date()): { date: string; hour: number } {
  let tz = timeZone || "UTC";
  try { new Intl.DateTimeFormat("en", { timeZone: tz }); } catch { tz = "UTC"; }
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, hour: Number(get("hour")) };
}

/** Due tonight? From 2am local, once per local date (later hours catch up a missed run). */
export function snapshotDue(lastSnapshotDate: string | null, clock: { date: string; hour: number }): boolean {
  return clock.hour >= SNAPSHOT_LOCAL_HOUR && lastSnapshotDate !== clock.date;
}

type AttemptRow = { user_id: string; subject: string | null; total_marks: number; max_marks: number; taken_at: string };

/** The hourly job: snapshot every recently active student whose night it is. */
export async function runForecastSnapshots(now = new Date()): Promise<{ students: number; written: number; errors: string[] }> {
  const supabase = getSupabase();
  const report = { students: 0, written: 0, errors: [] as string[] };
  if (!supabase) { report.errors.push("not configured"); return report; }

  const since = new Date(now.getTime() - 90 * DAY_MS).toISOString();
  const rows: AttemptRow[] = [];
  for (let from = 0; from < 50_000; from += 1000) {
    const { data, error } = await supabase.from("exam_attempts").select("user_id, subject, total_marks, max_marks, taken_at").gte("taken_at", since).order("taken_at").range(from, from + 999);
    if (error) { report.errors.push(`attempts: ${error.message}`); return report; }
    rows.push(...((data ?? []) as AttemptRow[]));
    if (!data || data.length < 1000) break;
  }
  const byUser = new Map<string, AttemptRow[]>();
  for (const r of rows) if (r.subject) byUser.set(r.user_id, [...(byUser.get(r.user_id) ?? []), r]);
  const users = [...byUser.keys()];
  report.students = users.length;
  if (!users.length) return report;

  // Time zones (kids from the free week have one) and the latest snapshot date per user.
  const tz = new Map<string, string>();
  const last = new Map<string, string>();
  const goals = new Map<string, string>(); // `${user}|${subject}` → examDate
  for (let i = 0; i < users.length; i += 200) {
    const chunk = users.slice(i, i + 200);
    const [kids, snaps, goalEvents] = await Promise.all([
      supabase.from("child_profiles").select("kid_user_id, timezone").in("kid_user_id", chunk),
      supabase.from("forecast_snapshots").select("user_id, snapshot_date").in("user_id", chunk).gte("snapshot_date", new Date(now.getTime() - 3 * DAY_MS).toISOString().slice(0, 10)),
      supabase.from("events").select("user_id, props, created_at").eq("name", "subject_goal").in("user_id", chunk).order("created_at"),
    ]);
    if (snaps.error) { report.errors.push(`snapshots: ${snaps.error.message}`); return report; }
    for (const k of kids.data ?? []) if (k.timezone) tz.set(k.kid_user_id as string, k.timezone as string);
    for (const s of snaps.data ?? []) {
      const prev = last.get(s.user_id as string);
      if (!prev || (s.snapshot_date as string) > prev) last.set(s.user_id as string, s.snapshot_date as string);
    }
    for (const g of goalEvents.data ?? []) {
      const p = (g.props ?? {}) as { subject?: string; examDate?: string };
      if (p.subject && p.examDate) goals.set(`${g.user_id}|${p.subject}`, p.examDate); // later events overwrite
    }
  }

  const out: Record<string, unknown>[] = [];
  for (const user of users) {
    const clock = localClock(tz.get(user) ?? null, now);
    if (!snapshotDue(last.get(user) ?? null, clock)) continue;
    const attempts = byUser.get(user)!.map((r) => ({ examId: "", date: r.taken_at, answers: {}, results: [], overallGrade: "achieved", totalMarks: r.total_marks, maxMarks: r.max_marks, mode: "practice", subject: r.subject ?? undefined }) as ExamAttempt);
    for (const subject of new Set(attempts.map((a) => a.subject!))) {
      const f = forecastFor(attempts, subject, goals.get(`${user}|${subject}`) ?? null, now.getTime());
      if (!f) continue;
      out.push({ user_id: user, subject, snapshot_date: clock.date, now_pct: f.nowPct, trend_per_week: f.trendPerWeek, heading_for_pct: f.headingForPct, papers: f.papers });
    }
  }
  for (let i = 0; i < out.length; i += 500) {
    const { error } = await supabase.from("forecast_snapshots").upsert(out.slice(i, i + 500), { onConflict: "user_id,subject,snapshot_date" });
    if (error) report.errors.push(`write: ${error.message}`);
    else report.written += Math.min(500, out.length - i);
  }
  return report;
}
