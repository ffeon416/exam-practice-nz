import { NextRequest, NextResponse, after } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { FUNNEL_PRICE_IDS, getStripe } from "@/lib/stripe";
import { getOrCreateProfile, getSupabase, logEvent } from "@/lib/supabase";
import { attributionFromRequest, attributionMetadata, attributionProps } from "@/lib/attributionServer";
import { metaMetadata, requestMeta, sendMetaEvent, utmFromRequest, utmMetadata } from "@/lib/metaCapi";
import { currencyForCountry, isFunnelBilling } from "@/lib/funnelPricing";
import { buildTrialSessionParams } from "@/lib/trialCheckout";
import { COUNTRY_COOKIE } from "@/lib/metaShared";

export const dynamic = "force-dynamic";

// POST /api/checkout/trial { billing: "yearly" | "monthly" }
// Starts the free week: a Stripe Checkout session in the visitor's currency
// (from Vercel's geo header — never from the browser). Returns the Stripe URL
// and the InitiateCheckout event id for the browser Pixel.

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: "Payments aren't set up yet. Please try again soon." }, { status: 503 });

    const body = (await req.json().catch(() => ({}))) as { billing?: unknown };
    if (!isFunnelBilling(body.billing)) return NextResponse.json({ error: "Pick yearly or monthly." }, { status: 400 });
    const billing = body.billing;
    const priceId = FUNNEL_PRICE_IDS[billing];
    if (!priceId) {
      return NextResponse.json(
        { error: `Price not configured. Set STRIPE_PRICE_FUNNEL_${billing.toUpperCase()}.` },
        { status: 503 }
      );
    }

    const country = req.headers.get("x-vercel-ip-country") || req.cookies.get(COUNTRY_COOKIE)?.value || null;
    const currency = currencyForCountry(country);
    const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_URL ?? "http://localhost:3000";

    // An existing account can start a free week only if it has never paid.
    const { userId } = await auth();
    let customerId: string | null = null;
    if (userId) {
      const user = await currentUser();
      const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
      const profile = await getOrCreateProfile(userId, email);
      if (profile && (profile.tier !== "free" || profile.stripe_subscription_id)) {
        return NextResponse.json({ error: "You already have StudyAce. Manage your plan from your profile." }, { status: 409 });
      }
      customerId = profile?.stripe_customer_id ?? null;
      if (!customerId) {
        const customer = await stripe.customers.create({ email: email ?? undefined, metadata: { userId } });
        customerId = customer.id;
        await getSupabase()?.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", userId);
      }
    }

    const attr = attributionFromRequest(req);
    const m = requestMeta(req);
    const sourceUrl = req.headers.get("referer");
    const session = await stripe.checkout.sessions.create(
      buildTrialSessionParams({
        priceId,
        currency,
        billing,
        origin,
        userId,
        customerId,
        sessionMetadata: attributionMetadata(attr),
        subscriptionMetadata: {
          visitor_id: attr.visitor_id ?? "",
          ...metaMetadata(m, sourceUrl),
          ...utmMetadata(utmFromRequest(req)),
        },
      })
    );

    void logEvent("checkout_started", userId ?? null, { tier: "pro", billing, trial: true, currency, ...attributionProps(attr) });

    let metaEventId: string | null = null;
    if (m.allowed) {
      metaEventId = `ic_${session.id.slice(-40)}`;
      const id = metaEventId;
      after(() =>
        sendMetaEvent({
          name: "InitiateCheckout",
          eventId: id,
          sourceUrl,
          user: { ip: m.ip, ua: m.ua, fbp: m.fbp, fbc: m.fbc, country: m.country, externalId: attr.visitor_id },
          customData: { currency: currency.toUpperCase(), content_name: billing },
        })
      );
    }
    return NextResponse.json({ url: session.url, metaEventId });
  } catch (error) {
    console.error("Trial checkout error:", error);
    return NextResponse.json({ error: "Couldn't open checkout. Please try again." }, { status: 500 });
  }
}
