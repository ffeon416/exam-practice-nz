// THE AUTO-CANCEL PROMISE — every path, every layer, retries included.
// "If your child hasn't done their grade check by day 6, we cancel the free
// week for you and nothing is charged."

import { beforeEach, describe, expect, it } from "vitest";
import {
  DAY, enforcePromise, guardInvoice, promiseDeadline, promiseDecision, refundIfPromiseBroken,
  type Deps, type PromiseStore, type PromiseStripe, type PromiseSub,
} from "@/lib/freeWeekPromise";

const T0 = 1_800_000_000; // checkout time (unix s)
const TRIAL_END = T0 + 7 * DAY;
const DEADLINE = promiseDeadline(TRIAL_END); // end of day 6

const trialSub = (over: Partial<PromiseSub> = {}): PromiseSub => ({
  id: "sub_1", status: "trialing", trial_end: TRIAL_END, metadata: { funnel: "trial", tier: "pro", billing: "yearly" }, ...over,
});

// ── A fake Stripe + store that records every call and can be told to fail ──
type World = {
  sub: PromiseSub;
  gradeDone: boolean;
  optInDb: boolean;
  dbDown: boolean;
  paid: { id: string; amount_paid: number }[];
  invoice: { id: string; held: boolean; status: string };
  fail: Partial<Record<keyof PromiseStripe | "record", number>>; // fail the next N calls
  calls: string[];
  records: string[];
  alerts: string[];
  refunds: number;
};

function makeWorld(): World {
  return {
    sub: trialSub(), gradeDone: false, optInDb: false, dbDown: false, paid: [],
    invoice: { id: "in_1", held: false, status: "draft" }, fail: {}, calls: [], records: [], alerts: [], refunds: 0,
  };
}

function deps(w: World, now: number): Deps {
  const maybeFail = (name: keyof World["fail"]) => {
    if ((w.fail[name] ?? 0) > 0) { w.fail[name]!--; throw new Error(`${name} failed`); }
  };
  const stripe: PromiseStripe = {
    async getSubscription() { w.calls.push("get"); maybeFail("getSubscription"); return { ...w.sub }; },
    async cancelSubscription() {
      w.calls.push("cancel"); maybeFail("cancelSubscription");
      if (w.sub.status !== "canceled") w.sub = { ...w.sub, status: "canceled" };
    },
    async holdInvoice() { w.calls.push("hold"); maybeFail("holdInvoice"); w.invoice.held = true; },
    async releaseInvoice() { w.calls.push("release"); maybeFail("releaseInvoice"); w.invoice.held = false; },
    async voidInvoice() { w.calls.push("void"); maybeFail("voidInvoice"); w.invoice.status = "void"; },
    async paidRealInvoices() { w.calls.push("listPaid"); maybeFail("paidRealInvoices"); return w.paid; },
    async refundInvoice() { w.calls.push("refund"); maybeFail("refundInvoice"); w.refunds = 1; /* idempotent, like Stripe with an idempotency key */ },
  };
  const store: PromiseStore = {
    async gradeCheckDone() { if (w.dbDown) throw new Error("db down"); return w.gradeDone; },
    async keepOptIn() { if (w.dbDown) throw new Error("db down"); return w.optInDb; },
    async recordAutoCancel(_id, how) { maybeFail("record"); w.records.push(how); },
    async alert(subject) { w.alerts.push(subject); },
  };
  return { stripe, store, now: () => now };
}

/** The first post-trial invoice, as Stripe sends it in invoice.created. */
const firstInvoice = (w: World) => ({ id: w.invoice.id, subscriptionId: "sub_1", billing_reason: "subscription_cycle", amount_due: 6900, status: w.invoice.status });

let w: World;
beforeEach(() => { w = makeWorld(); });

