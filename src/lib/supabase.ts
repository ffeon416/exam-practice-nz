// Supabase client — server-side only.
// Uses the service-role key so it bypasses RLS. All access is gated through
// our own auth (Clerk) which sets the user_id on every query.
//
// Never import this from a client component — the service-role key must
// stay on the server.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    // Database not configured yet — callers should handle null gracefully
    // and fall back to localStorage during the transition.
    return null;
  }

  _client = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return _client;
}

// Convenience wrapper that throws if Supabase isn't configured. Use this
// from API routes that strictly require the database.
export function requireSupabase(): SupabaseClient {
  const client = getSupabase();
  if (!client) {
    throw new Error("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return client;
}

// ── Profile helpers ──

export interface Profile {
  user_id: string;
  email: string | null;
  tier: "free" | "student" | "pro";
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  current_period_end: string | null;
  referrer_id: string | null;
  referrals_count: number;
  pro_until: string | null;
  bonus_exams_remaining: number;
  created_at: string;
  updated_at: string;
}

/**
 * Fetch a profile, creating it if it doesn't exist.
 * Called whenever a Clerk user hits the API for the first time.
 * If the row already exists but is missing an email (historical rows
 * created before we populated it from Clerk), backfill the email now.
 */
export async function getOrCreateProfile(
  userId: string,
  email: string | null
): Promise<Profile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: existing } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existing) {
    // Opportunistic backfill — if we've just learned the email and the row
    // doesn't have one saved yet, update it so the admin dashboard can show it.
    if (email && !existing.email) {
      await supabase
        .from("profiles")
        .update({ email, updated_at: new Date().toISOString() })
        .eq("user_id", userId);
      return { ...(existing as Profile), email };
    }
    return existing as Profile;
  }

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({ user_id: userId, email, tier: "free" })
    .select()
    .single();

  if (error) {
    console.error("Failed to create profile:", error);
    return null;
  }

  return created as Profile;
}

/**
 * Get a user's effective tier — honours referral-granted Pro time.
 * If pro_until is in the future and the paid tier is "free", returns "pro".
 * Defaults to 'free' if no profile exists yet.
 */
export async function getTier(userId: string): Promise<"free" | "student" | "pro"> {
  const supabase = getSupabase();
  if (!supabase) return "free";

  const { data } = await supabase
    .from("profiles")
    .select("tier, pro_until")
    .eq("user_id", userId)
    .single();

  const baseTier = (data?.tier as "free" | "student" | "pro") ?? "free";
  if (baseTier !== "free") return baseTier;

  // Referral-granted Pro overrides free
  if (data?.pro_until && new Date(data.pro_until).getTime() > Date.now()) {
    return "pro";
  }
  return baseTier;
}

/**
 * Atomically claim a referral. Validates that:
 *  - referrerId exists and is not the same as newUserId
 *  - newUserId hasn't already been referred (referrer_id is null)
 * On success: sets referrer_id on the new user, increments referrer's
 * referrals_count, pushes referrer's pro_until forward by 7 days, and
 * gives the new user 5 bonus exams.
 * Returns true if claimed, false if rejected (duplicate, self-ref, etc).
 */
export async function claimReferral(
  newUserId: string,
  referrerId: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  if (newUserId === referrerId) return false;

  // Make sure both profiles exist and the new user isn't already attributed.
  const { data: newUser } = await supabase
    .from("profiles")
    .select("user_id, referrer_id")
    .eq("user_id", newUserId)
    .single();
  if (!newUser || newUser.referrer_id) return false;

  const { data: referrer } = await supabase
    .from("profiles")
    .select("user_id, pro_until, referrals_count")
    .eq("user_id", referrerId)
    .single();
  if (!referrer) return false;

  // Push referrer's Pro window forward by 7 days. Stack on existing future date if any.
  const now = Date.now();
  const currentEnd =
    referrer.pro_until && new Date(referrer.pro_until).getTime() > now
      ? new Date(referrer.pro_until).getTime()
      : now;
  const newProUntil = new Date(currentEnd + 7 * 24 * 60 * 60 * 1000).toISOString();

  // Apply both updates. If the second fails after the first succeeds we'd
  // have a partial state, but the worst case is the new user gets bonus
  // exams without crediting the referrer — much less bad than the inverse.
  const { error: refereeErr } = await supabase
    .from("profiles")
    .update({
      referrer_id: referrerId,
      bonus_exams_remaining: 5,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", newUserId)
    .is("referrer_id", null); // race-safe: only updates if still unattributed
  if (refereeErr) {
    console.error("claimReferral: failed to update referee", refereeErr);
    return false;
  }

  const { error: referrerErr } = await supabase
    .from("profiles")
    .update({
      referrals_count: (referrer.referrals_count ?? 0) + 1,
      pro_until: newProUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", referrerId);
  if (referrerErr) {
    console.error("claimReferral: failed to credit referrer", referrerErr);
    // Don't return false — the referee already got their bonus, and rolling
    // back leaves them worse off than the partial-credit state above.
  }

  return true;
}

/**
 * Get referral stats for the /refer page.
 */
export async function getReferralStats(
  userId: string
): Promise<{ referralsCount: number; proUntil: string | null; bonusExamsRemaining: number }> {
  const supabase = getSupabase();
  if (!supabase) return { referralsCount: 0, proUntil: null, bonusExamsRemaining: 0 };

  const { data } = await supabase
    .from("profiles")
    .select("referrals_count, pro_until, bonus_exams_remaining")
    .eq("user_id", userId)
    .single();

  return {
    referralsCount: data?.referrals_count ?? 0,
    proUntil: data?.pro_until ?? null,
    bonusExamsRemaining: data?.bonus_exams_remaining ?? 0,
  };
}

/**
 * Decrement a user's bonus_exams_remaining counter. Returns true if a
 * bonus was consumed (caller can let the action through), false if none
 * available (caller should fall back to weekly-quota gate).
 */
export async function consumeBonusExam(userId: string): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;

  const { data } = await supabase
    .from("profiles")
    .select("bonus_exams_remaining")
    .eq("user_id", userId)
    .single();

  const remaining = data?.bonus_exams_remaining ?? 0;
  if (remaining <= 0) return false;

  await supabase
    .from("profiles")
    .update({
      bonus_exams_remaining: remaining - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return true;
}
