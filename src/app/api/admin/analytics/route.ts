import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/adminEmails";

export const dynamic = "force-dynamic";

// First-party traffic analytics for /admin. Reads the page_views table and
// aggregates in JS (volume is low for a new product). Returns pageviews +
// unique-visitor estimates for today / 7d / 30d, top pages, top referrers,
// device split, and a 14-day daily series for a simple chart.

// Safety cap so a traffic spike can't pull an unbounded result set into memory.
// If we ever exceed this we'd move the aggregation into a Postgres RPC.
const ROW_CAP = 50_000;

interface ViewRow {
  path: string;
  referrer: string | null;
  visitor_id: string | null;
  device: string | null;
  created_at: string;
}

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!isAdminEmail(email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  }

  const now = Date.now();
  const startOfDay = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
  const since30 = new Date(now - 30 * 86_400_000).toISOString();

  // Pull the last 30 days once and slice in memory for each window.
  const { data, error } = await supabase
    .from("page_views")
    .select("path, referrer, visitor_id, device, created_at")
    .gte("created_at", since30)
    .order("created_at", { ascending: false })
    .limit(ROW_CAP);

  if (error) {
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const rows = (data ?? []) as ViewRow[];
  const truncated = rows.length >= ROW_CAP;

  const ms7 = now - 7 * 86_400_000;
  const dayStartMs = startOfDay.getTime();

  const windowStats = (predicate: (t: number) => boolean) => {
    let views = 0;
    const visitors = new Set<string>();
    for (const r of rows) {
      const t = new Date(r.created_at).getTime();
      if (!predicate(t)) continue;
      views++;
      if (r.visitor_id) visitors.add(r.visitor_id);
    }
    return { views, visitors: visitors.size };
  };

  const totals = {
    today: windowStats((t) => t >= dayStartMs),
    week: windowStats((t) => t >= ms7),
    month: windowStats(() => true),
  };

  // Top pages & referrers over the full 30-day window.
  const pageMap = new Map<string, number>();
  const refMap = new Map<string, number>();
  const deviceCount = { mobile: 0, desktop: 0 };
  for (const r of rows) {
    pageMap.set(r.path, (pageMap.get(r.path) ?? 0) + 1);
    if (r.referrer) refMap.set(r.referrer, (refMap.get(r.referrer) ?? 0) + 1);
    if (r.device === "mobile") deviceCount.mobile++;
    else if (r.device === "desktop") deviceCount.desktop++;
  }
  const sortTop = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));

  const topPages = sortTop(pageMap, 12);
  const topReferrers = sortTop(refMap, 10);

  // 14-day daily series (oldest → newest) for a little bar chart.
  const dailyMap = new Map<string, number>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now - i * 86_400_000);
    dailyMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    if (dailyMap.has(key)) dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  }
  const daily = [...dailyMap.entries()].map(([date, views]) => ({ date, views }));

  return NextResponse.json({
    totals,
    topPages,
    topReferrers,
    deviceCount,
    daily,
    truncated,
  });
}
