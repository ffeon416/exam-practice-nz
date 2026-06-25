"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Pings /api/track once per page (including SPA route changes) for the
// first-party analytics in /admin. Anonymous: the only id stored is a random
// localStorage value used to estimate unique visitors — no cookies, no PII.

const VISITOR_KEY = "studyace-visitor-id";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

export default function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const payload = JSON.stringify({
      path: pathname,
      referrer: document.referrer || null,
      visitorId: getVisitorId(),
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
