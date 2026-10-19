import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/adminEmails";
import { isComp } from "@/lib/compEmails";
import { gaSnapshot } from "@/lib/ga";

export const dynamic = "force-dynamic";

// GET /api/admin/pulse — the numbers for the phone page (/admin/pulse):
// paying customers, grade-check leads, checkouts, visitors, where visitors
// came from, the ad funnel step by step, where the grade check loses people,
// what Google Analytics sees, and the latest things that happened. Admin
// only. Every query is wrapped so a missing table reads as zero instead of
// breaking the page.

const DAY = 864e5;
const GRADE_STEPS = ["name", "country", "system", "year", "subject", "contact", "loading", "test", "revealed"] as const;
/** Sources that mean "the Meta ad" (fbclid or an utm_source we set). */
const META = new Set(["meta", "facebook", "instagram", "fb", "ig"]);

type Ev = { name: string; created_at: string; props: Record<string, unknown> | null };
const str = (v: unknown) => (typeof v === "string" ? v : "");
const srcOf = (e: Ev) => str(e.props?.source) || "unknown";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const user = await currentUser();
  if (!isAdminEmail(user?.emailAddresses?.[0]?.emailAddress)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();

  // Google Analytics in parallel with everything else (8s cap inside).
  const gaPromise = gaSnapshot();

  // Paying customers: accounts on a paid plan, minus comps and test accounts.
  let paying = 0, accounts = 0;
  try {
    const { data } = await supabase.from("profiles").select("email, tier").limit(5000);
    for (const p of data ?? []) {
      accounts++;
      if (p.tier !== "free" && !isComp(p.email)) paying++;
    }
  } catch { /* zero */ }

  // Funnel events, last 30 days. Server-logged (lead, checkout, paid) and
  // browser-logged (session_start, grade_step, grade_revealed, cta_click).
  let events: Ev[] = [];
  let leadsTotal = 0;
  try {
    const { data } = await supabase.from("events").select("name, created_at, props")
      .in("name", ["diagnostic_lead", "checkout_started", "subscription_paid", "session_start", "grade_step", "grade_revealed", "cta_click", "ontrack_step", "ontrack_result"])
      .gte("created_at", iso(now - 30 * DAY)).order("created_at", { ascending: false }).limit(20000);
    events = (data ?? []) as Ev[];
    const { count } = await supabase.from("events").select("id", { count: "exact", head: true }).eq("name", "diagnostic_lead");
    leadsTotal = count ?? 0;
  } catch { /* zero */ }

  const inWindow = (ms: number) => events.filter((e) => new Date(e.created_at).getTime() >= now - ms);
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

  // Where visitors came from, last 7 days: one session_start per browser
  // session, grouped by source. Leads/payers per source are joined on it too.
  const week = inWindow(7 * DAY);
  const bySource = new Map<string, { sessions: number; leads: number; checkouts: number; paid: number }>();
  const bump = (src: string, k: "sessions" | "leads" | "checkouts" | "paid") => {
    const row = bySource.get(src) ?? { sessions: 0, leads: 0, checkouts: 0, paid: 0 };
    row[k]++; bySource.set(src, row);
  };
  for (const e of week) {
    if (e.name === "session_start") bump(srcOf(e), "sessions");
    else if (e.name === "diagnostic_lead") bump(srcOf(e), "leads");
    else if (e.name === "checkout_started") bump(srcOf(e), "checkouts");
    else if (e.name === "subscription_paid") bump(srcOf(e), "paid");
  }
  const sources7d = [...bySource.entries()].map(([source, v]) => ({ source, ...v })).sort((a, b) => b.sessions - a.sessions).slice(0, 8);
  const tracking = week.some((e) => e.name === "session_start");

  // The ad funnel, as steps with counts, for the last 24 h and the last 7 days,
  // everyone and Meta only. "Opened grade check" = reached /grade (first step
  // logged); "started" = picked a subject (contact step or straight to the paper).
  const funnel = (ms: number, metaOnly: boolean) => {
    const evs = inWindow(ms).filter((e) => !metaOnly || META.has(srcOf(e)));
    const steps = evs.filter((e) => e.name === "grade_step");
    const opened = new Set(steps.map((e) => str(e.props?.visitor_id)).filter(Boolean)).size || steps.filter((e) => str(e.props?.step) === "name").length;
    const started = steps.filter((e) => ["contact", "loading"].includes(str(e.props?.step))).length;
    return {
      sessions: evs.filter((e) => e.name === "session_start").length,
      opened,
      started,
      leads: evs.filter((e) => e.name === "diagnostic_lead").length,
      revealed: evs.filter((e) => e.name === "grade_revealed").length,
      pricing: evs.filter((e) => e.name === "cta_click").length,
      checkouts: evs.filter((e) => e.name === "checkout_started").length,
      paid: evs.filter((e) => e.name === "subscription_paid").length,
    };
  };

  // Grade-check drop-off, last 7 days: how many reached each step.
  const stepCounts = Object.fromEntries(GRADE_STEPS.map((s) => [s, 0])) as Record<(typeof GRADE_STEPS)[number], number>;
  for (const e of week) {
    if (e.name === "grade_step") { const s = str(e.props?.step) as (typeof GRADE_STEPS)[number]; if (s in stepCounts) stepCounts[s]++; }
    else if (e.name === "grade_revealed") stepCounts.revealed++;
  }

  // The parent check (/on-track), last 7 days: opened, got a verdict, left an email.
  const parentCheck7d = {
    opened: week.filter((e) => e.name === "ontrack_step" && str(e.props?.step) === "teen").length,
    results: week.filter((e) => e.name === "ontrack_result").length,
    leads: week.filter((e) => e.name === "diagnostic_lead" && str(e.props?.kind) === "on-track").length,
    verdicts: Object.fromEntries(["on", "borderline", "off", "hold", "unknown"].map((v) => [v, week.filter((e) => e.name === "ontrack_result" && str(e.props?.verdict) === v).length])) as Record<string, number>,
  };

  const feed = events.filter((e) => ["diagnostic_lead", "checkout_started", "subscription_paid"].includes(e.name)).slice(0, 15).map((e) => ({
    kind: e.name === "subscription_paid" ? "paid" : e.name === "checkout_started" ? "checkout" : str(e.props?.kind) === "on-track" ? "parent" : "lead",
    at: e.created_at,
    who: str(e.props?.name) || str(e.props?.email) || "",
    email: str(e.props?.email),
    source: srcOf(e),
    detail: e.name === "diagnostic_lead" && str(e.props?.kind) === "on-track" ? [str(e.props?.teen), str(e.props?.subject), str(e.props?.current) && str(e.props?.goal) && `${str(e.props?.current)} → ${str(e.props?.goal)}`, str(e.props?.bandLabel)].filter(Boolean).join(" · ")
      : e.name === "diagnostic_lead" ? [str(e.props?.subject), str(e.props?.curriculum), str(e.props?.bandLabel) && `got ${str(e.props?.bandLabel)}`].filter(Boolean).join(" · ")
      : e.name === "checkout_started" ? [str(e.props?.tier), str(e.props?.billing)].filter(Boolean).join(" · ")
      : str(e.props?.plan),
  }));

  return NextResponse.json({
    paying, goal: 50, accounts,
    leads: { total: leadsTotal, last24h: since("diagnostic_lead", DAY), last7d: since("diagnostic_lead", 7 * DAY) },
    checkouts7d: since("checkout_started", 7 * DAY),
    paid30d: since("subscription_paid", 30 * DAY),
    visitors24h, views24h, days, feed,
    tracking, sources7d,
    funnel: { all24h: funnel(DAY, false), all7d: funnel(7 * DAY, false), meta24h: funnel(DAY, true), meta7d: funnel(7 * DAY, true) },
    gradeSteps7d: stepCounts,
    parentCheck7d,
    ga: await gaPromise,
    at: iso(now),
  });
}
