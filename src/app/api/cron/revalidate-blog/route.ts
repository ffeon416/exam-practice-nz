import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAllPosts } from "@/lib/blog";
import { pingSearchEngines } from "@/lib/searchEngines";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  // Refuse outright if the secret is unset — otherwise "Bearer undefined" would pass.
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    revalidatePath("/blog");
    revalidatePath("/sitemap.xml");

    // Posts go live on NZ dates (see blog.ts). The cron runs at 00:05 UTC, which
    // is mid-afternoon NZT, so refresh anything dated NZ-today or NZ-yesterday.
    const nzDate = (offsetDays: number) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Pacific/Auckland",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(Date.now() + offsetDays * 86_400_000));
    const recent = new Set([nzDate(0), nzDate(-1)]);
    const newPosts = getAllPosts().filter((post) => recent.has(post.date.slice(0, 10)));

    // Revalidate individual posts that just went live so their static paths refresh.
    for (const p of newPosts) revalidatePath(`/blog/${p.slug}`);

    const siteUrl = process.env.NEXT_PUBLIC_URL || "https://studyace.co";
    const pingResults = await pingSearchEngines(newPosts.map((p) => `${siteUrl}/blog/${p.slug}`));

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      newPostsToday: newPosts.length,
      newPosts: newPosts.map((p) => ({ slug: p.slug, title: p.title })),
      searchEnginePings: pingResults,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown" },
      { status: 500 }
    );
  }
}
