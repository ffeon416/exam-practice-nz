"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import posthog from "posthog-js";
import { useTier } from "@/hooks/useTier";

// PostHog product analytics: autocapture (every click/pageview), session
// replay, funnels. Initialised once, client-side. Session replay masks all
// inputs by default so students' typed answers + passwords are never recorded
// (they're minors — see privacy policy). Traffic is proxied via /ingest.

let initialized = false;

export default function PostHogInit() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoaded } = useUser();
  const { tier, loading: tierLoading } = useTier();

  // Init once.
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || initialized) return;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "/ingest",
      ui_host: "https://us.posthog.com",
      capture_pageview: false, // captured manually below for SPA navigations
      capture_pageleave: true, // needed for time-on-page / bounce
      persistence: "localStorage+cookie",
      session_recording: {
        maskAllInputs: true, // never record what students type
      },
    });
    initialized = true;
  }, []);

  // Capture a pageview on every route change (App Router is a SPA).
  useEffect(() => {
    if (!initialized || !pathname) return;
    let url = window.location.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    posthog.capture("$pageview", { $current_url: url });
  }, [pathname, searchParams]);

  // Identify the signed-in user (so replays/funnels are tied to a person) and
  // tag them with their plan. Reset on sign-out so sessions don't bleed across
  // accounts on a shared device.
  useEffect(() => {
    if (!isLoaded || !initialized) return;
    if (user) {
      posthog.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress ?? undefined,
        ...(tierLoading ? {} : { tier }),
      });
    } else {
      posthog.reset();
    }
  }, [isLoaded, user, tier, tierLoading]);

  return null;
}
