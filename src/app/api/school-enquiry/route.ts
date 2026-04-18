import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type EnquiryBody = {
  name: string;
  email: string;
  school: string;
  role?: string;
  students?: string;
  message?: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EnquiryBody;
    const { name, email, school, role, students, message } = body;

    // Validate required fields
    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "Name is required." },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!school || !school.trim()) {
      return NextResponse.json(
        { error: "School name is required." },
        { status: 400 }
      );
    }

    const enquiry = {
      name: name.trim(),
      email: email.trim(),
      school: school.trim(),
      role: role?.trim() || null,
      students: students?.trim() || null,
      message: message?.trim() || null,
    };

    // 1. Store in Supabase (if configured)
    const supabase = getSupabase();
    if (supabase) {
      const { error: dbError } = await supabase
        .from("school_enquiries")
        .insert(enquiry);
      if (dbError) {
        console.error("[SCHOOL ENQUIRY] Supabase insert failed:", dbError.message);
      }
    }

    // 2. Send notification email via Resend (if configured)
    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.NOTIFY_EMAIL;
    if (resendKey && notifyEmail) {
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "StudyAce <noreply@studyace.co.nz>",
            to: notifyEmail,
            subject: `New school enquiry from ${enquiry.name} at ${enquiry.school}`,
            html: `
              <h2>New School Enquiry</h2>
              <table style="border-collapse:collapse;font-family:sans-serif;">
                <tr><td style="padding:6px 12px;font-weight:bold;">Name</td><td style="padding:6px 12px;">${enquiry.name}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;">Email</td><td style="padding:6px 12px;"><a href="mailto:${enquiry.email}">${enquiry.email}</a></td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;">School</td><td style="padding:6px 12px;">${enquiry.school}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;">Role</td><td style="padding:6px 12px;">${enquiry.role || "—"}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;">Students</td><td style="padding:6px 12px;">${enquiry.students || "—"}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;">Message</td><td style="padding:6px 12px;">${enquiry.message || "—"}</td></tr>
              </table>
            `,
          }),
        });
      } catch (emailErr) {
        console.error("[SCHOOL ENQUIRY] Email send failed:", emailErr);
      }
    }

    // 3. Always log as backup
    console.log(
      `[SCHOOL ENQUIRY] ${enquiry.name} | ${enquiry.email} | ${enquiry.school} | Role: ${enquiry.role || "N/A"} | Students: ${enquiry.students || "N/A"} | Message: ${enquiry.message || "N/A"}`
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Please try again." },
      { status: 400 }
    );
  }
}
