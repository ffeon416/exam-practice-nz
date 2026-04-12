import { NextRequest, NextResponse } from "next/server";
import { generatePracticePaper } from "@/lib/claude";
import { checkTier } from "@/lib/checkTier";
import { incrementUsage } from "@/lib/db";
import { isUnlimited } from "@/lib/tierLimits";

// Allow up to 5 minutes for paper generation
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // ── Tier gate ──
    const { userId, limits, usage } = await checkTier();

    const limitVal = limits.examsPerWeek === Infinity ? -1 : limits.examsPerWeek;
    if (!isUnlimited(limitVal) && usage.examsThisWeek >= limits.examsPerWeek) {
      return NextResponse.json(
        {
          error: "limit_reached",
          message: `You've used your ${limits.examsPerWeek} free exams this week. Upgrade to continue.`,
          upgradeUrl: "/pricing",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { subject, level, topic, questionCount } = body as {
      subject: string;
      level: number;
      topic?: string | null;
      questionCount?: number;
    };

    // Cap question count to tier limit
    const cappedCount = Math.min(questionCount ?? 8, limits.maxQuestions);

    const paper = await generatePracticePaper(
      subject,
      level,
      topic ?? null,
      cappedCount
    );

    // ── Increment usage (Step 10) ──
    if (userId) {
      await incrementUsage(userId, "exams_generated");
    }

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
