// Transactional email through Resend (raw fetch, like the rest of the app).
// Server-only.
//
// Every send has a `key` (e.g. "welcome:<childId>") that is claimed in
// email_log BEFORE sending, so a retried webhook or an overlapping cron run
// can never send the same email twice. If Resend fails the claim is released
// and the next run tries again. The same key goes to Resend as its
// Idempotency-Key, as a second lock.

import { getSupabase } from "./supabase";

const FROM = process.env.EMAIL_FROM || "StudyAce <hello@studyace.co>";
// Where parents' replies go (refund requests, questions). Must be a real inbox.
const REPLY_TO = process.env.EMAIL_REPLY_TO || "";

export type Email = { to: string; subject: string; html: string; text: string; key: string; template: string };
export type SendResult = "sent" | "duplicate" | "failed" | "not-configured";

export async function sendEmail(e: Email): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return "not-configured";
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase.from("email_log").insert({ key: e.key, template: e.template, to_email: e.to });
    if (error) {
      const code = (error as { code?: string }).code;
      if (code === "23505") return "duplicate";
      if (code !== "42P01") console.error("email_log claim failed:", error); // table missing: Resend's idempotency still holds
    }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}`, "Idempotency-Key": e.key.slice(0, 256) },
      body: JSON.stringify({ from: FROM, to: e.to, ...(REPLY_TO ? { reply_to: REPLY_TO } : {}), subject: e.subject, html: e.html, text: e.text, tags: [{ name: "template", value: e.template }] }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const id = ((await res.json().catch(() => ({}))) as { id?: string }).id ?? null;
    if (supabase) await supabase.from("email_log").update({ resend_id: id, sent_at: new Date().toISOString() }).eq("key", e.key);
    return "sent";
  } catch (err) {
    console.error(`email ${e.template} to ${e.to} failed:`, err);
    // Release the claim so the next run retries.
    if (supabase) await supabase.from("email_log").delete().eq("key", e.key).is("sent_at", null);
    return "failed";
  }
}

/** Has this email key already gone out? */
export async function emailSent(key: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data } = await supabase.from("email_log").select("key").eq("key", key).not("sent_at", "is", null).maybeSingle();
  return !!data;
}
