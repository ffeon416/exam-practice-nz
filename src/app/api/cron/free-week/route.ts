import { NextRequest, NextResponse } from "next/server";
import { runFreeWeekJobs } from "@/lib/freeWeekLive";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Hourly (external scheduler; daily Vercel backstop, see docs/CRONS.md): the
// auto-cancel promise (layer 1), held-invoice sweep, and the
// parent emails. Vercel Cron calls it with GET and "Authorization: Bearer
// $CRON_SECRET"; any external scheduler can call it the same way (GET or
// POST) as a backup. Safe to run more often or twice at once: every action is
// idempotent.

function authorised(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}

async function run(req: NextRequest) {
  if (!authorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const report = await runFreeWeekJobs();
  // 200 even with per-family errors (they retry next hour); the report says what happened.
  return NextResponse.json(report);
}

export const GET = run;
export const POST = run;
