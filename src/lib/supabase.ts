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
  student_until: string | null;
  bonus_exams_remaining: number;
  referral_credited: boolean;
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
 * Get a user's effective tier — honours referral-granted Student time.
 * Referrals only ever grant Student (cheap for us, no tutor calls).
 * If the user is already on a paid tier we return that as-is.
 */
export async function getTier(userId: string): Promise<"free" | "student" | "pro"> {
  const supabase = getSupabase();
  if (!supabase) return "free";

  const { data } = await supabase
    .from("profiles")
    .select("tier, student_until")
    .eq("user_id", userId)
    .single();

  const baseTier = (data?.tier as "free" | "student" | "pro") ?? "free";
  if (baseTier !== "free") return baseTier;

  if (data?.student_until && new Date(data.student_until).getTime() > Date.now()) {
    return "student";
  }
  return baseTier;
}

/**
 * Attribute a new signup to a referrer. Sets referee.referrer_id and gives
 * them 5 bonus exams immediately so they're nudged into the product.
 * The referrer is NOT credited yet — that happens via maybeCreditReferrer
 * once the referee actually completes their first exam (anti-fraud).
 * Returns true on success, false if rejected (duplicate, self-ref, etc).
 */
export async function claimReferral(
  newUserId: string,
  referrerId: string
): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  if (newUserId === referrerId) return false;

  const { data: newUser } = await supabase
    .from("profiles")
    .select("user_id, referrer_id")
    .eq("user_id", newUserId)
    .single();
  if (!newUser || newUser.referrer_id) return false;

  // Verify the referrer profile exists before attributing.
  const { data: referrer } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("user_id", referrerId)
    .single();
  if (!referrer) return false;

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

  return true;
}

/**
 * Idempotent: if this user was referred and we haven't yet credited the
 * referrer, do it now. Called from /api/mark after a successful exam mark.
 * Grants the referrer 14 days of Student tier per qualifying referral
 * (stacks on any existing future student_until).
 *
 * The referral_credited flag is set BEFORE the referrer update so a retry
 * after a partial failure won't double-credit. Worst case: the credit fails
 * and the referrer never gets their reward — better than double-paying.
 */
export async function maybeCreditReferrer(refereeUserId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const { data: referee } = await supabase
    .from("profiles")
    .select("referrer_id, referral_credited")
    .eq("user_id", refereeUserId)
    .single();

  if (!referee || !referee.referrer_id || referee.referral_credited) return;

  // Mark credited first to make this call idempotent under retry. Race-safe:
  // only flips if still false, so two concurrent calls can't both proceed.
  const { data: claimed, error: claimErr } = await supabase
    .from("profiles")
    .update({ referral_credited: true, updated_at: new Date().toISOString() })
    .eq("user_id", refereeUserId)
    .eq("referral_credited", false)
    .select("user_id")
    .single();
  if (claimErr || !claimed) return; // someone else credited first

  const { data: referrer } = await supabase
    .from("profiles")
    .select("student_until, referrals_count")
    .eq("user_id", referee.referrer_id)
    .single();
  if (!referrer) return;

  const now = Date.now();
  const currentEnd =
    referrer.student_until && new Date(referrer.student_until).getTime() > now
      ? new Date(referrer.student_until).getTime()
      : now;
  const newStudentUntil = new Date(currentEnd + 14 * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("profiles")
    .update({
      referrals_count: (referrer.referrals_count ?? 0) + 1,
      student_until: newStudentUntil,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", referee.referrer_id);
}

/**
 * Get referral stats for the /refer page.
 * pendingReferrals = friends who signed up but haven't taken an exam yet.
 */
export async function getReferralStats(userId: string): Promise<{
  referralsCount: number;
  studentUntil: string | null;
  bonusExamsRemaining: number;
  pendingReferrals: number;
}> {
  const supabase = getSupabase();
  if (!supabase) {
    return { referralsCount: 0, studentUntil: null, bonusExamsRemaining: 0, pendingReferrals: 0 };
  }

  const { data } = await supabase
    .from("profiles")
    .select("referrals_count, student_until, bonus_exams_remaining")
    .eq("user_id", userId)
    .single();

  // Count referees who signed up but haven't yet been credited (i.e.
  // haven't taken their first exam). This is the "pending" count we
  // surface so the user can see referrals are in flight.
  const { count: pendingCount } = await supabase
    .from("profiles")
    .select("user_id", { count: "exact", head: true })
    .eq("referrer_id", userId)
    .eq("referral_credited", false);

  return {
    referralsCount: data?.referrals_count ?? 0,
    studentUntil: data?.student_until ?? null,
    bonusExamsRemaining: data?.bonus_exams_remaining ?? 0,
    pendingReferrals: pendingCount ?? 0,
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
