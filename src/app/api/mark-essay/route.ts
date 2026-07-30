import { NextRequest, NextResponse } from "next/server";
import { markEnglishEssay } from "@/lib/claude";
import { logApiUsage } from "@/lib/db";
import { checkTier } from "@/lib/checkTier";
import { rateLimit } from "@/lib/rateLimit";

export async function POST(request: NextRequest) {
  // Same guard as /api/mark — this is the most expensive AI call in the app.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(ip, 10, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    // Deep essay marking is a paid feature — enforce the same tier gate as /api/mark.
    const { userId, limits } = await checkTier();
    if (!limits.deepEssayMarking) {
      return NextResponse.json(
        { error: "Deep essay marking is available on Student and Pro plans." },
        { status: 403 }
      );
    }

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
    await logApiUsage(userId, "essay", result.usage);

    const { usage: _u, ...payload } = result;
    void _u;
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Essay marking error:", error);
    return NextResponse.json(
      { error: "Failed to mark essay." },
      { status: 500 }
    );
  }
}
