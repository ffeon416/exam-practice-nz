import { NextRequest, NextResponse } from "next/server";
import { markAnswer, addUsage, zeroUsage } from "@/lib/claude";
import { logApiUsage } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { questionMaxMarks } from "@/lib/scoring";

// Public, unauthenticated marking for the Grade Detector. Same honest 1+1
// scheme + hedge guard as everywhere else on the site — no leniency just
// because there's no account attached. Deliberately skips the Pro-only
// multi-pass essay marker (too expensive to give away anonymously); every
// question, including English, is marked with the standard scheme.
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(`diag-mark:${ip}`, 8, 60 * 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  let fallbackQuestions: Array<{ id: string; markingGuide: string; topics: string[]; answerType?: string }> = [];

  try {
    const body = await request.json();
    const { questions, answers, curriculum } = body as {
      questions: {
        id: string;
        text: string;
        markingGuide: string;
        topics: string[];
        answerType?: "text" | "number" | "multi-choice" | "working";
      }[];
      answers: Record<string, string>;
      curriculum?: string;
    };
    fallbackQuestions = Array.isArray(questions) ? questions : [];

    let usage = zeroUsage();

    const results = await Promise.all(
      questions.map(async (q) => {
        try {
          const studentAnswer = answers[q.id] ?? "";
          const studentWorking = answers[`${q.id}_working`] ?? "";
          const result = await markAnswer({
            questionText: q.text,
            markingGuide: q.markingGuide,
            answerType: q.answerType,
            studentWorking,
            studentAnswer,
            curriculumId: curriculum,
          });
          usage = addUsage(usage, result.usage);
          return {
            questionId: q.id,
            marksAwarded: result.marksAwarded,
            maxMarks: result.maxMarks,
            grade: result.grade,
            feedback: result.feedback,
            correctApproach: result.correctApproach,
            examTip: result.examTip,
            topicsToReview: result.topicsToReview,
          };
        } catch (err) {
          console.error("Diagnostic per-question marking failed:", err);
          return {
            questionId: q.id,
            marksAwarded: 0,
            maxMarks: questionMaxMarks(q.answerType),
            grade: "not-achieved" as const,
            feedback: "We had trouble auto-marking this one.",
            correctApproach: q.markingGuide,
            examTip: "Always show your working clearly.",
            topicsToReview: q.topics,
          };
        }
      })
    );

    void logApiUsage(null, "diagnostic_mark", usage);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Diagnostic marking error:", error);
    const fallbackResults = fallbackQuestions.map((q) => ({
      questionId: q.id,
      marksAwarded: 0,
      maxMarks: questionMaxMarks(q.answerType),
      grade: "not-achieved" as const,
      feedback: "Auto-marking is temporarily unavailable.",
      correctApproach: q.markingGuide,
      examTip: "Always show your working clearly.",
      topicsToReview: q.topics,
    }));
    return NextResponse.json({ results: fallbackResults });
  }
}
