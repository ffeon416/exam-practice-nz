// Meta Conversions API — server half of the ads measurement. Server-only.
//
// Every browser Pixel event is mirrored here with the same event_id so Meta
// de-duplicates it; events that only the server can know (StartTrial and
// Purchase from Stripe, the kid-side custom events) are sent from here alone.
// Personal identifiers are SHA-256 hashed before they leave (Meta's rule);
// fbp / fbc / IP / user agent are sent as-is, as Meta requires.
//
// Never throws and never blocks the caller: a failed send is logged and
// dropped. Server-originated events use a deterministic event_id and are
// written to `meta_events` first, so a retried webhook can't double-count.

import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { getSupabase } from "./supabase";
import { CONSENT_COOKIE, COUNTRY_COOKIE, UTM_COOKIE, fbcFromClick, metaAllowed, type ConsentValue } from "./metaShared";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";

/** Who the event is about — everything optional; more = better matching. */
export type MetaUser = {
  email?: string | null;
  externalId?: string | null;
  ip?: string | null;
  ua?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  country?: string | null;
};

export type MetaEventInput = {
  name: string;
  eventId: string;
  sourceUrl?: string | null;
  user: MetaUser;
  customData?: Record<string, unknown>;
  /** Unix seconds; defaults to now. */
  time?: number;
};

const sha256 = (v: string) => createHash("sha256").update(v).digest("hex");

/** The exact JSON object Meta receives for one event. Pure — unit tested. */
export function buildMetaEvent(e: MetaEventInput): Record<string, unknown> {
  const user_data: Record<string, unknown> = {};
  const email = e.user.email?.trim().toLowerCase();
  if (email) user_data.em = [sha256(email)];
  const ext = e.user.externalId?.trim();
  if (ext) user_data.external_id = [sha256(ext)];
  const country = e.user.country?.trim().toLowerCase();
  if (country && /^[a-z]{2}$/.test(country)) user_data.country = [sha256(country)];
  if (e.user.ip) user_data.client_ip_address = e.user.ip;
  if (e.user.ua) user_data.client_user_agent = e.user.ua;
  if (e.user.fbp) user_data.fbp = e.user.fbp;
  if (e.user.fbc) user_data.fbc = e.user.fbc;

  const out: Record<string, unknown> = {
    event_name: e.name,
    event_time: e.time ?? Math.floor(Date.now() / 1000),
    event_id: e.eventId,
    action_source: "website",
    user_data,
  };
  if (e.sourceUrl) out.event_source_url = e.sourceUrl;
  if (e.customData && Object.keys(e.customData).length) out.custom_data = e.customData;
  return out;
}

function configured(): { pixelId: string; token: string } | null {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const token = process.env.META_CAPI_TOKEN;
  return pixelId && token ? { pixelId, token } : null;
}

/** Claim an event id in meta_events. false = already sent (skip). */
async function claimEventId(e: MetaEventInput, userId: string | null): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return true;
  const { error } = await supabase.from("meta_events").insert({ event_id: e.eventId, event_name: e.name, user_id: userId });
  if (!error) return true;
  const code = (error as { code?: string }).code;
  if (code === "23505") return false; // unique violation → sent before
  if (code !== "42P01") console.error("meta_events insert failed:", error); // 42P01 = table not created yet
  return true; // fail open: a missing log table must not lose the event
}

/**
 * Send one event to Meta. `once: true` (server-originated events) records the
 * event id first so the same Stripe event replayed never double-counts.
 */
export async function sendMetaEvent(e: MetaEventInput, opts: { once?: boolean; userId?: string | null } = {}): Promise<void> {
  const cfg = configured();
  if (!cfg) return;
  try {
    if (opts.once && !(await claimEventId(e, opts.userId ?? null))) return;
    const body: Record<string, unknown> = { data: [buildMetaEvent(e)] };
    if (process.env.META_TEST_EVENT_CODE) body.test_event_code = process.env.META_TEST_EVENT_CODE;
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${cfg.pixelId}/events?access_token=${encodeURIComponent(cfg.token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (!res.ok) console.error(`Meta CAPI ${e.name} failed: ${res.status} ${(await res.text()).slice(0, 300)}`);
  } catch (err) {
    console.error(`Meta CAPI ${e.name} error:`, err);
  }
}

// ── Reading the visitor off a request ──

export type RequestMeta = {
  allowed: boolean;
  consent: ConsentValue;
  country: string | null;
  ip: string | null;
  ua: string | null;
  fbp: string | null;
  fbc: string | null;
};

export type UtmRecord = {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  landing_page?: string;
  referrer?: string;
  fbclid?: string;
  fbclid_at?: number;
};

const utmField = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, "").slice(0, max) : undefined);

