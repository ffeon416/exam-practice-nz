import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/claude";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "lesson") {
      const { questionText, topics, markingGuide, expectedAnswer, level } = body;

      const levelName = level === 0 ? "Year 10 CAA Numeracy" : `NCEA Level ${level}`;

      const prompt = `You are a friendly maths tutor helping a New Zealand student prepare for ${levelName}.

The student is about to attempt this exam question:
"${questionText}"

The topics involved are: ${topics}
The correct answer is: ${expectedAnswer}
The marking guide says: ${markingGuide}

Write a SHORT lesson (150 words max) that teaches the student the concept they need to answer this question. DO NOT solve this specific question — teach the method so they can solve it themselves.

Rules:
- Talk like a friendly tutor, not a textbook
- Explain the key formula or method they need
- Give ONE quick worked example with DIFFERENT numbers than the actual question
- Keep it short — they need to learn fast, not read an essay
- Use simple language a teenager would understand
- End with a tip like "Now try the question below using this method"

Just write the lesson text directly, no JSON, no markdown headers.`;

      const { text } = await chatCompletion(prompt, { smart: true, maxTokens: 1500 });
      return NextResponse.json({ lesson: text });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Practice tutor error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
