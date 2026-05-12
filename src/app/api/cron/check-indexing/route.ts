import { NextResponse } from "next/server";
import { getAllPosts } from "@/lib/blog";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://studyace.co";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
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

    return NextResponse.json({ success: true, count: results.length, results });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
