import { NextRequest, NextResponse } from "next/server";
import { chatCompletion } from "@/lib/claude";
import { rateLimit } from "@/lib/rateLimit";
import { checkTier } from "@/lib/checkTier";
import { resolveCurriculum } from "@/data/curricula";

// A review lesson: built from the questions this student actually dropped
// marks on, in their own exam system. Teaches the two or three ideas behind
// those mistakes, then hands them to a short paper on exactly that.

type Mistake = { question: string; yourAnswer: string; feedback: string; correctApproach: string; marks: string };

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(ip, 6, 60_000).ok) return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });

  const { userId, tier } = await checkTier();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (tier === "free") return NextResponse.json({ error: "paid_only" }, { status: 403 });

  let body: { curriculum?: string; year?: number; subject?: string; weakLabel?: string | null; mistakes?: Mistake[] } = {};
  try { body = await request.json(); } catch {}
  const c = resolveCurriculum(body.curriculum);
  const year = Number(body.year);
  const level = c.levels.find((l) => l.value === year);
  const subject = c.subjects.find((s) => s.value === body.subject);
  if (!level || !subject) return NextResponse.json({ error: "invalid_subject" }, { status: 400 });
  const clean = (s: unknown, n: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "");
  const mistakes: Mistake[] = (Array.isArray(body.mistakes) ? body.mistakes : []).slice(0, 6).map((m) => ({
    question: clean(m?.question, 600), yourAnswer: clean(m?.yourAnswer, 300), feedback: clean(m?.feedback, 400), correctApproach: clean(m?.correctApproach, 500), marks: clean(m?.marks, 12),
  })).filter((m) => m.question);
  const weakLabel = clean(body.weakLabel, 80) || null;
  if (mistakes.length === 0 && !weakLabel) return NextResponse.json({ error: "nothing_to_review" }, { status: 400 });

  const list = mistakes.map((m, i) => `${i + 1}. Question: ${m.question}\n   Their answer: ${m.yourAnswer || "(blank)"}\n   Marks: ${m.marks || "0"}\n   Examiner feedback: ${m.feedback}\n   Full-marks approach: ${m.correctApproach}`).join("\n\n");

  const prompt = `You are a ${c.system} tutor in ${c.countryLabel} teaching a ${level.promptDescriptor} ${subject.label} student one to one.

HARD RULE — LOCATION: this student sits ${c.system} in ${c.countryLabel}. Every example, place, currency, institution and syllabus reference must belong to ${c.countryLabel}.${c.id === "nz-ncea" ? "" : " Never mention New Zealand, NCEA or any other country's exam system."}

${mistakes.length ? `Here are the recent ${subject.label} questions they dropped marks on, with what they wrote and what the examiner said:\n\n${list}` : `Their weakest area in ${subject.label} right now: ${weakLabel}.`}
${weakLabel && mistakes.length ? `\nTheir weakest area overall: ${weakLabel}.` : ""}

Write ONE focused review lesson that turns these mistakes into strengths. Find the two or three underlying ideas or methods behind the mistakes (not a fix per question) and teach those. Do not re-answer the questions above; they'll sit a fresh paper on this straight after.

═══ ACCURACY IS NON-NEGOTIABLE ═══
Real student, real exam. Re-check every formula, fact and worked step before you answer. If a worked example comes out messy or wrong, pick different numbers and redo it silently. No hedging, no "wait", no "actually".

═══ FORMAT (markdown, use exactly these headings) ═══
## What's costing you marks
Two to four bullets. Name the pattern in their answers plainly and without shame (e.g. "You give the answer but not the working, so you lose the working mark every time").
## The method
A numbered list, three to six steps, that they can run on any question of this type.
## Worked example
One example with clean numbers or a clear scenario from ${c.countryLabel}, showing every step and how an examiner marks it.
## Watch out for
Two or three bullets: the traps in their own answers above.
## Now try it
One or two sentences: they're about to sit a short paper on exactly this. Tell them what to do differently this time.

═══ STYLE ═══
Straight-talking, warm, like a good older sibling who's done this exam. Short sentences. Simple words. Bold (**like this**) only for the key term in a step. Around 350 words. No preamble, start at the first heading.`;

  try {
    const { text } = await chatCompletion(prompt, { smart: true, maxTokens: 1800 });
    return NextResponse.json({ lesson: text.trim() });
  } catch (error) {
    console.error("lesson failed:", error);
    return NextResponse.json({ error: "lesson_failed" }, { status: 500 });
  }
}
