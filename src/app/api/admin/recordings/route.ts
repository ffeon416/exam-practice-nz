import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/adminEmails";

export const dynamic = "force-dynamic";

// Lists first-party session recordings for /admin, newest first. Metadata only
// (no rrweb events) — the player fetches events per session on demand.

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });

  const { data, error } = await supabase
    .from("recordings")
    .select("session_id, user_id, page, country, device, started_at, last_seen")
    .order("last_seen", { ascending: false })
    .limit(60);

  if (error) {
    // Table not migrated yet — degrade to an empty list rather than 500.
    return NextResponse.json({ recordings: [] });
  }

  type Row = {
    session_id: string;
    user_id: string | null;
    page: string | null;
    country: string | null;
    device: string | null;
    started_at: string;
    last_seen: string;
  };
  const rows = (data ?? []) as Row[];

  // Attach a friendly name + tier from profiles for signed-in sessions.
  const userIds = [...new Set(rows.map((r) => r.user_id).filter((x): x is string => Boolean(x)))];
  const profileMap = new Map<string, { email: string | null; tier: string | null }>();
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, email, tier")
      .in("user_id", userIds);
    for (const p of (profs ?? []) as { user_id: string; email: string | null; tier: string | null }[]) {
      profileMap.set(p.user_id, { email: p.email, tier: p.tier });
    }
  }

  const recordings = rows.map((r) => {
    const profile = r.user_id ? profileMap.get(r.user_id) : undefined;
    const durationMs = Math.max(
      0,
      new Date(r.last_seen).getTime() - new Date(r.started_at).getTime()
    );
    return {
      sessionId: r.session_id,
      who: profile?.email ? profile.email.split("@")[0] : `Visitor ${r.session_id.slice(0, 6)}`,
      signedIn: Boolean(r.user_id),
      tier: profile?.tier ?? null,
      page: r.page,
      country: r.country,
      device: r.device,
      startedAt: r.started_at,
      durationMs,
    };
  });

  return NextResponse.json({ recordings });
}
