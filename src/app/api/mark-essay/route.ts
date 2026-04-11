import { NextRequest, NextResponse } from "next/server";
import { markEnglishEssay } from "@/lib/claude";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { questionText, markingGuide, marks, studentEssay } = body as {
      questionText: string;
      markingGuide: string;
      marks: number;
      studentEssay: string;
    };

    if (typeof questionText !== "string" || typeof markingGuide !== "string" || typeof marks !== "number") {
      return NextResponse.json(
        { error: "questionText, markingGuide, and marks are required" },
        { status: 400 }
      );
    }

    const result = await markEnglishEssay(
      questionText,
      markingGuide,
      marks,
      studentEssay ?? ""
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Essay marking error:", error);
    return NextResponse.json(
      { error: "Failed to mark essay." },
      { status: 500 }
    );
  }
}
