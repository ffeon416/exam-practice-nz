// Meta events that only Stripe can confirm: StartTrial (a trial subscription
// was created) and Purchase (the first real charge). Called from the Stripe
// webhook. Event ids are deterministic per subscription, and sendMetaEvent
// records them in meta_events first, so retries and replays count once.

import type Stripe from "stripe";
import { metaUserFromMetadata, sendMetaEvent } from "./metaCapi";

type Md = Record<string, string> | null | undefined;

/** Stripe stores amounts in minor units; all StudyAce currencies are 2-dp. */
export function majorUnits(amount: number): number {
  return Math.round(amount) / 100;
}

/**
 * Is this paid invoice the subscription's FIRST real charge? `paidInvoices`
 * is the subscription's paid invoices (any order). A £0 trial invoice never
 * counts, and neither does any renewal after the first charge — so existing
 * subscribers' renewals are never reported as new purchases.
 */
export function isFirstRealCharge(invoice: { id: string; amount_paid: number }, paidInvoices: { id: string; amount_paid: number }[]): boolean {
  if (invoice.amount_paid <= 0) return false;
  const real = paidInvoices.filter((i) => i.amount_paid > 0);
  if (!real.some((i) => i.id === invoice.id)) real.push(invoice);
  return real.length === 1;
}

export async function sendStartTrial(sub: Stripe.Subscription, email: string | null, userId: string | null) {
  if (sub.status !== "trialing") return;
  const who = metaUserFromMetadata(sub.metadata as Md, email);
  if (!who) return;
  const price = sub.items.data[0]?.price;
  const currency = (price?.currency ?? sub.currency ?? "").toUpperCase();
  await sendMetaEvent(
    {
      name: "StartTrial",
      eventId: `trial_${sub.id}`,
      sourceUrl: who.sourceUrl,
      user: who.user,
      // value 0: nothing is charged yet. predicted_ltv = what the first charge will be.
      customData: {
        value: 0,
        currency,
        ...(price?.unit_amount ? { predicted_ltv: majorUnits(price.unit_amount) } : {}),
        content_name: sub.metadata?.billing ?? "pro",
      },
      time: sub.created,
    },
    { once: true, userId }
  );
}

export function subscriptionIdOfInvoice(invoice: Stripe.Invoice): string | null {
  const s = invoice.parent?.subscription_details?.subscription;
  if (!s) return null;
  return typeof s === "string" ? s : s.id;
}

export async function sendPurchaseIfFirst(stripe: Stripe, invoice: Stripe.Invoice) {
  if (invoice.amount_paid <= 0) return;
  const subId = subscriptionIdOfInvoice(invoice);
  if (!subId) return;
  const md = invoice.parent?.subscription_details?.metadata as Md;
  const who = metaUserFromMetadata(md, invoice.customer_email);
  if (!who) return;

  const paid = await stripe.invoices.list({ subscription: subId, status: "paid", limit: 10 });
  if (!isFirstRealCharge(invoice, paid.data)) return;

  await sendMetaEvent(
    {
      name: "Purchase",
      eventId: `purchase_${subId}`,
      sourceUrl: who.sourceUrl,
      user: who.user,
      customData: {
        value: majorUnits(invoice.amount_paid),
        currency: invoice.currency.toUpperCase(),
        content_name: md?.billing ?? "pro",
      },
      time: invoice.status_transitions?.paid_at ?? undefined,
    },
    { once: true, userId: md?.userId ?? null }
  );
}
