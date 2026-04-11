import { NextRequest, NextResponse } from "next/server";
import { tutorChat } from "@/lib/claude";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, messages, studentAnswer } = body as {
      question: { text: string; markingGuide: string; expectedAnswer?: string };
      messages: { role: "user" | "assistant"; content: string }[];
      studentAnswer?: string;
    };

    const reply = await tutorChat(question, messages, studentAnswer);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Tutor error:", error);
    return NextResponse.json(
      { error: "Failed to get tutor response. Please try again." },
      { status: 500 }
    );
  }
}
