import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { saveExam, listUserExams } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { exam } = await request.json();
    if (!exam || !exam.id) {
      return NextResponse.json({ error: "Missing exam data" }, { status: 400 });
    }

    await saveExam(userId, exam);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/exams error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ exams: [] });
    }

    const exams = await listUserExams(userId);
    return NextResponse.json({ exams });
  } catch (error) {
    console.error("GET /api/exams error:", error);
    return NextResponse.json({ exams: [] });
  }
}
