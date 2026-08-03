import { NextRequest, NextResponse } from "next/server";
import { generatePracticePaper } from "@/lib/claude";
import { logApiUsage } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";
import { resolveCurriculum } from "@/data/curricula";

// Public, unauthenticated generation for the Grade Detector (/grade). No
// account required to sit the diagnostic — only to reveal/receive the grade
// (see /api/diagnostic/email). Always exactly 8 questions. Rate-limited hard
// per IP since there's no tier/usage gate behind this at all.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(`diag-gen:${ip}`, 5, 60 * 60_000);
  if (!ok) {
    return NextResponse.json(
      { error: "Too many grade checks from this connection. Please try again in an hour." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { subject, level, curriculum: rawCurriculum } = body as {
      subject: string;
      level: number;
      curriculum?: string;
    };

    const curriculum = resolveCurriculum(rawCurriculum);
    if (curriculum.status === "coming-soon") {
      return NextResponse.json(
        { error: "curriculum_unavailable", message: `${curriculum.system} isn't open yet.` },
        { status: 400 }
      );
    }
    if (!curriculum.subjects.some((s) => s.value === subject)) {
      return NextResponse.json(
        { error: "invalid_subject", message: "That subject isn't available in this exam system." },
        { status: 400 }
      );
    }

    const paper = await generatePracticePaper(subject, level, null, 8, curriculum.id);
    if (paper.questions.length > 8) paper.questions = paper.questions.slice(0, 8);

    void logApiUsage(null, "diagnostic_generate", paper.usage);

    const { usage: _u, ...payload } = paper;
    void _u;
    return NextResponse.json({ paper: payload });
  } catch (error) {
    console.error("Diagnostic generation error:", error);
    return NextResponse.json({ error: "Couldn't build your diagnostic. Please try again." }, { status: 500 });
  }
}
