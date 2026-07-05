import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getSupabase, logEvent } from "@/lib/supabase";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

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
    // Development mode — no signature verification
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

        // Determine tier from the price
        const priceId = subscription.items.data[0]?.price?.id;
        let tier: "free" | "student" | "pro" = "free";

        // Check which tier this price belongs to
        const studentPrices = [
          process.env.STRIPE_PRICE_STUDENT_MONTHLY,
          process.env.STRIPE_PRICE_STUDENT_YEARLY,
        ];
        const proPrices = [
          process.env.STRIPE_PRICE_PRO_MONTHLY,
          process.env.STRIPE_PRICE_PRO_YEARLY,
        ];

        if (priceId && studentPrices.includes(priceId)) {
          tier = "student";
        } else if (priceId && proPrices.includes(priceId)) {
          tier = "pro";
        } else if (subscription.metadata?.tier) {
          tier = subscription.metadata.tier as "student" | "pro";
        }

        const status = subscription.status;
        const itemPeriodEnd = subscription.items.data[0]?.current_period_end;
        const currentPeriodEnd = itemPeriodEnd
          ? new Date(itemPeriodEnd * 1000).toISOString()
          : null;

        await supabase
          .from("profiles")
          .update({
            tier: status === "active" ? tier : "free",
            subscription_status: status,
            current_period_end: currentPeriodEnd,
          })
          .eq("user_id", userId);

        console.log(`User ${userId} subscription updated: ${status}, tier: ${tier}`);
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
