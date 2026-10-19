import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { chatCompletion } from "@/lib/claude";
import { DAYS, FOCUS, MARKING, PRACTICE, type Days, type Focus, type Marking, type Practice } from "@/lib/onTrack";

// Public. The parent check's "describe how they study" step: a parent types a
// few honest sentences; this reads them into the four habits the verdict
// engine needs (days a week, timed practice vs re-reading, who marks it,
// weakest vs favourite topics) plus the specific things they mentioned, so
// the verdict can quote them back. Extraction only: nothing is invented, and
// anything not mentioned falls to the middle option. If the model fails, a
// keyword pass gives a rougher reading instead of an error.
export const dynamic = "force-dynamic";

export type Reading = {
  days: Days; practice: Practice; marking: Marking; focus: Focus;
  /** What the parent said, in 2–3 short plain lines. */
  observations: string[];
  /** Up to 3 fixes written for THIS teen, biggest lever first. */
  fixes: { title: string; why: string }[];
  source: "ai" | "keywords";
};

const pick = <T extends string>(v: unknown, allowed: readonly { id: T }[], fallback: T): T =>
  allowed.some((a) => a.id === v) ? (v as T) : fallback;

function keywordReading(text: string): Reading {
  const t = text.toLowerCase();
  const days: Days = /every ?day|daily|most nights|7 days|6 days/.test(t) ? "daily" : /4|5|four|five|most days/.test(t) ? "4-5" : /never|hardly|rarely|barely|once|1 day|one day|weekend only/.test(t) ? "0-1" : "2-3";
  const practice: Practice = /past paper|exam question|timed|practice question|practise question|mock/.test(t) ? (/notes|video|re-?read|highlight|flashcard/.test(t) ? "mixed" : "timed") : /notes|video|youtube|re-?read|highlight|flashcard|reads/.test(t) ? "notes" : "unsure";
  const marking: Marking = /tutor|teacher marks|gets marked|marked by/.test(t) ? "regular" : /nobody|no one|self|checks (it|them) (him|her)self|answers in the back/.test(t) ? "nobody" : "sometimes";
  const focus: Focus = /weak|hardest|struggl|worst/.test(t) ? "weakest" : /favourite|favorite|likes|enjoys|easy|good at/.test(t) ? "favourite" : "whatever";
  return { days, practice, marking, focus, observations: [], fixes: [], source: "keywords" };
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(`ontrack-read:${ip}`, 12, 60 * 60_000);
  if (!ok) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });

  try {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const text = typeof b.text === "string" ? b.text.trim().slice(0, 1200) : "";
    const teen = typeof b.teen === "string" ? b.teen.trim().slice(0, 40) || "the student" : "the student";
    const subject = typeof b.subject === "string" ? b.subject.trim().slice(0, 60) : "the subject";
    if (text.length < 8) return NextResponse.json({ error: "Tell us a little more." }, { status: 400 });

    const fallback = keywordReading(text);
    try {
      const prompt = `A parent describes how their teenager, ${teen}, studies ${subject}. Read it and return ONLY a JSON object, no prose.

Parent's words:
"""
${text}
"""

Return exactly this shape:
{
  "days": one of "0-1" | "2-3" | "4-5" | "daily"   — days per week they actually study this subject ("most nights"/"most days" = "4-5"; "every night" = "daily"; "once a week"/"weekends" = "0-1"); if not stated, "2-3",
  "practice": one of "timed" | "mixed" | "notes" | "unsure"   — "timed" = exam-style questions under time; "notes" = re-reading, videos, highlighting, flashcards; "mixed" = both; "unsure" if not stated,
  "marking": one of "regular" | "sometimes" | "nobody"   — who marks the practice work; "nobody" includes self-marking; "sometimes" if not stated,
  "focus": one of "weakest" | "whatever" | "favourite"   — what they spend time on; avoiding or skipping the hard topics = "favourite"; "whatever" if not stated,
  "observations": 2 or 3 short plain sentences (max 110 characters each) that restate ONLY what the parent actually said, in a calm, honest tone. No praise, no judgement, nothing invented.
  "fixes": up to 3 objects {"title": max 60 chars, "why": max 160 chars}, the specific changes that would most raise ${teen}'s grade GIVEN WHAT WAS WRITTEN, biggest lever first. Draw only from: timed exam questions instead of passive review; honest marking by someone other than themselves; starting with the weakest topics; short sessions on more days; a fixed plan to the exam date. Use the parent's own details (e.g. "the YouTube videos", "the Sunday cram"). If the habits described are already right, return fewer fixes or none.
}

Rules: never promise a grade; never claim anything the parent did not say; say "exam-style questions", never "past papers"; British/NZ spelling; plain words a busy parent reads in five seconds.`;
      const { text: raw } = await chatCompletion(prompt, { smart: false, maxTokens: 500, system: "You extract study habits from a parent's description into strict JSON. You never invent facts." });
      const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Record<string, unknown>;
      const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
      const reading: Reading = {
        days: pick(json.days, DAYS, fallback.days),
        practice: pick(json.practice, PRACTICE, fallback.practice),
        marking: pick(json.marking, MARKING, fallback.marking),
        focus: pick(json.focus, FOCUS, fallback.focus),
        observations: Array.isArray(json.observations) ? json.observations.map((o) => str(o, 140)).filter(Boolean).slice(0, 3) : [],
        fixes: Array.isArray(json.fixes) ? json.fixes.map((f) => { const o = (f ?? {}) as Record<string, unknown>; return { title: str(o.title, 70), why: str(o.why, 180) }; }).filter((f) => f.title).slice(0, 3) : [],
        source: "ai",
      };
      return NextResponse.json(reading);
    } catch (err) {
      console.error("On-track read: model failed, using keywords:", err);
      return NextResponse.json(fallback);
    }
  } catch (error) {
    console.error("On-track read route error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
