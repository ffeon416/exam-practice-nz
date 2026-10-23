// Proves the auto-cancel promise against REAL Stripe (test mode), using test
// clocks to fast-forward the free week. Exercises the exact live code
// (lib/freeWeekStripe.ts + lib/freeWeekPromise.ts); only "did the child do
// the grade check?" is stubbed, so no database is touched.
//
//   STRIPE_SECRET_KEY=sk_test_... STRIPE_PRICE_FUNNEL_YEARLY=price_... npx tsx scripts/verify-free-week-promise.ts
//
// STOP `stripe listen` / scripts/dev-funnel.sh first: otherwise your local
// webhook also reacts to these test subscriptions.
// Refuses live keys. Deletes its test clocks (and their customers) at the end.
//
// Scenarios:
//   A. Cron at the cut-off cancels the trial         → cancelled, nothing charged
//   B. Cron missed; invoice guard at trial end voids → invoice void, nothing charged
//   C. Child did the check; guard releases           → first invoice paid
//   D. Everything missed and it got charged          → refunded in full

import Stripe from "stripe";
import { liveStripe } from "../src/lib/freeWeekStripe";
import { DAY, enforcePromise, guardInvoice, promiseDeadline, refundIfPromiseBroken, type Deps } from "../src/lib/freeWeekPromise";

const key = process.env.STRIPE_SECRET_KEY ?? "";
const price = process.env.STRIPE_PRICE_FUNNEL_YEARLY ?? "";
if (!key.startsWith("sk_test_")) { console.error("Needs a Stripe TEST key (sk_test_…)."); process.exit(1); }
if (!price) { console.error("Set STRIPE_PRICE_FUNNEL_YEARLY to the test-mode funnel price."); process.exit(1); }

const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
const clocks: string[] = [];
let failures = 0;

