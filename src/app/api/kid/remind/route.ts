import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { childForKid, updateChild } from "@/lib/children";
import { getSupabase } from "@/lib/supabase";
import { validSubscription } from "@/lib/push";

export const dynamic = "force-dynamic";

// "Not now, remind me at 7pm".
//   POST { at: ISO time, timezone?, subscription? }
// Saves when to remind (7pm the kid's time, worked out in their browser) and,
// if they allowed notifications, this device's push subscription. The
// reminders cron (/api/cron/reminders) sends it. Without push, the page offers
// an "add to my calendar" file instead — nothing to store for that.

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const child = await childForKid(userId);
  if (!child) return NextResponse.json({ error: "Not a student account." }, { status: 403 });

  const b = (await req.json().catch(() => ({}))) as { at?: unknown; timezone?: unknown; subscription?: unknown };
  const at = typeof b.at === "string" ? new Date(b.at) : null;
  const now = Date.now();
  if (!at || Number.isNaN(at.getTime()) || at.getTime() < now - 60_000 || at.getTime() > now + 48 * 3600_000) {
    return NextResponse.json({ error: "That time doesn't look right." }, { status: 400 });
  }
  const timezone = typeof b.timezone === "string" && /^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(b.timezone) ? b.timezone : child.timezone;
  await updateChild(child.id, { remind_at: at.toISOString(), reminded_at: null, timezone });

  let push = false;
  if (validSubscription(b.subscription)) {
    const s = b.subscription;
    const { error } = (await getSupabase()?.from("push_subscriptions").upsert(
      { endpoint: s.endpoint, user_id: userId, p256dh: s.keys.p256dh, auth: s.keys.auth },
      { onConflict: "endpoint" }
    )) ?? { error: null };
    push = !error;
  }
  return NextResponse.json({ ok: true, push });
}
