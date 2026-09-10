#!/usr/bin/env node
// Publishing calendar for the StudyAce blog.
//
//   node scripts/blog-schedule.mjs          # human-readable runway report
//   node scripts/blog-schedule.mjs --json   # machine-readable
//   node scripts/blog-schedule.mjs --slots 6  # print the next 6 open Mon/Wed/Fri dates
//
// Cadence is three posts a week, Monday / Wednesday / Friday, NZ calendar dates.
// Posts are date-gated by src/lib/blog.ts, so "queued" = written, committed and
// deployed, but not yet visible. Run this before writing a batch to see which
// slots are open, and after, to confirm the runway.

import fs from "fs";
import path from "path";

const BLOG_DIR = path.join(process.cwd(), "content/blog");
const CADENCE_DAYS = [1, 3, 5]; // Mon, Wed, Fri (UTC weekday of the YYYY-MM-DD date)
const HORIZON_DAYS = 28;

const args = process.argv.slice(2);
const asJson = args.includes("--json");
const slotsIdx = args.indexOf("--slots");
const slotsWanted = slotsIdx !== -1 ? Number(args[slotsIdx + 1] || 6) : 0;

const nzToday = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Pacific/Auckland",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

function addDays(ymd, n) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function weekday(ymd) {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(`${ymd}T00:00:00Z`).getUTCDay()];
}
function isCadenceDay(ymd) {
  return CADENCE_DAYS.includes(new Date(`${ymd}T00:00:00Z`).getUTCDay());
}

const posts = fs
  .readdirSync(BLOG_DIR)
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => {
    const src = fs.readFileSync(path.join(BLOG_DIR, f), "utf-8");
    const fm = /^---\n([\s\S]*?)\n---/.exec(src)?.[1] ?? "";
    const date = /^date:\s*"?(\d{4}-\d{2}-\d{2})"?/m.exec(fm)?.[1] ?? "";
    const title = /^title:\s*"?(.*?)"?\s*$/m.exec(fm)?.[1] ?? f;
    const hub = /^hub:\s*true/m.test(fm);
    const slug = f.replace(/\.mdx$/, "").replace(/^\d{4}-\d{2}-\d{2}-/, "");
    const prefix = /^(\d{4}-\d{2}-\d{2})-/.exec(f)?.[1];
    return { file: f, slug, date, title, hub, prefixMismatch: prefix && prefix !== date };
  })
  .sort((a, b) => a.date.localeCompare(b.date));

const live = posts.filter((p) => p.date <= nzToday);
const queued = posts.filter((p) => p.date > nzToday);
const byDate = new Map();
for (const p of posts) byDate.set(p.date, [...(byDate.get(p.date) || []), p]);

// Next cadence slots from tomorrow, marked filled/open.
const slots = [];
for (let d = addDays(nzToday, 1); slots.length < Math.max(slotsWanted, 12); d = addDays(d, 1)) {
  if (!isCadenceDay(d)) continue;
  slots.push({ date: d, weekday: weekday(d), filled: byDate.has(d), posts: byDate.get(d) || [] });
}
const horizonEnd = addDays(nzToday, HORIZON_DAYS);
const openSlotsInHorizon = slots.filter((s) => !s.filled && s.date <= horizonEnd);
const lastQueued = queued.length ? queued[queued.length - 1].date : null;
const runwayDays = lastQueued
  ? Math.round((new Date(`${lastQueued}T00:00:00Z`) - new Date(`${nzToday}T00:00:00Z`)) / 86_400_000)
  : 0;

const warnings = [];
for (const p of queued) if (!isCadenceDay(p.date)) warnings.push(`${p.file}: dated ${weekday(p.date)}, not Mon/Wed/Fri`);
for (const [d, ps] of byDate) if (d > nzToday && ps.length > 1) warnings.push(`${d}: ${ps.length} posts share the date`);
for (const p of posts) if (p.prefixMismatch) warnings.push(`${p.file}: filename date prefix does not match date: field`);

const report = {
  nzToday,
  live: live.length,
  queued: queued.map((p) => ({ date: p.date, weekday: weekday(p.date), slug: p.slug, hub: p.hub })),
  runwayDays,
  lastQueuedDate: lastQueued,
  openSlotsNext28Days: openSlotsInHorizon.map((s) => s.date),
  nextOpenSlots: slots.filter((s) => !s.filled).slice(0, slotsWanted || 6).map((s) => s.date),
  warnings,
};

if (asJson) {
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}
if (slotsWanted) {
  for (const d of report.nextOpenSlots) console.log(`${d}  ${weekday(d)}`);
  process.exit(0);
}

console.log(`StudyAce blog schedule  (NZ today: ${nzToday})`);
console.log(`Live: ${live.length}   Queued: ${queued.length}   Runway: ${runwayDays} days${lastQueued ? ` (last queued ${lastQueued})` : ""}`);
console.log("");
console.log("Next Mon/Wed/Fri slots:");
for (const s of slots.slice(0, 12)) {
  const mark = s.filled ? "●" : "○";
  const what = s.filled ? s.posts.map((p) => p.slug + (p.hub ? " (hub)" : "")).join(", ") : "OPEN";
  console.log(`  ${mark} ${s.date} ${s.weekday}  ${what}`);
}
console.log("");
if (openSlotsInHorizon.length) {
  console.log(`Open slots in the next ${HORIZON_DAYS} days: ${openSlotsInHorizon.length} → ${openSlotsInHorizon.map((s) => s.date).join(", ")}`);
} else {
  console.log(`No open slots in the next ${HORIZON_DAYS} days. Runway is healthy.`);
}
if (warnings.length) {
  console.log("");
  console.log("Warnings:");
  for (const w of warnings) console.log(`  ! ${w}`);
}
