import { NextRequest, NextResponse } from "next/server";
import { generatePracticeQuestion } from "@/lib/claude";
import { markAnswer } from "@/lib/claude";
import { auth } from "@clerk/nextjs/server";
import { logApiUsage } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  // Both actions hit Claude — apply the same per-IP guard as the sibling AI routes.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(ip, 10, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    const { userId } = await auth();
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
      await logApiUsage(userId, "practice_question", question.usage);

      const { usage: _u, ...qPayload } = question;
      void _u;
      return NextResponse.json({
        id: `practice-${Date.now()}`,
        topic,
        gradeLevel,
        ...qPayload,
      });
    }

    if (action === "mark") {
      const { questionText, markingGuide, answerType, studentAnswer } =
        body as {
          action: string;
          questionText: string;
          markingGuide: string;
          answerType?: string;
          studentAnswer: string;
        };

      const result = await markAnswer({
        questionText,
        markingGuide,
        answerType,
        // Single practice box doubles as working + answer.
        studentWorking: studentAnswer,
        studentAnswer,
      });
      await logApiUsage(userId, "mark", result.usage);

      const { usage: _u, ...resultPayload } = result;
      void _u;
      return NextResponse.json(resultPayload);
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
