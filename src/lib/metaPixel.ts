// Meta (Facebook) Pixel — browser half of the ads measurement.
//
// Kept deliberately light: the script loads after the page is idle (inside
// <DeferUntilIdle>), only on parent pages, only with consent where the law
// asks for it, and with automatic click/button scraping switched OFF (the
// reason GA/PostHog were once removed — see layout.tsx). Every event carries
// an eventID; the same id goes to the server (/api/meta or the route that
// started the action) so the Conversions API copy is de-duplicated.
//
// No names, emails, answers or study data are ever sent from the browser.

import { CONSENT_COOKIE, COUNTRY_COOKIE, metaAllowed, type ClientMetaEvent, type ConsentValue } from "./metaShared";

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

type Fbq = ((...args: unknown[]) => void) & {
  queue?: unknown[];
  loaded?: boolean;
  version?: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

function readCookie(name: string): string | null {
  try {
    const hit = document.cookie.split("; ").find((c) => c.startsWith(`${name}=`));
    return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
  } catch {
    return null;
  }
}

export function readConsent(): ConsentValue {
  const v = readCookie(CONSENT_COOKIE);
  return v === "granted" || v === "denied" ? v : null;
}

export function visitorCountry(): string | null {
  return readCookie(COUNTRY_COOKIE);
}

/** Pixel configured and this visitor allowed? */
export function metaEnabled(): boolean {
  if (typeof window === "undefined" || !META_PIXEL_ID) return false;
  return metaAllowed(visitorCountry(), readConsent());
}

export function newMetaEventId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
  }
}

/** Installs the fbq stub + script once. Safe to call repeatedly. */
function loadMetaPixel() {
  if (window.fbq) return;
  const fbq: Fbq = function (...args: unknown[]) {
    (fbq.queue = fbq.queue || []).push(args);
  };
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  window._fbq = fbq;

  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);

  // autoConfig off = no automatic click / button / form scraping.
  fbq("set", "autoConfig", false, META_PIXEL_ID);
  fbq("init", META_PIXEL_ID);
}

/**
 * Fire a browser Pixel event with a known event id. Does nothing without
 * consent / config. Custom events (InviteSent…) use trackCustom.
 */
export function firePixel(event: string, eventId: string, params?: Record<string, unknown>, custom = false) {
  if (!metaEnabled()) return;
  try {
    loadMetaPixel();
    window.fbq!(custom ? "trackCustom" : "track", event, params ?? {}, { eventID: eventId });
  } catch {
    /* never let ad measurement break the app */
  }
}

/**
 * Page-level events (PageView, ViewContent): browser Pixel + server copy via
 * /api/meta, sharing one event id. Fire-and-forget.
 */
export function trackMetaPageEvent(event: ClientMetaEvent, params?: Record<string, string | number>) {
  if (!metaEnabled()) return;
  const eventId = newMetaEventId();
  firePixel(event, eventId, params);
  try {
    const body = JSON.stringify({ event, eventId, url: window.location.href, params: params ?? null });
    if (navigator.sendBeacon && navigator.sendBeacon("/api/meta", new Blob([body], { type: "application/json" }))) return;
    void fetch("/api/meta", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/** Browser half of InitiateCheckout — the server already sent its copy. */
export function fireCheckoutPixel(eventId: string | null | undefined) {
  if (eventId) firePixel("InitiateCheckout", eventId);
}
