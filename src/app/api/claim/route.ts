import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { claimPurchase } from "@/lib/claimPurchase";
import { getOrCreateProfile } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// After paying anonymously and creating a login, /start calls this to attach
// the subscription to the new account.
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let sessionId: string | null = null;
  try { sessionId = ((await request.json()) as { sessionId?: string }).sessionId ?? null; } catch {}
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  await getOrCreateProfile(userId, email);
  const tier = await claimPurchase({ userId, email, sessionId });
  return NextResponse.json({ tier });
}
