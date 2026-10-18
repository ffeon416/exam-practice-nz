import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rateLimit";

// Public, fire-and-forget beacon for the first-party analytics shown in
// /admin. Two shapes:
//   { path, referrer, visitorId, attribution? }         → one page_views row
//   { event, props, path, visitorId, attribution? }     → one events row
// Never blocks or slows the page — any failure is swallowed and we still
// return 204. No personal data: visitor_id is an anonymous localStorage id
// from the client used only to estimate uniques and join funnel steps.

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|preview|headless|lighthouse|monitor|curl|wget|python-requests|axios|node-fetch/i;

// Client-side events the browser may log, and the props each may carry.
// Anything else is dropped so the events table can't be spammed with junk.
const CLIENT_EVENTS: Record<string, string[]> = {
  session_start: ["source", "medium", "campaign", "content", "landing", "referrer"],
  grade_step: ["step", "curriculum", "subject"],
  grade_revealed: ["curriculum", "subject", "bandLabel", "pct"],
  cta_click: ["cta", "page"],
};

function deviceFrom(ua: string): "mobile" | "desktop" {
  return /Mobi|Android|iPhone|iPad|iPod/i.test(ua) ? "mobile" : "desktop";
}

// Keep only the referrer host, and drop self-referrals (internal navigation).
function externalReferrerHost(referrer: string | null, ownHost: string): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    if (!host || host === ownHost.replace(/^www\./, "")) return null;
    return host.slice(0, 120);
  } catch {
    return null;
  }
}

const word = (v: unknown, max = 80) => (typeof v === "string" ? v.toLowerCase().replace(/[^a-z0-9_.:+/ -]/g, "").slice(0, max) : "");

function attributionFrom(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  const a = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const k of ["source", "medium", "campaign", "content", "landing", "referrer"]) {
    const s = word(a[k], k === "landing" || k === "referrer" ? 200 : 80);
    if (s) out[k] = s;
  }
  return out;
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    // Generous cap — a normal browsing session sends well under this.
    const { ok } = rateLimit(`track:${ip}`, 120, 60_000);
    if (!ok) return new NextResponse(null, { status: 204 });

    const ua = request.headers.get("user-agent") ?? "";
    if (BOT_RE.test(ua)) return new NextResponse(null, { status: 204 });

    const body = (await request.json().catch(() => null)) as
      | { path?: unknown; referrer?: unknown; visitorId?: unknown; attribution?: unknown; event?: unknown; props?: unknown }
      | null;
    if (!body) return new NextResponse(null, { status: 204 });

    let path = typeof body.path === "string" ? body.path : "";
    if (!path.startsWith("/")) return new NextResponse(null, { status: 204 });
    path = path.split("?")[0].split("#")[0].slice(0, 300); // strip query/hash, cap length
    // Don't pollute traffic with the admin dashboard itself.
    if (path.startsWith("/admin")) return new NextResponse(null, { status: 204 });

    const supabase = getSupabase();
    if (!supabase) return new NextResponse(null, { status: 204 });

    const visitorId =
      typeof body.visitorId === "string" ? body.visitorId.slice(0, 64) : null;
    const country = request.headers.get("x-vercel-ip-country") || null;
    const device = deviceFrom(ua);
    const attribution = attributionFrom(body.attribution);
    const { userId } = await auth();

    // ── Product event from the browser ──
    if (typeof body.event === "string") {
      const allowed = CLIENT_EVENTS[body.event];
      if (!allowed) return new NextResponse(null, { status: 204 });
      const raw = body.props && typeof body.props === "object" ? (body.props as Record<string, unknown>) : {};
      const props: Record<string, unknown> = {};
      for (const k of allowed) {
        const v = raw[k];
        if (typeof v === "number" && Number.isFinite(v)) props[k] = v;
        else if (typeof v === "boolean") props[k] = v;
        else if (typeof v === "string") props[k] = v.slice(0, 200);
      }
      await supabase.from("events").insert({
        name: body.event,
        user_id: userId ?? null,
        props: { ...props, source: props.source ?? attribution.source ?? "unknown", ...(attribution.medium ? { medium: attribution.medium } : {}), ...(attribution.campaign ? { campaign: attribution.campaign } : {}), ...(attribution.content ? { content: attribution.content } : {}), visitor_id: visitorId, path, country, device },
      });
      return new NextResponse(null, { status: 204 });
    }

    // ── Page view ──
    const ownHost = request.headers.get("host") ?? "studyace.co";
    const referrer = externalReferrerHost(
      typeof body.referrer === "string" ? body.referrer : null,
      ownHost,
    );

    await supabase.from("page_views").insert({
      path,
      referrer,
      visitor_id: visitorId,
      user_id: userId ?? null,
      country,
      device,
    });
  } catch (err) {
    console.error("track failed:", err);
  }
  return new NextResponse(null, { status: 204 });
}
