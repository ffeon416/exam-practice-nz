import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getStripe, PRICE_IDS } from "@/lib/stripe";
import { getOrCreateProfile } from "@/lib/supabase";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

type CheckoutBody = {
  tier: "student" | "pro";
  billing: "monthly" | "yearly";
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
    if (!userId) {
      return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
    }

    const body = (await req.json()) as CheckoutBody;
    const { tier, billing } = body;

    if (!tier || !["student", "pro"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier." }, { status: 400 });
    }
    if (!billing || !["monthly", "yearly"].includes(billing)) {
      return NextResponse.json({ error: "Invalid billing period." }, { status: 400 });
    }

    // Resolve price ID
    const priceKey = `${tier}_${billing}` as keyof typeof PRICE_IDS;
    const priceId = PRICE_IDS[priceKey];
    if (!priceId) {
      return NextResponse.json(
        { error: `Price not configured for ${tier} ${billing}. Set the STRIPE_PRICE_${tier.toUpperCase()}_${billing.toUpperCase()} env var.` },
        { status: 503 }
      );
    }

    // Get or create profile + Stripe customer
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

    // Build success/cancel URLs
    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/pricing`,
      metadata: { userId, tier },
      subscription_data: {
        metadata: { userId, tier },
      },
    });

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
