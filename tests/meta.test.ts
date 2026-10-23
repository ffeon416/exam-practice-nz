import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { fbcFromClick, isParentPage, metaAllowed, needsConsent } from "@/lib/metaShared";
import { buildMetaEvent, metaMetadata, metaUserFromMetadata, parseUtmCookie, utmMetadata } from "@/lib/metaCapi";
import { isFirstRealCharge, majorUnits } from "@/lib/metaStripe";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

describe("consent", () => {
  it("needs opt-in for the UK, EU and EEA, and for unknown countries", () => {
    for (const c of ["GB", "gb", "DE", "IE", "FR", "NO", "IS", "LI", null, undefined, ""]) expect(needsConsent(c)).toBe(true);
    for (const c of ["AU", "NZ", "US", "CA"]) expect(needsConsent(c)).toBe(false);
  });

  it("allows Meta only with consent where needed, and always respects a no", () => {
    expect(metaAllowed("GB", null)).toBe(false);
    expect(metaAllowed("GB", "granted")).toBe(true);
    expect(metaAllowed("AU", null)).toBe(true);
    expect(metaAllowed("AU", "denied")).toBe(false);
  });
});

describe("parent pages", () => {
  it("runs on the sales and checkout pages only", () => {
    for (const p of ["/", "/pricing", "/start", "/start/x", "/on-track", "/invite/abc"]) expect(isParentPage(p)).toBe(true);
    for (const p of ["/schedule", "/grade", "/blog/post", "/join/abc", "/admin", "/pricingx", null]) expect(isParentPage(p)).toBe(false);
  });
});

describe("buildMetaEvent", () => {
  it("hashes email/external id/country and passes browser ids through", () => {
    const ev = buildMetaEvent({
      name: "Purchase",
      eventId: "purchase_sub_123",
      sourceUrl: "https://studyace.co/",
      time: 1700000000,
      user: { email: "  Parent@Example.COM ", externalId: "vid-1", country: "GB", ip: "1.2.3.4", ua: "UA", fbp: "fb.1.1.2", fbc: "fb.1.1.abc" },
      customData: { value: 79.99, currency: "GBP" },
    });
    expect(ev).toEqual({
      event_name: "Purchase",
      event_time: 1700000000,
      event_id: "purchase_sub_123",
      action_source: "website",
      event_source_url: "https://studyace.co/",
      user_data: {
        em: [sha("parent@example.com")],
        external_id: [sha("vid-1")],
        country: [sha("gb")],
        client_ip_address: "1.2.3.4",
        client_user_agent: "UA",
        fbp: "fb.1.1.2",
        fbc: "fb.1.1.abc",
      },
      custom_data: { value: 79.99, currency: "GBP" },
    });
  });

  it("omits empty fields", () => {
    const ev = buildMetaEvent({ name: "PageView", eventId: "abcdefgh12", user: {} });
    expect(ev.user_data).toEqual({});
    expect(ev).not.toHaveProperty("custom_data");
    expect(ev).not.toHaveProperty("event_source_url");
  });
});

describe("identity through Stripe metadata", () => {
  const m = { allowed: true, consent: null, country: "AU", ip: "1.2.3.4", ua: "UA", fbp: "fbp1", fbc: "fbc1" } as const;

  it("round-trips when allowed", () => {
    const md = { ...metaMetadata(m, "https://studyace.co/"), visitor_id: "vid-1" };
    const who = metaUserFromMetadata(md, "p@x.com");
    expect(who?.user).toEqual({ email: "p@x.com", externalId: "vid-1", ip: "1.2.3.4", ua: "UA", fbp: "fbp1", fbc: "fbc1", country: "AU" });
    expect(who?.sourceUrl).toBe("https://studyace.co/");
  });

  it("carries nothing and sends nothing when not allowed", () => {
    const md = metaMetadata({ ...m, allowed: false }, "https://studyace.co/");
    expect(md).toEqual({ meta_ok: "0" });
    expect(metaUserFromMetadata(md, "p@x.com")).toBeNull();
    expect(metaUserFromMetadata(null)).toBeNull();
  });

  it("keeps every Stripe metadata value under 500 chars", () => {
    const md = metaMetadata({ ...m, ua: "x".repeat(2000), fbc: "y".repeat(2000) }, "z".repeat(2000));
    for (const v of Object.values(md)) expect(v.length).toBeLessThanOrEqual(500);
  });
});

describe("UTM cookie", () => {
  it("keeps known fields and drops junk", () => {
    const raw = JSON.stringify({ utm_source: "facebook", utm_campaign: "uk-gcse", landing_page: "/?utm_source=facebook", fbclid: "AbC_1-2", fbclid_at: 1700000000000, evil: "x" });
    expect(parseUtmCookie(raw)).toEqual({ utm_source: "facebook", utm_campaign: "uk-gcse", landing_page: "/?utm_source=facebook", fbclid: "AbC_1-2", fbclid_at: 1700000000000 });
    expect(parseUtmCookie("not json")).toEqual({});
    expect(parseUtmCookie(JSON.stringify({ fbclid: "bad id;" }))).toEqual({});
  });

  it("maps to Stripe metadata without the click id", () => {
    expect(utmMetadata({ utm_source: "facebook", landing_page: "/", fbclid: "abc" })).toEqual({ utm_source: "facebook", landing_page: "/" });
  });

  it("builds fbc in Meta's format", () => {
    expect(fbcFromClick("abc", 1700000000000)).toBe("fb.1.1700000000000.abc");
  });
});

describe("Purchase = first real charge only", () => {
  it("ignores the £0 trial invoice", () => {
    expect(isFirstRealCharge({ id: "in_0", amount_paid: 0 }, [{ id: "in_0", amount_paid: 0 }])).toBe(false);
  });
  it("counts the first charge after a trial", () => {
    const paid = [{ id: "in_0", amount_paid: 0 }, { id: "in_1", amount_paid: 1499 }];
    expect(isFirstRealCharge({ id: "in_1", amount_paid: 1499 }, paid)).toBe(true);
  });
  it("counts it even if the list call hasn't caught up yet", () => {
    expect(isFirstRealCharge({ id: "in_1", amount_paid: 1499 }, [{ id: "in_0", amount_paid: 0 }])).toBe(true);
  });
  it("never counts a renewal", () => {
    const paid = [{ id: "in_1", amount_paid: 1499 }, { id: "in_2", amount_paid: 1499 }];
    expect(isFirstRealCharge({ id: "in_2", amount_paid: 1499 }, paid)).toBe(false);
  });
  it("converts minor units", () => {
    expect(majorUnits(14999)).toBe(149.99);
  });
});
