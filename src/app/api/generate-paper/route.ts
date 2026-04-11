import { NextRequest, NextResponse } from "next/server";
import { generatePracticePaper } from "@/lib/claude";

// Allow up to 5 minutes for paper generation
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { subject, level, topic, questionCount } = body as {
      subject: string;
      level: number;
      topic?: string | null;
      questionCount?: number;
    };

    const paper = await generatePracticePaper(
      subject,
      level,
      topic ?? null,
      questionCount ?? 8
    );

    return NextResponse.json({ paper });
  } catch (error) {
    console.error("Paper generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 500 }
    );
  }
}
