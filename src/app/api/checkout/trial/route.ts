import { NextRequest, NextResponse, after } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { FUNNEL_PRICE_IDS, getStripe } from "@/lib/stripe";
import { getOrCreateProfile, getSupabase, logEvent } from "@/lib/supabase";
import { attributionFromRequest, attributionMetadata, attributionProps } from "@/lib/attributionServer";
import { metaMetadata, requestMeta, sendMetaEvent, utmFromRequest, utmMetadata } from "@/lib/metaCapi";
import { currencyForCountry, funnelPrice, isFunnelBilling } from "@/lib/funnelPricing";
import { TRIAL_COOKIE, emailHadTrial } from "@/lib/trialGuard";
import { buildTrialSessionParams } from "@/lib/trialCheckout";
import { COUNTRY_COOKIE } from "@/lib/metaShared";

export const dynamic = "force-dynamic";

// POST /api/checkout/trial { billing: "yearly" | "monthly", confirmPaid?, childId? }
// Starts the free week: a Stripe Checkout session in the visitor's currency
// (from Vercel's geo header — never from the browser). Returns the Stripe URL
// and the InitiateCheckout event id for the browser Pixel.
//
// One free week per person: if this browser or signed-in parent has already
// had one, it returns { alreadyTrialed, price } INSTEAD of a checkout, so the
// page can say so before any payment. Sending confirmPaid: true then opens a
// normal paid checkout (no trial). A repeat that slips past this (new browser,
// new email, same card) is caught after checkout — see lib/trialGuard.ts.

export async function POST(req: NextRequest) {
  try {
    const stripe = getStripe();
    if (!stripe) return NextResponse.json({ error: "Payments aren't set up yet. Please try again soon." }, { status: 503 });

    const body = (await req.json().catch(() => ({}))) as { billing?: unknown; confirmPaid?: unknown; childId?: unknown };
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

    const livemode = (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_live");
    // Local runs use Stripe TEST keys only (docs/FUNNEL-LOCAL-TESTING.md).
    if (livemode && process.env.NODE_ENV !== "production") {
      return NextResponse.json({ error: "Local dev must use Stripe test keys. See docs/FUNNEL-LOCAL-TESTING.md." }, { status: 503 });
    }
    let alreadyTrialed = req.cookies.get(TRIAL_COOKIE)?.value === "1";
    let childId: string | null = null;

    // An existing account can start only if it has no live plan right now.
    const { userId } = await auth();
    let customerId: string | null = null;
    if (userId) {
      const user = await currentUser();
      const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
      const profile = await getOrCreateProfile(userId, email);
      const live = profile?.subscription_status === "active" || profile?.subscription_status === "trialing";
      if (profile && profile.tier !== "free" && live) {
        return NextResponse.json({ error: "You already have StudyAce. Manage your plan from your profile." }, { status: 409 });
      }
      if (!alreadyTrialed && email) alreadyTrialed = await emailHadTrial(email, livemode);
      // Paid restart for a child this parent already has.
      if (typeof body.childId === "string" && /^[0-9a-f-]{36}$/i.test(body.childId)) {
        const { data: kid } = (await getSupabase()?.from("child_profiles").select("id").eq("id", body.childId).eq("parent_user_id", userId).maybeSingle()) ?? { data: null };
        childId = (kid?.id as string | undefined) ?? null;
      }
      customerId = profile?.stripe_customer_id ?? null;
      if (!customerId) {
        const customer = await stripe.customers.create({ email: email ?? undefined, metadata: { userId } });
        customerId = customer.id;
        await getSupabase()?.from("profiles").update({ stripe_customer_id: customerId }).eq("user_id", userId);
      }
    }

    const price = funnelPrice(currency, billing);
    if (alreadyTrialed && body.confirmPaid !== true) {
      return NextResponse.json({ alreadyTrialed: true, price: price.perPeriod });
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
        trial: !alreadyTrialed,
        childId,
        priceLabel: price.perPeriod,
        sessionMetadata: attributionMetadata(attr),
        subscriptionMetadata: {
          visitor_id: attr.visitor_id ?? "",
          ...metaMetadata(m, sourceUrl),
          ...utmMetadata(utmFromRequest(req)),
        },
      })
    );

    void logEvent("checkout_started", userId ?? null, { tier: "pro", billing, trial: !alreadyTrialed, currency, ...attributionProps(attr) });

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
