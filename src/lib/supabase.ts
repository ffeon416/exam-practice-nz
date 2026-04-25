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
 * Get a user's current tier. Defaults to 'free' if no profile exists yet.
 */
export async function getTier(userId: string): Promise<"free" | "student" | "pro"> {
  const supabase = getSupabase();
  if (!supabase) return "free";

  const { data } = await supabase
    .from("profiles")
    .select("tier")
    .eq("user_id", userId)
    .single();

  return (data?.tier as "free" | "student" | "pro") ?? "free";
}
