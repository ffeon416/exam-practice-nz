import Link from "next/link";
import { getAllPosts, type PostMeta } from "@/lib/blog";

interface RelatedArticlesProps {
  currentSlug: string;
  currentCategory?: string;
  limit?: number;
}

export default function RelatedArticles({
  currentSlug,
  currentCategory,
  limit = 3,
}: RelatedArticlesProps) {
  const all = getAllPosts().filter((p) => p.slug !== currentSlug);

  const sameCategory = currentCategory
    ? all.filter((p) => p.category === currentCategory)
    : [];

  const hubsInCategory = sameCategory.filter((p) => p.hub);
  const nonHubsInCategory = sameCategory.filter((p) => !p.hub);
  const otherPosts = all.filter((p) => p.category !== currentCategory);

  const picks: PostMeta[] = [];
  const seen = new Set<string>();
  const push = (post?: PostMeta) => {
    if (!post || seen.has(post.slug) || picks.length >= limit) return;
    picks.push(post);
    seen.add(post.slug);
  };

  // Hub of same category first, then more posts in same category, then other hubs, then anything.
  push(hubsInCategory[0]);
  for (const p of nonHubsInCategory) push(p);
  for (const p of hubsInCategory.slice(1)) push(p);
  for (const p of otherPosts) push(p);

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
