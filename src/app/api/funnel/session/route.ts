import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { isCheckoutSessionId, parentSignInTicket, provisionFromCheckout } from "@/lib/funnelProvision";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// GET /api/funnel/session?id=cs_...   (the /invite page, straight after Stripe)
//   Makes sure the parent account + child profile exist (same idempotent step
//   as the webhook) and, if the browser isn't signed in as that parent yet,
//   returns a one-time Clerk sign-in ticket so they land signed in with no
//   password. The checkout session id is the proof of purchase, so tickets are
//   only issued for a short window after checkout and a limited number of times.
//
// GET /api/funnel/session   (signed in, no id)
//   The signed-in parent's children — for coming back to /invite later.

const TICKET_WINDOW_SECONDS = 2 * 60 * 60;
const MAX_TICKETS = 5;

type Child = { id: string; firstName: string };

async function childrenOf(parentUserId: string): Promise<Child[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("child_profiles")
    .select("id, first_name")
    .eq("parent_user_id", parentUserId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((c) => ({ id: c.id as string, firstName: c.first_name as string }));
}

/** Count a ticket against this checkout; false once the limit is reached. */
async function takeTicket(checkoutSessionId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return true;
  const { data, error } = await supabase
    .from("child_profiles")
    .select("id, parent_tickets_issued")
    .eq("checkout_session_id", checkoutSessionId)
    .maybeSingle();
  if (error || !data) return true; // table/column not there yet: the time window still applies
  const used = (data.parent_tickets_issued as number | null) ?? 0;
  if (used >= MAX_TICKETS) return false;
  const { data: bumped } = await supabase
    .from("child_profiles")
    .update({ parent_tickets_issued: used + 1 })
    .eq("id", data.id)
    .eq("parent_tickets_issued", used)
    .select("id");
  return !!bumped?.length;
}

export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`funnel-session:${ip}`, 30, 60_000).ok) {
    return NextResponse.json({ error: "Too many tries. Wait a minute." }, { status: 429 });
  }
  const { userId } = await auth();
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
    return NextResponse.json({ signedIn: true, children: await childrenOf(userId) });
  }
  if (!isCheckoutSessionId(id)) return NextResponse.json({ error: "That link isn't right." }, { status: 400 });

  let done;
  try {
    done = await provisionFromCheckout(id);
  } catch (err) {
    console.error("funnel/session provision failed:", err);
    return NextResponse.json({ error: "We're still setting things up. Try again in a moment.", retry: true }, { status: 503 });
  }
  if (!done) return NextResponse.json({ error: "We couldn't find that checkout.", retry: true }, { status: 404 });

  const children = await childrenOf(done.parentUserId);
  const base = {
    childFirstName: done.childFirstName,
    children,
    trialEnd: done.trialEnd,
    // Shown so the parent knows where sign-in codes go; it's their own email.
    email: done.email,
  };

  if (userId === done.parentUserId) return NextResponse.json({ ...base, signedIn: true });

  // Signed out (or signed in as someone else): a ticket, if still in the window.
  const fresh = Date.now() / 1000 - done.checkoutCreated < TICKET_WINDOW_SECONDS;
  const ticket = fresh && (await takeTicket(id)) ? await parentSignInTicket(done.parentUserId) : null;
  return NextResponse.json({ ...base, signedIn: false, signedInAsOther: !!userId, ticket });
}
