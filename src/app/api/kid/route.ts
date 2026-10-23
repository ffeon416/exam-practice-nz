import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { childForKid, updateChild } from "@/lib/children";
import { getSupabase } from "@/lib/supabase";
import { getCurriculum, USABLE_CURRICULA } from "@/data/curricula";
import { TARGET_BANDS } from "@/lib/gradeCheck";
import { COUNTRY_COOKIE } from "@/lib/metaShared";

export const dynamic = "force-dynamic";

// The kid's onboarding state (/hello).
//   GET  → name, country to show exams for, what they've picked, check status
//   POST { curriculumId, year, subjects[], checkSubject, targetBand, timezone? }

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const child = await childForKid(userId);
  if (!child) return NextResponse.json({ notKid: true });

  // Exams shown for the country the parent signed up from, else where the kid is now.
  const { data: parent } = (await getSupabase()?.from("profiles").select("signup_country").eq("user_id", child.parent_user_id).maybeSingle()) ?? { data: null };
  const country = ((parent?.signup_country as string | null) || req.cookies.get(COUNTRY_COOKIE)?.value || "").toUpperCase() || null;

  return NextResponse.json({
    childId: child.id,
    firstName: child.first_name,
    country,
    curriculumId: child.curriculum_id,
    year: child.year_level,
    subjects: child.subjects ?? [],
    checkSubject: child.check_subject,
    targetBand: child.target_band,
    remindAt: child.remind_at,
    gradeCheckDone: !!child.grade_check_completed_at,
    summary: child.grade_check,
  });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const child = await childForKid(userId);
  if (!child) return NextResponse.json({ error: "Not a student account." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as {
    curriculumId?: unknown; year?: unknown; subjects?: unknown; checkSubject?: unknown; targetBand?: unknown; timezone?: unknown;
  };
  const curriculum = typeof b.curriculumId === "string" ? getCurriculum(b.curriculumId) : null;
  if (!curriculum || !USABLE_CURRICULA.some((c) => c.id === curriculum.id)) return NextResponse.json({ error: "Pick your exams." }, { status: 400 });
  const year = Number(b.year);
  if (!curriculum.levels.some((l) => l.value === year)) return NextResponse.json({ error: "Pick your year." }, { status: 400 });
  const offered = new Set(curriculum.subjects.filter((s) => s.years.includes(year)).map((s) => s.value));
  const subjects = Array.isArray(b.subjects) ? [...new Set(b.subjects.filter((s): s is string => typeof s === "string" && offered.has(s)))].slice(0, 12) : [];
  if (!subjects.length) return NextResponse.json({ error: "Pick at least one subject." }, { status: 400 });
  const checkSubject = typeof b.checkSubject === "string" && subjects.includes(b.checkSubject) ? b.checkSubject : subjects[0];
  const targetBand = TARGET_BANDS.some((t) => t.id === b.targetBand) ? (b.targetBand as string) : "a";
  const timezone = typeof b.timezone === "string" && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(b.timezone) ? b.timezone : child.timezone;

  // Changing subject after a paper was built for another one: build a fresh paper.
  const paperStale = child.check_subject && child.check_subject !== checkSubject;
  await updateChild(child.id, {
    curriculum_id: curriculum.id,
    year_level: year,
    subjects,
    check_subject: checkSubject,
    target_band: targetBand,
    timezone,
    ...(paperStale && !child.grade_check_completed_at ? ({ grade_check_paper: null } as Record<string, null>) : {}),
  });
  return NextResponse.json({ ok: true, curriculumId: curriculum.id, year, subjects, checkSubject, targetBand });
}
