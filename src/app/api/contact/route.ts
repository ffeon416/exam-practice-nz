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

    // Store in Supabase — the success of this call is what determines whether
    // the message survives. Email notification is a nice-to-have on top.
    let stored = false;
    const supabase = getSupabase();
    if (supabase) {
      const { error: dbError } = await supabase
        .from("contact_messages")
        .insert(contact);
      if (dbError) {
        console.error("[CONTACT] Supabase insert failed:", dbError.message);
      } else {
        stored = true;
      }
    }

    // Email notification is handled client-side from the contact form (the
    // browser POSTs directly to FormSubmit). Server-side calls get blocked by
    // Cloudflare when they originate from Vercel's data-center IPs.

    // Send notification email via Resend (optional — skip silently if not configured)
    const resendKey = process.env.RESEND_API_KEY;
    const notifyEmail = process.env.NOTIFY_EMAIL;
    if (resendKey && notifyEmail) {
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "StudyAce <onboarding@resend.dev>",
            to: notifyEmail,
            reply_to: contact.email,
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
        if (!r.ok) {
          console.error("[CONTACT] Resend responded", r.status, await r.text().catch(() => ""));
        }
      } catch (emailErr) {
        console.error("[CONTACT] Email send failed:", emailErr);
      }
    }

    console.log(
      `[CONTACT] stored=${stored} | ${contact.type} | ${contact.name} | ${contact.email} | ${contact.message.slice(0, 100)}`
    );

    // Only claim success if the message actually landed somewhere durable.
    if (!stored) {
      return NextResponse.json(
        { error: "Couldn't save your message right now. Please email us directly at ffeon.io@gmail.com." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request. Please try again." },
      { status: 400 }
    );
  }
}
