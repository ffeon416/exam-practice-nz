import { NextRequest, NextResponse } from "next/server";
import { markAnswer, markEnglishEssay } from "@/lib/claude";

// Structured-feedback marker used when an English question is marked by the
// multi-pass essay pipeline. The results page detects this prefix to render
// the dimension breakdown nicely; other consumers can display it as plain
// JSON payload after the prefix if they want, or strip the prefix entirely.
const ESSAY_FEEDBACK_PREFIX = "__ENGLISH_ESSAY__";

export async function POST(request: NextRequest) {
  try {
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

    // Mark all questions in parallel
    const results = await Promise.all(
      questions.map(async (q) => {
        const studentAnswer = answers[q.id] ?? "";
        const studentWorking = answers[`${q.id}_working`] ?? "";

        // Combine working + answer for marking
        const combinedAnswer = studentWorking
          ? `WORKING:\n${studentWorking}\n\nFINAL ANSWER:\n${studentAnswer}`
          : studentAnswer;

        // English essay-style questions (text or working answer types with
        // meaningful length) go through the multi-pass marker. Very short
        // answers (e.g. a 1-mark language identification) still use the fast
        // marker — multi-pass would be overkill.
        const isEssayLike =
          isEnglish &&
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

          // Pack the structured dimension breakdown into the feedback field
          // using a parseable prefix so the results page can render it. The
          // human-readable overallFeedback is duplicated before the prefix
          // as a graceful fallback for any consumer that doesn't know how
          // to parse this format.
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
      })
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Marking error:", error);
    return NextResponse.json(
      { error: "Failed to mark exam. Check your API key." },
      { status: 500 }
    );
  }
}
