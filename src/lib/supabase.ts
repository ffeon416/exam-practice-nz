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
  pro_until: string | null;
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
 * Record how a user first heard about StudyAce (attribution).
 * Write-once: only sets the value if it's currently null, so a user
 * re-running onboarding can't overwrite the original source. Fire-and-forget
 * and resilient to the column not existing yet (42703) so it never blocks
 * signup if the migration hasn't been applied to prod.
 */
export async function setHeardAbout(userId: string, source: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { error } = await supabase
    .from("profiles")
    .update({ heard_about: source, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("heard_about", null);
  if (error && (error as { code?: string }).code !== "42703") {
    console.error("Failed to set heard_about:", error);
  }
}

/**
 * Get a user's effective tier — honours time-boxed grants.
 * A paid tier (Stripe) always wins. Otherwise we check, in order:
 *   1. pro_until    — a time-boxed Pro grant (e.g. a school trial code)
 *   2. student_until — a referral-granted Student window (cheap, no tutor)
 * Both lapse on their own with no charge — getTier just stops returning them.
 */
export async function getTier(userId: string): Promise<"free" | "student" | "pro"> {
  const supabase = getSupabase();
  if (!supabase) return "free";

  let { data, error } = await supabase
    .from("profiles")
    .select("tier, student_until, pro_until")
    .eq("user_id", userId)
    .single();

  // Resilience: if the pro_until column doesn't exist yet (migration not yet
  // applied), Postgres returns 42703 (undefined_column). Fall back to the
  // pre-pro_until select so existing tiers still resolve correctly.
  if (error && (error as { code?: string }).code === "42703") {
    ({ data } = await supabase
      .from("profiles")
      .select("tier, student_until")
      .eq("user_id", userId)
      .single());
  }

  const baseTier = (data?.tier as "free" | "student" | "pro") ?? "free";
  if (baseTier !== "free") return baseTier;

  const now = Date.now();
  if ((data as { pro_until?: string | null })?.pro_until && new Date((data as { pro_until: string }).pro_until).getTime() > now) {
    return "pro";
  }
  if (data?.student_until && new Date(data.student_until).getTime() > now) {
    return "student";
  }
  return baseTier;
}

/** Result of redeeming an access code. */
export type RedeemResult =
  | { ok: true; tier: "student" | "pro"; until: string }
  | { ok: false; reason: "invalid" | "expired" | "full" | "already" | "error" };

/**
 * Redeem an access code (e.g. a school's free-trial code) for the given user.
 * Grants the code's tier for `days` days, stacking on any existing future
 * grant. Caps total redemptions at the code's limit and prevents the same
 * user redeeming twice. No payment is ever involved — the grant simply lapses
 * when `pro_until` / `student_until` passes.
 */
export async function redeemCode(userId: string, rawCode: string): Promise<RedeemResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, reason: "error" };

  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, reason: "invalid" };

  // 1. Look up the code.
  const { data: ac } = await supabase
    .from("access_codes")
    .select("code, tier, days, max_redemptions, redemptions_count, expires_at")
    .eq("code", code)
    .single();
  if (!ac) return { ok: false, reason: "invalid" };

  const now = Date.now();
  if (ac.expires_at && new Date(ac.expires_at).getTime() < now) {
    return { ok: false, reason: "expired" };
  }

  // 2. Claim a redemption slot. The (code, user_id) primary key makes this
  // idempotent — a repeat by the same user hits a unique violation, so we
  // report "already" instead of granting twice.
  const { error: redErr } = await supabase
    .from("code_redemptions")
    .insert({ code, user_id: userId });
  if (redErr) {
    if ((redErr as { code?: string }).code === "23505") {
      return { ok: false, reason: "already" }; // unique_violation
    }
    console.error("redeemCode: redemption insert failed", redErr);
    return { ok: false, reason: "error" };
  }

  // 3. Enforce the cap. The count includes the row we just inserted; if we've
  // gone past the limit, roll our row back and report full. Race-safe enough
  // for a pilot — the (limit+1)th concurrent redeemer is the one that backs out.
  const { count } = await supabase
    .from("code_redemptions")
    .select("user_id", { count: "exact", head: true })
    .eq("code", code);
  if ((count ?? 0) > (ac.max_redemptions ?? 0)) {
    await supabase.from("code_redemptions").delete().eq("code", code).eq("user_id", userId);
    return { ok: false, reason: "full" };
  }

  // 4. Grant the tier for `days` days, stacking on any existing future grant.
  const days = ac.days ?? 30;
  const column = ac.tier === "pro" ? "pro_until" : "student_until";
  const { data: profile } = await supabase
    .from("profiles")
    .select(column)
    .eq("user_id", userId)
    .single();
  const existing = (profile as Record<string, string | null> | null)?.[column] ?? null;
  const base = existing && new Date(existing).getTime() > now ? new Date(existing).getTime() : now;
  const until = new Date(base + days * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("profiles")
    .update({ [column]: until, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  // 5. Keep the code's visible counter roughly in sync (display only).
  await supabase
    .from("access_codes")
    .update({ redemptions_count: count ?? 0 })
    .eq("code", code);

  return { ok: true, tier: ac.tier as "student" | "pro", until };
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

// ── Product events (conversion funnel) ──
// Fire-and-forget server-side event log that powers the /admin funnel. NEVER
// throws and never blocks the caller — a failed insert (or a missing `events`
// table before the migration is applied) is swallowed. Do not await this in a
// way that gates a user response; call it as `void logEvent(...)`.
export async function logEvent(
  name: string,
  userId: string | null,
  props?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    await supabase.from("events").insert({ name, user_id: userId, props: props ?? null });
  } catch (err) {
    console.error(`logEvent(${name}) failed:`, err);
  }
}
