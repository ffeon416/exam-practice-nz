import { NextResponse } from "next/server";
import { getAllPosts, getQueuedPosts, nzToday } from "@/lib/blog";
import { ADMIN_EMAILS } from "@/lib/adminEmails";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://studyace.co";

// Blog cadence is three posts a week (Mon/Wed/Fri, NZ dates). Posts are written
// ahead and date-gated, so "runway" = how many are queued. When the queue drops
// below one week of posts this cron emails the admins so the next batch gets
// written before the blog goes quiet. Fire-and-forget; never fails the cron.
const CADENCE_PER_WEEK = 3;
const MIN_QUEUED = CADENCE_PER_WEEK; // alert when < 1 week left

function nextOpenSlots(queuedDates: Set<string>, count: number): string[] {
  const out: string[] = [];
  for (let i = 1; out.length < count && i < 60; i++) {
    const d = nzToday(i);
    const wd = new Date(`${d}T00:00:00Z`).getUTCDay();
    if ((wd === 1 || wd === 3 || wd === 5) && !queuedDates.has(d)) out.push(d);
  }
  return out;
}

async function alertLowRunway(queued: number, lastQueued: string | null, slots: string[]) {
  const key = process.env.RESEND_API_KEY;
  if (!key || ADMIN_EMAILS.length === 0) return "skipped (no RESEND_API_KEY or admins)";
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: "StudyAce <grades@studyace.co>",
        to: ADMIN_EMAILS,
        subject: `Blog runway low: ${queued} post${queued === 1 ? "" : "s"} queued`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
            <h1 style="color:#4f46e5;">study<span style="color:#111">ace</span> blog</h1>
            <p><b>${queued}</b> scheduled post${queued === 1 ? "" : "s"} left${lastQueued ? ` (last one goes live ${lastQueued})` : ""}. The cadence is ${CADENCE_PER_WEEK} a week.</p>
            <p>Next open Mon/Wed/Fri slots: ${slots.join(", ") || "none found"}.</p>
            <p>Write the next batch (see <code>docs/CONTENT-ROADMAP.md</code> → Next queue), run <code>python3 scripts/validate-blog.py</code>, commit, push, and <code>vercel --prod --yes</code>.</p>
            <p style="color:#999;font-size:12px;margin-top:24px;">Sent by the weekly blog cron. studyace.co</p>
          </div>
        `,
      }),
    });
    return r.ok ? `emailed ${ADMIN_EMAILS.length} admin(s)` : `resend ${r.status}`;
  } catch (err) {
    return `error: ${err instanceof Error ? err.message : "unknown"}`;
  }
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  // Refuse outright if the secret is unset — otherwise "Bearer undefined" would pass.
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const postsToCheck = getAllPosts().filter((p) => {
      const d = new Date(p.date);
      return d >= sevenDaysAgo && d <= twoDaysAgo;
    });

    // Logging stub. Real GSC URL Inspection needs a service account
    // (GOOGLE_SEARCH_CONSOLE_CLIENT_EMAIL / PRIVATE_KEY) which isn't wired up yet —
    // for now this surfaces the list so we can spot-check manually in GSC.
    const results = postsToCheck.map((p) => ({
      slug: p.slug,
      url: `${SITE_URL}/blog/${p.slug}`,
      publishedDaysAgo: Math.round((now.getTime() - new Date(p.date).getTime()) / (1000 * 60 * 60 * 24)),
      status: "unknown" as const,
    }));

    const queued = getQueuedPosts();
    const queuedDates = new Set(queued.map((p) => p.date.slice(0, 10)));
    const lastQueued = queued.length ? queued[queued.length - 1].date.slice(0, 10) : null;
    const slots = nextOpenSlots(queuedDates, 6);
    const runway = {
      queued: queued.length,
      lastQueuedDate: lastQueued,
      nextOpenSlots: slots,
      alert: queued.length < MIN_QUEUED ? await alertLowRunway(queued.length, lastQueued, slots) : "ok",
    };

    return NextResponse.json({ success: true, count: results.length, results, runway });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
