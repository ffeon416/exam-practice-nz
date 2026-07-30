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

    const today = new Date().toISOString().split("T")[0];
    const newPosts = getAllPosts().filter((post) => post.date.startsWith(today));

    // Revalidate individual posts that just went live so their static paths refresh.
    for (const p of newPosts) revalidatePath(`/blog/${p.slug}`);

    const pingResults = await pingSearchEngines();

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