describe("the decision", () => {
  it("covers free-week trials only", () => {
    expect(promiseDecision(trialSub({ metadata: {} }), false, DEADLINE + 1)).toBe("not-covered");
    expect(promiseDecision(trialSub({ metadata: { funnel: "trial", paid_now: "1" } }), false, DEADLINE + 1)).toBe("not-covered");
    expect(promiseDecision(trialSub({ trial_end: null }), false, DEADLINE + 1)).toBe("not-covered");
  });
  it("waits until the end of day 6 (24h before the free week ends)", () => {
    expect(DEADLINE).toBe(T0 + 6 * DAY);
    expect(promiseDecision(trialSub(), false, T0)).toBe("wait");
    expect(promiseDecision(trialSub(), false, T0 + 5 * DAY)).toBe("wait");
    expect(promiseDecision(trialSub(), false, DEADLINE - 1)).toBe("wait");
  });
  it("cancels from the cut-off on, if there's no grade check", () => {
    expect(promiseDecision(trialSub(), false, DEADLINE)).toBe("cancel");
    expect(promiseDecision(trialSub(), false, TRIAL_END - 60)).toBe("cancel");
    expect(promiseDecision(trialSub({ status: "active" }), false, TRIAL_END + 60)).toBe("cancel"); // trial ended, still not done
  });
  it("never cancels a family whose child did the grade check", () => {
    expect(promiseDecision(trialSub(), true, DEADLINE + 1)).toBe("kept");
    expect(promiseDecision(trialSub(), true, TRIAL_END + DAY)).toBe("kept");
  });
  it("leaves an already-cancelled subscription alone", () => {
    expect(promiseDecision(trialSub({ status: "canceled" }), false, DEADLINE + 1)).toBe("already-ended");
  });
});

describe("layer 1: the hourly cron", () => {
  it("does nothing before the cut-off", async () => {
    const r = await enforcePromise(deps(w, DEADLINE - 3600), "sub_1");
    expect(r).toMatchObject({ decision: "wait", cancelled: false });
    expect(w.calls).not.toContain("cancel");
  });

  it("cancels at the first run past the cut-off, records it once", async () => {
    const r = await enforcePromise(deps(w, DEADLINE + 60), "sub_1");
    expect(r).toMatchObject({ decision: "cancel", cancelled: true });
    expect(w.sub.status).toBe("canceled");
    expect(w.records).toEqual(["cron"]);
  });

  it("is idempotent: the next hourly run doesn't cancel or email again", async () => {
    await enforcePromise(deps(w, DEADLINE + 60), "sub_1");
    const r2 = await enforcePromise(deps(w, DEADLINE + 3660), "sub_1");
    expect(r2.decision).toBe("already-ended");
    expect(w.calls.filter((c) => c === "cancel")).toHaveLength(1);
    expect(w.records).toEqual(["cron"]);
  });

  it("keeps the family whose child did the check", async () => {
    w.gradeDone = true;
    const r = await enforcePromise(deps(w, DEADLINE + 60), "sub_1");
    expect(r).toMatchObject({ decision: "kept", cancelled: false });
    expect(w.calls).not.toContain("cancel");
  });

  it("never cancels on a guess: database down → no action, retried next hour", async () => {
    w.dbDown = true;
    const r = await enforcePromise(deps(w, DEADLINE + 60), "sub_1");
    expect(r.cancelled).toBe(false);
    expect(r.error).toMatch(/db down/);
    expect(w.calls).not.toContain("cancel");
    w.dbDown = false;
    const r2 = await enforcePromise(deps(w, DEADLINE + 3660), "sub_1");
    expect(r2.cancelled).toBe(true);
  });

  it("retries after Stripe fails to cancel", async () => {
    w.fail.cancelSubscription = 2;
    expect((await enforcePromise(deps(w, DEADLINE + 60), "sub_1")).cancelled).toBe(false);
    expect((await enforcePromise(deps(w, DEADLINE + 3660), "sub_1")).cancelled).toBe(false);
    expect((await enforcePromise(deps(w, DEADLINE + 7260), "sub_1")).cancelled).toBe(true);
    expect(w.sub.status).toBe("canceled");
    expect(w.records).toEqual(["cron"]);
  });

  it("retries after Stripe fails to load the subscription", async () => {
    w.fail.getSubscription = 1;
    expect((await enforcePromise(deps(w, DEADLINE + 60), "sub_1")).cancelled).toBe(false);
    expect((await enforcePromise(deps(w, DEADLINE + 3660), "sub_1")).cancelled).toBe(true);
  });

  it("has 24 hourly chances before the trial ends", () => {
    const runs = [];
    for (let t = DEADLINE; t < TRIAL_END; t += 3600) runs.push(t);
    expect(runs).toHaveLength(24);
  });

  it("ignores subscriptions the promise doesn't cover", async () => {
    w.sub = trialSub({ metadata: { funnel: "trial", paid_now: "1" } });
    const r = await enforcePromise(deps(w, DEADLINE + 60), "sub_1");
    expect(r.decision).toBe("not-covered");
    expect(w.calls).not.toContain("cancel");
  });
});

