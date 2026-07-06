import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// Ingest endpoint for first-party session replay. Receives rrweb event batches
// from SessionRecorder and stores them so /admin can play them back. Public
// (logged-out visitors record too), bot-filtered, rate-limited, and ALWAYS
// returns 204 — recording must never surface an error to a user.

const BOT = /bot|crawl|spider|slurp|bing|facebookexternal|preview|headless|lighthouse|monitor|pingdom/i;
const MAX_BYTES = 4_000_000; // ~4 MB per batch (just under Vercel's 4.5 MB body limit)
const RETENTION_DAYS = 30;

const noContent = () => new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest) {
  try {
    const ua = req.headers.get("user-agent") ?? "";
    if (BOT.test(ua)) return noContent();

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const { ok } = rateLimit(`rec:${ip}`, 240, 60_000);
    if (!ok) return noContent();

    const raw = await req.text();
    if (!raw || raw.length > MAX_BYTES) return noContent();

    let body: {
      sessionId?: unknown;
      visitorId?: unknown;
      userId?: unknown;
      seq?: unknown;
      events?: unknown;
      path?: unknown;
    };
    try {
      body = JSON.parse(raw);
    } catch {
      return noContent();
    }

    const sessionId = body.sessionId;
    const events = body.events;
    if (typeof sessionId !== "string" || !Array.isArray(events) || events.length === 0) {
      return noContent();
    }

    const supabase = getSupabase();
    if (!supabase) return noContent();

    const country = req.headers.get("x-vercel-ip-country") ?? null;
    const device = /Mobile|Android|iPhone|iPad/i.test(ua) ? "mobile" : "desktop";

    await supabase.from("recording_chunks").insert({
      session_id: sessionId,
      seq: typeof body.seq === "number" && Number.isFinite(body.seq) ? body.seq : 0,
      events,
    });

    // One metadata row per session. started_at is left to the DB default on
    // first insert and preserved on later upserts; last_seen advances each batch.
    await supabase.from("recordings").upsert(
      {
        session_id: sessionId,
        visitor_id: typeof body.visitorId === "string" ? body.visitorId : null,
        user_id: typeof body.userId === "string" ? body.userId : null,
        page: typeof body.path === "string" ? body.path.slice(0, 200) : null,
        country,
        device,
        last_seen: new Date().toISOString(),
      },
      { onConflict: "session_id" }
    );

    // Opportunistic retention so storage stays bounded without a cron job.
    if (Math.random() < 0.01) {
      const cutoff = new Date(Date.now() - RETENTION_DAYS * 86_400_000).toISOString();
      await supabase.from("recording_chunks").delete().lt("created_at", cutoff);
      await supabase.from("recordings").delete().lt("last_seen", cutoff);
    }

    return noContent();
  } catch {
    return noContent();
  }
}
