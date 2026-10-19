import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { logEvent } from "@/lib/supabase";
import { resolveCurriculum } from "@/data/curricula";
import { attributionFromRequest, attributionProps } from "@/lib/attributionServer";
import { GOALS, GRADES, type Verdict } from "@/lib/onTrack";

// Public. The parent check's email gate (/on-track): banks the parent as a
// lead (a `diagnostic_lead` event with kind "on-track", so it shows in
// /admin/leads and Pulse next to the grade-check leads) and emails them
// their teen's verdict via Resend (skipped silently if not configured).
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VERDICT_LABEL: Record<Verdict, string> = { on: "On track", borderline: "Borderline", off: "Not on track", hold: "Already there — now hold it", unknown: "Can't tell yet — no current grade" };
const VERDICT_COLOR: Record<Verdict, string> = { on: "#15803d", borderline: "#b45309", off: "#be123c", hold: "#0369a1", unknown: "#6d28d9" };
const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string));

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(`ontrack-email:${ip}`, 6, 60 * 60_000);
  if (!ok) return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });

  try {
    const b = (await request.json()) as Record<string, unknown>;
    const str = (k: string, max = 80) => (typeof b[k] === "string" ? (b[k] as string).trim().slice(0, max) : "");
    const num = (k: string) => (typeof b[k] === "number" && Number.isFinite(b[k]) ? (b[k] as number) : null);

    const email = str("email", 200).toLowerCase();
    if (!EMAIL_RE.test(email)) return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    const name = str("name");
    const teen = str("teen") || "your teen";
    const curriculum = resolveCurriculum(str("curriculum"));
    const subject = str("subject");
    const subjectLabel = curriculum.subjects.find((s) => s.value === subject)?.label ?? subject ?? "the subject";
    const current = (GRADES as readonly string[]).includes(str("current")) ? str("current") : "";
    const goal = GOALS.find((g) => g.id === str("goal"));
    const verdict = (str("verdict") in VERDICT_LABEL ? str("verdict") : "unknown") as Verdict;
    const weeks = num("weeks");
    const requiredHours = num("requiredHours");
    const effectiveHours = num("effectiveHours");
    const fixes = Array.isArray(b.fixes) ? (b.fixes as unknown[]).filter((f): f is string => typeof f === "string").slice(0, 3).map((f) => f.slice(0, 120)) : [];

    void logEvent("diagnostic_lead", null, {
      ...attributionProps(attributionFromRequest(request)),
      kind: "on-track",
      email,
      ...(name ? { name } : {}),
      teen,
      curriculum: curriculum.id,
      subject,
      current: current || null,
      goal: goal?.grade ?? null,
      verdict,
      examMonth: str("examMonth", 10),
      days: str("days", 10), practice: str("practice", 10), marking: str("marking", 10), focus: str("focus", 10),
      weeks, requiredHours, effectiveHours,
      bandLabel: VERDICT_LABEL[verdict],
    });

    const resendKey = process.env.RESEND_API_KEY;
    let emailed = false;
    if (resendKey) {
      try {
        const fixesHtml = fixes.map((f) => `<li style="margin:6px 0;">${esc(f)}</li>`).join("");
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "StudyAce <grades@studyace.co>",
            to: email,
            subject: `${esc(teen)} and ${subjectLabel}: ${VERDICT_LABEL[verdict]}`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111;">
                <h1 style="color:#4f46e5;">study<span style="color:#111">ace</span></h1>
                <p>${name ? `Hi ${esc(name)}, here's` : "Here's"} where <b>${esc(teen)}</b> stands in <b>${subjectLabel}</b>${goal ? ` against the goal of <b>${goal.grade}</b>` : ""}:</p>
                <div style="font-size:34px;font-weight:800;color:${VERDICT_COLOR[verdict]};margin:12px 0;">${VERDICT_LABEL[verdict]}</div>
                <p style="color:#555;">${[current && goal ? `${current} now → ${goal.grade} wanted` : "", weeks != null ? `${weeks} weeks to the exam` : "", requiredHours != null && verdict !== "unknown" ? `needs about ${requiredHours}h a week of marked practice` : "", effectiveHours != null ? `currently about ${effectiveHours}h a week that counts` : ""].filter(Boolean).join(" · ")}</p>
                ${fixesHtml ? `<p><b>What changes the answer:</b></p><ol>${fixesHtml}</ol>` : ""}
                <p>StudyAce does all of that, every day: a plan to the exam, timed ${esc(curriculum.system)} questions, every answer marked honestly, and a pace line so you see whether ${esc(teen)} is heading for the grade before the report does.</p>
                <p style="margin-top:24px;">
                  <a href="https://studyace.co/pricing" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">Start ${esc(teen)}'s plan →</a>
                </p>
                <p style="margin-top:16px;">Not sure of the current grade? ${esc(teen)} can sit the free 2-minute grade check: <a href="https://studyace.co/grade">studyace.co/grade</a></p>
                <p style="color:#999;font-size:12px;margin-top:24px;">A rule of thumb from what you told us, not a measurement. No app can promise a grade. studyace.co</p>
              </div>
            `,
          }),
        });
        emailed = r.ok;
        if (!r.ok) console.error("On-track email send failed:", r.status, await r.text().catch(() => ""));
      } catch (err) {
        console.error("On-track email send error:", err);
      }
    }
    return NextResponse.json({ ok: true, emailed });
  } catch (error) {
    console.error("On-track email route error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
