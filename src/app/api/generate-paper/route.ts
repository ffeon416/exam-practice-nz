import { NextRequest, NextResponse } from "next/server";
import { generatePracticePaper } from "@/lib/claude";
import { checkTier } from "@/lib/checkTier";
import { incrementUsage, logApiUsage } from "@/lib/db";
import { isUnlimited } from "@/lib/tierLimits";
import { resolveCurriculum } from "@/data/curricula";
import { rateLimit } from "@/lib/rateLimit";
import { logEvent } from "@/lib/supabase";

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

    // There is NO free practice (free plan removed 2026-08-31, every side door
    // closed 2026-09-08). The only free experience is the Grade Detector at
    // /grade, which runs on its own /api/diagnostic routes. Unpaid accounts are
    // leads: no papers, no referral bonus exams, no first-diagnostic bypass.
    if (tier === "free") {
      // Money-moment: an unpaid user wants a paper (see /admin funnel).
      void logEvent("paywall_hit", userId, { reason: "exam_limit", tier });
      return NextResponse.json(
        {
          error: "limit_reached",
          message: "Practice exams are part of Pro. Upgrade to start training.",
          upgradeUrl: "/pricing",
        },
        { status: 403 }
      );
    }

    const limitVal = limits.examsPerWeek === Infinity ? -1 : limits.examsPerWeek;
    if (!isUnlimited(limitVal) && usage.examsThisWeek >= limits.examsPerWeek) {
      // Money-moment: a capped Student wants more exams (see /admin funnel).
      void logEvent("paywall_hit", userId, { reason: "exam_limit", tier });
      return NextResponse.json(
        {
          error: "limit_reached",
          message: "You've used all your exams this week. Upgrade to Pro for unlimited exams.",
          upgradeUrl: "/pricing",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { subject, level, topic, questionCount, curriculum: rawCurriculum, diagnostic } = body as {
      subject: string;
      level: number;
      topic?: string | null;
      questionCount?: number;
      curriculum?: string;
      /** Grade Detector run for a signed-in paid user — fixed 8 questions. */
      diagnostic?: boolean;
    };

    // Curriculum gate — only live/early-access systems can generate papers.
    const curriculum = resolveCurriculum(rawCurriculum);
    if (curriculum.status === "coming-soon") {
      return NextResponse.json(
        { error: "curriculum_unavailable", message: `${curriculum.system} isn't open yet — join the waitlist at /global.` },
        { status: 400 }
      );
    }
    // The subject must exist in this curriculum (stops slug-guessing across systems).
    if (!curriculum.subjects.some((s) => s.value === subject)) {
      return NextResponse.json(
        { error: "invalid_subject", message: "That subject isn't available in this exam system." },
        { status: 400 }
      );
    }

    // Cap question count to tier limit. Diagnostics are always exactly 8 —
    // the estimate needs a consistent sample size.
    const cappedCount = diagnostic === true ? 8 : Math.min(questionCount ?? 8, limits.maxQuestions);

    // Record the diagnostic (funnel stats)
    if (diagnostic === true) {
      void logEvent("diagnostic_used", userId, { subject, curriculum: curriculum.id });
    }

    const paper = await generatePracticePaper(
      subject,
      level,
      topic ?? null,
      cappedCount,
      curriculum.id
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
