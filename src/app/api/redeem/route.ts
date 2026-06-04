import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateProfile, redeemCode } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// POST /api/redeem
// Body: { code: string }
// Redeems a free-trial / school access code for the signed-in user.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let body: { code?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code : "";
  if (!code.trim()) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }

  // Make sure a profile row exists before we grant onto it (Clerk webhook race).
  let email: string | null = null;
  try {
    const user = await currentUser();
    email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  } catch {
    /* edge contexts can fail currentUser; the grant still works */
  }
  await getOrCreateProfile(userId, email);

  const result = await redeemCode(userId, code);
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
