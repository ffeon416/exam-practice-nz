import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rateLimit";

// Public, fire-and-forget pageview beacon for the first-party analytics shown in
// /admin. Records one row per page view. Never blocks or slows the page — any
// failure is swallowed and we still return 204. No personal data: visitor_id is
// an anonymous localStorage id from the client used only to estimate uniques.

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|preview|headless|lighthouse|monitor|curl|wget|python-requests|axios|node-fetch/i;

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

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    // Generous cap — a normal browsing session sends well under this.
    const { ok } = rateLimit(`track:${ip}`, 120, 60_000);
    if (!ok) return new NextResponse(null, { status: 204 });

    const ua = request.headers.get("user-agent") ?? "";
    if (BOT_RE.test(ua)) return new NextResponse(null, { status: 204 });

    const body = (await request.json().catch(() => null)) as
      | { path?: unknown; referrer?: unknown; visitorId?: unknown }
      | null;
    if (!body) return new NextResponse(null, { status: 204 });

    let path = typeof body.path === "string" ? body.path : "";
    if (!path.startsWith("/")) return new NextResponse(null, { status: 204 });
    path = path.split("?")[0].split("#")[0].slice(0, 300); // strip query/hash, cap length
    // Don't pollute traffic with the admin dashboard itself.
    if (path.startsWith("/admin")) return new NextResponse(null, { status: 204 });

    const supabase = getSupabase();
    if (!supabase) return new NextResponse(null, { status: 204 });

    const ownHost = request.headers.get("host") ?? "studyace.co";
    const referrer = externalReferrerHost(
      typeof body.referrer === "string" ? body.referrer : null,
      ownHost,
    );
    const visitorId =
      typeof body.visitorId === "string" ? body.visitorId.slice(0, 64) : null;
    const country = request.headers.get("x-vercel-ip-country") || null;
    const { userId } = await auth();

    await supabase.from("page_views").insert({
      path,
      referrer,
      visitor_id: visitorId,
      user_id: userId ?? null,
      country,
      device: deviceFrom(ua),
    });
  } catch (err) {
    console.error("track failed:", err);
  }
  return new NextResponse(null, { status: 204 });
}
