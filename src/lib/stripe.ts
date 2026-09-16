import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  _stripe = new Stripe(key, {
    apiVersion: "2026-03-25.dahlia",
    httpClient: Stripe.createFetchHttpClient(),
  });
  return _stripe;
}

// Price IDs — set these when you create products in the Stripe dashboard.
// One plan for sale (Pro) in three billing periods. The Student prices are
// LEGACY — never sold since 2026-09-16 and never repriced: existing Student
// subscribers keep the price they signed up at (Stripe keeps the price on the
// subscription, so nothing here can change what they're charged).
export const PRICE_IDS = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  pro_quarterly: process.env.STRIPE_PRICE_PRO_QUARTERLY ?? "",
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
  student_monthly: process.env.STRIPE_PRICE_STUDENT_MONTHLY ?? "",
  student_yearly: process.env.STRIPE_PRICE_STUDENT_YEARLY ?? "",
};
