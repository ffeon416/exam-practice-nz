import { NextResponse } from "next/server";
import { checkTier } from "@/lib/checkTier";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tier, limits, usage } = await checkTier();

    return NextResponse.json({
      tier,
      limits: {
        ...limits,
        // JSON can't serialize Infinity — use -1 as "unlimited"
        examsPerWeek: limits.examsPerWeek === Infinity ? -1 : limits.examsPerWeek,
        tutorMessagesPerDay: limits.tutorMessagesPerDay === Infinity ? -1 : limits.tutorMessagesPerDay,
      },
      usage,
    });
  } catch (error) {
    console.error("User tier check error:", error);
    // Graceful fallback — don't break the app
    return NextResponse.json({
      tier: "free",
      limits: {
        examsPerWeek: 2,
        maxQuestions: 8,
        tutorMessagesPerDay: 3,
        allSubjects: false,
        spacedRepetition: false,
        adaptiveDifficulty: false,
        studyPlanner: false,
        deepEssayMarking: false,
        mockExamMode: false,
      },
      usage: { examsThisWeek: 0, tutorMessagesToday: 0 },
    });
  }
}
