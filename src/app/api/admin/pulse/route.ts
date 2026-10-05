import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/adminEmails";
import { isComp } from "@/lib/compEmails";

export const dynamic = "force-dynamic";

// GET /api/admin/pulse — the handful of numbers for the phone page
// (/admin/pulse): paying customers, grade-check leads, checkouts, visitors,
// and the latest things that happened. Admin only. Every query is wrapped so
// a missing table reads as zero instead of breaking the page.

const DAY = 864e5;

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const user = await currentUser();
  if (!isAdminEmail(user?.emailAddresses?.[0]?.emailAddress)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();

  // Paying customers: accounts on a paid plan, minus comps and test accounts.
  let paying = 0, accounts = 0;
  const newPayers: { email: string; at: string }[] = [];
  try {
    const { data } = await supabase.from("profiles").select("email, tier, created_at, updated_at").limit(5000);
    for (const p of data ?? []) {
      accounts++;
      if (p.tier !== "free" && !isComp(p.email)) { paying++; newPayers.push({ email: p.email ?? "", at: p.updated_at ?? p.created_at }); }
    }
  } catch { /* zero */ }

  // Events: leads (grade-check emails), checkouts started, payments.
  type Ev = { name: string; created_at: string; props: Record<string, unknown> | null };
  let events: Ev[] = [];
  let leadsTotal = 0;
  try {
    const { data } = await supabase.from("events").select("name, created_at, props")
      .in("name", ["diagnostic_lead", "checkout_started", "subscription_paid"])
      .gte("created_at", iso(now - 30 * DAY)).order("created_at", { ascending: false }).limit(2000);
    events = (data ?? []) as Ev[];
    const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("name", "diagnostic_lead");
    leadsTotal = count ?? 0;
  } catch { /* zero */ }

  const since = (name: string, ms: number) => events.filter((e) => e.name === name && new Date(e.created_at).getTime() >= now - ms).length;

  // Leads per day, last 14 days, oldest first (UTC days).
  const days: { date: string; leads: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const key = iso(now - i * DAY).slice(0, 10);
    days.push({ date: key, leads: events.filter((e) => e.name === "diagnostic_lead" && e.created_at.slice(0, 10) === key).length });
  }

  // Visitors in the last 24 hours.
  let visitors24h = 0, views24h = 0;
  try {
    const { data } = await supabase.from("page_views").select("visitor_id").gte("created_at", iso(now - DAY)).limit(20000);
    views24h = data?.length ?? 0;
    visitors24h = new Set((data ?? []).map((r) => r.visitor_id)).size;
  } catch { /* zero */ }

  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const feed = events.slice(0, 15).map((e) => ({
    kind: e.name === "subscription_paid" ? "paid" : e.name === "checkout_started" ? "checkout" : "lead",
    at: e.created_at,
    who: str(e.props?.name) || str(e.props?.email) || "",
    detail: e.name === "diagnostic_lead" ? [str(e.props?.subject), str(e.props?.curriculum), str(e.props?.bandLabel) && `got ${str(e.props?.bandLabel)}`].filter(Boolean).join(" · ")
      : e.name === "checkout_started" ? [str(e.props?.tier), str(e.props?.billing)].filter(Boolean).join(" · ")
      : str(e.props?.plan),
  }));

  return NextResponse.json({
    paying, goal: 50, accounts,
    leads: { total: leadsTotal, last24h: since("diagnostic_lead", DAY), last7d: since("diagnostic_lead", 7 * DAY) },
    checkouts7d: since("checkout_started", 7 * DAY),
    paid30d: since("subscription_paid", 30 * DAY),
    visitors24h, views24h, days, feed,
    at: iso(now),
  });
}
