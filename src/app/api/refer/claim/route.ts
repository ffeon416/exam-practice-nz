import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { claimReferral, getOrCreateProfile } from "@/lib/supabase";

// POST /api/refer/claim
// Body: { referrerId: string }
// Called once after a new user signs up via someone's referral link.
// The referee's profile may not exist yet (Clerk webhook race); create it
// before attempting the claim so the update has a row to target.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { referrerId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const referrerId = typeof body.referrerId === "string" ? body.referrerId.trim() : "";
  if (!referrerId) {
    return NextResponse.json({ error: "missing_referrer" }, { status: 400 });
  }

  if (referrerId === userId) {
    return NextResponse.json({ ok: false, reason: "self_referral" });
  }

  // Make sure both profiles exist before the claim attempts an update.
  let email: string | null = null;
  try {
    const user = await currentUser();
    email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  } catch {
    /* edge contexts can fail currentUser; profile lookup still works */
  }
  await getOrCreateProfile(userId, email);

  const claimed = await claimReferral(userId, referrerId);
  return NextResponse.json({ ok: claimed });
}
