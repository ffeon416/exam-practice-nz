import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { upsertReview, getDueReviews, type DbReview } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { review } = (await request.json()) as { review: DbReview };
    if (!review || !review.questionId) {
      return NextResponse.json({ error: "Missing review data" }, { status: 400 });
    }

    await upsertReview(userId, review);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/reviews error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ reviews: [] });
    }

    const reviews = await getDueReviews(userId);
    return NextResponse.json({ reviews });
  } catch (error) {
    console.error("GET /api/reviews error:", error);
    return NextResponse.json({ reviews: [] });
  }
}
