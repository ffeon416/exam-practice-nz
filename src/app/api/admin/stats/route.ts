import { NextResponse } from "next/server";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/adminEmails";
import { TIER_PRICES, type Tier } from "@/lib/tierLimits";

export const dynamic = "force-dynamic";

interface TopUser {
  userId: string;
  email: string | null;
  tier: Tier;
  costUsdMonth: number;
  costUsdAllTime: number;
  calls: number;
  revenueMonth: number;
  profitMonth: number;
}

interface FeatureBreakdown {
  feature: string;
  calls: number;
  costUsd: number;
}

interface UserRow {
  userId: string;
  email: string | null;
  tier: Tier;
  signedUpAt: string;
  lifetimeCostUsd: number;
  lifetimeCalls: number;
  lastActive: string | null; // last api_usage row, or null if never used
}

// Stripe fee + NZ GST — used to turn gross revenue into net retained revenue.
// Applied on top of the Anthropic cost to produce "profit per user".
const STRIPE_FEE_RATE = 0.03;
const GST_RATE = 0.15;

// Accounts that hold a paid tier but don't pay real money (owner test accounts,
// 100%-off comps). Excluded from the fleet-wide "revenue this month" total so the
// headline number reflects actual cash, not comped/test seats.
const REVENUE_EXCLUDED_EMAILS = new Set<string>([
  "ffeon.io+test1@gmail.com",
  "osullivantre2009@gmail.com",
]);

