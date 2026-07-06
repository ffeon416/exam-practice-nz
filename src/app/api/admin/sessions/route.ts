import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/adminEmails";

export const dynamic = "force-dynamic";

// Play-by-play user activity for /admin. Instead of storing heavy video
// recordings, we reconstruct a readable timeline of what each person did by
// MERGING data we already collect: page views, conversion events
// (checkout_started / paywall_hit / subscription_paid) and exams taken.
// Grouped per visitor and split into "sessions" on a 30-minute idle gap.
// Zero extra storage — it's a different read of existing tables.

const ROW_CAP = 5_000;
const LOOKBACK_DAYS = 7;
const SESSION_GAP_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 40;

interface Step {
  t: number; // epoch ms
  kind: "page" | "checkout" | "paywall" | "paid" | "exam";
  label: string;
}

function friendlyPath(path: string): string {
  if (path === "/") return "Home";
  if (path === "/pricing") return "Pricing";
  if (path === "/dashboard") return "Dashboard";
  if (path === "/subjects") return "Subjects";
  if (path === "/practice") return "Practice";
  if (path === "/welcome") return "Welcome / signup";
  if (path === "/refer") return "Refer page";
  if (path === "/review") return "Review";
  if (path === "/plan") return "Study plan";
  if (path === "/demo") return "Demo";
  if (path === "/profile") return "Profile";
  if (path === "/schools") return "Schools";
  if (path.endsWith("/results")) return "exam results";
  if (path.startsWith("/exam/")) return "an exam";
  if (path.startsWith("/sign-in")) return "Sign in";
  if (path.startsWith("/sign-up")) return "Sign up";
  if (path.startsWith("/blog")) return "Blog";
  return path;
}

