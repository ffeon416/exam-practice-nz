import { NextRequest, NextResponse } from "next/server";
import { readCancelLink } from "@/lib/emailLinks";
import { getStripe } from "@/lib/stripe";
import { getSupabase, logEvent } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { parentCancelledEmail } from "@/lib/funnelEmails";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// One-click cancel from an email link (/cancel?t=…).
//   POST { t, action: "info" }   → what would be cancelled
//   POST { t, action: "cancel" } → cancel it
// Opening the link never cancels anything (email scanners pre-open links):
// it takes the tap on the page's button. Either way it's cancel_at_period_end:
// during the free week the child keeps access to its end and Stripe ends the
// subscription then WITHOUT raising a bill (proved in npm run verify:promise);
// after that it stops renewing and access lasts to the end of the paid period.

const dateLabel = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : null;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`cancel:${ip}`, 30, 10 * 60_000).ok) return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { t?: unknown; action?: unknown };
  let link: ReturnType<typeof readCancelLink> = null;
  try { link = typeof body.t === "string" ? readCancelLink(body.t) : null; } catch { link = null; }
  if (!link) return NextResponse.json({ error: "This link has expired. Sign in and cancel from your profile, or reply to any of our emails.", expired: true }, { status: 400 });

  const stripe = getStripe();
  const supabase = getSupabase();
  if (!stripe || !supabase) return NextResponse.json({ error: "Not available right now. Try again in a minute." }, { status: 503 });

  let sub;
  try { sub = await stripe.subscriptions.retrieve(link.subscriptionId); } catch { return NextResponse.json({ error: "We couldn't find that plan." }, { status: 404 }); }
  // The link must belong to the parent this subscription belongs to.
  if (sub.metadata?.userId && sub.metadata.userId !== link.parentUserId) return NextResponse.json({ error: "This link isn't right." }, { status: 403 });

  const { data: child } = await supabase.from("child_profiles").select("first_name").eq("stripe_subscription_id", sub.id).limit(1).maybeSingle();
  const childName = (child?.first_name as string | undefined) ?? "your child";
  const duringTrial = sub.status === "trialing";
  const periodEnd = sub.items.data[0]?.current_period_end ?? null;
  const ended = sub.status === "canceled" || sub.status === "incomplete_expired";
  const info = {
    childName,
    duringTrial,
    alreadyCancelled: ended || sub.cancel_at_period_end,
    trialEnds: dateLabel(sub.trial_end),
    accessUntil: duringTrial ? dateLabel(sub.trial_end) : dateLabel(periodEnd),
  };

  if (body.action !== "cancel") return NextResponse.json(info);
  if (info.alreadyCancelled) return NextResponse.json({ ...info, cancelled: true });

  await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
  void logEvent("parent_cancelled", link.parentUserId, { sub: sub.id, during_trial: duringTrial, via: "email_link" });

  const { data: parent } = await supabase.from("profiles").select("email").eq("user_id", link.parentUserId).maybeSingle();
  if (parent?.email) {
    const e = parentCancelledEmail({ childName, duringTrial, accessUntil: info.accessUntil });
    await sendEmail({ to: parent.email as string, ...e, key: `usercancel:${sub.id}`, template: "parent_cancelled" });
  }
  return NextResponse.json({ ...info, cancelled: true, alreadyCancelled: true });
}
