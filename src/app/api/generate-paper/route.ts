import { NextRequest, NextResponse } from "next/server";
import { generatePracticePaper } from "@/lib/claude";
import { checkTier } from "@/lib/checkTier";
import { incrementUsage, logApiUsage } from "@/lib/db";
import { isUnlimited, isSubjectAvailable } from "@/lib/tierLimits";
import { rateLimit } from "@/lib/rateLimit";

// Allow up to 5 minutes for paper generation
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(ip, 5, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    // ── Tier gate ──
    const { userId, tier, limits, usage } = await checkTier();

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

    // Subject gate — Free tier can only use the sample-subject whitelist.
    if (!isSubjectAvailable(subject, tier)) {
      return NextResponse.json(
        {
          error: "subject_locked",
          message: "This subject is on the Student and Pro plans. Upgrade to unlock all 19 NCEA subjects.",
          upgradeUrl: "/pricing",
        },
        { status: 403 }
      );
    }

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
    // Log per-call token cost for the admin dashboard
    await logApiUsage(userId, "generate_paper", paper.usage);

    // Strip usage from the paper payload before returning to the client
    const { usage: _usage, ...paperPayload } = paper;
    void _usage;
    return NextResponse.json({ paper: paperPayload });
  } catch (error) {
    console.error("Paper generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 500 }
    );
  }
}