describe("layer 2: the invoice guard (invoice.created)", () => {
  beforeEach(() => { w.sub = trialSub({ status: "active" }); }); // trial just ended, cron somehow didn't cancel

  it("holds the invoice BEFORE anything else, then voids it and cancels", async () => {
    const r = await guardInvoice(deps(w, TRIAL_END + 60), firstInvoice(w));
    expect(r).toBe("voided");
    expect(w.calls.indexOf("hold")).toBeLessThan(w.calls.indexOf("cancel"));
    expect(w.calls.indexOf("hold")).toBeLessThan(w.calls.indexOf("void"));
    expect(w.invoice.status).toBe("void");
    expect(w.sub.status).toBe("canceled");
    expect(w.records).toEqual(["invoice-guard"]);
    expect(w.alerts).toHaveLength(1); // the founder hears the cron missed it
  });

  it("releases the invoice when the child did the grade check", async () => {
    w.gradeDone = true;
    const r = await guardInvoice(deps(w, TRIAL_END + 60), firstInvoice(w));
    expect(r).toBe("released");
    expect(w.calls).toEqual(["get", "listPaid", "hold", "release"]);
    expect(w.invoice.held).toBe(false);
    expect(w.sub.status).toBe("active");
  });

  it("database down: invoice stays HELD, webhook fails so Stripe retries; retry voids it", async () => {
    w.dbDown = true;
    await expect(guardInvoice(deps(w, TRIAL_END + 60), firstInvoice(w))).rejects.toThrow(/held/);
    expect(w.invoice.held).toBe(true);
    expect(w.calls).not.toContain("release");
    expect(w.calls).not.toContain("void");
    expect(w.alerts).toHaveLength(1);
    w.dbDown = false;
    expect(await guardInvoice(deps(w, TRIAL_END + 3600), firstInvoice(w))).toBe("voided");
    expect(w.invoice.status).toBe("void");
  });

  it("hold fails: throws before touching anything else (Stripe retries the webhook)", async () => {
    w.fail.holdInvoice = 1;
    await expect(guardInvoice(deps(w, TRIAL_END + 60), firstInvoice(w))).rejects.toThrow();
    expect(w.calls).not.toContain("cancel");
    expect(await guardInvoice(deps(w, TRIAL_END + 120), firstInvoice(w))).toBe("voided");
  });

  it("void fails: retried, and the cancel email is recorded only once", async () => {
    w.fail.voidInvoice = 1;
    await expect(guardInvoice(deps(w, TRIAL_END + 60), firstInvoice(w))).rejects.toThrow(/void/);
    expect(w.records).toEqual([]);
    expect(await guardInvoice(deps(w, TRIAL_END + 120), firstInvoice(w))).toBe("voided");
    expect(w.records).toEqual(["invoice-guard"]);
  });

  it("cancel fails: invoice stays held, retry finishes the job", async () => {
    w.fail.cancelSubscription = 1;
    await expect(guardInvoice(deps(w, TRIAL_END + 60), firstInvoice(w))).rejects.toThrow();
    expect(w.invoice.held).toBe(true);
    expect(await guardInvoice(deps(w, TRIAL_END + 120), firstInvoice(w))).toBe("voided");
  });

  it("ignores everything that isn't the first post-trial charge of a covered free week", async () => {
    const d = deps(w, TRIAL_END + 60);
    expect(await guardInvoice(d, { ...firstInvoice(w), subscriptionId: null })).toBe("ignored");
    expect(await guardInvoice(d, { ...firstInvoice(w), amount_due: 0 })).toBe("ignored"); // the £0 trial invoice
    expect(await guardInvoice(d, { ...firstInvoice(w), billing_reason: "subscription_create" })).toBe("ignored");
    w.paid = [{ id: "in_0", amount_paid: 6900 }]; // already paid once: this is a renewal
    expect(await guardInvoice(d, firstInvoice(w))).toBe("ignored");
    w.paid = [];
    w.sub = trialSub({ status: "active", metadata: { funnel: "trial", paid_now: "1" } });
    expect(await guardInvoice(d, firstInvoice(w))).toBe("ignored");
    w.sub = trialSub({ status: "active", metadata: {} }); // legacy, non-funnel subscription
    expect(await guardInvoice(d, firstInvoice(w))).toBe("ignored");
    expect(w.calls).not.toContain("hold");
  });
});

