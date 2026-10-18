"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureAttribution, getVisitorId, readAttribution, trackEvent } from "@/lib/attribution";

// Pings /api/track once per page (including SPA route changes) for the
// first-party analytics in /admin. Anonymous: the only id stored is a random
// localStorage value used to estimate unique visitors — no cookies with
// personal data, no PII. On the first page of a browser session it also
// records where the visitor came from (utm_*, fbclid, referrer) as a
// `session_start` event, which is what lets /admin/pulse say "this lead came
// from the Meta ad".

let captured = false;

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    if (!captured) {
      captured = true;
      try {
        const { attribution, newSession } = captureAttribution();
        if (newSession && !pathname.startsWith("/admin")) {
          trackEvent("session_start", {
            source: attribution.source, medium: attribution.medium, campaign: attribution.campaign,
            content: attribution.content, landing: pathname, referrer: attribution.referrer,
          });
        }
      } catch { /* never block the page */ }
    }
    const a = readAttribution();
    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      visitorId: getVisitorId(),
      attribution: a ? { source: a.source, medium: a.medium, campaign: a.campaign, content: a.content } : null,
    });

    // sendBeacon survives the page unloading; fall back to keepalive fetch.
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
        return;
      }
    } catch {
      /* fall through to fetch */
    }
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
