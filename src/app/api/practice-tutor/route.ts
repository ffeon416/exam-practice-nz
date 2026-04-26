import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/claude";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === "lesson") {
      const { questionText, topics, markingGuide, expectedAnswer, level } = body;

      const levelName = level === 0 ? "Year 10 CAA Numeracy" : `NCEA Level ${level}`;

      const prompt = `You are a friendly tutor helping a New Zealand student prepare for ${levelName}.

The student is about to attempt this exam question:
"${questionText}"

Topics: ${topics}
The correct answer is: ${expectedAnswer}
Marking guide: ${markingGuide}

Write a focused mini-lesson that teaches the concept they need. DO NOT solve THIS specific question — teach the method so they can solve it themselves.

═══ ACCURACY IS NON-NEGOTIABLE ═══
This is a study app for real students preparing for real exams. Wrong information damages their learning. Before you submit your response:
1. Re-read every formula you wrote — is it correct?
2. Check every arithmetic step in your worked example — does it actually work out?
3. If your example produces a weird/messy/negative/contradictory result, the example is wrong — pick different numbers and redo it
4. Never write hedges like "weird but roll with it", "actually wait", "let me reconsider" — if you notice an error, silently fix it BEFORE responding

═══ FORMAT ═══
Use markdown. Be clear and structured:
- Short opening sentence introducing the concept
- **The Method:** numbered list of steps (3–6 steps)
- **Quick Example:** ONE worked example with simple, clean numbers (whole numbers when possible) that produce a clean answer
- **Top tip:** one practical tip
- Final encouragement line like "Now try the question below using this method!"

═══ STYLE ═══
- Friendly, like a helpful older sibling — not a textbook
- Use simple language a teenager understands
- Aim for around 200 words; longer is fine if needed for accuracy
- Use bold (**word**) sparingly to highlight key terms or steps

═══ EXAMPLE-NUMBER RULES ═══
- For algebra: pick coefficients so the variable solves to a small positive whole number (1–10)
- For geometry: pick lengths/angles that give clean answers (no decimals if avoidable)
- For percentages: use round percentages (10%, 20%, 25%, 50%) of round numbers
- Always show the substitution step explicitly so the student can follow

Output the lesson directly, no preamble, no "Here's your lesson:" — just the lesson.`;

      const { text } = await chatCompletion(prompt, { smart: true, maxTokens: 1500 });
      return NextResponse.json({ lesson: text });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Practice tutor error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
