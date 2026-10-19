import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { getSupabase } from "@/lib/supabase";
import { isAdminEmail } from "@/lib/adminEmails";

export const dynamic = "force-dynamic";

// GET /api/admin/leads — every grade-check lead (a `diagnostic_lead` row in
// the events table: the email a parent or student typed on /grade), newest
// first, with their grade and where they came from. Admin only.
// ?format=csv downloads the same list as a spreadsheet.

const str = (v: unknown) => (typeof v === "string" ? v : "");

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const user = await currentUser();
  if (!isAdminEmail(user?.emailAddresses?.[0]?.emailAddress)) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured." }, { status: 503 });

  const { data, error } = await supabase.from("events").select("created_at, props")
    .eq("name", "diagnostic_lead").order("created_at", { ascending: false }).limit(2000);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // One row per email (a lead can bank twice: contact step, then the report).
  const seen = new Set<string>();
  const leads = [];
  for (const e of data ?? []) {
    const p = (e.props ?? {}) as Record<string, unknown>;
    const email = str(p.email).toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    leads.push({
      at: e.created_at as string,
      email,
      name: str(p.name),
      subject: str(p.subject),
      curriculum: str(p.curriculum),
      grade: str(p.bandLabel),
      pct: typeof p.pct === "number" ? p.pct : null,
      source: str(p.source) || "unknown",
      campaign: str(p.campaign),
    });
  }

  if (new URL(request.url).searchParams.get("format") === "csv") {
    const esc = (v: string | number | null) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["when", "email", "name", "subject", "exam system", "grade", "pct", "source", "campaign"].join(",")]
      .concat(leads.map((l) => [l.at, l.email, l.name, l.subject, l.curriculum, l.grade, l.pct, l.source, l.campaign].map(esc).join(",")));
    return new NextResponse(rows.join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="studyace-leads-${new Date().toISOString().slice(0, 10)}.csv"` } });
  }
  return NextResponse.json({ leads, total: leads.length });
}
