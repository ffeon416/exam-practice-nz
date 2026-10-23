// Completed free-week checkout → parent account + linked child profile.
//
// Called from BOTH the Stripe webhook and the /invite page the parent lands
// on, because either can arrive first. Idempotent: the second caller finds
// everything in place and only reads it back. Server-only.
//
// Parent = a Clerk user (created here, no password — they sign in with an
// email code, or straight from /invite with a one-time sign-in token) plus a
// `profiles` row holding the subscription. Child = a `child_profiles` row
// with their first name; Phase 3 turns it into the kid's own login via the
// invite link.

import type Stripe from "stripe";
import { clerkClient } from "@clerk/nextjs/server";
import { getStripe } from "./stripe";
import { getSupabase, logEvent, saveSignupAttribution } from "./supabase";
import { childNameFromSession } from "./trialCheckout";
import { cardFingerprint, recordTrial } from "./trialGuard";

export type Provisioned = {
  parentUserId: string;
  email: string;
  childId: string | null;
  childFirstName: string | null;
  subscriptionId: string;
  status: Stripe.Subscription.Status;
  trialEnd: string | null;
  /** Unix seconds the checkout session was created (ticket window). */
  checkoutCreated: number;
  /** This email/card already had a free week: the trial was cancelled, nothing charged. */
  repeatTrial: boolean;
  billing: "yearly" | "monthly";
  currency: string;
};

const SESSION_ID_RE = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
export const isCheckoutSessionId = (v: unknown): v is string => typeof v === "string" && SESSION_ID_RE.test(v);

const iso = (unix: number | null | undefined) => (unix ? new Date(unix * 1000).toISOString() : null);

/** Find the Clerk user for this email, or create one (race-safe). */
async function parentUserFor(email: string, isTest: boolean): Promise<string> {
  const clerk = await clerkClient();
  const find = async () => (await clerk.users.getUserList({ emailAddress: [email], limit: 1 })).data[0]?.id ?? null;
  const existing = await find();
  if (existing) return existing;
  try {
    const user = await clerk.users.createUser({
      emailAddress: [email],
      skipPasswordRequirement: true,
      // test: true = made by a Stripe TEST-mode checkout; safe to delete.
      publicMetadata: { role: "parent", ...(isTest ? { test: true } : {}) },
    });
    return user.id;
  } catch (err) {
    // The webhook and /invite raced and the other one created it first.
    const again = await find();
    if (again) return again;
    throw err;
  }
}

