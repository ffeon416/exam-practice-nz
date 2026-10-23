import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { pushToUser } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Sends due "remind me at 7pm" pushes. Safe to run as often as you like
// (every 5–15 minutes is ideal): each reminder is claimed before sending, so
// it goes once. Triggered by Vercel Cron (GET, "Authorization: Bearer
// $CRON_SECRET" added automatically) or any external scheduler sending the
// same header with GET or POST.

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const supabase = getSupabase();
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 503 });

  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabase
    .from("child_profiles")
    .select("id, first_name, kid_user_id, remind_at")
    .lte("remind_at", nowIso)
    .is("reminded_at", null)
    .is("grade_check_completed_at", null)
    .not("kid_user_id", "is", null)
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let sent = 0;
  let claimed = 0;
  for (const c of due ?? []) {
    // Claim first (only one run can flip reminded_at from null).
    const { data: mine } = await supabase.from("child_profiles").update({ reminded_at: nowIso }).eq("id", c.id).is("reminded_at", null).select("id");
    if (!mine?.length) continue;
    claimed++;
    // A reminder more than 3 hours late isn't a 7pm reminder any more: skip it.
    if (Date.now() - new Date(c.remind_at as string).getTime() > 3 * 3600_000) continue;
    sent += await pushToUser(c.kid_user_id as string, {
      title: `${c.first_name}, it's 7pm`,
      body: "Your grade check is ready. About 15 minutes.",
      url: "/hello",
      tag: `remind-${c.id}`,
    });
  }
  return NextResponse.json({ due: due?.length ?? 0, claimed, sent });
}

export const GET = run;
export const POST = run;
