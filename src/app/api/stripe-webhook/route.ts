import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabase, logEvent } from "@/lib/supabase";
import type Stripe from "stripe";
import { inviteEmail } from "@/lib/clerkInvite";

export const dynamic = "force-dynamic";

// Every price StudyAce has ever sold, so a renewal on a grandfathered
// subscription (old Student/Pro prices) can never be misread. Existing
// subscribers keep the exact price they signed up at — Stripe bills the price
// on the subscription, and this map only READS it to keep their tier right.
const LEGACY_PRICE_TIERS: Record<string, "student" | "pro"> = {
  price_1TQQwmEawYTUXAvo0nHw4HBP: "student", // Student monthly NZ$9.99 (Apr 2026)
  price_1TQRBAEawYTUXAvoxwIy8Pgz: "student", // Student yearly NZ$83.92
  price_1TeVTZEawYTUXAvoD81vcjjM: "student", // Student monthly NZ$15 (Jun 2026)
  price_1TeVTZEawYTUXAvoPjLfCG8l: "student", // Student yearly NZ$126
  price_1TQRDnEawYTUXAvoA1KIujWW: "pro", // Pro monthly NZ$19.99 (Apr 2026)
  price_1TQRFmEawYTUXAvoDZJaTIXC: "pro", // Pro yearly NZ$167.92
  price_1TpiHDEawYTUXAvoukgK4E3t: "pro", // Pro monthly NZ$20 (Jul 2026)
  price_1TpiHDEawYTUXAvoDI0aH6nk: "pro", // Pro yearly NZ$168
};

/** Resolve a subscription's tier: checkout metadata first (immutable), then
 *  current env prices, then every legacy price. Returns null if unknown so the
 *  caller leaves the stored tier alone rather than guessing. */
function tierForSubscription(sub: Stripe.Subscription): "student" | "pro" | null {
  const meta = sub.metadata?.tier;
  if (meta === "student" || meta === "pro") return meta;
  const priceId = sub.items.data[0]?.price?.id;
  if (!priceId) return null;
  const proPrices = [
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_PRO_QUARTERLY,
    process.env.STRIPE_PRICE_PRO_YEARLY,
  ].filter(Boolean);
  const studentPrices = [
    process.env.STRIPE_PRICE_STUDENT_MONTHLY,
    process.env.STRIPE_PRICE_STUDENT_YEARLY,
  ].filter(Boolean);
  if (proPrices.includes(priceId)) return "pro";
  if (studentPrices.includes(priceId)) return "student";
  return LEGACY_PRICE_TIERS[priceId] ?? null;
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (webhookSecret && signature) {
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  } else {
    // Unsigned processing is a DEV-ONLY convenience. In production a missing
    // secret must hard-fail — otherwise anyone could POST a forged
    // checkout.session.completed and self-upgrade their tier.
    if (process.env.NODE_ENV === "production") {
      console.error("STRIPE_WEBHOOK_SECRET missing in production — rejecting unsigned webhook.");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
    }
    console.warn("STRIPE_WEBHOOK_SECRET not set. Processing event without verification.");
    try {
      event = JSON.parse(body) as Stripe.Event;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }

  const supabase = getSupabase();
  if (!supabase) {
    console.error("Supabase not configured — cannot process webhook");
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const tier = session.metadata?.tier as "student" | "pro" | undefined;

        if (!userId && session.metadata?.anonymous === "1") {
          // Paid before having an account. Invite this email (Clerk sign-ups
          // are invitation-only) and let Clerk email the link as a backup in
          // case they closed the tab; /start does the linking.
          const email = session.customer_details?.email ?? session.customer_email ?? null;
          if (email) await inviteEmail(email, session.id, true);
          void logEvent("subscription_paid", null, { plan: tier ?? "pro", anonymous: true, email });
          console.log(`Anonymous purchase for ${email ?? "(no email)"} — invited to create a login`);
          break;
        }
        if (!userId || !tier) {
          console.error("checkout.session.completed missing userId or tier in metadata");
          break;
        }

        // Retrieve subscription details
        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;

        let currentPeriodEnd: string | null = null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          // In Stripe API 2026+, current_period_end lives on items, not subscription
          const itemPeriodEnd = sub.items.data[0]?.current_period_end;
          if (itemPeriodEnd) {
            currentPeriodEnd = new Date(itemPeriodEnd * 1000).toISOString();
          }
        }

        // Cancel any prior active subscription so the user isn't billed twice
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("stripe_subscription_id")
          .eq("user_id", userId)
          .single();

        const priorSubId = existingProfile?.stripe_subscription_id;
        if (priorSubId && priorSubId !== subscriptionId) {
          try {
            await stripe.subscriptions.cancel(priorSubId);
            console.log(`Cancelled prior subscription ${priorSubId} for user ${userId}`);
          } catch (err) {
            console.error(`Failed to cancel prior subscription ${priorSubId}:`, err);
          }
        }

        await supabase
          .from("profiles")
          .update({
            tier,
            stripe_subscription_id: subscriptionId ?? null,
            subscription_status: "active",
            current_period_end: currentPeriodEnd,
            stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          })
          .eq("user_id", userId);

        // Funnel: authoritative "paid" event, fired only on a real completed
        // checkout (fire-and-forget — never block the webhook ack).
        void logEvent("subscription_paid", userId, { plan: tier });

        console.log(`User ${userId} upgraded to ${tier}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          console.error("subscription.updated missing userId in metadata");
          break;
        }

        const tier = tierForSubscription(subscription);
        const status = subscription.status;
        const paid = status === "active" || status === "trialing";
        const itemPeriodEnd = subscription.items.data[0]?.current_period_end;
        const currentPeriodEnd = itemPeriodEnd
          ? new Date(itemPeriodEnd * 1000).toISOString()
          : null;

        const update: Record<string, unknown> = {
          subscription_status: status,
          current_period_end: currentPeriodEnd,
        };
        if (!paid) {
          update.tier = "free";
        } else if (tier) {
          update.tier = tier;
        } else {
          // Unknown price and no metadata: keep whatever tier is stored rather
          // than downgrading a paying customer on a guess.
          console.error(
            `subscription.updated: could not resolve tier for ${subscription.id} (price ${subscription.items.data[0]?.price?.id}) — leaving tier unchanged`
          );
        }

        await supabase.from("profiles").update(update).eq("user_id", userId);

        console.log(`User ${userId} subscription updated: ${status}, tier: ${update.tier ?? "(unchanged)"}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (!userId) {
          console.error("subscription.deleted missing userId in metadata");
          break;
        }

        // Only downgrade if the cancelled sub is the user's CURRENT one.
        // If they upgraded and we cancelled the old sub, that deletion event
        // shouldn't wipe out the new active subscription.
        const { data: profile } = await supabase
          .from("profiles")
          .select("stripe_subscription_id")
          .eq("user_id", userId)
          .single();

        if (profile?.stripe_subscription_id !== subscription.id) {
          console.log(`Ignoring deletion of stale sub ${subscription.id} for user ${userId} (current: ${profile?.stripe_subscription_id})`);
          break;
        }

        await supabase
          .from("profiles")
          .update({
            tier: "free",
            subscription_status: "canceled",
            stripe_subscription_id: null,
          })
          .eq("user_id", userId);

        console.log(`User ${userId} subscription canceled — downgraded to free`);
        break;
      }

      default:
        // Ignore other event types
        break;
    }
  } catch (error) {
    console.error(`Error processing webhook event ${event.type}:`, error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
