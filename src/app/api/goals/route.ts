import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabase, logEvent } from "@/lib/supabase";
import { resolveCurriculum } from "@/data/curricula";
import { normalizeGoalId } from "@/lib/goals";

export const dynamic = "force-dynamic";

// Subject goals live as append-only `subject_goal` events (latest per
// subject wins). No migration needed; see supabase/migrations for the
// proper table to move to once DDL can be applied.

type Goal = { subject: string; goal: string; examDate: string; curriculumId: string; year: number; updatedAt: string; startedAt: string };

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ goals: [] });
  const { data } = await supabase
    .from("events")
    .select("props, created_at")
    .eq("user_id", userId)
    .eq("name", "subject_goal")
    .order("created_at", { ascending: false })
    .limit(100);
  const seen = new Map<string, Goal>();
  for (const row of data ?? []) {
    const p = row.props as Partial<Goal> | null;
    if (!p?.subject || seen.has(p.subject)) continue;
    seen.set(p.subject, {
      subject: p.subject,
      goal: normalizeGoalId(p.goal ?? ""),
      examDate: p.examDate ?? "",
      curriculumId: p.curriculumId ?? "nz-ncea",
      year: Number(p.year) || 12,
      updatedAt: p.updatedAt ?? (row.created_at as string),
      startedAt: p.startedAt ?? p.updatedAt ?? (row.created_at as string),
    });
  }
  return NextResponse.json({ goals: [...seen.values()] });
}

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: Partial<Goal> = {};
  try { body = await request.json(); } catch {}
  const curriculum = resolveCurriculum(body.curriculumId);
  const subjectOk = curriculum.subjects.some((s) => s.value === body.subject);
  const goalOk = curriculum.gradeBands.some((b) => b.id === body.goal);
  const dateOk = typeof body.examDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.examDate);
  if (!subjectOk || !goalOk || !dateOk) return NextResponse.json({ error: "invalid_goal" }, { status: 400 });
  await logEvent("subject_goal", userId, {
    subject: body.subject, goal: body.goal, examDate: body.examDate,
    curriculumId: curriculum.id, year: Number(body.year) || 12,
    updatedAt: body.updatedAt ?? new Date().toISOString(),
    startedAt: body.startedAt ?? body.updatedAt ?? new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}
