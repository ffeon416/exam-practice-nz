// Web push for the kid's "remind me at 7pm". Server-only.
//
// Keys: NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY (make a pair once with
// `npx web-push generate-vapid-keys`), VAPID_SUBJECT = mailto:you@... .
// iPhones only get web push once StudyAce is added to the home screen, so the
// page always offers the "add to my calendar" (.ics) fallback too.

import webpush from "web-push";
import { getSupabase } from "./supabase";

let configured: boolean | null = null;
function ready(): boolean {
  if (configured !== null) return configured;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (configured = false);
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:hello@studyace.co", pub, priv);
  return (configured = true);
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Send to every device this user subscribed. Returns how many got it. */
export async function pushToUser(userId: string, payload: PushPayload): Promise<number> {
  const supabase = getSupabase();
  if (!supabase || !ready()) return 0;
  const { data: subs } = await supabase.from("push_subscriptions").select("endpoint, p256dh, auth").eq("user_id", userId);
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 6 });
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      // Gone / not found = the device unsubscribed; forget it.
      if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      else console.error("push failed:", code, err);
    }
  }
  return sent;
}

export function validSubscription(v: unknown): v is { endpoint: string; keys: { p256dh: string; auth: string } } {
  if (!v || typeof v !== "object") return false;
  const s = v as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  return (
    typeof s.endpoint === "string" && /^https:\/\//.test(s.endpoint) && s.endpoint.length < 1000 &&
    typeof s.keys?.p256dh === "string" && s.keys.p256dh.length < 200 &&
    typeof s.keys?.auth === "string" && s.keys.auth.length < 100
  );
}
