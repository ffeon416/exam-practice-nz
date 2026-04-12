import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { saveAttempt, listAttempts, upsertTopicScore } from "@/lib/db";
import type { TopicScore } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { attempt, topicScores } = await request.json();
    if (!attempt) {
      return NextResponse.json({ error: "Missing attempt data" }, { status: 400 });
    }

    await saveAttempt(userId, attempt);

    // Update topic scores in parallel
    if (topicScores && typeof topicScores === "object") {
      const updates = Object.values(topicScores as Record<string, TopicScore>).map(
        (score) => upsertTopicScore(userId, score)
      );
      await Promise.all(updates);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/attempts error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ attempts: [] });
    }

    const attempts = await listAttempts(userId);
    return NextResponse.json({ attempts });
  } catch (error) {
    console.error("GET /api/attempts error:", error);
    return NextResponse.json({ attempts: [] });
  }
}
