// The free-week Stripe Checkout session. Server-only.
//
// Subscription mode, 7-day trial, card taken upfront (payment_method_collection
// "always"), local currency from the visitor's country. No payment_method_types:
// that leaves Stripe's dynamic payment methods on, which is what shows Apple Pay
// and Google Pay (switched on in Dashboard → Settings → Payment methods).
// Stripe collects the parent's email; the only extra field is the child's
// first name. The webhook and /invite both turn the completed session into a
// parent account + child profile (lib/funnelProvision.ts).

import type Stripe from "stripe";
import { TRIAL_DAYS, type FunnelBilling, type FunnelCurrency } from "./funnelPricing";

export const CHILD_NAME_FIELD = "childname";

export type TrialSessionInput = {
  priceId: string;
  currency: FunnelCurrency;
  billing: FunnelBilling;
  origin: string;
  /** Set when an existing (unpaid) account starts the free week. */
  userId?: string | null;
  customerId?: string | null;
  sessionMetadata: Record<string, string>;
  subscriptionMetadata: Record<string, string>;
  /** false = this person already had a free week and chose to pay now. */
  trial?: boolean;
  /** Paid restart for an existing child profile (no name field needed). */
  childId?: string | null;
  /** "£69 a year" — shown on the paid-now checkout. */
  priceLabel?: string;
};

export function buildTrialSessionParams(i: TrialSessionInput): Stripe.Checkout.SessionCreateParams {
  const trial = i.trial !== false;
  const identity: Record<string, string> = {
    ...(i.userId ? { userId: i.userId } : {}),
    ...(i.childId ? { childId: i.childId } : {}),
    ...(trial ? {} : { paid_now: "1" }),
  };
  return {
    mode: "subscription",
    line_items: [{ price: i.priceId, quantity: 1 }],
    currency: i.currency,
    payment_method_collection: "always",
    ...(i.customerId ? { customer: i.customerId } : {}),
    allow_promotion_codes: true,
    ...(i.childId
      ? {}
      : {
          custom_fields: [
            {
              key: CHILD_NAME_FIELD,
              label: { type: "custom" as const, custom: "Your child's first name" },
              type: "text" as const,
              text: { minimum_length: 1, maximum_length: 40 },
            },
          ],
        }),
    custom_text: {
      submit: {
        message: trial
          ? `Free for ${TRIAL_DAYS} days, then your plan starts. We email you before the free week ends. ` +
            "If your child hasn't done their grade check by day 6, we cancel it for you and nothing is charged. " +
            "Cancel any time in one click. Not working? Full refund within 30 days."
          : `You've already had your free week, so your plan starts today${i.priceLabel ? ` at ${i.priceLabel}` : ""}. ` +
            "Cancel any time in one click. Not working? Full refund within 30 days.",
      },
    },
    subscription_data: {
      ...(trial
        ? { trial_period_days: TRIAL_DAYS, trial_settings: { end_behavior: { missing_payment_method: "cancel" as const } } }
        : {}),
      metadata: { tier: "pro", billing: i.billing, funnel: "trial", ...identity, ...i.subscriptionMetadata },
    },
    metadata: { tier: "pro", billing: i.billing, funnel: "trial", ...identity, ...i.sessionMetadata },
    success_url: `${i.origin}/invite?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${i.origin}/#pricing`,
  };
}

/** The child's first name from the completed session, tidied. */
export function childNameFromSession(session: Pick<Stripe.Checkout.Session, "custom_fields">): string | null {
  const raw = session.custom_fields?.find((f) => f.key === CHILD_NAME_FIELD)?.text?.value ?? "";
  const name = raw.replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 40);
  if (!name) return null;
  // "mia" → "Mia"; leave "McKenzie" / "Ana-Lucía" alone.
  return name === name.toLowerCase() ? name.charAt(0).toUpperCase() + name.slice(1) : name;
}
