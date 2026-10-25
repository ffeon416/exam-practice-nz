#!/usr/bin/env node
// Creates (or updates) the frequent StudyAce crons on cron-job.org, which run
// them because Vercel Hobby only allows once-a-day crons (docs/CRONS.md).
// Safe to re-run: jobs are matched by URL and updated in place.
//
//   CRONJOB_API_KEY=... CRON_SECRET=... node scripts/setup-cron-jobs.mjs           # create, paused
//   CRONJOB_API_KEY=... CRON_SECRET=... node scripts/setup-cron-jobs.mjs --enable  # switch them on
//
// Jobs are created paused, so they don't fail against production before the
// funnel is deployed. Run with --enable after the deploy.

const API = "https://api.cron-job.org";
const BASE = process.env.CRON_BASE_URL ?? "https://studyace.co";
const { CRONJOB_API_KEY, CRON_SECRET } = process.env;
const enable = process.argv.includes("--enable");

if (!CRONJOB_API_KEY || !CRON_SECRET) {
  console.error("Set CRONJOB_API_KEY (cron-job.org Console → Settings → API) and CRON_SECRET (same value as in Vercel).");
  process.exit(1);
}

const every = { hours: [-1], mdays: [-1], months: [-1], wdays: [-1] };
const JOBS = [
  // The auto-cancel promise depends on this one: alert on the first failure.
  { title: "StudyAce free week (promise)", path: "/api/cron/free-week", minutes: [7], onFailureCount: 1 },
  { title: "StudyAce study reminders", path: "/api/cron/reminders", minutes: [0, 10, 20, 30, 40, 50], onFailureCount: 3 },
  { title: "StudyAce forecast snapshots", path: "/api/cron/forecast", minutes: [15], onFailureCount: 2 },
];

async function call(method, path, body) {
  const res = await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${CRONJOB_API_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${await res.text()}`);
  return res.json();
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const { jobs: existing } = await call("GET", "/jobs");
for (const j of JOBS) {
  const url = BASE + j.path;
  const job = {
    url,
    title: j.title,
    enabled: enable,
    saveResponses: true,
    requestMethod: 0,
    schedule: { timezone: "UTC", ...every, minutes: j.minutes },
    extendedData: { headers: { Authorization: `Bearer ${CRON_SECRET}` } },
    notification: { onFailure: true, onFailureCount: j.onFailureCount, onSuccess: true, onDisable: true },
  };
  const found = existing.find((e) => e.url === url);
  if (found) {
    await call("PATCH", `/jobs/${found.jobId}`, { job });
    console.log(`updated  #${found.jobId}  ${url}  ${enable ? "ON" : "paused"}`);
  } else {
    const { jobId } = await call("PUT", "/jobs", { job });
    console.log(`created  #${jobId}  ${url}  ${enable ? "ON" : "paused"}`);
    await sleep(1500); // create is limited to 1/second
  }
}
