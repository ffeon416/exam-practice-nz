"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Tier } from "@/lib/tierLimits";

export interface TierLimitsClient {
  examsPerWeek: number; // -1 means unlimited
  maxQuestions: number;
  tutorMessagesPerDay: number; // -1 means unlimited
  allSubjects: boolean;
  spacedRepetition: boolean;
  adaptiveDifficulty: boolean;
  studyPlanner: boolean;
  deepEssayMarking: boolean;
  mockExamMode: boolean;
}

export interface TierUsage {
  examsThisWeek: number;
  tutorMessagesToday: number;
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
  tutorMessagesPerDay: 3,
  allSubjects: false,
  spacedRepetition: false,
  adaptiveDifficulty: false,
  studyPlanner: false,
  deepEssayMarking: false,
  mockExamMode: false,
};

const CACHE_TTL = 60_000; // 60 seconds

let cachedData: { tier: Tier; limits: TierLimitsClient; usage: TierUsage } | null = null;
let cachedAt = 0;

export function useTier(): UseTierResult {
  const [tier, setTier] = useState<Tier>(cachedData?.tier ?? "free");
  const [limits, setLimits] = useState<TierLimitsClient>(cachedData?.limits ?? FREE_DEFAULTS);
  const [usage, setUsage] = useState<TierUsage>(cachedData?.usage ?? { examsThisWeek: 0, tutorMessagesToday: 0 });
  const [loading, setLoading] = useState(!cachedData);
  const fetchingRef = useRef(false);

  const doFetch = useCallback(async (force = false) => {
    // Use cache if fresh
    if (!force && cachedData && Date.now() - cachedAt < CACHE_TTL) {
      setTier(cachedData.tier);
      setLimits(cachedData.limits);
      setUsage(cachedData.usage);
      setLoading(false);
      return;
    }

    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try {
      const res = await fetch("/api/user");
      if (!res.ok) throw new Error("Failed to fetch tier");
      const data = await res.json();

      const newData = {
        tier: data.tier as Tier,
        limits: data.limits as TierLimitsClient,
        usage: data.usage as TierUsage,
      };

      cachedData = newData;
      cachedAt = Date.now();

      setTier(newData.tier);
      setLimits(newData.limits);
      setUsage(newData.usage);
    } catch {
      // Keep defaults on error
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    doFetch();
  }, [doFetch]);

  const refresh = useCallback(() => {
    cachedData = null;
    cachedAt = 0;
    doFetch(true);
  }, [doFetch]);

  return { tier, limits, usage, loading, refresh };
}

// Re-export for convenience in client components
export { isUnlimited } from "@/lib/tierLimits";
