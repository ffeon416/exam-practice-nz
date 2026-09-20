// Link a paid Stripe subscription to a Clerk account.
//
// Since 2026-09-20 nobody can create an account without paying: checkout is
// anonymous (Stripe collects the email), then the buyer creates their login
// on /start. This is the glue — find the subscription that belongs to this
// email (or this checkout session) and attach it to the new user. Idempotent.

import type Stripe from "stripe";
import { getStripe } from "./stripe";
import { getSupabase, logEvent, claimReferral } from "./supabase";

type PaidTier = "pro" | "student";

const recent = new Map<string, number>();

async function attach(userId: string, email: string | null, sub: Stripe.Subscription, ref?: string | null): Promise<PaidTier> {
  const stripe = getStripe()!;
  const supabase = getSupabase()!;
  const tier: PaidTier = sub.metadata?.tier === "student" ? "student" : "pro";
  const periodEnd = sub.items.data[0]?.current_period_end;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  await supabase.from("profiles").upsert(
    {
      user_id: userId,
      ...(email ? { email } : {}),
      tier,
      stripe_customer_id: customerId,
      stripe_subscription_id: sub.id,
      subscription_status: sub.status,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  // Tag Stripe so future webhooks (renewals, cancellations) map to this user.
  if (sub.metadata?.userId !== userId) {
    await stripe.subscriptions.update(sub.id, { metadata: { ...sub.metadata, userId, tier } }).catch(() => {});
    await stripe.customers.update(customerId, { metadata: { userId } }).catch(() => {});
  }
  if (ref && ref !== userId) {
    try { await claimReferral(userId, ref); } catch {}
  }
  void logEvent("subscription_paid", userId, { plan: tier, claimed: true });
  return tier;
}

/**
 * Try to claim a purchase for this user. Returns the tier attached, or null
 * when nothing paid is waiting for this email / session.
 */
export async function claimPurchase(opts: { userId: string; email: string | null; sessionId?: string | null }): Promise<PaidTier | null> {
  const stripe = getStripe();
  const supabase = getSupabase();
  if (!stripe || !supabase) return null;
  const { userId, email, sessionId } = opts;

  // 1. Exact: the checkout session they were just redirected from.
  if (sessionId) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ["subscription"] });
      const sub = session.subscription;
      if (session.payment_status === "paid" && sub && typeof sub !== "string") {
        const owner = sub.metadata?.userId;
        if (!owner || owner === userId) {
          const sessionEmail = session.customer_details?.email ?? session.customer_email ?? email;
          return attach(userId, sessionEmail, sub, session.metadata?.ref ?? null);
        }
      }
    } catch (err) {
      console.error("claimPurchase: session lookup failed", err);
    }
  }

  // 2. By email: an active subscription on a customer with this email that
  //    no account has claimed yet.
  if (!email) return null;
  const key = `${userId}:${email}`;
  const last = recent.get(key) ?? 0;
  if (Date.now() - last < 20_000) return null; // don't hammer Stripe on every request
  recent.set(key, Date.now());
  try {
    const customers = await stripe.customers.list({ email, limit: 10 });
    for (const c of customers.data) {
      const subs = await stripe.subscriptions.list({ customer: c.id, status: "active", limit: 5 });
      const sub = subs.data.find((s) => !s.metadata?.userId || s.metadata.userId === userId);
      if (sub) return attach(userId, email, sub, null);
    }
  } catch (err) {
    console.error("claimPurchase: email lookup failed", err);
  }
  return null;
}
