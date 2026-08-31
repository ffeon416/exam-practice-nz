import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { logEvent } from "@/lib/supabase";
import { resolveCurriculum } from "@/data/curricula";

// Public. The Grade Detector's email gate: anonymous visitors type their
// email here to reveal + receive their estimated grade. Sends via Resend
// (optional — skips silently if RESEND_API_KEY isn't configured, same
// convention as /api/contact) and always logs a "diagnostic_lead" event so
// these show up as a lead list in /admin even before anyone signs up.
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { ok } = rateLimit(`diag-email:${ip}`, 6, 60 * 60_000);
  if (!ok) {
    return NextResponse.json({ error: "Too many requests. Please try again shortly." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { email, name, curriculum: curriculumId, subject, bandLabel, pct, weakTopics, leadOnly, skipLead } = body as {
      email?: string;
      name?: string;
      curriculum?: string;
      subject?: string;
      bandLabel?: string;
      pct?: number;
      weakTopics?: string[];
      leadOnly?: boolean;
      skipLead?: boolean;
    };

    const cleanEmail = (email ?? "").trim().toLowerCase().slice(0, 200);
    if (!EMAIL_RE.test(cleanEmail)) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    const cleanName = (name ?? "").trim().slice(0, 80);

    const curriculum = resolveCurriculum(curriculumId);
    const subjectLabel = curriculum.subjects.find((s) => s.value === subject)?.label ?? subject ?? "your exam";

    // Lead capture — logged regardless of whether the email send below is
    // configured. skipLead=true marks a report send whose lead was already
    // banked at the wizard's contact step (avoids duplicate lead rows).
    if (!skipLead) void logEvent("diagnostic_lead", null, {
      email: cleanEmail,
      ...(cleanName ? { name: cleanName } : {}),
      curriculum: curriculum.id,
      subject,
      bandLabel,
      pct,
    });

    // leadOnly: the grade check captures the email mid-flow, before marking
    // finishes. If marking then fails, the client still banks the lead here
    // without sending a report email that has no grade in it.
    if (leadOnly === true) {
      return NextResponse.json({ ok: true, emailed: false });
    }

    const resendKey = process.env.RESEND_API_KEY;
    let emailed = false;
    if (resendKey) {
      try {
        const topicsHtml = (weakTopics ?? []).slice(0, 3)
          .map((t) => `<li>${t}</li>`).join("");
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendKey}` },
          body: JSON.stringify({
            from: "StudyAce <grades@studyace.co>",
            to: cleanEmail,
            subject: `Your estimated grade: ${bandLabel ?? "—"} (${subjectLabel})`,
            html: `
              <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
                <h1 style="color:#4f46e5;">study<span style="color:#111">ace</span></h1>
                <p>${cleanName ? `Hey ${cleanName.replace(/[<>&"]/g, "")} — here's` : "Here's"} what you'd get if you sat <b>${subjectLabel}</b> today:</p>
                <div style="font-size:48px;font-weight:800;color:#4f46e5;margin:12px 0;">${bandLabel ?? "—"}</div>
                <p style="color:#555;">${typeof pct === "number" ? pct + "% on today's diagnostic" : ""}</p>
                ${topicsHtml ? `<p><b>Your weakest topics right now:</b></p><ul>${topicsHtml}</ul>` : ""}
                <p style="margin-top:24px;">
                  <a href="https://studyace.co/sign-up" style="background:#4f46e5;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700;">
                    Build my schedule to the top grade →
                  </a>
                </p>
                <p style="color:#999;font-size:12px;margin-top:24px;">This is an honest estimate from a short diagnostic, not a guarantee. studyace.co</p>
              </div>
            `,
          }),
        });
        emailed = r.ok;
        if (!r.ok) console.error("Diagnostic email send failed:", r.status, await r.text().catch(() => ""));
      } catch (err) {
        console.error("Diagnostic email send error:", err);
      }
    }

    return NextResponse.json({ ok: true, emailed });
  } catch (error) {
    console.error("Diagnostic email route error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
