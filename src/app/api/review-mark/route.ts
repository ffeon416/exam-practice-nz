import { NextRequest, NextResponse } from "next/server";
import { chatCompletion, markAnswer } from "@/lib/claude";
import { rateLimit } from "@/lib/rateLimit";
import { checkTier } from "@/lib/checkTier";
import { resolveCurriculum } from "@/data/curricula";

// Marks one review answer, honestly (same marker as every paper), then
// explains the model answer as two or three steps with a tick or a cross
// against each depending on whether the student's answer showed it.

type Step = { title: string; detail: string; hit: boolean };

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(ip, 20, 60_000).ok) return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const { userId, tier } = await checkTier();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (tier === "free") return NextResponse.json({ error: "paid_only" }, { status: 403 });

  let body: { questionText?: string; markingGuide?: string; expectedAnswer?: string; answerType?: string; answer?: string; curriculum?: string } = {};
  try { body = await request.json(); } catch {}
  const clean = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");
  const questionText = clean(body.questionText, 3000), markingGuide = clean(body.markingGuide, 2000), expectedAnswer = clean(body.expectedAnswer, 1000), answer = clean(body.answer, 2000);
  if (!questionText) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const c = resolveCurriculum(body.curriculum);

  let marksAwarded = 0, maxMarks = 2, feedback = "";
  try {
    const m = await markAnswer({ questionText, markingGuide: markingGuide || expectedAnswer, answerType: body.answerType, studentAnswer: answer, curriculumId: c.id });
    marksAwarded = m.marksAwarded; maxMarks = m.maxMarks; feedback = m.feedback;
  } catch (error) {
    console.error("review-mark: markAnswer failed", error);
  }

  const prompt = `You are a ${c.system} examiner in ${c.countryLabel}. A student is reviewing a question they previously dropped marks on.

Question: ${questionText}
Model answer: ${expectedAnswer || "(see marking guide)"}
Marking guide: ${markingGuide || "(none)"}
Student's answer this time: ${answer || "(blank)"}
Marks awarded this time: ${marksAwarded}/${maxMarks}${feedback ? `\nExaminer feedback: ${feedback}` : ""}

Return JSON only, no prose, exactly this shape:
{"headline": "<the final answer in at most 6 words, with units, e.g. '2,000 litres of milk' or 'x = 4'>",
 "steps": [{"title": "<2-4 word step name>", "detail": "<one sentence: what the step is, with the numbers or the point>", "hit": <true if the student's answer this time clearly showed this step, else false>}]}

Rules: two or three steps, in the order a student would do them. The last step is usually stating the answer properly (units, wording). Be strict and honest about "hit": a blank or hedged answer hits nothing. Facts and arithmetic must be correct. ${c.countryLabel} context only.`;

  let headline = expectedAnswer || "See the marking guide";
  let steps: Step[] = [];
  try {
    const { text } = await chatCompletion(prompt, { smart: false, maxTokens: 500 });
    const json = text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
    const parsed = JSON.parse(json) as { headline?: unknown; steps?: unknown };
    if (typeof parsed.headline === "string" && parsed.headline.trim()) headline = parsed.headline.trim().slice(0, 80);
    if (Array.isArray(parsed.steps)) {
      steps = parsed.steps.slice(0, 3).map((s) => ({ title: clean((s as Step)?.title, 60), detail: clean((s as Step)?.detail, 240), hit: !!(s as Step)?.hit && answer.length > 0 })).filter((s) => s.title);
    }
  } catch (error) {
    console.error("review-mark: steps failed", error);
  }
  if (steps.length === 0) steps = [{ title: "Model answer", detail: expectedAnswer || markingGuide || "See the marking guide.", hit: marksAwarded >= maxMarks && maxMarks > 0 }];

  return NextResponse.json({ marksAwarded, maxMarks, headline, steps, feedback });
}
