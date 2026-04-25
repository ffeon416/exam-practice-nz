import { NextRequest, NextResponse } from "next/server";
import { tutorChat } from "@/lib/claude";
import { checkTier } from "@/lib/checkTier";
import { incrementUsage, logApiUsage } from "@/lib/db";
import { isUnlimited } from "@/lib/tierLimits";
import { rateLimit } from "@/lib/rateLimit";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(ip, 20, 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  }

  try {
    // ── Tier gate ──
    const { userId, limits, usage } = await checkTier();

    const limitVal = limits.tutorMessagesPerWeek === Infinity ? -1 : limits.tutorMessagesPerWeek;
    if (!isUnlimited(limitVal) && usage.tutorMessagesThisWeek >= limits.tutorMessagesPerWeek) {
      return NextResponse.json(
        {
          error: "limit_reached",
          message:
            limits.tutorMessagesPerWeek === 0
              ? "The AI tutor is available on the Pro plan."
              : `You've used your ${limits.tutorMessagesPerWeek} tutor chats for this week. Upgrade or come back next week.`,
          upgradeUrl: "/pricing",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { question, messages, studentAnswer } = body as {
      question: { text: string; markingGuide: string; expectedAnswer?: string };
      messages: { role: "user" | "assistant"; content: string }[];
      studentAnswer?: string;
    };

    const { reply, usage: callUsage } = await tutorChat(question, messages, studentAnswer);

    // ── Increment usage (Step 10) ──
    if (userId) {
      await incrementUsage(userId, "tutor_messages");
    }
    // Log per-call token cost for the admin dashboard
    await logApiUsage(userId, "tutor", callUsage);

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Tutor error:", error);
    return NextResponse.json(
      { error: "Failed to get tutor response. Please try again." },
      { status: 500 }
    );
  }
}
