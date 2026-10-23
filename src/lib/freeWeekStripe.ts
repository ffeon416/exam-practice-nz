// The promise's Stripe operations against the real API (lib/freeWeekPromise.ts
// defines the interface). Only depends on the Stripe SDK so the test-mode
// harness (scripts/verify-free-week-promise.ts) can exercise it directly.

import type Stripe from "stripe";
import type { PromiseStripe } from "./freeWeekPromise";

export function liveStripe(stripe: Stripe): PromiseStripe {
  return {
    async getSubscription(id) {
      const s = await stripe.subscriptions.retrieve(id);
      return { id: s.id, status: s.status, trial_end: s.trial_end, metadata: (s.metadata ?? {}) as Record<string, string> };
    },
    async cancelSubscription(id) {
      const s = await stripe.subscriptions.retrieve(id);
      if (s.status === "canceled" || s.status === "incomplete_expired") return;
      await stripe.subscriptions.cancel(id, { invoice_now: false, prorate: false }, { idempotencyKey: `promise-cancel-${id}` });
    },
    async holdInvoice(id) {
      await stripe.invoices.update(id, { auto_advance: false, metadata: { promise_hold: "1" } });
    },
    async releaseInvoice(id) {
      await stripe.invoices.update(id, { auto_advance: true, metadata: { promise_hold: "" } });
    },
    async voidInvoice(id) {
      let inv = await stripe.invoices.retrieve(id);
      if (inv.status === "void") return;
      if (inv.status === "draft") inv = await stripe.invoices.finalizeInvoice(id, { auto_advance: false });
      if (inv.status === "open" || inv.status === "uncollectible") await stripe.invoices.voidInvoice(id);
      else if (inv.status !== "void") throw new Error(`invoice ${id} is ${inv.status}; can't void`);
    },
    async paidRealInvoices(subscriptionId) {
      const list = await stripe.invoices.list({ subscription: subscriptionId, status: "paid", limit: 10 });
      return list.data.filter((i) => i.amount_paid > 0).map((i) => ({ id: i.id!, amount_paid: i.amount_paid }));
    },
    async refundInvoice(invoiceId) {
      const payments = await stripe.invoicePayments.list({ invoice: invoiceId, limit: 10 });
      for (const p of payments.data) {
        if (p.status !== "paid") continue;
        const pi = p.payment?.payment_intent;
        const charge = p.payment?.charge;
        const target = pi ? { payment_intent: typeof pi === "string" ? pi : pi.id } : charge ? { charge: typeof charge === "string" ? charge : charge.id } : null;
        if (!target) continue;
        // Already refunded in full (an earlier run)? Then nothing to do.
        const existing = await stripe.refunds.list({ ...target, limit: 20 });
        const refunded = existing.data.filter((r) => r.status !== "failed" && r.status !== "canceled").reduce((sum, r) => sum + r.amount, 0);
        if (refunded >= (p.amount_paid ?? 0) && refunded > 0) continue;
        await stripe.refunds.create({ ...target, reason: "requested_by_customer", metadata: { why: "free-week-promise" } }, { idempotencyKey: `promise-refund-${p.id}` });
      }
    },
  };
}
