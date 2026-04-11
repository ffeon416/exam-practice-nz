import { NextRequest, NextResponse } from "next/server";
import { generatePracticePaper } from "@/lib/claude";

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
    return NextResponse.json(
      { error: "Failed to generate paper. Please try again." },
      { status: 500 }
    );
  }
}
