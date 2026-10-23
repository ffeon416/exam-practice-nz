import { NextRequest, NextResponse } from "next/server";
import { runForecastSnapshots } from "@/lib/forecastSnapshots";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Hourly; each student is snapshotted once a night, from 2am their time
// (lib/forecastSnapshots.ts). Vercel Cron or any scheduler with
// "Authorization: Bearer $CRON_SECRET" (GET or POST). Idempotent.

async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json(await runForecastSnapshots());
}

export const GET = run;
export const POST = run;
