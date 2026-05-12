# StudyAce — Content Roadmap & Voice Brief

Read this at the start of every blog content session. It keeps voice, taxonomy, and frontmatter usage consistent across posts.

## Frontmatter schema

Every `.mdx` file in `content/blog/` must start with:

```yaml
---
title: "Your Post Title"
description: "One-line excerpt — used as meta description and on cards"
date: "YYYY-MM-DD"           # Publish date. Post is hidden until this date arrives.
author: "Study Ace"
tags: ["primary tag", "secondary tag"]
category: "<EXACT name from BLOG_CATEGORIES — see below>"
keywords: ["primary keyword", "secondary keyword"]
hub: true                    # Only for pillar posts. Omit otherwise.
---
```

**Filename convention**: `YYYY-MM-DD-slug.mdx`. The date prefix is the publish date; the slug becomes the URL (`/blog/<slug>`).

## Canonical categories (must match EXACTLY)

| `category:` value | URL slug |
|---|---|
| `Exam Strategy` | `/blog?category=exam-strategy` |
| `Study Methods` | `/blog?category=study-methods` |
| `Subject Guides` | `/blog?category=subject-guides` |
| `Mock Exam Practice` | `/blog?category=mock-exam-practice` |
| `Mindset & Test Anxiety` | `/blog?category=mindset-and-test-anxiety` |
| `AI in Education` | `/blog?category=ai-in-education` |
| `Parents & Teachers` | `/blog?category=parents-and-teachers` |

Casing and the ampersand matter. Mismatches break category filtering silently.

## Voice brief — paste into every writing prompt

> Write in this style: direct, plain English, no academic fluff. Problem-first — open with what's broken about how most students study, then deliver the fix as a system or framework. Short sentences. Specific numbers and examples over vague claims. Treat the reader as an intelligent student who wants to know exactly what to do — not theory. End every post with a clear, low-pressure CTA tied to StudyAce's specific feature that solves the problem covered.

**Anti-patterns to avoid**: "unlock your potential", "achieve your dreams", "your future starts here", "study smarter not harder" (clichéd), corporate edu-speak.

**Honesty rule** (carries over from product, see `feedback_studyace_honest_marking`): never overstate what AI can do. Don't claim outcomes you can't back up. No fake stats. No fake testimonials. Cite real sources.

## Outbound citation sources (verify before using)

- [OECD PISA](https://www.oecd.org/pisa/) — international education benchmarks
- [NZQA](https://www.nzqa.govt.nz/) — NCEA reference (primary market)
- [Cambridge Assessment](https://www.cambridgeassessment.org.uk/) — IGCSE / A-Level
- [NESA](https://educationstandards.nsw.edu.au/) — HSC (AU market)
- AERA — meta-research on study methods
- Wikipedia for foundational cognitive-science concepts ([Spaced repetition](https://en.wikipedia.org/wiki/Spaced_repetition), [Active recall](https://en.wikipedia.org/wiki/Active_recall), [Testing effect](https://en.wikipedia.org/wiki/Testing_effect))

## Priority 1 — pillar posts (write first, mark `hub: true`)

1. *The Testing Effect: Why Practice Exams Beat Re-Reading Every Time* — category: `Exam Strategy`
2. *How to Use AI to Generate Practice Exam Questions That Actually Help* — category: `AI in Education`
3. *Spaced Repetition for Exams: A Student's Guide* — category: `Study Methods`
4. *Mock Exam Strategy: How to Use Past Papers Properly* — category: `Mock Exam Practice`
5. *How to Beat Test Anxiety Before a High-Stakes Exam* — category: `Mindset & Test Anxiety`

## Priority 2 — supporting / comparison posts

- StudyAce vs Quizlet (flashcards vs exam practice)
- StudyAce vs Khan Academy
- StudyAce vs ChatGPT for studying
- StudyAce vs traditional tutoring
- Best AI study tools for [year level / exam type]
- NCEA Level 1/2/3 subject-specific guides
- How parents can support exam prep without becoming a stress source

## Body conventions

- Open with a bold one-liner that hooks: `**Most students don't fail because they don't know enough...**`
- Use `## Heading` for sections (H2). The H1 is auto-rendered from frontmatter.
- Use `<Callout type="tip">...</Callout>` for emphasis. Types: `info`, `tip`, `warning`.
- 1500–3000 words for pillars; 800–1500 for supporting posts.
- Internal links: `[anchor text](/blog/other-slug)` — run `npx tsx scripts/interlink-posts.ts` after publishing batches to inject these automatically based on `content/interlinking/keyword-map.json`.
- External authority citations: `[anchor text](https://authoritative-source.com/page)` — opens in new tab automatically.
- End with a `<Callout type="tip">` containing a trial CTA tied to the post's topic.

## Implementation hooks

- **Internal linking**: `npx tsx scripts/interlink-posts.ts` after each batch. Add keyword → slug entries to `content/interlinking/keyword-map.json` (3+ words per keyword enforced by the script).
- **Hub posts**: set `hub: true` in frontmatter. Treated specially in `RelatedArticles` and renders a "Bookmark this guide" banner.
- **Date-gating**: set `date:` in the future to queue posts. Daily cron at 00:05 UTC revalidates `/blog` + `/sitemap.xml`. Crons live in `vercel.json`; `CRON_SECRET` env var required.
- **Schema**: Article + BreadcrumbList JSON-LD is auto-rendered server-side on every post.

## Manual GSC submission after each pillar

1. Open Google Search Console (`studyace.co` property)
2. URL Inspection → paste post URL → **Request Indexing**
3. Limit ~10 per day per property. Pillar posts first; supporting posts can wait for natural crawl.

## Where the system lives in the repo

- Blog libs: `src/lib/blog.ts`, `src/lib/blog-categories.ts`, `src/lib/searchEngines.ts`
- Pages: `src/app/blog/page.tsx`, `src/app/blog/[slug]/page.tsx`
- Components: `src/components/MdxBlogComponents.tsx`, `src/components/blog/RelatedArticles.tsx`
- SEO: `src/app/sitemap.ts`, `src/app/robots.ts`
- Crons: `src/app/api/cron/revalidate-blog/route.ts`, `src/app/api/cron/check-indexing/route.ts`, schedules in `vercel.json`
- Content: `content/blog/*.mdx`, `content/interlinking/keyword-map.json`
- Script: `scripts/interlink-posts.ts`
