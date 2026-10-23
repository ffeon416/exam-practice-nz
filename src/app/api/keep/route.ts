import { NextRequest, NextResponse } from "next/server";
import { readKeepLink } from "@/lib/emailLinks";
import { getStripe } from "@/lib/stripe";
import { getSupabase, logEvent } from "@/lib/supabase";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// "Keep the plan going" from the day-5 email: the parent opts out of the
// auto-cancel promise ("charge me on day 7 anyway").
//   POST { t, action: "info" } → what it means
//   POST { t, action: "keep" } → record the choice
// Recorded on the Stripe subscription first (keep_opt_in = "1", which every
// promise layer reads even if our database is down), then in
// child_profiles.keep_opt_in_at, and logged. Opening the link alone does nothing.

const dateLabel = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }) : null;

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`keep:${ip}`, 30, 10 * 60_000).ok) return NextResponse.json({ error: "Too many tries. Wait a few minutes." }, { status: 429 });
  const body = (await req.json().catch(() => ({}))) as { t?: unknown; action?: unknown };
  let link: ReturnType<typeof readKeepLink> = null;
  try { link = typeof body.t === "string" ? readKeepLink(body.t) : null; } catch { link = null; }
  if (!link) return NextResponse.json({ error: "This link has expired." }, { status: 400 });

  const stripe = getStripe();
  const supabase = getSupabase();
  if (!stripe || !supabase) return NextResponse.json({ error: "Not available right now. Try again in a minute." }, { status: 503 });

  let sub;
  try { sub = await stripe.subscriptions.retrieve(link.subscriptionId); } catch { return NextResponse.json({ error: "We couldn't find that plan." }, { status: 404 }); }
  if (sub.metadata?.userId && sub.metadata.userId !== link.parentUserId) return NextResponse.json({ error: "This link isn't right." }, { status: 403 });

  const { data: child } = await supabase.from("child_profiles").select("id, first_name, grade_check_completed_at").eq("stripe_subscription_id", sub.id).limit(1).maybeSingle();
  const childName = (child?.first_name as string | undefined) ?? "your child";
  const info = {
    childName,
    trialEnds: dateLabel(sub.trial_end),
    kept: sub.metadata?.keep_opt_in === "1",
    gradeCheckDone: !!child?.grade_check_completed_at,
    ended: sub.status === "canceled" || sub.status === "incomplete_expired",
    parentCancelled: sub.cancel_at_period_end,
    trialing: sub.status === "trialing",
  };

  if (body.action !== "keep") return NextResponse.json(info);
  if (info.ended) return NextResponse.json({ ...info, error: `${childName}'s free week has already ended. You can start a plan any time from the homepage.` }, { status: 409 });
  if (info.parentCancelled) return NextResponse.json({ ...info, error: `You've cancelled ${childName}'s free week. To carry on, start a plan from the homepage after it ends.` }, { status: 409 });
  if (!info.trialing) return NextResponse.json({ ...info, kept: true });
  if (info.kept) return NextResponse.json(info);

  const at = new Date().toISOString();
  await stripe.subscriptions.update(sub.id, { metadata: { ...sub.metadata, keep_opt_in: "1", keep_opt_in_at: at } });
  if (child?.id) {
    const { error } = await supabase.from("child_profiles").update({ keep_opt_in_at: at }).eq("id", child.id);
    if (error) console.error("keep_opt_in_at save failed (Stripe metadata still holds it):", error);
  }
  void logEvent("keep_opt_in", link.parentUserId, { sub: sub.id, child: child?.id ?? null, grade_check_done: info.gradeCheckDone });
  return NextResponse.json({ ...info, kept: true });
}
