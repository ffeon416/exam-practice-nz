import { NextRequest, NextResponse } from "next/server";
import { markAnswer } from "@/lib/claude";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questions, answers } = body as {
      questions: {
        id: string;
        text: string;
        marks: number;
        gradeLevel: string;
        markingGuide: string;
        topics: string[];
      }[];
      answers: Record<string, string>;
    };

    // Mark all questions in parallel
    const results = await Promise.all(
      questions.map(async (q) => {
        const studentAnswer = answers[q.id] ?? "";
        const studentWorking = answers[`${q.id}_working`] ?? "";

        // Combine working + answer for marking
        const combinedAnswer = studentWorking
          ? `WORKING:\n${studentWorking}\n\nFINAL ANSWER:\n${studentAnswer}`
          : studentAnswer;

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
