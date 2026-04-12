// Server-side tier checker. Use in API routes and server components.

import { auth } from "@clerk/nextjs/server";
import { getOrCreateProfile, getTier } from "./supabase";
import { TIER_LIMITS, type Tier, type TierLimits } from "./tierLimits";
import { getUsage } from "./db";

export interface TierInfo {
  tier: Tier;
  limits: TierLimits;
  usage: {
    examsThisWeek: number;
    tutorMessagesToday: number;
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
      usage: { examsThisWeek: 0, tutorMessagesToday: 0 },
    };
  }

  // Ensure profile exists (creates with "free" tier if new)
  await getOrCreateProfile(userId, null);

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
      tutorMessagesToday: tutorUsage.count,
    },
  };
}
