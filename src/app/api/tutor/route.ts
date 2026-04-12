import { NextRequest, NextResponse } from "next/server";
import { tutorChat } from "@/lib/claude";
import { checkTier } from "@/lib/checkTier";
import { incrementUsage } from "@/lib/db";
import { isUnlimited } from "@/lib/tierLimits";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // ── Tier gate ──
    const { userId, limits, usage } = await checkTier();

    const limitVal = limits.tutorMessagesPerDay === Infinity ? -1 : limits.tutorMessagesPerDay;
    if (!isUnlimited(limitVal) && usage.tutorMessagesToday >= limits.tutorMessagesPerDay) {
      return NextResponse.json(
        {
          error: "limit_reached",
          message: `You've used your ${limits.tutorMessagesPerDay} tutor messages for today. Upgrade to continue.`,
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

    const reply = await tutorChat(question, messages, studentAnswer);

    // ── Increment usage (Step 10) ──
    if (userId) {
      await incrementUsage(userId, "tutor_messages");
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error("Tutor error:", error);
    return NextResponse.json(
      { error: "Failed to get tutor response. Please try again." },
      { status: 500 }
    );
  }
}
