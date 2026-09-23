import { NextRequest, NextResponse } from "next/server";
import { checkTier } from "@/lib/checkTier";
import { getSupabase } from "@/lib/supabase";
import { resolveCurriculum } from "@/data/curricula";
import { buildPaper, levelValueFor } from "@/lib/buildPaper";
import type { Exam } from "@/lib/types";

// "Tonight's paper" — the pre-built paper that makes the Today screen an
// instant start. GET returns the most recent prepared paper the student
// hasn't sat yet (or null). POST builds one if none exists, choosing the
// subject they've gone longest without, and returns it. Both are safe to
// call repeatedly: POST is idempotent while an unsat paper exists.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const TITLE_PREFIX = "Tonight's paper";

type Prepared = { exam: Exam; createdAt: string };

async function findPrepared(userId: string): Promise<Prepared | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data: rows } = await supabase
    .from("custom_exams")
    .select("*")
    .eq("user_id", userId)
    .like("title", `${TITLE_PREFIX}%`)
    .order("created_at", { ascending: false })
    .limit(5);
  if (!rows || rows.length === 0) return null;
  const ids = rows.map((r) => r.id as string);
  const { data: attempts } = await supabase
    .from("exam_attempts")
    .select("exam_id")
    .eq("user_id", userId)
    .in("exam_id", ids);
  const sat = new Set((attempts ?? []).map((a) => a.exam_id as string));
  const row = rows.find((r) => !sat.has(r.id as string));
  if (!row) return null;
  return {
    createdAt: row.created_at as string,
    exam: {
      id: row.id,
      title: row.title,
      level: row.level,
      standard: "PRACTICE",
      year: new Date(row.created_at).getFullYear(),
      subject: row.subject,
      timeMinutes: row.time_minutes,
      questions: row.questions,
      totalMarks: row.total_marks,
    } as Exam,
  };
}

export async function GET() {
  const { userId, tier } = await checkTier();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (tier === "free") return NextResponse.json({ error: "paid_only" }, { status: 403 });
  const prepared = await findPrepared(userId);
  return NextResponse.json({ exam: prepared?.exam ?? null });
}

export async function POST(request: NextRequest) {
  const { userId, tier } = await checkTier();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (tier === "free") return NextResponse.json({ error: "paid_only" }, { status: 403 });

  let body: { curriculum?: string; year?: number; subjects?: string[]; subject?: string; topic?: string; kind?: "tonight" | "check" | "weak" | "paper" | "mock" | "today"; date?: string; task?: "check" | "mock" | "paper" | "fix" } = {};
  try { body = await request.json(); } catch {}
  const curriculum = resolveCurriculum(body.curriculum);
  if (curriculum.status === "coming-soon") {
    return NextResponse.json({ error: "curriculum_unavailable" }, { status: 400 });
  }
  const year = Number(body.year);
  if (!curriculum.levels.some((l) => l.value === year)) {
    return NextResponse.json({ error: "invalid_year" }, { status: 400 });
  }
  const kind = body.kind === "check" || body.kind === "weak" || body.kind === "paper" || body.kind === "mock" || body.kind === "today" ? body.kind : "tonight";
  const validSubject = (s: string) => curriculum.subjects.some((cs) => cs.value === s && cs.years.includes(year));

  // ── The daily task: one paper for this local date, built once ──
  if (kind === "today") {
    const subject = body.subject ?? "";
    const date = typeof body.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : null;
    const task = body.task === "check" || body.task === "mock" || body.task === "paper" || body.task === "fix" ? body.task : "paper";
    if (!validSubject(subject) || !date) return NextResponse.json({ error: "invalid_today" }, { status: 400 });
    const label = curriculum.subjects.find((s) => s.value === subject)?.label ?? subject;
    const prefix = `Day ${date} · `;
    const supabase = getSupabase();
    if (supabase) {
      const { data: rows } = await supabase.from("custom_exams").select("*").eq("user_id", userId).like("title", `${prefix}%`).order("created_at", { ascending: false }).limit(1);
      const row = rows?.[0];
      if (row) {
        return NextResponse.json({ exam: { id: row.id, title: row.title, level: row.level, standard: "PRACTICE", year: new Date(row.created_at).getFullYear(), subject: row.subject, timeMinutes: row.time_minutes, questions: row.questions, totalMarks: row.total_marks, curriculumId: curriculum.id } as Exam, built: false });
      }
    }
    const titles = { check: "Grade check", mock: "Mock exam", paper: "Practice paper", fix: "Weak spot" } as const;
    try {
      const exam = await buildPaper({
        userId, curriculumId: curriculum.id, subject, year,
        questionCount: task === "mock" ? 12 : 8,
        topic: task === "fix" ? (body.topic ?? "").slice(0, 120) || null : null,
        title: `${prefix}${titles[task]} · ${label}`,
      });
      return NextResponse.json({ exam, built: true });
    } catch (error) {
      console.error("today build failed:", error);
      return NextResponse.json({ error: "build_failed" }, { status: 500 });
    }
  }

  // ── Grade check / weak-spot paper: a specific subject, built fresh ──
  if (kind !== "tonight") {
    const subject = body.subject ?? "";
    if (!validSubject(subject)) return NextResponse.json({ error: "invalid_subject" }, { status: 400 });
    const label = curriculum.subjects.find((s) => s.value === subject)?.label ?? subject;
    const topic = kind === "weak" ? (body.topic ?? "").slice(0, 120) || null : null;
    try {
      const titles = { check: `Grade check · ${label}`, weak: `Weak spot · ${label}`, paper: `Practice paper · ${label}`, mock: `Mock exam · ${label}` } as const;
      const exam = await buildPaper({
        userId, curriculumId: curriculum.id, subject, year, questionCount: kind === "mock" ? 12 : 8, topic,
        title: titles[kind],
      });
      return NextResponse.json({ exam, built: true });
    } catch (error) {
      console.error("next-paper build failed:", error);
      return NextResponse.json({ error: "build_failed" }, { status: 500 });
    }
  }

  const wanted = (body.subjects ?? []).filter(validSubject);
  if (wanted.length === 0) {
    return NextResponse.json({ error: "no_subjects" }, { status: 400 });
  }

  // Already have one waiting? Return it — never build a second.
  const existing = await findPrepared(userId);
  if (existing) return NextResponse.json({ exam: existing.exam, built: false });

  // Pick the subject they've gone longest without (never-sat subjects first,
  // in the order they chose them).
  const supabase = getSupabase();
  const lastSat = new Map<string, string>();
  if (supabase) {
    const { data } = await supabase
      .from("exam_attempts")
      .select("subject, taken_at")
      .eq("user_id", userId)
      .order("taken_at", { ascending: false })
      .limit(60);
    for (const a of data ?? []) {
      const s = a.subject as string | null;
      if (s && !lastSat.has(s)) lastSat.set(s, a.taken_at as string);
    }
  }
  const subject =
    wanted.find((s) => !lastSat.has(s)) ??
    [...wanted].sort((a, b) => (lastSat.get(a)! < lastSat.get(b)! ? -1 : 1))[0];
  const label = curriculum.subjects.find((s) => s.value === subject)?.label ?? subject;

  try {
    const exam = await buildPaper({
      userId,
      curriculumId: curriculum.id,
      subject,
      year,
      questionCount: 8,
      title: `${TITLE_PREFIX} · ${label}`,
    });
    void levelValueFor; // (kept exported for callers; not needed here)
    return NextResponse.json({ exam, built: true });
  } catch (error) {
    console.error("next-paper build failed:", error);
    return NextResponse.json({ error: "build_failed" }, { status: 500 });
  }
}
