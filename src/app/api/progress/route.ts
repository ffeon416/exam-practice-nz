import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { listAttempts, getTopicScores } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({
        examAttempts: [],
        topicScores: {},
        totalExamsTaken: 0,
        streakDays: 0,
      });
    }

    const [examAttempts, topicScores] = await Promise.all([
      listAttempts(userId, 50),
      getTopicScores(userId),
    ]);

    // Calculate streak from attempts
    let streakDays = 0;
    if (examAttempts.length > 0) {
      const dates = [...new Set(
        examAttempts.map((a) => new Date(a.date).toISOString().slice(0, 10))
      )].sort().reverse();

      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

      if (dates[0] === today || dates[0] === yesterday) {
        streakDays = 1;
        for (let i = 1; i < dates.length; i++) {
          const prev = new Date(dates[i - 1]);
          const curr = new Date(dates[i]);
          const diffDays = Math.floor(
            (prev.getTime() - curr.getTime()) / 86400000
          );
          if (diffDays === 1) {
            streakDays++;
          } else {
            break;
          }
        }
      }
    }

    return NextResponse.json({
      examAttempts,
      topicScores,
      totalExamsTaken: examAttempts.length,
      streakDays,
    });
  } catch (error) {
    console.error("GET /api/progress error:", error);
    return NextResponse.json({
      examAttempts: [],
      topicScores: {},
      totalExamsTaken: 0,
      streakDays: 0,
    });
  }
}
