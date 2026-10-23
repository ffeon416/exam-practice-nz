// THE PROMISE: "If your child hasn't done their grade check by day 6, we
// cancel the free week for you and nothing is charged."
//
// It's advertised at checkout, so it has four independent layers. Every layer
// asks the same pure question (promiseDecision) and acts through the same
// injected Stripe/store interfaces, so all of it is unit tested with fakes
// (tests/freeWeekPromise.test.ts):
//
//   1. CRON (hourly, from the end of day 6 = 24h before the trial ends):
//      cancel the subscription. Idempotent, so 24 hourly retries before the
//      first charge could ever be attempted.
//   2. INVOICE GUARD (webhook invoice.created): the first post-trial invoice is
//      put on hold (auto_advance off) BEFORE anything else, then decided:
//      promise applies → cancel the subscription and void the invoice;
//      child did the check → release it; can't tell (database down) → leave
//      it held and fail the webhook so Stripe retries. A held invoice is
//      never charged; the cron re-checks held invoices too.
//   3. REFUND (webhook invoice.paid): if a first real charge ever gets through
//      for a family the promise covers, refund it in full and cancel.
//   4. Every action is logged and alerts the founder when something needed
//      the later layers.
//
// "Done the grade check" = child_profiles.grade_check_completed_at is set for
// the child on this subscription.

export const DAY = 24 * 60 * 60;

/** Cut-off: end of day 6 = 24h before the free week ends. */
export function promiseDeadline(trialEnd: number): number {
  return trialEnd - DAY;
}

export type PromiseSub = {
  id: string;
  status: string; // Stripe subscription status
  trial_end: number | null;
  metadata: Record<string, string>;
};

/** Does the promise cover this subscription at all? */
export function promiseApplies(sub: PromiseSub): boolean {
  return sub.metadata?.funnel === "trial" && sub.metadata?.paid_now !== "1" && !!sub.trial_end;
}

export type Decision =
  | "not-covered"   // not a free-week trial (paid-now restart, legacy sub…)
  | "kept"          // the child did the grade check: nothing to do
  | "wait"          // still before the cut-off
  | "cancel"        // past the cut-off, no grade check: cancel now
  | "already-ended"; // subscription is no longer trialing/active

export function promiseDecision(sub: PromiseSub, gradeCheckDone: boolean, now: number): Decision {
  if (!promiseApplies(sub)) return "not-covered";
  if (gradeCheckDone) return "kept";
  if (sub.status === "canceled" || sub.status === "incomplete_expired") return "already-ended";
  if (now < promiseDeadline(sub.trial_end!)) return "wait";
  return "cancel";
}

// ── Injected dependencies (live versions in freeWeekLive.ts) ──

export interface PromiseStripe {
  getSubscription(id: string): Promise<PromiseSub>;
  /** Cancel now, no proration, no final invoice. Must be safe to repeat. */
  cancelSubscription(id: string): Promise<void>;
  /** Stop Stripe finalising / charging this invoice automatically. */
  holdInvoice(invoiceId: string): Promise<void>;
  /** Let Stripe finalise and charge it as normal. */
  releaseInvoice(invoiceId: string): Promise<void>;
  /** Void it (finalising a draft first, as Stripe requires). Must be safe to repeat. */
  voidInvoice(invoiceId: string): Promise<void>;
  /** Paid invoices with amount > 0 on this subscription. */
  paidRealInvoices(subscriptionId: string): Promise<{ id: string; amount_paid: number }[]>;
  /** Full refund of what this invoice charged. Must be safe to repeat. */
  refundInvoice(invoiceId: string): Promise<void>;
}

export interface PromiseStore {
  /** Throws if the answer can't be known (DB down) — callers must not guess. */
  gradeCheckDone(subscriptionId: string): Promise<boolean>;
  /** Records the auto-cancel and emails the parent (idempotent per subscription). */
  recordAutoCancel(subscriptionId: string, how: "cron" | "invoice-guard" | "refund"): Promise<void>;
  /** Founder alert for anything that needed a later layer or a human. */
  alert(subject: string, detail: Record<string, unknown>): Promise<void>;
}

export type Deps = { stripe: PromiseStripe; store: PromiseStore; now?: () => number };
const nowOf = (d: Deps) => (d.now ? d.now() : Math.floor(Date.now() / 1000));

// ── Layer 1: cron ──