export async function provisionFromCheckout(sessionOrId: string | Stripe.Checkout.Session): Promise<Provisioned | null> {
  const stripe = getStripe();
  const supabase = getSupabase();
  if (!stripe || !supabase) return null;

  const session =
    typeof sessionOrId === "string"
      ? await stripe.checkout.sessions.retrieve(sessionOrId, { expand: ["subscription"] })
      : sessionOrId;
  if (session.metadata?.funnel !== "trial" || session.status !== "complete") return null;

  const subRef = session.subscription;
  if (!subRef) return null;
  const sub = typeof subRef === "string" ? await stripe.subscriptions.retrieve(subRef) : subRef;
  const email = (session.customer_details?.email ?? session.customer_email ?? "").trim().toLowerCase();
  if (!email) {
    console.error(`provision: checkout ${session.id} has no email`);
    return null;
  }
  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;
  const childFirstName = childNameFromSession(session);

  const isTest = !session.livemode;
  const parentUserId = session.metadata?.userId || sub.metadata?.userId || (await parentUserFor(email, isTest));

  // ── One free week per person (email OR card). A repeat is cancelled at
  // once — before any charge — and /invite asks if they want to pay instead.
  let repeatTrial = false;
  let liveSub = sub;
  if (sub.trial_end) {
    const fingerprint = await cardFingerprint(stripe, sub);
    ({ repeat: repeatTrial } = await recordTrial({
      email, fingerprint, subscriptionId: sub.id, checkoutSessionId: session.id, livemode: session.livemode,
    }));
    if (repeatTrial && sub.status !== "canceled") {
      liveSub = await stripe.subscriptions.cancel(sub.id, { invoice_now: false, prorate: false });
      void logEvent("trial_repeat_blocked", parentUserId, { sub: sub.id, by_card: !!fingerprint, test: isTest });
    }
  }

  // ── Profile (subscription lives on the parent) ──
  const { data: existing } = await supabase
    .from("profiles")
    .select("user_id, tier, stripe_subscription_id, subscription_status")
    .eq("user_id", parentUserId)
    .maybeSingle();
  const alreadyThis = existing?.stripe_subscription_id === sub.id;
  const hasOtherPaid =
    !!existing?.stripe_subscription_id && !alreadyThis && existing.tier !== "free" &&
    (existing.subscription_status === "active" || existing.subscription_status === "trialing");
  const paid = !repeatTrial && (liveSub.status === "trialing" || liveSub.status === "active");
  const periodEnd = sub.items.data[0]?.current_period_end;

  if (hasOtherPaid) {
    // Same email already has a live plan. Never overwrite it or cancel it
    // automatically — flag it so it can be refunded/merged by hand.
    void logEvent("funnel_duplicate_subscription", parentUserId, { new_sub: sub.id, old_sub: existing!.stripe_subscription_id });
  } else if (!alreadyThis) {
    const { error } = await supabase.from("profiles").upsert(
      {
        user_id: parentUserId,
        email,
        tier: paid ? "pro" : "free",
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        subscription_status: liveSub.status,
        current_period_end: iso(periodEnd),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) throw new Error(`provision: profile upsert failed: ${error.message}`);
  }

  // New columns (migration 2026-10-24): tolerated if not applied yet.
  const { error: roleErr } = await supabase
    .from("profiles")
    .update({ role: "parent", trial_ends_at: repeatTrial ? null : iso(sub.trial_end), ...(isTest ? { is_test: true } : {}) })
    .eq("user_id", parentUserId);
  if (roleErr && (roleErr as { code?: string }).code !== "42703") console.error("provision: role update failed:", roleErr);

  // ── Child profile, one per checkout ──
  // A paid restart after a blocked repeat carries the existing child's id,
  // so the family keeps one child profile rather than gaining a duplicate.
  let childId: string | null = null;
  let childName = childFirstName;
  const reuseId = session.metadata?.childId;
  const { data: child, error: childErr } = reuseId
    ? await supabase
        .from("child_profiles")
        .update({ stripe_subscription_id: sub.id })
        .eq("id", reuseId)
        .eq("parent_user_id", parentUserId)
        .select("id, first_name")
        .single()
    : await supabase
        .from("child_profiles")
        .upsert(
          {
            parent_user_id: parentUserId,
            first_name: childFirstName ?? "your child",
            checkout_session_id: session.id,
            stripe_subscription_id: sub.id,
            ...(isTest ? { is_test: true } : {}),
          },
          { onConflict: "checkout_session_id", ignoreDuplicates: false }
        )
        .select("id, first_name")
        .single();
  if (child) {
    childId = child.id as string;
    childName = (child.first_name as string) ?? childName;
  } else if (childErr && (childErr as { code?: string }).code !== "42P01") {
    console.error("provision: child upsert failed:", childErr);
  }

  if (!alreadyThis && !hasOtherPaid && !repeatTrial) {
    await saveSignupAttribution(parentUserId, sub.metadata);
    // Tag Stripe so renewals / cancellations / the auto-cancel job map back.
    if (sub.metadata?.userId !== parentUserId || (childId && sub.metadata?.childId !== childId)) {
      await stripe.subscriptions
        .update(sub.id, { metadata: { ...sub.metadata, userId: parentUserId, ...(childId ? { childId } : {}) } })
        .catch((err) => console.error("provision: tag subscription failed:", err));
    }
    if (customerId) await stripe.customers.update(customerId, { metadata: { userId: parentUserId } }).catch(() => {});
    void logEvent("trial_started", parentUserId, {
      plan: sub.metadata?.billing ?? "pro",
      currency: sub.currency,
      child: !!childFirstName,
      source: session.metadata?.source ?? null,
    });
  }

  return {
    parentUserId,
    email,
    childId,
    childFirstName: childName,
    subscriptionId: sub.id,
    status: liveSub.status,
    trialEnd: repeatTrial ? null : iso(sub.trial_end),
    checkoutCreated: session.created,
    repeatTrial,
    billing: sub.metadata?.billing === "monthly" ? "monthly" : "yearly",
    currency: sub.currency,
  };
}

/** A short-lived Clerk sign-in token for the parent (consumed on /invite). */
export async function parentSignInTicket(userId: string): Promise<string | null> {
  try {
    const clerk = await clerkClient();
    const t = await clerk.signInTokens.createSignInToken({ userId, expiresInSeconds: 600 });
    return t.token;
  } catch (err) {
    console.error("parentSignInTicket failed:", err);
    return null;
  }
}
