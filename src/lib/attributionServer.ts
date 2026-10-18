import type { NextRequest } from "next/server";

// Server half of src/lib/attribution.ts: reads the two first-party cookies
// the browser sets (sa_vid = anonymous visitor id, sa_src = source|medium|
// campaign|content) so a lead, a checkout or a payment can be logged with
// where that visitor came from. Everything is optional — a missing cookie
// just means "unknown".

export type ServerAttribution = {
  visitor_id: string | null;
  source: string;
  medium: string;
  campaign: string;
  content: string;
};

const word = (v: string | undefined, max = 80) => (v ?? "").toLowerCase().replace(/[^a-z0-9_.:+ -]/g, "").slice(0, max);

export function attributionFromRequest(request: NextRequest): ServerAttribution {
  const vid = request.cookies.get("sa_vid")?.value ?? "";
  const raw = request.cookies.get("sa_src")?.value ?? "";
  const [source, medium, campaign, content] = raw.split("|");
  return {
    visitor_id: /^[A-Za-z0-9-]{6,64}$/.test(vid) ? vid : null,
    source: word(source) || "unknown",
    medium: word(medium),
    campaign: word(campaign),
    content: word(content),
  };
}

/** The props worth attaching to a funnel event (drops empty fields). */
export function attributionProps(a: ServerAttribution): Record<string, string> {
  const out: Record<string, string> = { source: a.source };
  if (a.visitor_id) out.visitor_id = a.visitor_id;
  if (a.medium) out.medium = a.medium;
  if (a.campaign) out.campaign = a.campaign;
  if (a.content) out.content = a.content;
  return out;
}

/** Stripe metadata values must be strings ≤ 500 chars; keys are our own. */
export function attributionMetadata(a: ServerAttribution): Record<string, string> {
  return {
    visitor_id: a.visitor_id ?? "",
    source: a.source,
    medium: a.medium,
    campaign: a.campaign,
    content: a.content,
  };
}
