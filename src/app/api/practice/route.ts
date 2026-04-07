import { NextRequest, NextResponse } from "next/server";
import { generatePracticeQuestion } from "@/lib/claude";
import { markAnswer } from "@/lib/claude";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body as { action: string };

    if (action === "generate") {
      const { topic, level, gradeLevel } = body as {
        action: string;
        topic: string;
        level: number;
        gradeLevel: string;
      };

      const question = await generatePracticeQuestion(
        topic,
        level,
        gradeLevel
      );

      return NextResponse.json({
        id: `practice-${Date.now()}`,
        topic,
        gradeLevel,
        ...question,
      });
    }

    if (action === "mark") {
      const { questionText, marks, gradeLevel, markingGuide, studentAnswer } =
        body as {
          action: string;
          questionText: string;
          marks: number;
          gradeLevel: string;
          markingGuide: string;
          studentAnswer: string;
        };

      const result = await markAnswer(
        questionText,
        marks,
        gradeLevel,
        markingGuide,
        studentAnswer
      );

      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Practice error:", error);
    return NextResponse.json(
      { error: "Failed to process request. Check your API key." },
      { status: 500 }
    );
  }
}
