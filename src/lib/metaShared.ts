// Meta ads measurement — the rules both halves (browser Pixel and server
// Conversions API) agree on. No imports, safe on client and server.
//
// Three firm lines:
//   1. The Pixel only ever runs on PARENT pages (the sales pages, checkout,
//      the invite page). Kids' screens never load it and no kid data is sent.
//   2. UK and EU/EEA visitors must opt in first (PECR / GDPR). Elsewhere it
//      runs unless the visitor has said no.
//   3. Every event the browser fires is also sent server-side with the SAME
//      event_id, so Meta counts it once.

/** Cookie the middleware sets from Vercel's x-vercel-ip-country header. */
export const COUNTRY_COOKIE = "sa_cc";
/** "granted" | "denied" — set by the consent banner. */
export const CONSENT_COOKIE = "sa_consent";
/** Raw UTM + landing page + fbclid for this visitor (see attribution.ts). */
export const UTM_COOKIE = "sa_utm";

// UK + EU27 + the EEA extras (Iceland, Liechtenstein, Norway).
const CONSENT_COUNTRIES = new Set([
  "GB", "UK",
  "AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU",
  "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE",
  "IS", "LI", "NO",
]);

/** Does this visitor have to opt in before Meta sees anything? Unknown → yes. */
export function needsConsent(country: string | null | undefined): boolean {
  if (!country) return true;
  return CONSENT_COUNTRIES.has(country.toUpperCase());
}

export type ConsentValue = "granted" | "denied" | null;

/** May Meta be told about this visitor? */
export function metaAllowed(country: string | null | undefined, consent: ConsentValue): boolean {
  if (consent === "denied") return false;
  if (consent === "granted") return true;
  return !needsConsent(country);
}

// Pages a PARENT is on. Anything else (the app, the kid's invite landing,
// the grade check, the blog) never loads the Pixel.
const PARENT_PATHS = ["/", "/pricing", "/start", "/on-track", "/global", "/invite"];

export function isParentPage(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return PARENT_PATHS.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(`${p}/`)));
}

/** The browser events the /api/meta relay accepts. */
export const CLIENT_META_EVENTS = ["PageView", "ViewContent"] as const;
export type ClientMetaEvent = (typeof CLIENT_META_EVENTS)[number];

export const EVENT_ID_RE = /^[A-Za-z0-9_-]{8,80}$/;

/** Meta's fbc format, built from a raw fbclid when the _fbc cookie is missing. */
export function fbcFromClick(fbclid: string, clickedAtMs: number): string {
  return `fb.1.${clickedAtMs}.${fbclid}`;
}
