import { NextRequest, NextResponse } from "next/server";
import { markAnswer, addUsage, zeroUsage, type Usage } from "@/lib/claude";
import { logApiUsage } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { questionMaxMarks } from "@/lib/scoring";
import { demoQuestions } from "@/data/demoQuestions";
import type { MarkingResult } from "@/lib/types";

export const maxDuration = 60;

// Public, no-login demo marking. Runs the EXACT same honest `markAnswer`
// pipeline the real exams use — no canned results, no leniency. The questions
// and marking guides are fixed server-side (from demoQuestions), so the client
// can only ever submit answer text; it can never tamper with what's correct.
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(ip, 8, 60_000);
  if (!ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  // Self-mark fallback for a single question — never fakes a pass.
  const fallback = (q: (typeof demoQuestions)[number]): MarkingResult => ({
    questionId: q.id,
    marksAwarded: 0,
    maxMarks: questionMaxMarks(q.answerType),
    workingMark: q.answerType === "multi-choice" ? null : 0,
    answerMark: 0,
    grade: "not-achieved",
    feedback:
      "We couldn't auto-mark this one just now. Compare your answer with the correct approach below and mark yourself honestly.",
    correctApproach: q.markingGuide,
    examTip: "Always show your working clearly.",
    topicsToReview: q.topics,
  });

  try {
    const body = await request.json().catch(() => ({}));
    const answers = (body?.answers ?? {}) as Record<string, string>;

    let usage: Usage = zeroUsage();

    const results: MarkingResult[] = await Promise.all(
      demoQuestions.map(async (q): Promise<MarkingResult> => {
        try {
          const studentAnswer = (answers[q.id] ?? "").toString().slice(0, 4000);
          const studentWorking = (answers[`${q.id}_working`] ?? "")
            .toString()
            .slice(0, 4000);

          const result = await markAnswer({
            questionText: q.text,
            markingGuide: q.markingGuide,
            answerType: q.answerType,
            studentWorking,
            studentAnswer,
          });
          usage = addUsage(usage, result.usage);

          return {
            questionId: q.id,
            marksAwarded: result.marksAwarded,
            maxMarks: result.maxMarks,
            workingMark: result.workingMark,
            answerMark: result.answerMark,
            grade: result.grade as MarkingResult["grade"],
            feedback: result.feedback,
            correctApproach: result.correctApproach,
            examTip: result.examTip,
            topicsToReview:
              result.topicsToReview.length > 0 ? result.topicsToReview : q.topics,
          };
        } catch (err) {
          console.error(`Demo marking failed for ${q.id}:`, err);
          return fallback(q);
        }
      })
    );

    // Track demo spend on the admin dashboard (fire-and-forget, no user).
    if (usage.inputTokens + usage.outputTokens > 0) {
      logApiUsage(null, "mark", usage).catch(() => {});
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Demo marking error:", error);
    return NextResponse.json({ results: demoQuestions.map(fallback) });
  }
}
