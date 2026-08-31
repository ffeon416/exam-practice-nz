import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import { getAllPostSlugs, getPostBySlug, formatDate } from "@/lib/blog";
import { blogMdxComponents } from "@/components/MdxBlogComponents";
import RelatedArticles from "@/components/blog/RelatedArticles";

const SITE_URL = process.env.NEXT_PUBLIC_URL || "https://studyace.co";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };

  const postUrl = `${SITE_URL}/blog/${post.slug}`;

  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    authors: [{ name: post.author }],
    alternates: { canonical: postUrl },
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
      url: postUrl,
      siteName: "StudyAce",
      images: post.image ? [post.image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: post.image ? [post.image] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const postUrl = `${SITE_URL}/blog/${post.slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    author: { "@type": "Organization", name: "StudyAce", url: SITE_URL },
    publisher: {
      "@type": "Organization",
      name: "StudyAce",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.png` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": postUrl },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: postUrl },
    ],
  };

  return (
    <div className="relative overflow-hidden bg-[#06060a] min-h-screen isolate">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-[150px] left-1/2 -translate-x-1/2 w-[400px] sm:w-[700px] h-[400px] sm:h-[700px] bg-indigo-600/10 blur-[120px] rounded-full" />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <main className="container mx-auto px-5 sm:px-8 pt-10 sm:pt-16 pb-16 sm:pb-20 max-w-3xl">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors mb-8"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Back to blog
        </Link>

        {post.hub && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-indigo-400/30 bg-indigo-500/[0.06] px-4 py-3">
            <svg
              className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
              />
            </svg>
            <p className="text-sm text-zinc-200">
              <span className="font-semibold text-white">
                This is our complete guide to {post.category || "this topic"}.
              </span>{" "}
              <span className="text-zinc-400">Bookmark it.</span>
            </p>
          </div>
        )}

        <article>
          <header className="mb-8">
            {post.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight tracking-tight">
              {post.title}
            </h1>
            <p className="text-lg text-zinc-400 mb-6">{post.description}</p>
            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500 border-b border-white/[0.06] pb-6">
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                  />
                </svg>
                {post.author}
              </span>
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  aria-hidden
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
                {formatDate(post.date)}
              </span>
              <span className="flex items-center gap-2">
                <svg
                  className="h-4 w-4"
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
          </header>

          <div className="max-w-none">
            <MDXRemote source={post.content} components={blogMdxComponents} />
          </div>
        </article>

        <RelatedArticles currentSlug={post.slug} currentCategory={post.category} />

        <div className="mt-16 p-8 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            Ready to start practising?
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mb-6">
            StudyAce generates exam-style practice questions tailored to your syllabus. Start with a
            free grade check.
          </p>
          <Link
            href="/grade"
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-6 py-3 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 hover:opacity-95 transition-opacity"
          >
            Get my free grade check
          </Link>
        </div>
      </main>
    </div>
  );
}
