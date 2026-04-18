import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type ContactBody = {
  name: string;
  email: string;
  type?: string;
  message: string;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ContactBody;
    const { name, email, type, message } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required." }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (!message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const contact = {
      name: name.trim(),
      email: email.trim(),
      type: type?.trim() || "general",
      message: message.trim(),
    };

    // Store in Supabase
    const supabase = getSupabase();
    if (supabase) {
      const { error: dbError } = await supabase
        .from("contact_messages")
        .insert(contact);
      if (dbError) {
        console.error("[CONTACT] Supabase insert failed:", dbError.message);
      }
    }

    // Send notification email via Resend
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
            subject: `[${contact.type}] New message from ${contact.name}`,
            html: `
              <h2>New Contact Message</h2>
              <table style="border-collapse:collapse;font-family:sans-serif;">
                <tr><td style="padding:6px 12px;font-weight:bold;">Name</td><td style="padding:6px 12px;">${contact.name}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;">Email</td><td style="padding:6px 12px;"><a href="mailto:${contact.email}">${contact.email}</a></td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;">Type</td><td style="padding:6px 12px;">${contact.type}</td></tr>
                <tr><td style="padding:6px 12px;font-weight:bold;">Message</td><td style="padding:6px 12px;">${contact.message}</td></tr>
              </table>
            `,
          }),
        });
      } catch (emailErr) {
        console.error("[CONTACT] Email send failed:", emailErr);
      }
    }

    console.log(
      `[CONTACT] ${contact.type} | ${contact.name} | ${contact.email} | ${contact.message.slice(0, 100)}`
    );

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Please try again." },
      { status: 400 }
    );
  }
}
