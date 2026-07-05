import { NextRequest, NextResponse } from "next/server";
import { generatePracticePaper } from "@/lib/claude";
import { checkTier } from "@/lib/checkTier";
import { incrementUsage, logApiUsage } from "@/lib/db";
import { isUnlimited, isSubjectAvailable } from "@/lib/tierLimits";
import { rateLimit } from "@/lib/rateLimit";
import { consumeBonusExam, logEvent } from "@/lib/supabase";

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
      // Free user is over their weekly cap — try to spend a referral bonus
      // before returning the upgrade prompt. Consumes one bonus exam if any
      // are remaining; otherwise blocks as before.
      const bonusUsed = userId ? await consumeBonusExam(userId) : false;
      if (!bonusUsed) {
        // Money-moment: a capped user wants more exams (see /admin funnel).
        void logEvent("paywall_hit", userId, { reason: "exam_limit", tier });
        return NextResponse.json(
          {
            error: "limit_reached",
            message: `You've used your ${limits.examsPerWeek} free exams this week. Upgrade to continue, or invite a friend for bonus exams.`,
            upgradeUrl: "/pricing",
          },
          { status: 403 }
        );
      }
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
      // Money-moment: user tapped a locked subject.
      void logEvent("paywall_hit", userId, { reason: "subject_locked", tier, subject });
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

    // Belt: trim if the generator overshot (shouldn't happen — it has its own
    // trim — but defensive).
    if (paper.questions.length > cappedCount) {
      paper.questions = paper.questions.slice(0, cappedCount);
    }

    // Braces: HARD THROW if the count is wrong in either direction. The
    // generator's internal top-up loop should make this impossible, but if
    // anything ever slips through, the route returns 500 so the client retries
    // rather than serving a paper that doesn't match the requested length.
    // Per the no-silent-undercount rule — better an error than a wrong count.
    if (paper.questions.length !== cappedCount) {
      throw new Error(
        `Generator returned ${paper.questions.length} questions, expected exactly ${cappedCount}. This indicates a generator bug.`,
      );
    }

    // ── Increment usage (Step 10) ──
    if (userId) {
      await incrementUsage(userId, "exams_generated");
    }
    // Log per-call token cost for the admin dashboard
    await logApiUsage(userId, "generate_paper", paper.usage);

    // Strip usage from the paper payload before returning to the client.
    // `requested` echoes the server-side capped count so the client can
    // independently verify the count it received matches what the server
    // actually produced — a cross-check against any client-side tier-cache
    // drift.
    const { usage: _usage, ...paperPayload } = paper;
    void _usage;
    return NextResponse.json({ paper: paperPayload, requested: cappedCount });
  } catch (error) {
    console.error("Paper generation error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Generation failed: ${message}` },
      { status: 500 }
    );
  }
}
