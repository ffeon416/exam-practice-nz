"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import type { Tier } from "@/lib/tierLimits";

export interface TierLimitsClient {
  examsPerWeek: number; // -1 means unlimited
  maxQuestions: number;
  tutorMessagesPerWeek: number; // -1 means unlimited, 0 means no access
  allSubjects: boolean;
  spacedRepetition: boolean;
  adaptiveDifficulty: boolean;
  studyPlanner: boolean;
  deepEssayMarking: boolean;
  mockExamMode: boolean;
}

export interface TierUsage {
  examsThisWeek: number;
  tutorMessagesThisWeek: number;
}

export interface UseTierResult {
  tier: Tier;
  limits: TierLimitsClient;
  usage: TierUsage;
  loading: boolean;
  /** Re-fetch tier data (e.g. after generating an exam) */
  refresh: () => void;
}

const FREE_DEFAULTS: TierLimitsClient = {
  examsPerWeek: 2,
  maxQuestions: 8,
  tutorMessagesPerWeek: 0,
  allSubjects: false,
  spacedRepetition: false,
  adaptiveDifficulty: false,
  studyPlanner: false,
  deepEssayMarking: false,
  mockExamMode: false,
};

const CACHE_TTL = 60_000; // 60 seconds — module cache (same session only)

// Module-level cache so client-side navigation between pages doesn't re-fetch
// every time. Scoped by Clerk userId so two accounts on the same browser
// cannot see each other's cached tier. NOT persisted across page reloads —
// localStorage was deliberately removed from the display path because a stale
// cached tier (e.g. user upgraded or downgraded between visits) would cause
// the wrong plan to render briefly before /api/user could correct it. The
// only acceptable source of truth for `loading=false` is a /api/user response
// or this same-session module cache.
let cachedUserId: string | null = null;
let cachedData: { tier: Tier; limits: TierLimitsClient; usage: TierUsage } | null = null;
let cachedAt = 0;

function isTier(v: unknown): v is Tier {
  return v === "free" || v === "student" || v === "pro";
}

// Persisted, userId-scoped last-known tier. Unlike the module cache above, this
// SURVIVES page reloads — so returning to the app shows the exact plan you left
// on, instantly, with no loading skeleton. It is always reconciled against
// /api/user in the background and updated if it changed. Safe because it is
// keyed to the Clerk userId (it can only ever show YOUR OWN last plan, never
// another account's, never a default "free"), and no celebration/popup keys off
// it. On the rare visit where your plan changed server-side since last time, it
// shows the previous plan for a moment, then self-corrects.
const TIER_LS_KEY = "studyace-tier-cache-v2";

type TierSnapshot = { tier: Tier; limits: TierLimitsClient; usage: TierUsage };

function readPersistedTier(userId: string): TierSnapshot | null {
  try {
    const raw = localStorage.getItem(TIER_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId !== userId || !isTier(parsed?.tier) || !parsed?.limits || !parsed?.usage) return null;
    return { tier: parsed.tier, limits: parsed.limits, usage: parsed.usage };
  } catch {
    return null;
  }
}

function writePersistedTier(userId: string, snap: TierSnapshot): void {
  try {
    localStorage.setItem(TIER_LS_KEY, JSON.stringify({ userId, ...snap }));
  } catch {
    // localStorage unavailable (private mode / quota) — non-fatal.
  }
}

