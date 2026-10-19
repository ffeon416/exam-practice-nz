// Where a visitor came from, worked out in the browser and remembered so
// that the lead, the checkout and the payment that follow can be tied back
// to it. Reads the Meta/Google URL markers (utm_*, fbclid, gclid) and the
// referrer on arrival; keeps the result in localStorage and in two small
// first-party cookies the server reads when it logs an event.
//
// Nothing personal: the visitor id is the same random id the page-view
// beacon has always used, and the source is a word like "meta" or "google".

export type Attribution = {
  source: string;    // "meta" | "google" | "instagram" | "direct" | utm_source …
  medium: string;    // "paid" | "referral" | "none" | utm_medium
  campaign: string;  // utm_campaign or ""
  content: string;   // utm_content (the ad / creative) or ""
  landing: string;   // first path seen with this source
  referrer: string;  // referrer host or ""
  at: string;        // ISO time it was recorded
};

const STORE_KEY = "studyace-source";
export const VISITOR_KEY = "studyace-visitor-id";
const SESSION_KEY = "studyace-session";
const YEAR = 60 * 60 * 24 * 365;

export function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anon";
  }
}

function host(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
}

/** Referrer host → a short source word. */
function sourceFromReferrer(h: string): string {
  if (!h) return "";
  if (/(^|\.)instagram\.com$/.test(h)) return "instagram";
  if (/(^|\.)(facebook\.com|fb\.com|messenger\.com)$/.test(h)) return "facebook";
  if (/(^|\.)tiktok\.com$/.test(h)) return "tiktok";
  if (/(^|\.)(youtube\.com|youtu\.be)$/.test(h)) return "youtube";
  if (/(^|\.)google\./.test(h)) return "google";
  if (/(^|\.)bing\.com$/.test(h)) return "bing";
  if (/(^|\.)duckduckgo\.com$/.test(h)) return "duckduckgo";
  if (/(^|\.)(twitter\.com|x\.com|t\.co)$/.test(h)) return "x";
  if (/(^|\.)reddit\.com$/.test(h)) return "reddit";
  if (/(^|\.)linkedin\.com$/.test(h)) return "linkedin";
  if (/(^|\.)(chatgpt\.com|openai\.com|claude\.ai|perplexity\.ai)$/.test(h)) return "ai";
  return h;
}

const clean = (v: string | null, max = 80) => (v ?? "").trim().toLowerCase().replace(/[^a-z0-9_.:+ -]/g, "").slice(0, max);

/** Work out the source of THIS arrival from the URL and referrer. */
function detect(): Attribution {
  const q = new URLSearchParams(window.location.search);
  const utmSource = clean(q.get("utm_source"));
  const ref = host(document.referrer);
  const refSource = ref && ref !== window.location.hostname.replace(/^www\./, "") ? sourceFromReferrer(ref) : "";
  const paidClick = q.has("fbclid") ? "meta" : q.has("gclid") || q.has("gbraid") || q.has("wbraid") ? "google" : q.has("ttclid") ? "tiktok" : "";

  let source = utmSource || paidClick || refSource || "direct";
  // "facebook"/"instagram" with a click id is the Meta ad, not a share.
  if (paidClick === "meta" && (source === "facebook" || source === "instagram" || source === "ig" || source === "fb")) source = "meta";
  const medium = clean(q.get("utm_medium")) || (paidClick ? "paid" : refSource ? "referral" : "none");
  return {
    source, medium,
    campaign: clean(q.get("utm_campaign")),
    content: clean(q.get("utm_content")) || clean(q.get("utm_term")),
    landing: window.location.pathname.slice(0, 200),
    referrer: ref.slice(0, 120),
    at: new Date().toISOString(),
  };
}

function hasMarkers(a: Attribution): boolean {
  return a.source !== "direct" || a.medium !== "none" || !!a.campaign;
}

export function readAttribution(): Attribution | null {
  try { const raw = localStorage.getItem(STORE_KEY); return raw ? (JSON.parse(raw) as Attribution) : null; } catch { return null; }
}

function setCookie(name: string, value: string, maxAge: number) {
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  } catch { /* storage blocked */ }
}

/**
 * Called on every page load (not on client-side route changes). Keeps the
 * stored source unless this arrival carries its own markers, so a parent
 * who taps the ad, leaves, and comes back directly two days later still
 * counts for the ad. Returns the attribution in force, and whether this was
 * the first page of a browser session (one `session_start` per session).
 */
export function captureAttribution(): { attribution: Attribution; newSession: boolean } {
  const now = detect();
  const stored = readAttribution();
  const attribution = !stored || hasMarkers(now) ? now : stored;
  try { localStorage.setItem(STORE_KEY, JSON.stringify(attribution)); } catch { /* ignore */ }

  // Cookies for the server routes (lead, checkout) — same data, nothing more.
  setCookie("sa_vid", getVisitorId(), YEAR);
  setCookie("sa_src", [attribution.source, attribution.medium, attribution.campaign, attribution.content].join("|"), YEAR);

  let newSession = false;
  try {
    if (!sessionStorage.getItem(SESSION_KEY)) { sessionStorage.setItem(SESSION_KEY, "1"); newSession = true; }
  } catch { newSession = true; }
  return { attribution, newSession };
}

/** The client events the server accepts (see /api/track). */
export type ClientEvent = "session_start" | "grade_step" | "grade_revealed" | "cta_click" | "ontrack_step" | "ontrack_result";

/** Fire-and-forget product event for the admin funnel. Never throws. */
export function trackEvent(event: ClientEvent, props: Record<string, string | number | boolean | null> = {}): void {
  try {
    const a = readAttribution();
    const payload = JSON.stringify({
      event, props,
      path: window.location.pathname,
      visitorId: getVisitorId(),
      attribution: a ? { source: a.source, medium: a.medium, campaign: a.campaign, content: a.content, landing: a.landing, referrer: a.referrer } : null,
    });
    if (navigator.sendBeacon && navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }))) return;
    void fetch("/api/track", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload, keepalive: true }).catch(() => {});
  } catch { /* never block the page */ }
}
