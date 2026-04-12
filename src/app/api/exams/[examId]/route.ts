import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { loadExam, deleteExam } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ exam: null });
    }

    const { examId } = await params;
    const exam = await loadExam(userId, examId);
    return NextResponse.json({ exam });
  } catch (error) {
    console.error("GET /api/exams/[examId] error:", error);
    return NextResponse.json({ exam: null });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ examId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { examId } = await params;
    await deleteExam(userId, examId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/exams/[examId] error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
