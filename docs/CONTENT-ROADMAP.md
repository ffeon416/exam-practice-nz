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

## Published (17 posts as of 2026-09-11) — all Priority 1 pillars are DONE

Hubs (`hub: true`): testing-effect-practice-beats-rereading, how-to-study-for-ncea-exams,
spaced-repetition-for-exams-student-guide, how-to-use-past-papers-mock-exam-strategy,
how-to-beat-test-anxiety-before-exams, how-to-use-ai-to-generate-practice-exam-questions.

Supporting: ncea-credits-explained-how-many-to-pass, ncea-endorsement-merit-excellence,
achieved-merit-excellence-what-examiners-look-for, how-to-study-for-ncea-level-1-maths,
how-to-get-excellence-in-ncea-english, university-entrance-nz-requirements-explained,
how-parents-can-help-with-ncea-exams, how-to-make-a-study-timetable-you-will-follow,
how-to-cram-for-an-exam-the-night-before, chatgpt-for-studying-what-it-gets-wrong,
how-to-study-for-qce-external-exams.

## Next queue (in priority order — one cluster at a time)

1. **NCEA subject guides, Level 2 + 3** (Subject Guides): L2 maths (calculus/stats split), L3 calculus,
   L3 statistics, L2/L3 biology, chemistry, physics, L2 English. Same shape as the L1 maths post:
   exam shape → where marks are lost → 4-week routine → 2 worked examples.
2. **Exam-week posts** timed for late October: "NCEA exam timetable: how to plan the gaps between
   papers", "What to do the morning of an NCEA exam", "How NCEA externals are marked" (link NZQA).
3. **AU/UK entry points**: how to study for HSC trials, VCE exam plan, GCSE revision timetable,
   A-level past-paper strategy. One per system, each linking to `/subjects?curriculum=<id>`.
4. **Comparisons** (only once there is search demand): StudyAce vs Quizlet, vs Khan Academy, vs a
   tutor. Keep honest — say what each is better at.

## Standing rules learned 2026-09-11

- **CTA goes to `/grade`** (the free grade check). There is no free plan or free trial — never
  write "free trial", "free plan", or link `/sign-up` from a post.
- **Never claim StudyAce uses real / NZQA past papers.** Recommending NZQA's or QCAA's own free
  published papers is fine (and good advice).
- **No invented statistics.** Real findings to cite qualitatively: Roediger & Karpicke (2006),
  Dunlosky et al. (2013), Ebbinghaus forgetting curve. If a number isn't from a source you can
  link, don't write it.
- **Publish dates are NZ calendar dates.** `date: "2026-09-11"` goes live at midnight NZT (the
  gate in `src/lib/blog.ts` uses Pacific/Auckland). Only link to posts dated on or before your own.
- **Validate before committing:** `python3 scripts/validate-blog.py` checks categories, description
  length (120–170), the `/grade` callout, no `/sign-up`, no free-trial copy, no past-paper claims,
  no links to unknown or future posts, external URLs on the allowlist, and flags every `%` for a
  manual honesty check.
- **Markdown tables work** (remark-gfm + styled table components). Use them for credit tables,
  timetables, comparison grids.
- **After a batch:** `npx tsx scripts/interlink-posts.ts` (note: it rewrites frontmatter in YAML
  block style on files it touches — harmless, but re-run the validator), then commit, push, and
  `vercel --prod --yes`. The daily cron submits newly-live post URLs to IndexNow automatically; for
  Google, request indexing by hand in Search Console (hubs first, ~10/day).

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
- **Date-gating**: set `date:` in the future to queue posts (NZ calendar date). Daily cron at 00:05 UTC revalidates `/blog` + `/sitemap.xml` + any post dated NZ-today/yesterday, and submits those URLs to IndexNow. Crons live in `vercel.json`; `CRON_SECRET` env var required.
- **IndexNow**: key file `public/<key>.txt`, key constant in `src/lib/searchEngines.ts`. Covers Bing/DuckDuckGo/Yandex. Google ignores it — use GSC.
- **RSS**: `/feed.xml` (route handler, hourly revalidate), advertised via `alternates.types` in `layout.tsx`.
- **`updated:` frontmatter** (optional) drives `dateModified`, `article:modified_time` and sitemap lastmod. Set it when you substantively revise a post.
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
