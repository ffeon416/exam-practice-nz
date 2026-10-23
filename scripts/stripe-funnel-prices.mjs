#!/usr/bin/env node
// Creates the two free-week funnel Prices (yearly, monthly) in Stripe, each
// one multi-currency (NZD default + GBP/AUD/USD/CAD currency_options), with
// the amounts from src/lib/funnelPricing.ts. Prints the env lines to set.
//
//   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-funnel-prices.mjs prod_XXXX
//
// prod_XXXX = the existing StudyAce Pro product (Dashboard → Products).
// TEST MODE ONLY unless you pass --live, on purpose: run it in test mode,
// check a test checkout, then run it again with the live key and --live.
// Never edits or archives existing Prices, so current subscribers are untouched.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const key = process.env.STRIPE_SECRET_KEY ?? "";
const live = process.argv.includes("--live");
const product = process.argv.slice(2).find((a) => a.startsWith("prod_"));

if (!product) {
  console.error("Usage: STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-funnel-prices.mjs prod_XXXX [--live]");
  process.exit(1);
}
if (key.startsWith("sk_live") && !live) {
  console.error("Refusing: that is a LIVE key. Use a test key, or pass --live deliberately.");
  process.exit(1);
}
if (!key.startsWith("sk_test") && !key.startsWith("sk_live") && !key.startsWith("rk_")) {
  console.error("STRIPE_SECRET_KEY missing.");
  process.exit(1);
}

// Read the amounts straight from the TS config so there is one source of truth.
const src = readFileSync(fileURLToPath(new URL("../src/lib/funnelPricing.ts", import.meta.url)), "utf8");
const prices = {};
for (const m of src.matchAll(/^\s+(gbp|aud|nzd|usd|cad): \{ yearly: (\d+(?:\.\d+)?), monthly: (\d+(?:\.\d+)?)/gm)) {
  prices[m[1]] = { yearly: Number(m[2]), monthly: Number(m[3]) };
}
const defaultCurrency = src.match(/FUNNEL_DEFAULT_CURRENCY: FunnelCurrency = "(\w+)"/)?.[1];
if (Object.keys(prices).length !== 5 || !defaultCurrency) {
  console.error("Couldn't read FUNNEL_PRICES from src/lib/funnelPricing.ts", prices);
  process.exit(1);
}

const cents = (n) => Math.round(n * 100);

async function createPrice(billing) {
  const body = new URLSearchParams();
  body.set("product", product);
  body.set("currency", defaultCurrency);
  body.set("unit_amount", String(cents(prices[defaultCurrency][billing])));
  body.set("recurring[interval]", billing === "yearly" ? "year" : "month");
  body.set("nickname", `Pro ${billing} (free-week funnel)`);
  body.set("metadata[funnel]", "trial");
  body.set("metadata[billing]", billing);
  body.set("tax_behavior", "inclusive");
  for (const [cur, p] of Object.entries(prices)) {
    if (cur === defaultCurrency) continue;
    body.set(`currency_options[${cur}][unit_amount]`, String(cents(p[billing])));
    body.set(`currency_options[${cur}][tax_behavior]`, "inclusive");
  }
  const res = await fetch("https://api.stripe.com/v1/prices", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`${billing}: ${json.error?.message ?? res.status}`);
  return json.id;
}

const yearly = await createPrice("yearly");
const monthly = await createPrice("monthly");
console.log(`\nCreated in ${key.startsWith("sk_live") ? "LIVE" : "TEST"} mode. Set these in Vercel:\n`);
console.log(`STRIPE_PRICE_FUNNEL_YEARLY=${yearly}`);
console.log(`STRIPE_PRICE_FUNNEL_MONTHLY=${monthly}\n`);
