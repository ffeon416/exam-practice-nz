import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { savePlanDb, loadPlanDb, deletePlanDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await request.json();
    if (!plan) {
      return NextResponse.json({ error: "Missing plan data" }, { status: 400 });
    }

    await savePlanDb(userId, {
      examDate: plan.examDate,
      subjects: plan.subjects,
      yearLevel: plan.yearLevel,
      weeks: plan.weeks,
      createdAt: plan.createdAt ?? new Date().toISOString(),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/plan error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ plan: null });
    }

    const plan = await loadPlanDb(userId);
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("GET /api/plan error:", error);
    return NextResponse.json({ plan: null });
  }
}

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deletePlanDb(userId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/plan error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
