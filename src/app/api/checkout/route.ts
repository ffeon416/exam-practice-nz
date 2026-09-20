import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getStripe, PRICE_IDS } from "@/lib/stripe";
import { isBilling } from "@/lib/tierLimits";
import { getOrCreateProfile, logEvent } from "@/lib/supabase";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// Only Pro is for sale (Student closed to new signups 2026-09-16; existing
// Student subscribers are untouched and keep their original price).
type CheckoutBody = {
  tier?: "pro";
  billing: "monthly" | "quarterly" | "yearly";
  /** Referrer Clerk id captured from a ?ref= link (optional). */
  ref?: string;
};

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) {
      return NextResponse.json(
        { error: "Payments are not configured yet. Please check back soon or contact us." },
        { status: 503 }
      );
    }

    const { userId } = await auth();

    const body = (await req.json()) as CheckoutBody;
    const tier = "pro" as const;
    const { billing } = body;

    if (body.tier !== undefined && body.tier !== "pro") {
      return NextResponse.json({ error: "That plan is no longer available. Pro is the only plan." }, { status: 400 });
    }
    if (!isBilling(billing)) {
      return NextResponse.json({ error: "Invalid billing period." }, { status: 400 });
    }

    // Resolve price ID
    const priceKey = `${tier}_${billing}` as const;
    const priceId = PRICE_IDS[priceKey];
    if (!priceId) {
      return NextResponse.json(
        { error: `Price not configured for ${tier} ${billing}. Set the STRIPE_PRICE_${tier.toUpperCase()}_${billing.toUpperCase()} env var.` },
        { status: 503 }
      );
    }

    // Build success/cancel URLs
    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";

    // ── Anonymous checkout ──
    // There is no sign-up: people pay first, then create their login on
    // /start. Stripe collects the email; the webhook allowlists it in Clerk;
    // /start attaches the subscription once the account exists.
    if (!userId) {
      const ref = typeof body.ref === "string" && body.ref.length < 200 ? body.ref : "";
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        allow_promotion_codes: true,
        success_url: `${origin}/start?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing`,
        metadata: { tier, billing, anonymous: "1", ref },
        subscription_data: { metadata: { tier, billing } },
      });
      void logEvent("checkout_started", null, { tier, billing, anonymous: true });
      return NextResponse.json({ url: session.url });
    }

    // ── Signed-in checkout (existing accounts changing plan) ──
    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
    const profile = await getOrCreateProfile(userId, email);

    let stripeCustomerId = profile?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      // Create a Stripe customer
      const customer = await stripe.customers.create({
        email: email ?? undefined,
        metadata: { userId },
      });
      stripeCustomerId = customer.id;

      // Save customer ID to profile
      const supabase = getSupabase();
      if (supabase) {
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("user_id", userId);
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/start?payment=success&plan=${tier}`,
      cancel_url: `${origin}/pricing`,
      metadata: { userId, tier, billing },
      subscription_data: {
        metadata: { userId, tier, billing },
      },
    });

    // Funnel: record that this user reached Stripe checkout (fire-and-forget).
    void logEvent("checkout_started", userId, { tier, billing });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: `Failed to create checkout session: ${message}` },
      { status: 500 }
    );
  }
}
