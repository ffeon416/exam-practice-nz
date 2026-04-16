import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  return _stripe;
}

// Price IDs — set these when you create products in the Stripe dashboard.
export const PRICE_IDS = {
  student_monthly: process.env.STRIPE_PRICE_STUDENT_MONTHLY ?? "",
  student_yearly: process.env.STRIPE_PRICE_STUDENT_YEARLY ?? "",
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  pro_yearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
};
