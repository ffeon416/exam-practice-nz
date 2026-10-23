// Meta custom events from the parent journey that happen away from the
// parent's browser: InviteSent, KidStarted, GradeCheckCompleted. Server-only.
//
// They are attributed to the PARENT (their hashed email and the fbp/fbc/IP
// stored on their profile at checkout) — never to the child. No child data
// goes to Meta: just the event name. Sent only if the parent allowed ad
// measurement, and once per child (deterministic event ids in meta_events).

import { getSupabase } from "./supabase";
import { sendMetaEvent } from "./metaCapi";

export type FunnelEvent = "InviteSent" | "KidStarted" | "GradeCheckCompleted";

const PREFIX: Record<FunnelEvent, string> = { InviteSent: "invite", KidStarted: "kidstart", GradeCheckCompleted: "gradecheck" };

export function funnelEventId(name: FunnelEvent, childId: string): string {
  return `${PREFIX[name]}_${childId}`;
}

export async function sendParentEvent(name: FunnelEvent, parentUserId: string, childId: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  const { data, error } = await supabase
    .from("profiles")
    .select("email, meta_consent, meta_identity")
    .eq("user_id", parentUserId)
    .maybeSingle();
  if (error || !data || data.meta_consent !== true) return;
  const id = (data.meta_identity ?? {}) as { fbp?: string; fbc?: string; ip?: string; ua?: string; cc?: string; vid?: string };
  await sendMetaEvent(
    {
      name,
      eventId: funnelEventId(name, childId),
      user: { email: data.email, externalId: id.vid, ip: id.ip, ua: id.ua, fbp: id.fbp, fbc: id.fbc, country: id.cc },
    },
    { once: true, userId: parentUserId }
  );
}
