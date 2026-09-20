// Clerk invitations = the free way to make sign-ups paid-only.
//
// The Clerk instance runs in "Restricted" sign-up mode (dashboard setting),
// so an account can only be created with an invitation ticket. We invite the
// email the moment Stripe confirms payment; /start walks the buyer through
// the ticket link so the sign-up form is pre-bound to the email they paid
// with. Nobody else can create an account anywhere — including the hosted
// Clerk pages and the Google button on sign-in.

const API = "https://api.clerk.com/v1";

function headers() {
  const key = process.env.CLERK_SECRET_KEY;
  if (!key) return null;
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_URL || "https://studyace.co").replace(/\/$/, "");
}

/** Does a Clerk user with this email already exist? */
export async function clerkUserExists(email: string): Promise<boolean> {
  const h = headers();
  if (!h) return false;
  try {
    const res = await fetch(`${API}/users?email_address=${encodeURIComponent(email)}&limit=1`, { headers: h, cache: "no-store" });
    if (!res.ok) return false;
    const data = (await res.json()) as unknown[];
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}

/**
 * Find the pending invitation for this email, or create one. Returns the
 * ticket URL the buyer follows to create their login (lands back on /start
 * with __clerk_ticket appended), or null if Clerk is unavailable.
 */
export async function inviteEmail(email: string, sessionId: string, notify = false): Promise<string | null> {
  const h = headers();
  if (!h) return null;
  const redirect = `${siteUrl()}/start?session_id=${encodeURIComponent(sessionId)}`;
  try {
    const list = await fetch(`${API}/invitations?status=pending&query=${encodeURIComponent(email)}&limit=5`, { headers: h, cache: "no-store" });
    if (list.ok) {
      const rows = (await list.json()) as { email_address?: string; url?: string }[];
      const hit = Array.isArray(rows) ? rows.find((r) => r.email_address?.toLowerCase() === email.toLowerCase() && r.url) : null;
      if (hit?.url) return hit.url;
    }
    const res = await fetch(`${API}/invitations`, {
      method: "POST",
      headers: h,
      body: JSON.stringify({ email_address: email, redirect_url: redirect, notify, ignore_existing: true }),
    });
    if (!res.ok) {
      console.error("Clerk invitation failed:", res.status, await res.text());
      return null;
    }
    const inv = (await res.json()) as { url?: string };
    return inv.url ?? null;
  } catch (err) {
    console.error("Clerk invitation error:", err);
    return null;
  }
}
