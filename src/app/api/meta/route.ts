import { NextRequest, NextResponse, after } from "next/server";
import { rateLimit } from "@/lib/rateLimit";
import { requestMeta, sendMetaEvent } from "@/lib/metaCapi";
import { CLIENT_META_EVENTS, EVENT_ID_RE, isParentPage, type ClientMetaEvent } from "@/lib/metaShared";

export const dynamic = "force-dynamic";

// Server copy of the browser's page-level Pixel events (PageView,
// ViewContent), with the same event_id so Meta counts each once. Only
// parent pages, only with consent where it's needed — the same checks the
// browser made, repeated here because the browser can't be trusted.

const ok = () => new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!rateLimit(`meta:${ip}`, 60, 60_000).ok) return ok();

  let body: { event?: string; eventId?: string; url?: string; params?: Record<string, unknown> | null };
  try {
    body = await req.json();
  } catch {
    return ok();
  }
  const event = body.event as ClientMetaEvent;
  if (!CLIENT_META_EVENTS.includes(event) || typeof body.eventId !== "string" || !EVENT_ID_RE.test(body.eventId)) return ok();

  let url: URL;
  try {
    url = new URL(String(body.url ?? ""));
  } catch {
    return ok();
  }
  const origin = req.headers.get("origin") || req.nextUrl.origin;
  if (url.origin !== origin || !isParentPage(url.pathname)) return ok();

  const m = requestMeta(req);
  if (!m.allowed) return ok();

  // Only two flat, non-personal params are passed through.
  const customData: Record<string, string> = {};
  for (const k of ["content_name", "content_category"]) {
    const v = body.params?.[k];
    if (typeof v === "string" && v.length <= 60) customData[k] = v;
  }

  const visitorId = req.cookies.get("sa_vid")?.value;
  after(() =>
    sendMetaEvent({
      name: event,
      eventId: body.eventId!,
      sourceUrl: url.toString().slice(0, 500),
      customData,
      user: { ip: m.ip, ua: m.ua, fbp: m.fbp, fbc: m.fbc, country: m.country, externalId: visitorId },
    })
  );
  return ok();
}