describe("layer 3: refund if a charge ever gets through (invoice.paid)", () => {
  beforeEach(() => { w.sub = trialSub({ status: "active" }); w.paid = [{ id: "in_1", amount_paid: 6900 }]; });
  const paidInvoice = { id: "in_1", subscriptionId: "sub_1", amount_paid: 6900 };

  it("refunds in full, cancels, emails the parent and alerts the founder", async () => {
    expect(await refundIfPromiseBroken(deps(w, TRIAL_END + 7200), paidInvoice)).toBe(true);
    expect(w.refunds).toBe(1);
    expect(w.sub.status).toBe("canceled");
    expect(w.records).toEqual(["refund"]);
    expect(w.alerts).toHaveLength(1);
  });

  it("keeps the charge when the child did the grade check", async () => {
    w.gradeDone = true;
    expect(await refundIfPromiseBroken(deps(w, TRIAL_END + 7200), paidInvoice)).toBe(false);
    expect(w.calls).not.toContain("refund");
  });

  it("never touches renewals, uncovered plans or £0 invoices", async () => {
    w.paid = [{ id: "in_0", amount_paid: 6900 }, { id: "in_1", amount_paid: 6900 }];
    expect(await refundIfPromiseBroken(deps(w, TRIAL_END + 7200), paidInvoice)).toBe(false);
    w.paid = [{ id: "in_1", amount_paid: 6900 }];
    expect(await refundIfPromiseBroken(deps(w, TRIAL_END + 7200), { ...paidInvoice, amount_paid: 0 })).toBe(false);
    w.sub = trialSub({ status: "active", metadata: { funnel: "trial", paid_now: "1" } });
    expect(await refundIfPromiseBroken(deps(w, TRIAL_END + 7200), paidInvoice)).toBe(false);
    expect(w.calls).not.toContain("refund");
  });

  it("database down: throws (Stripe retries) and refunds nothing on a guess", async () => {
    w.dbDown = true;
    await expect(refundIfPromiseBroken(deps(w, TRIAL_END + 7200), paidInvoice)).rejects.toThrow();
    expect(w.refunds).toBe(0);
  });

  it("refund fails: retried; the parent is only told once", async () => {
    w.fail.refundInvoice = 1;
    await expect(refundIfPromiseBroken(deps(w, TRIAL_END + 7200), paidInvoice)).rejects.toThrow();
    expect(w.records).toEqual([]);
    expect(await refundIfPromiseBroken(deps(w, TRIAL_END + 7300), paidInvoice)).toBe(true);
    expect(w.records).toEqual(["refund"]);
  });
});

describe("the whole week, hour by hour", () => {
  async function simulate(opts: { gradeDoneAt?: number; cronBroken?: boolean; guardBroken?: boolean }) {
    const world = makeWorld();
    if (opts.cronBroken) world.fail.cancelSubscription = 24; // every cron run's cancel fails
    for (let t = T0; t < TRIAL_END; t += 3600) {
      world.gradeDone = opts.gradeDoneAt !== undefined && t >= opts.gradeDoneAt;
      await enforcePromise(deps(world, t), "sub_1");
    }
    world.gradeDone = opts.gradeDoneAt !== undefined && TRIAL_END >= opts.gradeDoneAt;
    if (world.sub.status === "canceled") return { world, charged: false };
    // Trial ends: Stripe creates the first invoice.
    world.sub = { ...world.sub, status: "active" };
    let charged = false;
    if (!opts.guardBroken) {
      const g = await guardInvoice(deps(world, TRIAL_END + 60), firstInvoice(world));
      charged = g === "released";
    } else {
      charged = true; // the guard webhook never arrived; Stripe charged
      world.paid = [{ id: "in_1", amount_paid: 6900 }];
      const refunded = await refundIfPromiseBroken(deps(world, TRIAL_END + 3600), { id: "in_1", subscriptionId: "sub_1", amount_paid: 6900 });
      if (refunded) charged = false;
    }
    return { world, charged };
  }

  it("child never does the check → cancelled at the cut-off by the cron, nothing charged", async () => {
    const { world, charged } = await simulate({});
    expect(charged).toBe(false);
    expect(world.records).toEqual(["cron"]);
  });

  it("child does the check on day 3 → kept and charged at the end of the week", async () => {
    const { world, charged } = await simulate({ gradeDoneAt: T0 + 2 * DAY });
    expect(charged).toBe(true);
    expect(world.records).toEqual([]);
  });

  it("child does the check at 11pm on day 6, just before the cut-off → kept", async () => {
    const { charged } = await simulate({ gradeDoneAt: DEADLINE - 3600 });
    expect(charged).toBe(true);
  });

  it("cron broken all day → the invoice guard voids it, nothing charged", async () => {
    const { world, charged } = await simulate({ cronBroken: true });
    expect(charged).toBe(false);
    expect(world.invoice.status).toBe("void");
    expect(world.records).toEqual(["invoice-guard"]);
  });

  it("cron AND invoice guard broken → the charge is refunded in full", async () => {
    const { world, charged } = await simulate({ cronBroken: true, guardBroken: true });
    expect(charged).toBe(false);
    expect(world.refunds).toBe(1);
    expect(world.records).toEqual(["refund"]);
  });
});

