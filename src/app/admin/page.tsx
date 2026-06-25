"use client";

import { useEffect, useState } from "react";

interface Totals {
  today: { cost: number; calls: number };
  month: { cost: number; calls: number };
  allTime: { cost: number; calls: number };
}

interface FeatureBreakdown {
  feature: string;
  calls: number;
  costUsd: number;
}

interface TopUser {
  userId: string;
  email: string | null;
  tier: "free" | "student" | "pro";
  costUsdMonth: number;
  costUsdAllTime: number;
  calls: number;
  revenueMonth: number;
  profitMonth: number;
}

interface UserRow {
  userId: string;
  email: string | null;
  tier: "free" | "student" | "pro";
  signedUpAt: string;
  lifetimeCostUsd: number;
  lifetimeCalls: number;
  lastActive: string | null;
}

interface Stats {
  totals: Totals;
  features: FeatureBreakdown[];
  topUsers: TopUser[];
  fleetRevenueMonth: number;
  fleetProfitMonth: number;
  subscriberCounts: { free: number; student: number; pro: number };
  allUsers: UserRow[];
}

interface TrafficWindow {
  views: number;
  visitors: number;
}

interface Analytics {
  totals: { today: TrafficWindow; week: TrafficWindow; month: TrafficWindow };
  topPages: { key: string; count: number }[];
  topReferrers: { key: string; count: number }[];
  topCountries: { key: string; count: number }[];
  deviceCount: { mobile: number; desktop: number };
  daily: { date: string; views: number }[];
  truncated: boolean;
}