export function useTier(): UseTierResult {
  const { user, isLoaded: userLoaded } = useUser();
  const userId = user?.id ?? null;

  // Initial state is deterministic on both SSR and first client render —
  // tier="free", loading=true. This avoids hydration mismatches. After mount,
  // the effect either uses a fresh same-session module cache (no fetch) or
  // hits /api/user (skeleton while loading, then real tier). Consumers gating
  // on `loading` will only ever see the authoritative tier — never a stale
  // optimistic value.
  const [tier, setTier] = useState<Tier>(() => cachedData?.tier ?? "free");
  const [limits, setLimits] = useState<TierLimitsClient>(() => cachedData?.limits ?? FREE_DEFAULTS);
  const [usage, setUsage] = useState<TierUsage>(() => cachedData?.usage ?? { examsThisWeek: 0, tutorMessagesThisWeek: 0 });
  // If we have a fresh module cache (same user, within TTL), trust it from
  // the start so client-side navigation doesn't show a loading flash.
  const [loading, setLoading] = useState(() => {
    return !cachedData;
  });

  const fetchingRef = useRef(false);
  // Used to discard responses from a fetch that started before the user changed.
  const requestSeqRef = useRef(0);

  useEffect(() => {
    // Wait for Clerk to tell us who the user is. Until then, loading=true.
    if (!userLoaded) {
      setLoading(true);
      return;
    }

    // Signed out — show free defaults, but resolve loading.
    if (!userId) {
      cachedUserId = null;
      cachedData = null;
      setTier("free");
      setLimits(FREE_DEFAULTS);
      setUsage({ examsThisWeek: 0, tutorMessagesThisWeek: 0 });
      setLoading(false);
      return;
    }

    // Only fast path: module cache for THIS user, and fresh. This survives
    // SPA navigation but NOT page reloads, so it can only ever hold a value
    // that was just fetched from /api/user — never stale across sessions.
    if (cachedUserId === userId && cachedData && Date.now() - cachedAt < CACHE_TTL) {
      setTier(cachedData.tier);
      setLimits(cachedData.limits);
      setUsage(cachedData.usage);
      setLoading(false);
      return;
    }

    // No fresh same-session cache. Before fetching, restore the user's own
    // last-known plan from localStorage so a reload shows "where they left it"
    // instantly (no skeleton). If there's nothing persisted (e.g. first visit
    // on this device), fall back to a loading skeleton rather than a wrong
    // default. Either way we still fetch /api/user below to reconcile.
    const persisted = readPersistedTier(userId);
    if (persisted) {
      setTier(persisted.tier);
      setLimits(persisted.limits);
      setUsage(persisted.usage);
      setLoading(false);
    } else {
      setLoading(true);
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;
    const seq = ++requestSeqRef.current;

    (async () => {
      try {
        const res = await fetch("/api/user");
        if (!res.ok) throw new Error("Failed to fetch tier");
        const data = await res.json();
        if (!isTier(data.tier)) throw new Error("Invalid tier payload");

        // Drop stale responses if user changed during the request.
        if (seq !== requestSeqRef.current) return;

        const newData = {
          tier: data.tier as Tier,
          limits: data.limits as TierLimitsClient,
          usage: data.usage as TierUsage,
        };
        cachedUserId = userId;
        cachedData = newData;
        cachedAt = Date.now();
        writePersistedTier(userId, newData);

        setTier(newData.tier);
        setLimits(newData.limits);
        setUsage(newData.usage);
        setLoading(false);
      } catch {
        if (seq === requestSeqRef.current) {
          // Only fall back to free defaults if we had nothing to show. If we
          // already restored the user's persisted plan, KEEP it — a transient
          // network blip must never flash a paid user down to "free".
          if (!persisted) {
            setTier("free");
            setLimits(FREE_DEFAULTS);
            setUsage({ examsThisWeek: 0, tutorMessagesThisWeek: 0 });
          }
          setLoading(false);
        }
      } finally {
        fetchingRef.current = false;
      }
    })();
  }, [userId, userLoaded]);

  const refresh = useCallback(() => {
    if (!userId) return;
    cachedData = null;
    cachedAt = 0;
    fetchingRef.current = false;
    // Silent background reconcile — do NOT flip `loading` to true. We already
    // have a value on screen; updating it only on success avoids blinking the
    // plan UI to a skeleton mid-session (e.g. after generating an exam).
    const seq = ++requestSeqRef.current;
    fetch("/api/user")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fetch failed"))))
      .then((data) => {
        if (seq !== requestSeqRef.current) return;
        if (!isTier(data.tier)) return;
        cachedUserId = userId;
        cachedData = {
          tier: data.tier,
          limits: data.limits,
          usage: data.usage,
        };
        cachedAt = Date.now();
        writePersistedTier(userId, cachedData);
        setTier(data.tier);
        setLimits(data.limits);
        setUsage(data.usage);
        setLoading(false);
      })
      .catch(() => {});
  }, [userId]);

  return { tier, limits, usage, loading, refresh };
}

// Re-export for convenience in client components
export { isUnlimited } from "@/lib/tierLimits";
