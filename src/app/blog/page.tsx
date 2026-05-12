import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts, formatDate } from "@/lib/blog";
import {
  BLOG_CATEGORIES,
  getCategoryName,
  postMatchesCategory,
} from "@/lib/blog-categories";

const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://studyace.co";

interface BlogPageProps {
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata({
  searchParams,
}: BlogPageProps): Promise<Metadata> {
  const { category: categoryParam } = await searchParams;
  const hasCategory = Boolean(categoryParam && getCategoryName(categoryParam));

  return {
    title: "Study Strategy Blog | StudyAce — How to Pass Exams With AI Practice",
    description:
      "Practical study strategies for students preparing for high-stakes exams. Practice exam techniques, subject-specific guides, AI-driven prep, and mindset.",
    alternates: { canonical: `${SITE_URL}/blog` },
    robots: hasCategory ? { index: false, follow: true } : undefined,
    openGraph: {
      title: "Blog | StudyAce",
      description:
        "Practice-based study methods backed by AI. Written for students, not academics.",
      url: `${SITE_URL}/blog`,
      siteName: "StudyAce",
      type: "website",
    },
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const { category: categoryParam } = await searchParams;
  const activeCategorySlug =
    categoryParam && getCategoryName(categoryParam) ? categoryParam : undefined;

  const allPosts = getAllPosts();
  const posts = activeCategorySlug
    ? allPosts.filter((p) => postMatchesCategory(p.category, activeCategorySlug))
    : allPosts;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
    ],
  };

  return (
    <div className="relative overflow-hidden bg-[#06060a] min-h-screen isolate">
      {/* Soft ambient background — matches existing landing aesthetic */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[150px] left-1/2 -translate-x-1/2 w-[500px] sm:w-[800px] h-[500px] sm:h-[800px] bg-indigo-600/15 blur-[120px] rounded-full" />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="container mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-16 sm:pb-20 max-w-4xl">
        <header className="text-center mb-10 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            The Exam Strategy Playbook
          </h1>
          <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mx-auto px-4">
            Practice-based study methods backed by AI. Written for students, not academics.
          </p>
        </header>

        <nav
          className="flex flex-wrap items-center justify-center gap-2 mb-10 sm:mb-12"
          aria-label="Filter posts by category"
        >
          <Link
            href="/blog"
            className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border transition-colors ${
              !activeCategorySlug
                ? "bg-indigo-500 text-white border-indigo-500"
                : "border-white/[0.08] text-zinc-400 hover:text-white hover:border-indigo-400/50"
            }`}
          >
            All
          </Link>
          {BLOG_CATEGORIES.map((cat) => (
            <Link
              key={cat.slug}
              href={`/blog?category=${cat.slug}`}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border transition-colors ${
                activeCategorySlug === cat.slug
                  ? "bg-indigo-500 text-white border-indigo-500"
                  : "border-white/[0.08] text-zinc-400 hover:text-white hover:border-indigo-400/50"
              }`}
            >
              {cat.name}
            </Link>
          ))}
        </nav>

        {posts.length === 0 ? (
          <div className="rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center py-12 px-6">
            <p className="text-zinc-400">
              {activeCategorySlug
                ? "No posts in this category yet."
                : "No blog posts yet. Check back soon."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="group block">
                <article className="rounded-2xl bg-white/[0.02] border border-white/[0.06] p-5 sm:p-6 transition-colors hover:border-indigo-400/40">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1 min-w-0">
                      {post.hub && (
                        <span className="inline-block mb-2 text-[10px] uppercase tracking-[0.18em] font-bold text-indigo-400">
                          Hub guide
                        </span>
                      )}
                      <h2 className="text-xl font-semibold text-white mb-2 group-hover:text-indigo-300">
                        {post.title}
                      </h2>
                      <p className="text-zinc-400 text-sm mb-4 line-clamp-2">
                        {post.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
                        <span className="flex items-center gap-1.5">
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                            stroke="currentColor"
                            aria-hidden
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008z"
                            />
                          </svg>
                          {formatDate(post.date)}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <svg
                            className="w-3.5 h-3.5"
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
                      </div>
                    </div>
                    <svg
                      className="h-5 w-5 text-zinc-500 group-hover:text-indigo-400 hidden sm:block shrink-0 mt-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      aria-hidden
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                      />
                    </svg>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-16">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            Ready to start practising?
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mb-6 px-4 max-w-xl mx-auto">
            StudyAce generates exam-style practice questions tailored to your syllabus. Start your
            free trial.
          </p>
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:opacity-95 transition-opacity"
          >
            Start free trial
          </Link>
        </div>
      </main>
    </div>
  );
}
