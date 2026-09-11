import Link from "next/link";
import { getAllPosts, type PostMeta } from "@/lib/blog";

interface RelatedArticlesProps {
  currentSlug: string;
  currentCategory?: string;
  currentTags?: string[];
  limit?: number;
}

/**
 * Smart related-articles picker.
 *   +5   same category
 *   +3   hub article in the same category
 *   +1   per shared tag (capped at +4)
 *   +0.5 hub anywhere
 * A same-category hub is always included if one exists, so every post
 * points readers back to the authority piece for its topic.
 */
export default function RelatedArticles({
  currentSlug,
  currentCategory,
  currentTags = [],
  limit = 3,
}: RelatedArticlesProps) {
  const all = getAllPosts().filter((p) => p.slug !== currentSlug);
  if (all.length === 0) return null;

  const tagsLower = new Set(currentTags.map((t) => t.toLowerCase()));

  const scored = all.map((post) => {
    let score = 0;
    if (currentCategory && post.category === currentCategory) {
      score += 5;
      if (post.hub) score += 3;
    }
    const shared = (post.tags || []).filter((t) => tagsLower.has(t.toLowerCase())).length;
    score += Math.min(shared, 4);
    if (post.hub) score += 0.5;
    return { post, score };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.post.date).getTime() - new Date(a.post.date).getTime();
  });

  const picks: PostMeta[] = [];
  const seen = new Set<string>();
  const hub = scored.find((s) => s.post.category === currentCategory && s.post.hub)?.post;
  if (hub) {
    picks.push(hub);
    seen.add(hub.slug);
  }
  for (const { post } of scored) {
    if (picks.length >= limit) break;
    if (seen.has(post.slug)) continue;
    picks.push(post);
    seen.add(post.slug);
  }
  if (picks.length === 0) return null;

  return (
    <section
      className="mt-16 pt-12 border-t border-white/[0.06]"
      aria-labelledby="related-articles-heading"
    >
      <h2 id="related-articles-heading" className="text-xl sm:text-2xl font-bold text-white mb-6">
        Related articles
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {picks.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="group">
            <article className="h-full rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 transition-colors hover:border-indigo-400/40">
              {post.hub && (
                <span className="inline-block mb-2 text-[10px] uppercase tracking-[0.18em] font-bold text-indigo-400">
                  Hub guide
                </span>
              )}
              <h3 className="text-[15px] font-semibold text-white mb-2 group-hover:text-indigo-300 line-clamp-2">
                {post.title}
              </h3>
              <p className="text-xs text-zinc-400 line-clamp-3 mb-3">{post.description}</p>
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {post.readingTime}
              </span>
            </article>
          </Link>
        ))}
      </div>
    </section>
  );
}