/** Parse the sa_utm cookie written by attribution.ts. Unknown keys dropped. */
export function parseUtmCookie(raw: string | null | undefined): UtmRecord {
  if (!raw) return {};
  try {
    const j = JSON.parse(raw) as Record<string, unknown>;
    const out: UtmRecord = {};
    for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
      const v = utmField(j[k], 150);
      if (v) out[k] = v;
    }
    const landing = utmField(j.landing_page, 300);
    if (landing) out.landing_page = landing;
    const ref = utmField(j.referrer, 150);
    if (ref) out.referrer = ref;
    const fbclid = utmField(j.fbclid, 300);
    if (fbclid && /^[A-Za-z0-9_-]+$/.test(fbclid)) out.fbclid = fbclid;
    if (typeof j.fbclid_at === "number" && Number.isFinite(j.fbclid_at)) out.fbclid_at = Math.floor(j.fbclid_at);
    return out;
  } catch {
    return {};
  }
}

export function utmFromRequest(req: NextRequest): UtmRecord {
  return parseUtmCookie(req.cookies.get(UTM_COOKIE)?.value);
}

export function requestMeta(req: NextRequest): RequestMeta {
  const country = req.headers.get("x-vercel-ip-country") || req.cookies.get(COUNTRY_COOKIE)?.value || null;
  const c = req.cookies.get(CONSENT_COOKIE)?.value;
  const consent: ConsentValue = c === "granted" || c === "denied" ? c : null;
  const allowed = metaAllowed(country, consent);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const ua = req.headers.get("user-agent")?.slice(0, 400) || null;
  const fbp = req.cookies.get("_fbp")?.value || null;
  let fbc = req.cookies.get("_fbc")?.value || null;
  if (!fbc) {
    // Pixel not loaded yet (deferred) — rebuild fbc from the stored click id.
    const utm = utmFromRequest(req);
    if (utm.fbclid) fbc = fbcFromClick(utm.fbclid, utm.fbclid_at ?? Date.now());
  }
  return { allowed, consent, country, ip, ua, fbp, fbc };
}

// ── Carrying the visitor through Stripe ──
// Checkout is anonymous, so the identity Meta needs for StartTrial / Purchase
// rides on the subscription's metadata (Stripe: ≤50 keys, values ≤500 chars)
// and is copied onto the parent's profile when the account is created.

export function metaMetadata(m: RequestMeta, sourceUrl: string | null): Record<string, string> {
  if (!m.allowed) return { meta_ok: "0" };
  return {
    meta_ok: "1",
    meta_fbp: m.fbp ?? "",
    meta_fbc: (m.fbc ?? "").slice(0, 500),
    meta_ip: m.ip ?? "",
    meta_ua: (m.ua ?? "").slice(0, 400),
    meta_cc: m.country ?? "",
    meta_url: (sourceUrl ?? "").slice(0, 400),
  };
}

export function utmMetadata(u: UtmRecord): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "landing_page", "referrer"] as const) {
    if (u[k]) out[k] = String(u[k]).slice(0, 300);
  }
  return out;
}

/** Inverse of metaMetadata, for events sent from webhooks. null = not allowed. */
export function metaUserFromMetadata(md: Record<string, string> | null | undefined, email?: string | null): { user: MetaUser; sourceUrl: string | null } | null {
  if (!md || md.meta_ok !== "1") return null;
  return {
    user: {
      email: email ?? null,
      externalId: md.visitor_id || null,
      ip: md.meta_ip || null,
      ua: md.meta_ua || null,
      fbp: md.meta_fbp || null,
      fbc: md.meta_fbc || null,
      country: md.meta_cc || null,
    },
    sourceUrl: md.meta_url || null,
  };
}