describe("parent chose 'Keep the plan going' (day-5 email)", () => {
  const optedIn = (over: Partial<PromiseSub> = {}) => trialSub({ metadata: { funnel: "trial", tier: "pro", billing: "yearly", keep_opt_in: "1" }, ...over });

  it("the decision respects it, from Stripe or from our database", () => {
    expect(promiseDecision(optedIn(), false, DEADLINE + 60)).toBe("opted-in");
    expect(promiseDecision(trialSub(), false, DEADLINE + 60, true)).toBe("opted-in");
  });

  it("cron doesn't cancel — even with the database down (Stripe metadata is enough)", async () => {
    w.sub = optedIn(); w.dbDown = true;
    const r = await enforcePromise(deps(w, DEADLINE + 60), "sub_1");
    expect(r.decision).toBe("opted-in");
    expect(w.calls).not.toContain("cancel");
  });

  it("cron doesn't cancel when only our database has the opt-in", async () => {
    w.optInDb = true;
    const r = await enforcePromise(deps(w, DEADLINE + 60), "sub_1");
    expect(r.decision).toBe("opted-in");
    expect(w.calls).not.toContain("cancel");
  });

  it("invoice guard releases the charge", async () => {
    w.sub = optedIn({ status: "active" });
    expect(await guardInvoice(deps(w, TRIAL_END + 60), firstInvoice(w))).toBe("released");
    w = makeWorld(); w.sub = trialSub({ status: "active" }); w.optInDb = true;
    expect(await guardInvoice(deps(w, TRIAL_END + 60), firstInvoice(w))).toBe("released");
    expect(w.calls).not.toContain("void");
  });

  it("refund layer leaves the charge alone", async () => {
    w.sub = optedIn({ status: "active" }); w.paid = [{ id: "in_1", amount_paid: 6900 }];
    expect(await refundIfPromiseBroken(deps(w, TRIAL_END + 7200), { id: "in_1", subscriptionId: "sub_1", amount_paid: 6900 })).toBe(false);
    expect(w.refunds).toBe(0);
  });

  it("whole week: opt in on day 5, child never starts → charged on day 7, as the parent chose", async () => {
    for (let t = T0; t < TRIAL_END; t += 3600) {
      if (t >= T0 + 4 * DAY) w.sub = { ...w.sub, metadata: { ...w.sub.metadata, keep_opt_in: "1" } };
      await enforcePromise(deps(w, t), "sub_1");
    }
    expect(w.sub.status).toBe("trialing");
    w.sub = { ...w.sub, status: "active" };
    expect(await guardInvoice(deps(w, TRIAL_END + 60), firstInvoice(w))).toBe("released");
    expect(w.records).toEqual([]);
  });
});

describe("parent cancelled during the free week (cancel_at_period_end)", () => {
  it("the promise has nothing to do: the child keeps access, Stripe ends it without a bill", async () => {
    w.sub = trialSub({ cancel_at_period_end: true });
    expect(promiseDecision(w.sub, false, DEADLINE + 60)).toBe("ending");
    const r = await enforcePromise(deps(w, DEADLINE + 60), "sub_1");
    expect(r).toMatchObject({ decision: "ending", cancelled: false });
    expect(w.calls).not.toContain("cancel"); // no early cut-off of access
  });

  it("if Stripe ever did raise a bill for it, the guard still voids it", async () => {
    w.sub = trialSub({ status: "active", cancel_at_period_end: true });
    expect(await guardInvoice(deps(w, TRIAL_END + 60), firstInvoice(w))).toBe("voided");
  });

  it("a grade check done after cancelling doesn't change anything", () => {
    expect(promiseDecision(trialSub({ cancel_at_period_end: true }), true, DEADLINE + 60)).toBe("kept");
  });
});