const PAYWALL_LABELS: Record<string, string> = {
  exam_limit: "out of weekly exams",
  subject_locked: "a locked subject",
  tutor_locked: "AI tutor (Pro-only)",
  tutor_limit: "out of tutor chats",
};

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

  const since = new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString();

  // Pull the three activity sources + profiles (for names/tiers). Each is
  // resilient: a missing table (e.g. events before its migration) just yields
  // an empty slice rather than failing the whole panel.
  const [viewsRes, eventsRes, attemptsRes, profilesRes] = await Promise.all([
    supabase
      .from("page_views")
      .select("path, visitor_id, user_id, country, device, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(ROW_CAP),
    supabase
      .from("events")
      .select("name, user_id, props, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(ROW_CAP),
    supabase
      .from("exam_attempts")
      .select("user_id, subject, overall_grade, taken_at")
      .gte("taken_at", since)
      .order("taken_at", { ascending: false })
      .limit(ROW_CAP),
    supabase.from("profiles").select("user_id, email, tier").limit(ROW_CAP),
  ]);

  type ViewRow = { path: string; visitor_id: string | null; user_id: string | null; country: string | null; device: string | null; created_at: string };
  type EventRow = { name: string; user_id: string | null; props: Record<string, unknown> | null; created_at: string };
  type AttemptRow = { user_id: string | null; subject: string | null; overall_grade: string | null; taken_at: string };
  type ProfileRow = { user_id: string; email: string | null; tier: string | null };

  const views = (viewsRes.data ?? []) as ViewRow[];
  const events = (eventsRes.data ?? []) as EventRow[];
  const attempts = (attemptsRes.data ?? []) as AttemptRow[];
  const profiles = (profilesRes.data ?? []) as ProfileRow[];

  const profileById = new Map(profiles.map((p) => [p.user_id, p]));

  // Map a Clerk user_id → their most recent visitor_id, so user-keyed items
  // (events, exams) attach to the same timeline as their page views. Rows are
  // newest-first, so the first one we see for a user is the most recent.
  const userToVisitor = new Map<string, string>();
  for (const v of views) {
    if (v.user_id && v.visitor_id && !userToVisitor.has(v.user_id)) {
      userToVisitor.set(v.user_id, v.visitor_id);
    }
  }

  const keyForUser = (uid: string | null): string | null =>
    uid ? userToVisitor.get(uid) ?? `u:${uid}` : null;

  interface Person {
    steps: Step[];
    userId: string | null;
    country: string | null;
    device: string | null;
  }
  const people = new Map<string, Person>();
  const ensure = (key: string): Person => {
    let p = people.get(key);
    if (!p) { p = { steps: [], userId: null, country: null, device: null }; people.set(key, p); }
    return p;
  };

  for (const v of views) {
    const key = v.visitor_id ?? (v.user_id ? `u:${v.user_id}` : null);
    if (!key) continue;
    const p = ensure(key);
    if (v.user_id) p.userId ??= v.user_id;
    if (v.country) p.country ??= v.country;
    if (v.device) p.device ??= v.device;
    p.steps.push({ t: new Date(v.created_at).getTime(), kind: "page", label: `opened ${friendlyPath(v.path)}` });
  }

  for (const e of events) {
    const key = keyForUser(e.user_id);
    if (!key) continue;
    const p = ensure(key);
    if (e.user_id) p.userId ??= e.user_id;
    const t = new Date(e.created_at).getTime();
    if (e.name === "checkout_started") {
      const tier = typeof e.props?.tier === "string" ? e.props.tier : "";
      const billing = typeof e.props?.billing === "string" ? e.props.billing : "";
      p.steps.push({ t, kind: "checkout", label: `clicked Subscribe${tier ? ` — ${tier}${billing ? ` ${billing}` : ""}` : ""}` });
    } else if (e.name === "paywall_hit") {
      const reason = typeof e.props?.reason === "string" ? e.props.reason : "";
      p.steps.push({ t, kind: "paywall", label: `hit a wall — ${PAYWALL_LABELS[reason] ?? "upgrade needed"}` });
    } else if (e.name === "subscription_paid") {
      const plan = typeof e.props?.plan === "string" ? e.props.plan : "";
      p.steps.push({ t, kind: "paid", label: `PAID${plan ? ` — ${plan}` : ""} 🎉` });
    }
  }

  for (const a of attempts) {
    const key = keyForUser(a.user_id);
    if (!key) continue;
    const p = ensure(key);
    if (a.user_id) p.userId ??= a.user_id;
    const subj = a.subject ? a.subject.charAt(0).toUpperCase() + a.subject.slice(1) : "an";
    const grade = a.overall_grade ? ` → ${a.overall_grade}` : "";
    p.steps.push({ t: new Date(a.taken_at).getTime(), kind: "exam", label: `took a ${subj} exam${grade}` });
  }

  // Split each person's steps into sessions on the idle gap, then flatten.
  interface Session {
    who: string;
    signedIn: boolean;
    tier: string | null;
    country: string | null;
    device: string | null;
    start: number;
    end: number;
    steps: { time: string; kind: string; label: string }[];
  }
  const sessions: Session[] = [];

  for (const [key, p] of people) {
    if (p.steps.length === 0) continue;
    p.steps.sort((a, b) => a.t - b.t);

    const profile = p.userId ? profileById.get(p.userId) : undefined;
    const who = profile?.email
      ? profile.email.split("@")[0]
      : `Visitor ${key.replace(/^u:/, "").slice(0, 6)}`;
    const tier = profile?.tier ?? null;

    let current: Step[] = [];
    const flush = () => {
      if (current.length === 0) return;
      sessions.push({
        who,
        signedIn: Boolean(p.userId),
        tier,
        country: p.country,
        device: p.device,
        start: current[0].t,
        end: current[current.length - 1].t,
        steps: current.map((s) => ({
          time: new Date(s.t).toISOString(),
          kind: s.kind,
          label: s.label,
        })),
      });
      current = [];
    };

    let prevT = 0;
    for (const s of p.steps) {
      if (current.length > 0 && s.t - prevT > SESSION_GAP_MS) flush();
      current.push(s);
      prevT = s.t;
    }
    flush();
  }

  sessions.sort((a, b) => b.start - a.start);
  const truncated = views.length >= ROW_CAP || events.length >= ROW_CAP;

  return NextResponse.json({ sessions: sessions.slice(0, MAX_SESSIONS), truncated });
}