export async function GET() {
  // ── Gate: admin email only ──
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

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // ── Aggregate totals ──
  const [allTimeRes, monthRes, dayRes, featureRes, perUserRes] = await Promise.all([
    supabase.from("api_usage").select("cost_usd"),
    supabase.from("api_usage").select("cost_usd").gte("created_at", startOfMonth),
    supabase.from("api_usage").select("cost_usd").gte("created_at", startOfDay),
    supabase.from("api_usage").select("feature, cost_usd").gte("created_at", startOfMonth),
    supabase
      .from("api_usage")
      .select("user_id, cost_usd, created_at")
      .not("user_id", "is", null),
  ]);

  const sum = (rows: { cost_usd: number | null }[] | null) =>
    (rows ?? []).reduce((s, r) => s + (Number(r.cost_usd) || 0), 0);

  const countRows = (rows: unknown[] | null) => (rows ?? []).length;

  const totals = {
    today: { cost: sum(dayRes.data), calls: countRows(dayRes.data) },
    month: { cost: sum(monthRes.data), calls: countRows(monthRes.data) },
    allTime: { cost: sum(allTimeRes.data), calls: countRows(allTimeRes.data) },
  };

  // ── Feature breakdown (this month) ──
  const featureMap: Record<string, FeatureBreakdown> = {};
  for (const row of featureRes.data ?? []) {
    const key = row.feature as string;
    if (!featureMap[key]) featureMap[key] = { feature: key, calls: 0, costUsd: 0 };
    featureMap[key].calls += 1;
    featureMap[key].costUsd += Number(row.cost_usd) || 0;
  }
  const features = Object.values(featureMap).sort((a, b) => b.costUsd - a.costUsd);

  // ── Per-user spend (for top-spenders leaderboard) ──
  type UserAgg = { userId: string; costMonth: number; costAllTime: number; callsAllTime: number };
  const userAgg: Record<string, UserAgg> = {};
  for (const row of perUserRes.data ?? []) {
    const uid = row.user_id as string;
    if (!userAgg[uid]) userAgg[uid] = { userId: uid, costMonth: 0, costAllTime: 0, callsAllTime: 0 };
    const cost = Number(row.cost_usd) || 0;
    userAgg[uid].costAllTime += cost;
    userAgg[uid].callsAllTime += 1;
    if (row.created_at >= startOfMonth) {
      userAgg[uid].costMonth += cost;
    }
  }

  const topUserIds = Object.values(userAgg)
    .sort((a, b) => b.costMonth - a.costMonth)
    .slice(0, 25)
    .map((u) => u.userId);

  // ── Join with profiles for tier + email ──
  const profilesMap: Record<string, { email: string | null; tier: Tier }> = {};
  if (topUserIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, email, tier")
      .in("user_id", topUserIds);
    for (const p of profiles ?? []) {
      profilesMap[p.user_id as string] = {
        email: (p.email as string) ?? null,
        tier: (p.tier as Tier) ?? "free",
      };
    }
  }

  const topUsers: TopUser[] = topUserIds.map((uid) => {
    const agg = userAgg[uid];
    const prof = profilesMap[uid];
    const tier: Tier = prof?.tier ?? "free";
    const grossRevenue = TIER_PRICES[tier] ?? 0; // monthly rate in USD-ish (treat as NZD ≈ USD for rough profit)
    // Net revenue after Stripe fee + GST obligation
    const netRevenue =
      grossRevenue === 0 ? 0 : grossRevenue * (1 - STRIPE_FEE_RATE) * (1 - GST_RATE);
    return {
      userId: uid,
      email: prof?.email ?? null,
      tier,
      costUsdMonth: agg.costMonth,
      costUsdAllTime: agg.costAllTime,
      calls: agg.callsAllTime,
      revenueMonth: netRevenue,
      profitMonth: netRevenue - agg.costMonth,
    };
  });

  // ── Fleet-wide profit: sum of all paid subscribers' net revenue − total API cost this month ──
  const { data: paidProfiles } = await supabase
    .from("profiles")
    .select("tier, email")
    .neq("tier", "free");
  let fleetRevenueMonth = 0;
  for (const p of paidProfiles ?? []) {
    // Skip owner test accounts / comps — they hold a paid tier but pay no cash.
    // Normalised to lowercase so a differently-cased profile email still matches.
    if (p.email && REVENUE_EXCLUDED_EMAILS.has((p.email as string).toLowerCase().trim())) continue;
    const tier = (p.tier as Tier) ?? "free";
    const gross = TIER_PRICES[tier] ?? 0;
    fleetRevenueMonth += gross * (1 - STRIPE_FEE_RATE) * (1 - GST_RATE);
  }

  const subscriberCounts = {
    free: 0,
    student: 0,
    pro: 0,
  };

  // Full user list for the "All users" section (latest sign-ups first).
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("user_id, email, tier, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  for (const p of allProfiles ?? []) {
    const t = (p.tier as Tier) ?? "free";
    if (t in subscriberCounts) subscriberCounts[t] += 1;
  }

  // Lifetime cost / calls / last-active per user (from the per-user agg built above)
  const allUsers: UserRow[] = (allProfiles ?? []).map((p) => {
    const uid = p.user_id as string;
    const agg = userAgg[uid];
    return {
      userId: uid,
      email: (p.email as string) ?? null,
      tier: (p.tier as Tier) ?? "free",
      signedUpAt: p.created_at as string,
      lifetimeCostUsd: agg?.costAllTime ?? 0,
      lifetimeCalls: agg?.callsAllTime ?? 0,
      lastActive: null, // filled in next
    };
  });

  // Fill last-active for users who have api_usage rows.
  if (allUsers.length > 0) {
    const uidSet = new Set(allUsers.map((u) => u.userId));
    const userIds = Array.from(uidSet);
    const { data: lastActiveRows } = await supabase
      .from("api_usage")
      .select("user_id, created_at")
      .in("user_id", userIds)
      .order("created_at", { ascending: false });

    const lastActiveMap: Record<string, string> = {};
    for (const row of lastActiveRows ?? []) {
      const uid = row.user_id as string;
      if (!lastActiveMap[uid]) lastActiveMap[uid] = row.created_at as string;
    }
    for (const u of allUsers) {
      u.lastActive = lastActiveMap[u.userId] ?? null;
    }
  }

  // Overlay emails from Clerk for users whose profile row has email = null.
  // Covers historical rows created before we started storing the email.
  const missingEmailIds = [
    ...allUsers.filter((u) => !u.email).map((u) => u.userId),
    ...topUsers.filter((u) => !u.email).map((u) => u.userId),
  ];
  const uniqueMissing = Array.from(new Set(missingEmailIds));
  if (uniqueMissing.length > 0) {
    try {
      const clerk = await clerkClient();
      const { data: clerkUsers } = await clerk.users.getUserList({
        userId: uniqueMissing,
        limit: Math.min(uniqueMissing.length, 500),
      });
      const emailMap: Record<string, string> = {};
      for (const cu of clerkUsers) {
        const primaryId = cu.primaryEmailAddressId;
        const primary = cu.emailAddresses.find((e) => e.id === primaryId);
        const fallback = cu.emailAddresses[0];
        const email = primary?.emailAddress ?? fallback?.emailAddress ?? null;
        if (email) emailMap[cu.id] = email;
      }
      for (const u of allUsers) {
        if (!u.email && emailMap[u.userId]) u.email = emailMap[u.userId];
      }
      for (const u of topUsers) {
        if (!u.email && emailMap[u.userId]) u.email = emailMap[u.userId];
      }
    } catch (err) {
      console.error("Failed to fetch Clerk emails:", err);
    }
  }

  return NextResponse.json({
    totals,
    features,
    topUsers,
    fleetRevenueMonth,
    fleetProfitMonth: fleetRevenueMonth - totals.month.cost,
    subscriberCounts,
    allUsers,
  });
}
