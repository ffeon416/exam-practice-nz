import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// Public: lets /start confirm an anonymous checkout paid before offering
// "create your login", and prefill the email they paid with. Returns nothing
// sensitive beyond the email the visitor just typed into Stripe themselves.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id || !/^cs_(live|test)_[A-Za-z0-9]+$/.test(id)) {
    return NextResponse.json({ paid: false }, { status: 400 });
  }
  const stripe = getStripe();
  if (!stripe) return NextResponse.json({ paid: false }, { status: 503 });
  try {
    const s = await stripe.checkout.sessions.retrieve(id);
    return NextResponse.json({
      paid: s.payment_status === "paid",
      email: s.customer_details?.email ?? s.customer_email ?? null,
      claimed: false,
    });
  } catch {
    return NextResponse.json({ paid: false }, { status: 404 });
  }
}