function fmtMoney(n: number): string {
  if (n === 0) return "$0.00";
  if (Math.abs(n) < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

const FEATURE_LABELS: Record<string, string> = {
  tutor: "Tutor chat",
  mark: "Answer marking",
  essay: "Essay marking (4-pass)",
  generate_paper: "Paper generation",
  practice_question: "Practice question",
};

type UserSortKey = "signedUpAt" | "email" | "tier" | "lifetimeCostUsd" | "lastActive";

export default function AdminPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState("");
  const [userSort, setUserSort] = useState<UserSortKey>("signedUpAt");
  const [tierFilter, setTierFilter] = useState<"all" | "free" | "student" | "pro">("all");
  const [cleanupState, setCleanupState] = useState<
    { status: "idle" } | { status: "running" } | { status: "done"; scanned: number; deleted: number } | { status: "error"; message: string }
  >({ status: "idle" });

  async function runCleanup() {
    if (
      !confirm(
        "Delete all profiles whose Clerk user no longer exists (test data from before Clerk production)? This cannot be undone."
      )
    )
      return;
    setCleanupState({ status: "running" });
    try {
      const res = await fetch("/api/admin/cleanup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setCleanupState({ status: "error", message: data.error ?? `HTTP ${res.status}` });
        return;
      }
      setCleanupState({ status: "done", scanned: data.scanned, deleted: data.deleted });
      // Reload stats so the table reflects the cleanup
      const freshRes = await fetch("/api/admin/stats", { cache: "no-store" });
      if (freshRes.ok) setStats((await freshRes.json()) as Stats);
    } catch (err) {
      setCleanupState({ status: "error", message: err instanceof Error ? err.message : "Failed" });
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/stats", { cache: "no-store" });
        if (res.status === 403) {
          if (!cancelled) setError("Forbidden — you're not on the admin allowlist.");
          return;
        }
        if (!res.ok) {
          if (!cancelled) setError(`Failed to load stats (${res.status})`);
          return;
        }
        const data = (await res.json()) as Stats;
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    async function loadAnalytics() {
      try {
        const res = await fetch("/api/admin/analytics", { cache: "no-store" });
        if (res.ok && !cancelled) setAnalytics((await res.json()) as Analytics);
      } catch {
        /* traffic panel is non-critical — ignore */
      }
    }
    load();
    loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-5 pt-16 pb-20">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-white/[0.04] rounded-lg w-48" />
          <div className="h-32 bg-white/[0.04] rounded-2xl w-full" />
          <div className="h-64 bg-white/[0.04] rounded-2xl w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-xl mx-auto px-5 pt-16 pb-20 text-center">
        <h1 className="text-[24px] font-extrabold text-white mb-3">Admin</h1>
        <p className="text-red-300 text-[14px]">{error}</p>
      </div>
    );
  }

  if (!stats) return null;

  const { totals, features, topUsers, fleetRevenueMonth, fleetProfitMonth, subscriberCounts, allUsers } = stats;
  const totalSubscribers = subscriberCounts.free + subscriberCounts.student + subscriberCounts.pro;
  const paidSubscribers = subscriberCounts.student + subscriberCounts.pro;

  const filteredUsers = allUsers
    .filter((u) => (tierFilter === "all" ? true : u.tier === tierFilter))
    .filter((u) => {
      if (!userSearch.trim()) return true;
      const q = userSearch.trim().toLowerCase();
      return (
        (u.email ?? "").toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q)
      );
    })
    .slice()
    .sort((a, b) => {
      switch (userSort) {
        case "email":
          return (a.email ?? "").localeCompare(b.email ?? "");
        case "tier": {
          const order = { pro: 0, student: 1, free: 2 } as const;
          return order[a.tier] - order[b.tier];
        }
        case "lifetimeCostUsd":
          return b.lifetimeCostUsd - a.lifetimeCostUsd;
        case "lastActive":
          return (b.lastActive ?? "").localeCompare(a.lastActive ?? "");
        case "signedUpAt":
        default:
          return b.signedUpAt.localeCompare(a.signedUpAt);
      }
    });

  return (
    <div className="max-w-5xl mx-auto px-5 pt-8 sm:pt-12 pb-20">
      <div className="mb-8">
        <h1 className="text-[28px] sm:text-[32px] font-extrabold text-white tracking-tight mb-1">
          Admin — cost & profit
        </h1>
        <p className="text-zinc-500 text-[13px]">
          Live from Supabase. Refresh to update.
        </p>
      </div>

      {/* Fleet-wide summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Stat label="Spent today" value={fmtMoney(totals.today.cost)} sub={`${totals.today.calls} calls`} />
        <Stat label="Spent this month" value={fmtMoney(totals.month.cost)} sub={`${totals.month.calls} calls`} />
        <Stat label="Revenue this month" value={fmtMoney(fleetRevenueMonth)} sub="After fees + GST" />
        <Stat
          label="Profit this month"
          value={fmtMoney(fleetProfitMonth)}
          sub={fleetProfitMonth >= 0 ? "In the black ✓" : "In the red"}
          emphasis={fleetProfitMonth >= 0 ? "good" : "bad"}
        />
      </div>

      {/* Subscriber counts */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-8">
        <h2 className="text-white font-extrabold text-[14px] mb-3">Subscribers</h2>
        <div className="grid grid-cols-3 gap-3">
          <MiniStat label="Free" value={subscriberCounts.free} />
          <MiniStat label="Student" value={subscriberCounts.student} />
          <MiniStat label="Pro" value={subscriberCounts.pro} />
        </div>
        <p className="text-zinc-500 text-[11px] mt-3">
          {totalSubscribers} total signed-up users · {paidSubscribers} paying
        </p>
      </div>

      {/* Traffic (first-party analytics) */}
      {analytics && <Traffic analytics={analytics} />}

      {/* Feature breakdown */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-8">
        <h2 className="text-white font-extrabold text-[14px] mb-3">Cost by feature (this month)</h2>
        {features.length === 0 ? (
          <p className="text-zinc-500 text-[13px]">No API calls yet this month.</p>
        ) : (
          <div className="space-y-2">
            {features.map((f) => {
              const pct = totals.month.cost > 0 ? (f.costUsd / totals.month.cost) * 100 : 0;
              return (
                <div key={f.feature}>
                  <div className="flex justify-between text-[12px] mb-1">
                    <span className="text-zinc-300">{FEATURE_LABELS[f.feature] ?? f.feature}</span>
                    <span className="text-zinc-400 tabular-nums">
                      {fmtMoney(f.costUsd)} · {f.calls} calls
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Top users */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5">
        <h2 className="text-white font-extrabold text-[14px] mb-3">Top spenders (this month)</h2>
        {topUsers.length === 0 ? (
          <p className="text-zinc-500 text-[13px]">No users with logged API usage yet.</p>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-[12px] min-w-[600px]">
              <thead>
                <tr className="text-zinc-500 text-left border-b border-white/[0.06]">
                  <th className="font-medium py-2 px-2">User</th>
                  <th className="font-medium py-2 px-2">Tier</th>
                  <th className="font-medium py-2 px-2 text-right">Cost (mo)</th>
                  <th className="font-medium py-2 px-2 text-right">Calls</th>
                  <th className="font-medium py-2 px-2 text-right">Revenue</th>
                  <th className="font-medium py-2 px-2 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {topUsers.map((u) => (
                  <tr key={u.userId} className="border-b border-white/[0.04]">
                    <td className="py-2 px-2 text-zinc-300 truncate max-w-[200px]">
                      {u.email ?? <span className="text-zinc-600 font-mono">{u.userId.slice(0, 16)}…</span>}
                    </td>
                    <td className="py-2 px-2">
                      <TierBadge tier={u.tier} />
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-300">
                      {fmtMoney(u.costUsdMonth)}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-400">{u.calls}</td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-400">
                      {fmtMoney(u.revenueMonth)}
                    </td>
                    <td
                      className={`py-2 px-2 text-right tabular-nums font-semibold ${
                        u.profitMonth >= 0 ? "text-emerald-400" : "text-red-400"
                      }`}
                    >
                      {fmtMoney(u.profitMonth)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-zinc-600 text-[11px] mt-3 leading-relaxed">
          Profit = (tier price × 0.97 Stripe × 0.85 GST) − API cost. Free-tier users have $0 revenue so they always show as a loss; that&apos;s fine — free is acquisition, not revenue.
        </p>
      </div>

      {/* All users */}
      <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mt-8">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-white font-extrabold text-[14px]">
              All users <span className="text-zinc-500 font-normal">({allUsers.length})</span>
            </h2>
            <button
              onClick={runCleanup}
              disabled={cleanupState.status === "running"}
              className="text-[11px] font-medium text-red-300 hover:text-red-200 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
            >
              {cleanupState.status === "running" ? "Cleaning…" : "Clean up stale profiles"}
            </button>
            {cleanupState.status === "done" && (
              <span className="text-[11px] text-emerald-300">
                Scanned {cleanupState.scanned} · deleted {cleanupState.deleted}
              </span>
            )}
            {cleanupState.status === "error" && (
              <span className="text-[11px] text-red-300">Error: {cleanupState.message}</span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Search email or ID…"
              className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-1.5 text-[12px] text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500/50 w-48"
            />
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value as typeof tierFilter)}
              className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12px] text-zinc-300 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="all">All tiers</option>
              <option value="free">Free</option>
              <option value="student">Student</option>
              <option value="pro">Pro</option>
            </select>
            <select
              value={userSort}
              onChange={(e) => setUserSort(e.target.value as UserSortKey)}
              className="bg-white/[0.03] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[12px] text-zinc-300 focus:outline-none focus:border-indigo-500/50"
            >
              <option value="signedUpAt">Newest first</option>
              <option value="lastActive">Last active</option>
              <option value="lifetimeCostUsd">Lifetime cost</option>
              <option value="tier">Tier</option>
              <option value="email">Email (A-Z)</option>
            </select>
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <p className="text-zinc-500 text-[13px] text-center py-8">
            {allUsers.length === 0 ? "No signed-up users yet." : "No users match that filter."}
          </p>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:mx-0">
            <table className="w-full text-[12px] min-w-[700px]">
              <thead>
                <tr className="text-zinc-500 text-left border-b border-white/[0.06]">
                  <th className="font-medium py-2 px-2">User</th>
                  <th className="font-medium py-2 px-2">Tier</th>
                  <th className="font-medium py-2 px-2">Signed up</th>
                  <th className="font-medium py-2 px-2">Last active</th>
                  <th className="font-medium py-2 px-2 text-right">Lifetime cost</th>
                  <th className="font-medium py-2 px-2 text-right">Calls</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.userId} className="border-b border-white/[0.04]">
                    <td className="py-2 px-2 text-zinc-300 truncate max-w-[240px]">
                      {u.email ?? (
                        <span className="text-zinc-600 font-mono">{u.userId.slice(0, 16)}…</span>
                      )}
                    </td>
                    <td className="py-2 px-2">
                      <TierBadge tier={u.tier} />
                    </td>
                    <td className="py-2 px-2 text-zinc-400 tabular-nums">
                      {fmtDate(u.signedUpAt)}
                    </td>
                    <td className="py-2 px-2 text-zinc-500 tabular-nums">
                      {u.lastActive ? fmtRelative(u.lastActive) : <span className="text-zinc-700">Never</span>}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-300">
                      {fmtMoney(u.lifetimeCostUsd)}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums text-zinc-500">
                      {u.lifetimeCalls}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-zinc-600 text-[11px] mt-3 leading-relaxed">
          Showing newest 500 users. &quot;Last active&quot; = most recent AI call (tutor / marking / paper gen). Users who signed up but never used AI show &quot;Never&quot;.
        </p>
      </div>
    </div>
  );
}

function fmtDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "2-digit" });
  } catch {
    return iso;
  }
}

function fmtRelative(iso: string): string {
  try {
    const diffMs = Date.now() - new Date(iso).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return `${diffDay}d ago`;
    return fmtDate(iso);
  } catch {
    return "—";
  }
}

// Country code → flag emoji + name. Vercel's edge gives a 2-letter ISO code.
const COUNTRY_NAMES: Record<string, string> = {
  NZ: "New Zealand", AU: "Australia", US: "United States", GB: "United Kingdom",
  CA: "Canada", IE: "Ireland", IN: "India", ZA: "South Africa", SG: "Singapore",
  PH: "Philippines", FJ: "Fiji", CN: "China", JP: "Japan", DE: "Germany",
  FR: "France", NL: "Netherlands", BR: "Brazil",
};
function countryLabel(code: string): string {
  if (!code || code.length !== 2 || code === "XX") return "Unknown";
  const flag = String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65),
  );
  return `${flag} ${COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase()}`;
}

function Traffic({ analytics }: { analytics: Analytics }) {
  const { totals, topPages, topReferrers, topCountries, deviceCount, daily, truncated } = analytics;
  const maxDay = Math.max(1, ...daily.map((d) => d.views));
  const deviceTotal = deviceCount.mobile + deviceCount.desktop;
  const mobilePct = deviceTotal > 0 ? Math.round((deviceCount.mobile / deviceTotal) * 100) : 0;

  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 mb-8">
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-white font-extrabold text-[14px]">Traffic</h2>
        <span className="text-zinc-600 text-[11px]">First-party · last 30 days</span>
      </div>

      {/* Headline windows */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Today" value={totals.today.views.toLocaleString()} sub={`${totals.today.visitors} visitors`} />
        <Stat label="7 days" value={totals.week.views.toLocaleString()} sub={`${totals.week.visitors} visitors`} />
        <Stat label="30 days" value={totals.month.views.toLocaleString()} sub={`${totals.month.visitors} visitors`} />
      </div>

      {/* 14-day daily views bar chart */}
      <div className="mb-5">
        <p className="text-zinc-500 text-[11px] uppercase tracking-wider font-medium mb-2">Views · last 14 days</p>
        <div className="flex items-end gap-[3px] h-20">
          {daily.map((d) => (
            <div key={d.date} className="flex-1 flex flex-col justify-end group relative" title={`${d.date}: ${d.views}`}>
              <div
                className="w-full bg-gradient-to-t from-indigo-500/70 to-purple-500/70 rounded-sm min-h-[2px]"
                style={{ height: `${(d.views / maxDay) * 100}%` }}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-zinc-600 text-[10px] mt-1">
          <span>{daily[0]?.date.slice(5)}</span>
          <span>{daily[daily.length - 1]?.date.slice(5)}</span>
        </div>
      </div>

      {/* Top pages + referrers + countries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <TrafficList title="Top pages" rows={topPages} emptyLabel="No views yet." />
        <TrafficList title="Top referrers" rows={topReferrers} emptyLabel="No external referrers yet — traffic is direct." />
        <TrafficList
          title="Top countries"
          rows={topCountries.map((c) => ({ key: countryLabel(c.key), count: c.count }))}
          emptyLabel="No location data yet."
        />
      </div>

      <p className="text-zinc-600 text-[11px] mt-4">
        {deviceTotal > 0 ? `${mobilePct}% mobile · ${100 - mobilePct}% desktop` : "No device data yet"}
        {truncated && " · showing newest 50k views (older traffic capped)"}
      </p>
    </div>
  );
}

function TrafficList({ title, rows, emptyLabel }: { title: string; rows: { key: string; count: number }[]; emptyLabel: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div>
      <p className="text-zinc-500 text-[11px] uppercase tracking-wider font-medium mb-2">{title}</p>
      {rows.length === 0 ? (
        <p className="text-zinc-500 text-[12px]">{emptyLabel}</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => (
            <div key={r.key} className="relative flex justify-between items-center text-[12px] px-2 py-1 rounded-md overflow-hidden">
              <div className="absolute inset-0 bg-white/[0.03] rounded-md" style={{ width: `${(r.count / max) * 100}%` }} />
              <span className="relative text-zinc-300 truncate max-w-[78%]">{r.key}</span>
              <span className="relative text-zinc-400 tabular-nums">{r.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  emphasis,
}: {
  label: string;
  value: string;
  sub?: string;
  emphasis?: "good" | "bad";
}) {
  const valColor =
    emphasis === "good" ? "text-emerald-400" : emphasis === "bad" ? "text-red-400" : "text-white";
  return (
    <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-4">
      <p className="text-zinc-500 text-[11px] uppercase tracking-wider font-medium mb-1">{label}</p>
      <p className={`text-[22px] font-extrabold tabular-nums ${valColor}`}>{value}</p>
      {sub && <p className="text-zinc-500 text-[11px] mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2.5">
      <p className="text-zinc-500 text-[10px] uppercase tracking-wider">{label}</p>
      <p className="text-white font-bold text-[18px] tabular-nums">{value}</p>
    </div>
  );
}

function TierBadge({ tier }: { tier: "free" | "student" | "pro" }) {
  const styles = {
    free: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
    student: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    pro: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  }[tier];
  return (
    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${styles}`}>
      {tier}
    </span>
  );
}
