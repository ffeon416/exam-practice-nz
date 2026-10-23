// Free-week funnel prices, by country. Isomorphic (no imports).
//
// These are the DISPLAY amounts. What Stripe actually charges comes from the
// two multi-currency Prices (STRIPE_PRICE_FUNNEL_YEARLY / _MONTHLY), whose
// currency_options must hold the same numbers — scripts/stripe-funnel-prices.mjs
// creates them from this file, so the two can't drift. Change a price here,
// re-run the script, and update the env vars to the new Price ids.
//
// Existing subscribers are never affected: Stripe bills the Price already on
// their subscription.

export type FunnelCurrency = "gbp" | "aud" | "nzd" | "usd" | "cad";
export type FunnelBilling = "yearly" | "monthly";

export const FUNNEL_PRICES: Record<FunnelCurrency, { yearly: number; monthly: number; prefix: string }> = {
  gbp: { yearly: 69, monthly: 22, prefix: "£" },
  aud: { yearly: 139, monthly: 45, prefix: "A$" },
  nzd: { yearly: 149, monthly: 49, prefix: "NZ$" },
  usd: { yearly: 89, monthly: 29, prefix: "US$" },
  cad: { yearly: 119, monthly: 39, prefix: "C$" },
};

/** Stripe Prices need one default currency; the others are currency_options. */
export const FUNNEL_DEFAULT_CURRENCY: FunnelCurrency = "nzd";

/** Everyone outside the five markets pays in US dollars. */
export const FUNNEL_FALLBACK_CURRENCY: FunnelCurrency = "usd";

export const TRIAL_DAYS = 7;

const BY_COUNTRY: Record<string, FunnelCurrency> = {
  GB: "gbp", UK: "gbp", IM: "gbp", JE: "gbp", GG: "gbp",
  AU: "aud",
  NZ: "nzd",
  US: "usd",
  CA: "cad",
};

export function currencyForCountry(country: string | null | undefined): FunnelCurrency {
  return (country && BY_COUNTRY[country.toUpperCase()]) || FUNNEL_FALLBACK_CURRENCY;
}

export function isFunnelBilling(v: unknown): v is FunnelBilling {
  return v === "yearly" || v === "monthly";
}

export type FunnelPrice = {
  currency: FunnelCurrency;
  amount: number;
  /** "£69" */
  label: string;
  /** "£69 a year" */
  perPeriod: string;
};

export function funnelPrice(currency: FunnelCurrency, billing: FunnelBilling): FunnelPrice {
  const p = FUNNEL_PRICES[currency];
  const amount = p[billing];
  const label = `${p.prefix}${amount}`;
  return { currency, amount, label, perPeriod: `${label} a ${billing === "yearly" ? "year" : "month"}` };
}

/** Both plans for a visitor's country — what the homepage pricing shows. */
export function funnelPricesForCountry(country: string | null | undefined) {
  const currency = currencyForCountry(country);
  return { currency, yearly: funnelPrice(currency, "yearly"), monthly: funnelPrice(currency, "monthly") };
}
