import { NextRequest, NextResponse } from "next/server";
import { markAnswer, markEnglishEssay, addUsage, zeroUsage, type Usage } from "@/lib/claude";
import { checkTier } from "@/lib/checkTier";
import { logApiUsage } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { maybeCreditReferrer } from "@/lib/supabase";

// Structured-feedback marker used when an English question is marked by the
// multi-pass essay pipeline. The results page detects this prefix to render
// the dimension breakdown nicely; other consumers can display it as plain
// JSON payload after the prefix if they want, or strip the prefix entirely.
const ESSAY_FEEDBACK_PREFIX = "__ENGLISH_ESSAY__";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(ip, 10, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    // ── Tier check for deep essay marking ──
    const { userId, limits } = await checkTier();

    const body = await request.json();
    const { questions, answers, subject } = body as {
      questions: {
        id: string;
        text: string;
        marks: number;
        gradeLevel: string;
        markingGuide: string;
        topics: string[];
        answerType?: "text" | "number" | "multi-choice" | "working";
      }[];
      answers: Record<string, string>;
      subject?: string;
    };

    const isEnglish = subject === "english";

    // Track per-feature usage so the admin dashboard can split "mark" vs "essay"
    let markUsage: Usage = zeroUsage();
    let essayUsage: Usage = zeroUsage();

    // Mark all questions in parallel — each question is wrapped in its own
    // try/catch so one failure doesn't take down the whole exam.
    const results = await Promise.all(
      questions.map(async (q) => {
        try {
          const studentAnswer = answers[q.id] ?? "";
          const studentWorking = answers[`${q.id}_working`] ?? "";

          // Combine working + answer for marking
          const combinedAnswer = studentWorking
            ? `WORKING:\n${studentWorking}\n\nFINAL ANSWER:\n${studentAnswer}`
            : studentAnswer;

          // Only use multi-pass essay marking for Pro users
          const isEssayLike =
            isEnglish &&
            limits.deepEssayMarking &&
            q.marks >= 3 &&
            (q.answerType === undefined ||
              q.answerType === "text" ||
              q.answerType === "working") &&
            studentAnswer.trim().length > 0;

          if (isEssayLike) {
            const essay = await markEnglishEssay(
              q.text,
              q.markingGuide,
              q.marks,
              combinedAnswer
            );
            essayUsage = addUsage(essayUsage, essay.usage);
            const packed =
              essay.overallFeedback +
              "\n\n" +
              ESSAY_FEEDBACK_PREFIX +
              JSON.stringify({
                thesisAndStructure: essay.thesisAndStructure,
                evidenceUse: essay.evidenceUse,
                languageAndStyle: essay.languageAndStyle,
                improvements: essay.improvements,
                overallFeedback: essay.overallFeedback,
              });

            return {
              questionId: q.id,
              marksAwarded: Math.min(essay.marksAwarded, q.marks),
              maxMarks: q.marks,
              grade: essay.grade,
              feedback: packed,
              correctApproach: q.markingGuide,
              examTip:
                essay.improvements[0] ??
                "Focus on developing a clear thesis and supporting it with specific textual evidence.",
              topicsToReview: q.topics,
            };
          }

          const result = await markAnswer(
            q.text,
            q.marks,
            q.gradeLevel,
            q.markingGuide,
            combinedAnswer
          );
          markUsage = addUsage(markUsage, result.usage);

          return {
            questionId: q.id,
            marksAwarded: Math.min(result.marksAwarded, q.marks),
            maxMarks: q.marks,
            grade: result.grade,
            feedback: result.feedback,
            correctApproach: result.correctApproach,
            examTip: result.examTip,
            topicsToReview:
              result.topicsToReview.length > 0
                ? result.topicsToReview
                : q.topics,
          };
        } catch (err) {
          // Per-question fallback — never fail the whole exam because of one bad question
          console.error(`Marking failed for question ${q.id}:`, err);
          return {
            questionId: q.id,
            marksAwarded: 0,
            maxMarks: q.marks,
            grade: "achieved" as const,
            feedback: "Auto-marking unavailable for this question. Compare your answer with the marking guide.",
            correctApproach: q.markingGuide,
            examTip: "Always show your working clearly.",
            topicsToReview: q.topics,
          };
        }
      })
    );

    // Log one combined row per feature used in this mark request
    if (markUsage.inputTokens + markUsage.outputTokens > 0) {
      await logApiUsage(userId, "mark", markUsage);
    }
    if (essayUsage.inputTokens + essayUsage.outputTokens > 0) {
      await logApiUsage(userId, "essay", essayUsage);
    }

    // First-exam referral credit: if this user was referred and we haven't
    // credited the referrer yet, do it now. Idempotent + race-safe.
    if (userId) {
      maybeCreditReferrer(userId).catch((err) => {
        console.error("maybeCreditReferrer failed:", err);
      });
    }

    return NextResponse.json({ results });
  } catch (error) {
    // Never fail the whole exam — return self-mark fallback so the student
    // can still see their answers and the marking guide.
    console.error("Marking error:", error);
    const { questions } = (await request.clone().json().catch(() => ({ questions: [] }))) as {
      questions?: Array<{ id: string; marks: number; markingGuide: string; topics: string[] }>;
    };
    const fallbackResults = (questions ?? []).map((q) => ({
      questionId: q.id,
      marksAwarded: 0,
      maxMarks: q.marks,
      grade: "achieved" as const,
      feedback:
        "Auto-marking is temporarily unavailable. Compare your answer with the marking guide below to mark yourself.",
      correctApproach: q.markingGuide,
      examTip: "Always show your working clearly.",
      topicsToReview: q.topics,
    }));
    return NextResponse.json({ results: fallbackResults });
  }
}
