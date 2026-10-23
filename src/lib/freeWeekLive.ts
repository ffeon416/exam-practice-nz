// Free-week jobs against the real Stripe + Supabase + Resend. Server-only.
//
// - Live implementations of the promise interfaces (lib/freeWeekPromise.ts).
// - The parent emails, each sent at most once (email_log keys).
// - runFreeWeekJobs(): the hourly cron — promise first, then held-invoice
//   sweep, then emails. One family's failure never stops the others.

import type Stripe from "stripe";
import { getStripe } from "./stripe";
import { getSupabase, logEvent } from "./supabase";
import { sendEmail, type SendResult } from "./email";
import { cancelLink, parentLink } from "./emailLinks";
import { ADMIN_EMAILS } from "./adminEmails";
import { autoCancelledEmail, endingSoonEmail, gradeCheckEmail, notStartedEmail, welcomeEmail, type FreeWeekVars } from "./funnelEmails";
import { FUNNEL_PRICES, funnelPrice, type FunnelCurrency } from "./funnelPricing";
import type { GradeCheckSummary } from "./children";
import { liveStripe } from "./freeWeekStripe";
import { DAY, enforcePromise, guardInvoice, promiseApplies, promiseDeadline, refundIfPromiseBroken, type Deps, type PromiseStore, type PromiseSub } from "./freeWeekPromise";

