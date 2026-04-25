// Server-side tier checker. Use in API routes and server components.

import { auth, currentUser } from "@clerk/nextjs/server";
import { getOrCreateProfile, getTier } from "./supabase";
import { TIER_LIMITS, type Tier, type TierLimits } from "./tierLimits";
import { getUsage } from "./db";

export interface TierInfo {
  tier: Tier;
  limits: TierLimits;
  usage: {
    examsThisWeek: number;
    tutorMessagesThisWeek: number;
  };
}

/**
 * Get the current user's tier, limits, and usage.
 * Returns "free" defaults for unauthenticated users.
 */
export async function checkTier(): Promise<TierInfo & { userId: string | null }> {
  const { userId } = await auth();

  if (!userId) {
    return {
      userId: null,
      tier: "free",
      limits: TIER_LIMITS.free,
      usage: { examsThisWeek: 0, tutorMessagesThisWeek: 0 },
    };
  }

  // Ensure profile exists (creates with "free" tier if new).
  // Pull email from Clerk so the profile row has it — used in the admin dashboard.
  let email: string | null = null;
  try {
    const user = await currentUser();
    email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  } catch {
    // currentUser() can fail in edge contexts — profile lookup still works without email
  }
  await getOrCreateProfile(userId, email);

  const tier = await getTier(userId);
  const limits = TIER_LIMITS[tier];

  const [examUsage, tutorUsage] = await Promise.all([
    getUsage(userId, "exams_generated"),
    getUsage(userId, "tutor_messages"),
  ]);

  return {
    userId,
    tier,
    limits,
    usage: {
      examsThisWeek: examUsage.count,
      tutorMessagesThisWeek: tutorUsage.count,
    },
  };
}
