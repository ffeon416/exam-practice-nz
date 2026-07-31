"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Google Analytics 4.
 *
 * Re-added 2026-07-31 after being removed 2026-07-19. The original removal was
 * because gtag's click listener collided with heavy blur backgrounds and cost
 * ~2s per interaction; those backgrounds are GPU-promoted now, and this loads
 * only inside <DeferUntilIdle> (after first paint + idle), so it never competes
 * with the first tap.
 *
 * The Measurement ID is not a secret — it's visible in every browser — so it can
 * live in NEXT_PUBLIC_GA_ID. Set it in .env.local AND in Vercel's env for prod.
 */
const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export default function GoogleAnalytics() {
  const pathname = usePathname();

  // Load gtag once.
  useEffect(() => {
    if (!GA_ID || window.gtag) return;
    const s = document.createElement("script");
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    s.async = true;
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    // We send page_views manually per route change below (App Router does not
    // do full page loads), so turn off the automatic initial one here.
    window.gtag("config", GA_ID, { send_page_view: false });
  }, []);

  // One page_view per client-side route change (plus the first render).
  useEffect(() => {
    if (!GA_ID || typeof window.gtag !== "function") return;
    window.gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname]);

  return null;
}