function check(ok: boolean, what: string) {
  console.log(`${ok ? "  ✓" : "  ✗"} ${what}`);
  if (!ok) failures++;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function advance(clockId: string, to: number) {
  await stripe.testHelpers.testClocks.advance(clockId, { frozen_time: to });
  for (let i = 0; i < 60; i++) {
    const c = await stripe.testHelpers.testClocks.retrieve(clockId);
    if (c.status === "ready") return;
    await sleep(2000);
  }
  throw new Error(`clock ${clockId} didn't settle`);
}

async function freeWeek(label: string) {
  const start = Math.floor(Date.now() / 1000);
  const clock = await stripe.testHelpers.testClocks.create({ frozen_time: start, name: `promise ${label}` });
  clocks.push(clock.id);
  const customer = await stripe.customers.create({ email: `promise-${label.toLowerCase()}+test@studyace.co`, test_clock: clock.id, payment_method: "pm_card_visa", invoice_settings: { default_payment_method: "pm_card_visa" } });
  const sub = await stripe.subscriptions.create({
    customer: customer.id,
    items: [{ price }],
    currency: "gbp",
    trial_period_days: 7,
    metadata: { funnel: "trial", tier: "pro", billing: "yearly", harness: "1" },
  });
  return { clock, sub, start, trialEnd: sub.trial_end! };
}

const depsFor = (gradeDone: boolean, now: number): Deps => ({
  stripe: liveStripe(stripe),
  store: { gradeCheckDone: async () => gradeDone, recordAutoCancel: async () => {}, alert: async () => {} },
  now: () => now,
});

async function realCharges(subId: string) {
  const paid = await stripe.invoices.list({ subscription: subId, status: "paid", limit: 10 });
  return paid.data.filter((i) => i.amount_paid > 0);
}

async function firstCycleInvoice(subId: string) {
  const list = await stripe.invoices.list({ subscription: subId, limit: 10 });
  return list.data.find((i) => i.billing_reason === "subscription_cycle");
}

async function main() {
  console.log("A. Cron at the cut-off");
  {
    const w = await freeWeek("A");
    const t = promiseDeadline(w.trialEnd) + 3600;
    await advance(w.clock.id, t);
    const r = await enforcePromise(depsFor(false, t), w.sub.id);
    check(r.cancelled, `cron cancelled (decision ${r.decision}${r.error ? `, ${r.error}` : ""})`);
    await advance(w.clock.id, w.trialEnd + 2 * 3600);
    check((await stripe.subscriptions.retrieve(w.sub.id)).status === "canceled", "subscription is cancelled");
    check((await realCharges(w.sub.id)).length === 0, "nothing charged after the trial end");
    const again = await enforcePromise(depsFor(false, t + 3600), w.sub.id);
    check(!again.cancelled && again.decision === "already-ended", "a second run does nothing");
  }

  console.log("B. Invoice guard at trial end");
  {
    const w = await freeWeek("B");
    await advance(w.clock.id, w.trialEnd + 60); // Stripe creates the first invoice, ~1h before charging it
    const inv = await firstCycleInvoice(w.sub.id);
    check(!!inv && inv.status === "draft", `first invoice is a draft (${inv?.status})`);
    if (inv) {
      const g = await guardInvoice(depsFor(false, w.trialEnd + 60), { id: inv.id!, subscriptionId: w.sub.id, billing_reason: inv.billing_reason, amount_due: inv.amount_due, status: inv.status });
      check(g === "voided", `guard result: ${g}`);
      await advance(w.clock.id, w.trialEnd + 3 * 3600);
      check((await stripe.invoices.retrieve(inv.id!)).status === "void", "invoice is void");
      check((await stripe.subscriptions.retrieve(w.sub.id)).status === "canceled", "subscription is cancelled");
      check((await realCharges(w.sub.id)).length === 0, "nothing charged");
      const again = await guardInvoice(depsFor(false, w.trialEnd + 4 * 3600), { id: inv.id!, subscriptionId: w.sub.id, billing_reason: inv.billing_reason, amount_due: inv.amount_due, status: "void" });
      check(again === "ignored", "re-running the guard is harmless");
    }
  }

  console.log("C. Child did the check: guard releases, plan starts");
  {
    const w = await freeWeek("C");
    await advance(w.clock.id, w.trialEnd + 60);
    const inv = await firstCycleInvoice(w.sub.id);
    if (inv) {
      const g = await guardInvoice(depsFor(true, w.trialEnd + 60), { id: inv.id!, subscriptionId: w.sub.id, billing_reason: inv.billing_reason, amount_due: inv.amount_due, status: inv.status });
      check(g === "released", `guard result: ${g}`);
      await advance(w.clock.id, w.trialEnd + 3 * 3600);
      check((await realCharges(w.sub.id)).length === 1, "first invoice charged");
      check((await stripe.subscriptions.retrieve(w.sub.id)).status === "active", "plan is active");
    } else check(false, "first invoice exists");
  }

  console.log("D. Everything missed: refund");
  {
    const w = await freeWeek("D");
    await advance(w.clock.id, w.trialEnd + 3 * 3600); // nobody intervened: Stripe charged
    const paid = await realCharges(w.sub.id);
    check(paid.length === 1, "it was charged (the failure we're simulating)");
    if (paid[0]) {
      const refunded = await refundIfPromiseBroken(depsFor(false, w.trialEnd + 3 * 3600), { id: paid[0].id!, subscriptionId: w.sub.id, amount_paid: paid[0].amount_paid });
      check(refunded, "refund layer acted");
      const refunds = await stripe.refunds.list({ limit: 10 });
      const total = refunds.data.filter((r) => r.metadata?.why === "free-week-promise" && r.status !== "failed").reduce((s, r) => s + r.amount, 0);
      check(total >= paid[0].amount_paid, `refunded in full (${total} of ${paid[0].amount_paid})`);
      check((await stripe.subscriptions.retrieve(w.sub.id)).status === "canceled", "subscription is cancelled");
      const again = await refundIfPromiseBroken(depsFor(false, w.trialEnd + 4 * 3600), { id: paid[0].id!, subscriptionId: w.sub.id, amount_paid: paid[0].amount_paid });
      const refunds2 = await stripe.refunds.list({ limit: 10 });
      const total2 = refunds2.data.filter((r) => r.metadata?.why === "free-week-promise" && r.status !== "failed").reduce((s, r) => s + r.amount, 0);
      check(total2 === total, `a second run doesn't refund twice (acted again: ${again})`);
    }
  }
}

main()
  .catch((err) => { console.error(err); failures++; })
  .finally(async () => {
    for (const c of clocks) await stripe.testHelpers.testClocks.del(c).catch(() => {});
    console.log(failures ? `\n${failures} check(s) FAILED` : "\nAll checks passed. The promise holds against real Stripe.");
    process.exit(failures ? 1 : 0);
  });

void DAY;
