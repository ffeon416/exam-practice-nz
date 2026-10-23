import { NextRequest, NextResponse, after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { childForKid, updateChild } from "@/lib/children";
import { getSupabase, logEvent } from "@/lib/supabase";
import { generatePracticePaper, markAnswer, addUsage, zeroUsage } from "@/lib/claude";
import { logApiUsage, saveAttempt } from "@/lib/db";
import { levelValueFor } from "@/lib/buildPaper";
import { isQuestionBroken } from "@/lib/questionGuard";
import { questionMaxMarks, bandToneGrade } from "@/lib/scoring";
import { resolveCurriculum } from "@/data/curricula";
import { CHECK_QUESTIONS, publicQuestions, summarise, type Marked } from "@/lib/gradeCheck";
import { sendParentEvent } from "@/lib/metaFunnel";
import { sendChildEmail } from "@/lib/freeWeekLive";
import type { ExamAttempt, Question } from "@/lib/types";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// The kid's first grade check.
//   POST { action: "start" }            → the 8 questions (builds them once; resumes after)
//   POST { action: "submit", answers }  → marks them, saves the attempt, returns the result
// The paper with its marking guides stays on the server (child_profiles.grade_check_paper).

const MAX_BUILDS = 3; // per child, ever — each build is a paid AI call

type StoredPaper = { title: string; subject: string; curriculumId: string; year: number; questions: Question[]; builtAt: string };

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const child = await childForKid(userId);
  if (!child) return NextResponse.json({ error: "Not a student account." }, { status: 403 });
  if (child.grade_check_completed_at && child.grade_check) {
    return NextResponse.json({ done: true, summary: child.grade_check });
  }
  if (!child.curriculum_id || !child.year_level || !child.check_subject) {
    return NextResponse.json({ error: "Pick your exams and subjects first." }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Not available right now." }, { status: 503 });
  const { data: row } = await supabase.from("child_profiles").select("grade_check_paper, grade_check_generated").eq("id", child.id).maybeSingle();
  let paper = (row?.grade_check_paper as StoredPaper | null) ?? null;
  const builds = (row?.grade_check_generated as number | null) ?? 0;

  const body = (await req.json().catch(() => ({}))) as { action?: unknown; answers?: unknown };

  // ── Start (or resume) ──
  if (body.action === "start") {
    if (!paper || paper.subject !== child.check_subject) {
      if (builds >= MAX_BUILDS) return NextResponse.json({ error: "We couldn't build your check. Ask your parent to contact us." }, { status: 429 });
      await supabase.from("child_profiles").update({ grade_check_generated: builds + 1 }).eq("id", child.id);
      const curriculum = resolveCurriculum(child.curriculum_id);
      try {
        const built = await generatePracticePaper(child.check_subject, levelValueFor(curriculum.id, child.year_level), null, CHECK_QUESTIONS + 2, curriculum.id);
        void logApiUsage(userId, "generate_paper", built.usage);
        // Same guard as every other paper: drop questions that reference a missing graph/image.
        const questions: Question[] = built.questions
          .map((q, i) => ({ ...q, id: `q${i + 1}`, number: String(i + 1), topics: [child.check_subject!] }) as Question)
          .filter((q) => !isQuestionBroken(q))
          .slice(0, CHECK_QUESTIONS)
          .map((q, i) => ({ ...q, id: `q${i + 1}`, number: String(i + 1) }));
        if (questions.length < 6) throw new Error(`only ${questions.length} usable questions`);
        paper = { title: built.title, subject: child.check_subject, curriculumId: curriculum.id, year: child.year_level, questions, builtAt: new Date().toISOString() };
        await supabase.from("child_profiles").update({ grade_check_paper: paper }).eq("id", child.id);
      } catch (err) {
        console.error("grade check build failed:", err);
        return NextResponse.json({ error: "Your check didn't build. Tap to try again.", retry: true }, { status: 503 });
      }
    }
    return NextResponse.json({ title: paper.title, questions: publicQuestions(paper.questions) });
  }

  // ── Submit ──
  if (body.action === "submit") {
    if (!paper) return NextResponse.json({ error: "Start the check first." }, { status: 400 });
    const raw = body.answers && typeof body.answers === "object" ? (body.answers as Record<string, unknown>) : {};
    const answers: Record<string, string> = {};
    for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && /^q\d+(_working)?$/.test(k)) answers[k] = v.slice(0, 4000);

    let usage = zeroUsage();
    const results: Marked[] = await Promise.all(
      paper.questions.map(async (q): Promise<Marked> => {
        try {
          const r = await markAnswer({
            questionText: q.text,
            markingGuide: q.markingGuide,
            answerType: q.answerType,
            studentWorking: answers[`${q.id}_working`] ?? "",
            studentAnswer: answers[q.id] ?? "",
            curriculumId: paper!.curriculumId,
          });
          usage = addUsage(usage, r.usage);
          return {
            questionId: q.id, marksAwarded: r.marksAwarded, maxMarks: r.maxMarks, workingMark: r.workingMark, answerMark: r.answerMark,
            grade: r.grade as Marked["grade"], feedback: r.feedback, correctApproach: r.correctApproach, examTip: r.examTip, topicsToReview: r.topicsToReview,
          };
        } catch (err) {
          console.error("grade check marking failed for", q.id, err);
          // A marking error is OUR failure, not a wrong answer: left out of the score.
          return {
            questionId: q.id, marksAwarded: 0, maxMarks: questionMaxMarks(q.answerType), grade: "not-achieved",
            feedback: "We couldn't mark this one, so it isn't counted.", correctApproach: "", examTip: "", topicsToReview: [], unmarked: true,
          };
        }
      })
    );
    void logApiUsage(userId, "mark", usage);

    const summary = summarise({ results, curriculumId: paper.curriculumId, subject: paper.subject, targetBandId: child.target_band ?? "a" });
    if ("tooManyUnmarked" in summary) {
      return NextResponse.json({ error: "Our marking had a hiccup. Your answers are saved here; tap submit again.", retry: true }, { status: 503 });
    }

    const scored = results.filter((r) => !r.unmarked);
    const now = new Date().toISOString();
    const attempt: ExamAttempt & { examTitle: string; subject: string; level: number } = {
      examId: `grade-check-${child.id}`,
      date: now,
      answers,
      results: scored,
      overallGrade: bandToneGrade(resolveCurriculum(paper.curriculumId).gradeBands.find((b) => b.id === summary.bandId) ?? resolveCurriculum(paper.curriculumId).gradeBands.at(-1)!),
      totalMarks: scored.reduce((s, r) => s + r.marksAwarded, 0),
      maxMarks: scored.reduce((s, r) => s + r.maxMarks, 0),
      mode: "mock",
      examTitle: `Grade check · ${summary.subjectLabel}`,
      subject: paper.subject,
      level: levelValueFor(paper.curriculumId, paper.year),
    };
    await saveAttempt(userId, attempt);
    await updateChild(child.id, { grade_check_completed_at: now, grade_check: summary });
    void logEvent("grade_check_completed", userId, { child: child.id, subject: paper.subject, pct: summary.pct, band: summary.bandId });
    after(() => sendParentEvent("GradeCheckCompleted", child.parent_user_id, child.id).catch((e) => console.error("GradeCheckCompleted failed:", e)));
    // "Here's where [name] actually stands" — now; the hourly job retries if it fails.
    after(() => sendChildEmail("gradecheck", child.id).then(() => undefined).catch((e) => console.error("grade check email failed:", e)));

    return NextResponse.json({
      done: true,
      summary,
      attempt,
      // Per-question feedback for the kid's own review.
      results: results.map((r) => ({ questionId: r.questionId, marksAwarded: r.marksAwarded, maxMarks: r.maxMarks, feedback: r.feedback, unmarked: !!r.unmarked })),
    });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
