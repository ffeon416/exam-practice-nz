// One free week per person. Server-only.
//
// A trial is a repeat if the same email OR the same card (Stripe's card
// fingerprint, which stays the same across emails) has had one before. Email
// and card are only known once Stripe Checkout is done, so a repeat trial is
// caught right after checkout and cancelled before anything can be charged;
// the parent then sees "You've already had your free week" on /invite and
// chooses whether to start a paid plan. Nobody is ever charged silently.
//
// A browser that has already had a free week (cookie sa_trial) or a signed-in
// parent who has, gets the same message BEFORE going to Stripe.

import type Stripe from "stripe";
import { getSupabase } from "./supabase";

export const TRIAL_COOKIE = "sa_trial";

export type TrialRow = { email: string | null; card_fingerprint: string | null; stripe_subscription_id: string };

/** Pure: does any earlier trial share this email or card? */
export function isRepeatTrial(rows: TrialRow[], me: { email: string | null; fingerprint: string | null; subscriptionId: string }): boolean {
  const email = me.email?.trim().toLowerCase() || null;
  return rows.some(
    (r) =>
      r.stripe_subscription_id !== me.subscriptionId &&
      ((!!email && r.email?.toLowerCase() === email) || (!!me.fingerprint && r.card_fingerprint === me.fingerprint))
  );
}

/** The card behind a subscription (works for Apple Pay / Google Pay too). */
export async function cardFingerprint(stripe: Stripe, sub: Stripe.Subscription): Promise<string | null> {
  try {
    let pm = sub.default_payment_method;
    if (!pm) {
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const list = await stripe.paymentMethods.list({ customer: customerId, limit: 1 });
      pm = list.data[0] ?? null;
    }
    if (!pm) return null;
    const full = typeof pm === "string" ? await stripe.paymentMethods.retrieve(pm) : pm;
    return full.card?.fingerprint ?? null;
  } catch (err) {
    console.error("trialGuard: fingerprint lookup failed", err);
    return null;
  }
}

/**
 * Record this trial and say whether it's a repeat. Idempotent per
 * subscription. If the history table isn't there yet it fails open (the
 * free week goes ahead) and logs, rather than blocking real parents.
 */
export async function recordTrial(opts: {
  email: string;
  fingerprint: string | null;
  subscriptionId: string;
  checkoutSessionId: string;
  livemode: boolean;
}): Promise<{ repeat: boolean }> {
  const supabase = getSupabase();
  if (!supabase) return { repeat: false };
  const email = opts.email.trim().toLowerCase();

  // Values quoted for PostgREST's or() syntax (emails may contain + . etc).
  const q = (v: string) => `"${v.replace(/["\\]/g, "")}"`;
  const filters = [`email.eq.${q(email)}`];
  if (opts.fingerprint) filters.push(`card_fingerprint.eq.${q(opts.fingerprint)}`);
  const { data: rows, error } = await supabase
    .from("trial_history")
    .select("email, card_fingerprint, stripe_subscription_id, repeat")
    .eq("is_test", !opts.livemode)
    .or(filters.join(","));
  if (error) {
    if ((error as { code?: string }).code !== "42P01") console.error("trialGuard: history read failed", error);
    return { repeat: false };
  }
  // Only earlier trials that actually ran count; a blocked repeat isn't a "free week had".
  const earlier = (rows ?? []).filter((r) => !r.repeat) as TrialRow[];
  const mine = (rows ?? []).find((r) => r.stripe_subscription_id === opts.subscriptionId);
  const repeat = mine ? !!mine.repeat : isRepeatTrial(earlier, { email, fingerprint: opts.fingerprint, subscriptionId: opts.subscriptionId });

  const { error: upErr } = await supabase.from("trial_history").upsert(
    {
      stripe_subscription_id: opts.subscriptionId,
      checkout_session_id: opts.checkoutSessionId,
      email,
      card_fingerprint: opts.fingerprint,
      repeat,
      is_test: !opts.livemode,
    },
    { onConflict: "stripe_subscription_id", ignoreDuplicates: true }
  );
  if (upErr) console.error("trialGuard: history write failed", upErr);
  return { repeat };
}

/** Has this email had a free week (that ran)? For signed-in pre-checks. */
export async function emailHadTrial(email: string, livemode: boolean): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data, error } = await supabase
    .from("trial_history")
    .select("stripe_subscription_id")
    .eq("email", email.trim().toLowerCase())
    .eq("repeat", false)
    .eq("is_test", !livemode)
    .limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}
