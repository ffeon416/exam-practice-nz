import { describe, expect, it } from "vitest";
import { FUNNEL_PRICES, currencyForCountry, funnelPrice, funnelPricesForCountry } from "@/lib/funnelPricing";
import { buildTrialSessionParams, childNameFromSession } from "@/lib/trialCheckout";
import { isCheckoutSessionId } from "@/lib/funnelProvision";
import type Stripe from "stripe";

describe("local currency", () => {
  it("maps the five markets and falls back to USD", () => {
    expect(currencyForCountry("GB")).toBe("gbp");
    expect(currencyForCountry("au")).toBe("aud");
    expect(currencyForCountry("NZ")).toBe("nzd");
    expect(currencyForCountry("US")).toBe("usd");
    expect(currencyForCountry("CA")).toBe("cad");
    for (const c of ["DE", "IE", "SG", null, undefined, ""]) expect(currencyForCountry(c)).toBe("usd");
  });

  it("holds the agreed prices", () => {
    expect(FUNNEL_PRICES).toEqual({
      gbp: { yearly: 69, monthly: 22, prefix: "£" },
      aud: { yearly: 139, monthly: 45, prefix: "A$" },
      nzd: { yearly: 149, monthly: 49, prefix: "NZ$" },
      usd: { yearly: 89, monthly: 29, prefix: "US$" },
      cad: { yearly: 119, monthly: 39, prefix: "C$" },
    });
  });

  it("formats labels", () => {
    expect(funnelPrice("gbp", "yearly")).toEqual({ currency: "gbp", amount: 69, label: "£69", perPeriod: "£69 a year" });
    expect(funnelPricesForCountry("AU").monthly.perPeriod).toBe("A$45 a month");
  });
});

describe("free-week checkout session", () => {
  const base = {
    priceId: "price_123",
    currency: "gbp" as const,
    billing: "yearly" as const,
    origin: "https://studyace.co",
    sessionMetadata: { source: "meta" },
    subscriptionMetadata: { meta_ok: "1", utm_source: "facebook" },
  };

  it("is a 7-day trial with the card taken upfront, in local currency", () => {
    const p = buildTrialSessionParams(base);
    expect(p.mode).toBe("subscription");
    expect(p.currency).toBe("gbp");
    expect(p.payment_method_collection).toBe("always");
    expect(p.subscription_data?.trial_period_days).toBe(7);
    expect(p.subscription_data?.trial_settings?.end_behavior.missing_payment_method).toBe("cancel");
    expect(p.line_items).toEqual([{ price: "price_123", quantity: 1 }]);
  });

  it("leaves dynamic payment methods on (Apple Pay / Google Pay)", () => {
    expect(buildTrialSessionParams(base)).not.toHaveProperty("payment_method_types");
  });

  it("asks only for the child's first name on top of Stripe's email", () => {
    const p = buildTrialSessionParams(base);
    expect(p.custom_fields).toHaveLength(1);
    expect(p.custom_fields?.[0].key).toBe("childname");
    expect(p).not.toHaveProperty("phone_number_collection");
    expect(p).not.toHaveProperty("shipping_address_collection");
    expect(p.billing_address_collection).toBeUndefined();
  });

  it("tags session and subscription as the funnel, Pro, with tracking", () => {
    const p = buildTrialSessionParams(base);
    expect(p.metadata).toMatchObject({ funnel: "trial", tier: "pro", billing: "yearly", source: "meta" });
    expect(p.subscription_data?.metadata).toMatchObject({ funnel: "trial", tier: "pro", meta_ok: "1", utm_source: "facebook" });
    expect(p.metadata).not.toHaveProperty("userId");
    expect(p.success_url).toBe("https://studyace.co/invite?session_id={CHECKOUT_SESSION_ID}");
  });

  it("binds an existing account when signed in", () => {
    const p = buildTrialSessionParams({ ...base, userId: "user_1", customerId: "cus_1" });
    expect(p.customer).toBe("cus_1");
    expect(p.metadata?.userId).toBe("user_1");
    expect(p.subscription_data?.metadata?.userId).toBe("user_1");
  });

  it("keeps every metadata value Stripe-legal", () => {
    const p = buildTrialSessionParams(base);
    for (const md of [p.metadata!, p.subscription_data!.metadata!]) {
      expect(Object.keys(md).length).toBeLessThanOrEqual(50);
      for (const v of Object.values(md)) expect(String(v).length).toBeLessThanOrEqual(500);
    }
    const submit = p.custom_text?.submit;
    expect(submit && typeof submit === "object" ? submit.message.length : 0).toBeLessThanOrEqual(1200);
  });
});

describe("child's first name", () => {
  const s = (value: string | null) =>
    ({ custom_fields: [{ key: "childname", text: { value } }] }) as unknown as Pick<Stripe.Checkout.Session, "custom_fields">;
  it("tidies what the parent typed", () => {
    expect(childNameFromSession(s("  mia "))).toBe("Mia");
    expect(childNameFromSession(s("McKenzie"))).toBe("McKenzie");
    expect(childNameFromSession(s("<b>Leo</b>"))).toBe("bLeo/b");
    expect(childNameFromSession(s(""))).toBeNull();
    expect(childNameFromSession({ custom_fields: [] } as unknown as Pick<Stripe.Checkout.Session, "custom_fields">)).toBeNull();
  });
});

describe("checkout session ids", () => {
  it("accepts only Stripe checkout ids", () => {
    expect(isCheckoutSessionId("cs_test_a1B2c3D4e5F6g7")).toBe(true);
    expect(isCheckoutSessionId("cs_live_a1B2c3D4e5F6g7")).toBe(true);
    for (const v of ["", "cs_test_", "pi_123", "cs_test_abc;drop", null, 42]) expect(isCheckoutSessionId(v)).toBe(false);
  });
});