export type EnforceResult = { subscriptionId: string; decision: Decision; cancelled: boolean; error?: string };

export async function enforcePromise(deps: Deps, subscriptionId: string): Promise<EnforceResult> {
  try {
    const sub = await deps.stripe.getSubscription(subscriptionId);
    if (!promiseApplies(sub)) return { subscriptionId, decision: "not-covered", cancelled: false };
    const done = await deps.store.gradeCheckDone(subscriptionId); // throws → no action this run
    const decision = promiseDecision(sub, done, nowOf(deps));
    if (decision !== "cancel") return { subscriptionId, decision, cancelled: false };
    await deps.stripe.cancelSubscription(subscriptionId);
    await deps.store.recordAutoCancel(subscriptionId, "cron");
    return { subscriptionId, decision, cancelled: true };
  } catch (err) {
    // Nothing is cancelled on a guess; the next hourly run tries again.
    return { subscriptionId, decision: "wait", cancelled: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Layer 2: invoice guard ──

export type InvoiceLike = {
  id: string;
  subscriptionId: string | null;
  billing_reason: string | null;
  amount_due: number;
  status: string | null; // draft | open | paid | void | uncollectible
};

export type GuardResult = "ignored" | "released" | "voided" | "held";

/**
 * Called for invoice.created. Throws (→ webhook 500 → Stripe retries) only
 * when the invoice is held and the answer couldn't be known yet.
 */
export async function guardInvoice(deps: Deps, inv: InvoiceLike): Promise<GuardResult> {
  if (!inv.subscriptionId || inv.amount_due <= 0) return "ignored";
  if (inv.billing_reason !== "subscription_cycle") return "ignored";
  const sub = await deps.stripe.getSubscription(inv.subscriptionId);
  if (!promiseApplies(sub)) return "ignored";
  // Only the FIRST real charge is covered; renewals are ordinary billing.
  const paid = await deps.stripe.paidRealInvoices(inv.subscriptionId);
  if (paid.some((p) => p.id !== inv.id)) return "ignored";
  if (inv.status === "paid" || inv.status === "void") return "ignored"; // layer 3 handles a paid one

  // Hold first: whatever happens next, Stripe can't charge it on its own.
  await deps.stripe.holdInvoice(inv.id);

  let done: boolean;
  try {
    done = await deps.store.gradeCheckDone(inv.subscriptionId);
  } catch (err) {
    await deps.store.alert("Free week: invoice held, grade check status unknown", { invoice: inv.id, sub: inv.subscriptionId, error: String(err) });
    throw new Error(`invoice ${inv.id} held: grade check status unknown`);
  }

  if (done) {
    await deps.stripe.releaseInvoice(inv.id);
    return "released";
  }
  // The cron should have cancelled already. It didn't — honour the promise here.
  await deps.stripe.cancelSubscription(inv.subscriptionId);
  await deps.stripe.voidInvoice(inv.id);
  await deps.store.recordAutoCancel(inv.subscriptionId, "invoice-guard");
  await deps.store.alert("Free week: auto-cancel needed the invoice guard", { invoice: inv.id, sub: inv.subscriptionId });
  return "voided";
}

// ── Layer 3: refund ──

export type PaidInvoiceLike = { id: string; subscriptionId: string | null; amount_paid: number };

/** Called for invoice.paid. Returns true if it refunded. Throws to retry. */
export async function refundIfPromiseBroken(deps: Deps, inv: PaidInvoiceLike): Promise<boolean> {
  if (!inv.subscriptionId || inv.amount_paid <= 0) return false;
  const sub = await deps.stripe.getSubscription(inv.subscriptionId);
  if (!promiseApplies(sub)) return false;
  const paid = await deps.stripe.paidRealInvoices(inv.subscriptionId);
  if (paid.some((p) => p.id !== inv.id)) return false; // not the first charge
  const done = await deps.store.gradeCheckDone(inv.subscriptionId); // throws → Stripe retries
  if (done) return false;
  await deps.stripe.refundInvoice(inv.id);
  await deps.stripe.cancelSubscription(inv.subscriptionId);
  await deps.store.recordAutoCancel(inv.subscriptionId, "refund");
  await deps.store.alert("Free week: a charge got through and was REFUNDED", { invoice: inv.id, sub: inv.subscriptionId, amount: inv.amount_paid });
  return true;
}
