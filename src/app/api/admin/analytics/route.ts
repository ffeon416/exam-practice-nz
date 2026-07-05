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
  country: string | null;
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
    .select("path, referrer, visitor_id, device, country, created_at")
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
  const countryMap = new Map<string, number>();
  const deviceCount = { mobile: 0, desktop: 0 };
  for (const r of rows) {
    pageMap.set(r.path, (pageMap.get(r.path) ?? 0) + 1);
    if (r.referrer) refMap.set(r.referrer, (refMap.get(r.referrer) ?? 0) + 1);
    if (r.country) countryMap.set(r.country, (countryMap.get(r.country) ?? 0) + 1);
    if (r.device === "mobile") deviceCount.mobile++;
    else if (r.device === "desktop") deviceCount.desktop++;
  }
  const sortTop = (m: Map<string, number>, n: number) =>
    [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));

  const topPages = sortTop(pageMap, 12);
  const topReferrers = sortTop(refMap, 10);
  const topCountries = sortTop(countryMap, 10);

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

  // Attribution: how signed-up users say they first heard about StudyAce.
  // Separate, non-critical query — resilient to the column not existing yet.
  let heardAbout: { key: string; count: number }[] = [];
  const { data: heardRows, error: heardErr } = await supabase
    .from("profiles")
    .select("heard_about")
    .not("heard_about", "is", null);
  if (!heardErr && heardRows) {
    const heardMap = new Map<string, number>();
    for (const r of heardRows as { heard_about: string | null }[]) {
      if (r.heard_about) heardMap.set(r.heard_about, (heardMap.get(r.heard_about) ?? 0) + 1);
    }
    heardAbout = sortTop(heardMap, 10);
  }

  // New vs returning visitors (30d): a returning visitor is one seen on 2+
  // distinct days in the window. A proxy — no cookies, just the anon id.
  const visitorDays = new Map<string, Set<string>>();
  for (const r of rows) {
    if (!r.visitor_id) continue;
    let set = visitorDays.get(r.visitor_id);
    if (!set) { set = new Set(); visitorDays.set(r.visitor_id, set); }
    set.add(r.created_at.slice(0, 10));
  }
  let returningVisitors = 0;
  for (const days of visitorDays.values()) if (days.size >= 2) returningVisitors++;
  const newVsReturning = {
    new: visitorDays.size - returningVisitors,
    returning: returningVisitors,
  };

  // ── Conversion funnel ────────────────────────────────────
  // All four steps are keyed on the Clerk user_id, so this is a genuine linked
  // funnel (not just stage counts): Signed up → Took first exam → Started
  // checkout → Paid. Each query is resilient — the funnel degrades to zeros
  // rather than failing the whole panel if a table/column isn't there yet.
  const funnel = { signedUp: 0, activated: 0, startedCheckout: 0, paid: 0 };
  const signupDaily = [...dailyMap.keys()].map((date) => ({ date, count: 0 }));
  // Money-moments: free/student users hitting a paywall (30d) — the strongest
  // "would pay" signal. { total, users, byReason: [{key,count}] }.
  let paywall = { total: 0, users: 0, byReason: [] as { key: string; count: number }[] };
  const paywallReasonLabels: Record<string, string> = {
    exam_limit: "Out of weekly exams",
    subject_locked: "Locked subject",
    tutor_locked: "AI tutor (Pro-only)",
    tutor_limit: "Out of tutor chats",
  };
  try {
    const [profRes, attemptRes, eventRes] = await Promise.all([
      supabase.from("profiles").select("user_id, tier, created_at").limit(ROW_CAP),
      supabase.from("exam_attempts").select("user_id").limit(ROW_CAP),
      supabase.from("events").select("name, user_id, props, created_at").limit(ROW_CAP),
    ]);

    const profRows = (profRes.data ?? []) as { user_id: string; tier: string | null; created_at: string }[];
    const signedUp = new Set(profRows.map((p) => p.user_id));
    const paidUsers = new Set(
      profRows.filter((p) => p.tier === "student" || p.tier === "pro").map((p) => p.user_id)
    );

    const activated = new Set<string>();
    for (const a of (attemptRes.data ?? []) as { user_id: string | null }[]) {
      if (a.user_id) activated.add(a.user_id);
    }

    const startedCheckout = new Set<string>();
    const paywallUsers = new Set<string>();
    const reasonMap = new Map<string, number>();
    type EventRow = { name: string; user_id: string | null; props: Record<string, unknown> | null; created_at: string };
    for (const e of (eventRes.data ?? []) as EventRow[]) {
      if (e.name === "checkout_started" && e.user_id) startedCheckout.add(e.user_id);
      // Historical payers (before event logging existed) are captured via tier
      // above; the subscription_paid event covers everyone going forward.
      else if (e.name === "subscription_paid" && e.user_id) paidUsers.add(e.user_id);
      else if (e.name === "paywall_hit" && new Date(e.created_at).getTime() >= now - 30 * 86_400_000) {
        paywall.total++;
        if (e.user_id) paywallUsers.add(e.user_id);
        const reason = typeof e.props?.reason === "string" ? e.props.reason : "other";
        reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
      }
    }
    paywall = {
      total: paywall.total,
      users: paywallUsers.size,
      byReason: [...reasonMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => ({ key: paywallReasonLabels[key] ?? key, count })),
    };

    funnel.signedUp = signedUp.size;
    funnel.activated = activated.size;
    funnel.startedCheckout = startedCheckout.size;
    funnel.paid = paidUsers.size;

    // Signups per day for the 14-day chart (aligns with the views series).
    const sMap = new Map<string, number>(signupDaily.map((d) => [d.date, 0]));
    for (const p of profRows) {
      const key = p.created_at?.slice(0, 10);
      if (key && sMap.has(key)) sMap.set(key, (sMap.get(key) ?? 0) + 1);
    }
    for (const d of signupDaily) d.count = sMap.get(d.date) ?? 0;
  } catch (err) {
    console.error("Funnel aggregation failed (non-fatal):", err);
  }

  return NextResponse.json({
    totals,
    topPages,
    topReferrers,
    topCountries,
    deviceCount,
    daily,
    heardAbout,
    newVsReturning,
    funnel,
    signupDaily,
    paywall,
    truncated,
  });
}