const livemode = () => (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live");

// ── Database + email ──

type ChildRow = {
  id: string; parent_user_id: string; first_name: string; kid_user_id: string | null; stripe_subscription_id: string | null;
  invite_opened_at: string | null; grade_check_completed_at: string | null; grade_check: GradeCheckSummary | null;
  timezone: string | null; auto_cancelled_at: string | null; created_at: string;
};
type ParentRow = { user_id: string; email: string | null; trial_ends_at: string | null; subscription_status: string | null; signup_country: string | null };

const CHILD_COLS = "id, parent_user_id, first_name, kid_user_id, stripe_subscription_id, invite_opened_at, grade_check_completed_at, grade_check, timezone, auto_cancelled_at, created_at";

async function childForSub(subscriptionId: string): Promise<ChildRow | null> {
  const supabase = getSupabase();
  if (!supabase) throw new Error("database not configured");
  const { data, error } = await supabase.from("child_profiles").select(CHILD_COLS).eq("stripe_subscription_id", subscriptionId).limit(1);
  if (error) throw new Error(`child lookup failed: ${error.message}`);
  return (data?.[0] as ChildRow | undefined) ?? null;
}

async function parentOf(userId: string): Promise<ParentRow | null> {
  const { data } = (await getSupabase()?.from("profiles").select("user_id, email, trial_ends_at, subscription_status, signup_country").eq("user_id", userId).maybeSingle()) ?? { data: null };
  return (data as ParentRow | null) ?? null;
}

export async function founderAlert(subject: string, detail: Record<string, unknown>): Promise<void> {
  const body = `<pre style="font-size:13px">${JSON.stringify(detail, null, 2).replace(/</g, "&lt;")}</pre>`;
  const key = `alert:${subject}:${String(detail.sub ?? detail.invoice ?? "")}`.slice(0, 250);
  for (const to of ADMIN_EMAILS) {
    await sendEmail({ to, subject: `[StudyAce] ${subject}`, html: body, text: JSON.stringify(detail, null, 2), key: `${key}:${to}`, template: "founder_alert" });
  }
  console.error(`ALERT ${subject}`, detail);
}

export const liveStore: PromiseStore = {
  async gradeCheckDone(subscriptionId) {
    const child = await childForSub(subscriptionId); // throws on DB error
    return !!child?.grade_check_completed_at;
  },
  async recordAutoCancel(subscriptionId, how) {
    try {
      const child = await childForSub(subscriptionId);
      if (!child) return;
      await getSupabase()!.from("child_profiles").update({ auto_cancelled_at: new Date().toISOString(), auto_cancel_how: how }).eq("id", child.id).is("auto_cancelled_at", null);
      void logEvent("free_week_auto_cancelled", child.parent_user_id, { sub: subscriptionId, child: child.id, how });
      const parent = await parentOf(child.parent_user_id);
      if (parent?.email) {
        const e = autoCancelledEmail({ childName: child.first_name }, how);
        await sendEmail({ to: parent.email, ...e, key: `autocancel:${subscriptionId}`, template: "free_week_auto_cancelled" });
      }
    } catch (err) {
      // The cancel itself already happened; a failed record/email must not undo or repeat it.
      console.error("recordAutoCancel failed:", err);
    }
  },
  alert: founderAlert,
};

export function liveDeps(): Deps | null {
  const stripe = getStripe();
  return stripe ? { stripe: liveStripe(stripe), store: liveStore } : null;
}

// ── Parent emails ──

const COUNTRY_TZ: Record<string, string> = { GB: "Europe/London", AU: "Australia/Sydney", NZ: "Pacific/Auckland", US: "America/New_York", CA: "America/Toronto" };

export function dateLabels(trialEndUnix: number, timeZone: string, country: string | null) {
  const locale = country === "US" || country === "CA" ? "en-US" : "en-GB";
  const tz = (() => { try { new Intl.DateTimeFormat("en", { timeZone }); return timeZone; } catch { return "UTC"; } })();
  const day = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", timeZone: tz });
  const dayTime = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", hour: "numeric", minute: "2-digit", timeZone: tz });
  return {
    trialEnds: day.format(new Date(trialEndUnix * 1000)),
    deadline: dayTime.format(new Date(promiseDeadline(trialEndUnix) * 1000)),
  };
}

export type ChildEmail = "welcome" | "not_started" | "gradecheck" | "ending_soon";

/** Build and send one parent email for a child (at most once, ever). */
export async function sendChildEmail(kind: ChildEmail, childId: string, sub?: Stripe.Subscription | null): Promise<SendResult | "skipped"> {
  const supabase = getSupabase();
  const stripe = getStripe();
  if (!supabase || !stripe) return "skipped";
  const { data } = await supabase.from("child_profiles").select(CHILD_COLS).eq("id", childId).maybeSingle();
  const child = data as ChildRow | null;
  if (!child?.stripe_subscription_id) return "skipped";
  const parent = await parentOf(child.parent_user_id);
  if (!parent?.email) return "skipped";

  const s = sub ?? (await stripe.subscriptions.retrieve(child.stripe_subscription_id));
  if (s.metadata?.funnel !== "trial") return "skipped";
  const trialing = s.status === "trialing";
  if (kind !== "gradecheck" && !trialing) return "skipped";
  if (kind === "gradecheck" && !child.grade_check) return "skipped";

  const trialEnd = s.trial_end ?? Math.floor(Date.now() / 1000) + 7 * DAY;
  const tz = child.timezone || COUNTRY_TZ[parent.signup_country ?? ""] || "UTC";
  const labels = dateLabels(trialEnd, tz, parent.signup_country);
  const cur = (s.currency in FUNNEL_PRICES ? s.currency : "usd") as FunnelCurrency;
  const vars: FreeWeekVars = {
    childName: child.first_name,
    ...labels,
    inviteHref: parentLink(child.parent_user_id, "/invite"),
    cancelHref: cancelLink(s.id, child.parent_user_id),
    price: funnelPrice(cur, s.metadata?.billing === "monthly" ? "monthly" : "yearly").perPeriod,
  };

  const e =
    kind === "welcome" ? welcomeEmail(vars)
    : kind === "not_started" ? notStartedEmail(vars)
    : kind === "ending_soon" ? endingSoonEmail(vars, !!child.grade_check_completed_at)
    : gradeCheckEmail(vars, child.grade_check!);
  return sendEmail({ to: parent.email, ...e, key: `${kind}:${child.id}`, template: `free_week_${kind}` });
}

/** Which emails are due for a child right now (pure; unit tested). */
export function dueEmails(c: { trialStart: number; trialEnd: number; now: number; status: string; inviteOpened: boolean; gradeCheckDone: boolean }): ChildEmail[] {
  const out: ChildEmail[] = [];
  if (c.gradeCheckDone) out.push("gradecheck");
  if (c.status !== "trialing") return out;
  out.push("welcome");
  if (!c.inviteOpened && !c.gradeCheckDone && c.now >= c.trialStart + DAY) out.push("not_started");
  if (c.now >= c.trialStart + 4 * DAY && c.now < c.trialEnd) out.push("ending_soon");
  return out;
}

// ── The hourly job ──

export type JobReport = { checked: number; cancelled: number; held: number; emails: number; errors: string[] };

export async function runFreeWeekJobs(now = Math.floor(Date.now() / 1000)): Promise<JobReport> {
  const report: JobReport = { checked: 0, cancelled: 0, held: 0, emails: 0, errors: [] };
  const supabase = getSupabase();
  const stripe = getStripe();
  const deps = liveDeps();
  if (!supabase || !stripe || !deps) { report.errors.push("not configured"); return report; }

  // Every free-week family from the last 15 days (7-day trial + a week of
  // guard sweeps). Test accounts only ever with test keys, and vice versa.
  const since = new Date((now - 15 * DAY) * 1000).toISOString();
  const { data: rows, error } = await supabase
    .from("child_profiles")
    .select(CHILD_COLS)
    .not("stripe_subscription_id", "is", null)
    .eq("is_test", !livemode())
    .gte("created_at", since)
    .limit(2000);
  if (error) { report.errors.push(`candidates: ${error.message}`); return report; }

  for (const child of (rows ?? []) as ChildRow[]) {
    const subId = child.stripe_subscription_id!;
    report.checked++;
    let sub: Stripe.Subscription;
    try {
      sub = await stripe.subscriptions.retrieve(subId);
    } catch (err) {
      report.errors.push(`${subId}: ${String(err)}`);
      continue;
    }
    const pSub: PromiseSub = { id: sub.id, status: sub.status, trial_end: sub.trial_end, metadata: (sub.metadata ?? {}) as Record<string, string> };

    // 1. The promise.
    if (sub.status === "trialing" && !child.grade_check_completed_at) {
      const r = await enforcePromise({ ...deps, stripe: { ...deps.stripe, getSubscription: async () => pSub }, now: () => now }, subId);
      if (r.cancelled) report.cancelled++;
      if (r.error) report.errors.push(`${subId}: ${r.error}`);
      if (r.cancelled) continue;
    }

    // 2. After the free week: run the webhook layers from here too, so the
    // promise holds even if Stripe's webhooks never arrive. Unpaid first
    // invoice → guard (hold, then void or release); paid first invoice →
    // refund check. Both ignore renewals and are safe to repeat.
    if (sub.trial_end && now > sub.trial_end && promiseApplies(pSub)) {
      try {
        const invoices = await stripe.invoices.list({ subscription: subId, limit: 5 });
        for (const inv of invoices.data) {
          if (inv.status === "draft" || inv.status === "open") {
            if (inv.metadata?.promise_hold !== "1" && inv.status === "open" && child.grade_check_completed_at) continue; // normal billing
            const g = await guardInvoice({ ...deps, now: () => now }, {
              id: inv.id!, subscriptionId: subId, billing_reason: inv.billing_reason, amount_due: inv.amount_due, status: inv.status,
            });
            if (g === "voided") report.cancelled++;
          } else if (inv.status === "paid" && inv.amount_paid > 0) {
            if (await refundIfPromiseBroken({ ...deps, now: () => now }, { id: inv.id!, subscriptionId: subId, amount_paid: inv.amount_paid })) report.cancelled++;
          }
        }
      } catch (err) {
        report.held++;
        report.errors.push(`${subId} after-trial check: ${String(err)}`);
      }
    }

    // 3. Emails.
    if (!sub.trial_start || !sub.trial_end || child.auto_cancelled_at) continue;
    const due = dueEmails({
      trialStart: sub.trial_start, trialEnd: sub.trial_end, now, status: sub.status,
      inviteOpened: !!child.invite_opened_at || !!child.kid_user_id, gradeCheckDone: !!child.grade_check_completed_at,
    });
    for (const kind of due) {
      try {
        const r = await sendChildEmail(kind, child.id, sub);
        if (r === "sent") report.emails++;
        if (r === "failed") report.errors.push(`${child.id} ${kind}: send failed`);
      } catch (err) {
        report.errors.push(`${child.id} ${kind}: ${String(err)}`);
      }
    }
  }

  if (report.errors.length) console.error("free-week jobs:", report.errors);
  return report;
}
