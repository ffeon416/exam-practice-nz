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

## Cadence: 3 posts a week, Mon / Wed / Fri (NZ dates)

The blog is a queue, not a burst. Posts are written ahead, committed with a future `date:`, and the
site publishes them itself at midnight NZ (date gate in `src/lib/blog.ts`; `/blog`, post pages and
the sitemap re-render hourly; the daily cron submits newly-live URLs to IndexNow).

**The weekly loop (do this every Monday, or whenever the runway alert email arrives):**
1. `node scripts/blog-schedule.mjs` → shows live/queued counts, runway, and the next open Mon/Wed/Fri slots.
2. Pick topics from the **Next queue** below, in order. One cluster at a time.
3. Write to `content/blog/YYYY-MM-DD-slug.mdx` with `date:` = the slot date (filename prefix must match).
   Reuse the writer brief shape: subject guides = exam shape → where marks are lost → 4-week routine →
   two worked examples → Q&A → `/grade` tip callout. Plans = hook → what people get wrong → phased
   timetable table → rules → sample week → Q&A → callout.
4. Link only to posts dated on or before the new post (the validator enforces it).
5. `python3 scripts/validate-blog.py` → must end with `NO PROBLEMS` (PERCENT lines are manual checks), and
   `node scripts/check-mdx.mjs` → every post must compile (MDX is compiled at request time, so a bad `<` or `{`
   in a queued post would otherwise crash the page on its publish morning).
6. Add 1–2 `keyword → slug` entries per new post to `content/interlinking/keyword-map.json`
   (3+ words, phrases that actually occur in other posts), then `npx tsx scripts/interlink-posts.ts`
   (it never links forward to a later-dated post) and re-run the validator.
7. Commit, push, **`vercel --prod --yes`**. Queued posts must be deployed to exist; the gate does the rest.
8. Google: request indexing in Search Console for each post the day it goes live (hubs first, ~10/day).

**Keep ≥ 1 week (3 posts) queued at all times.** The weekly cron (`/api/cron/check-indexing`, Mon
10:00 UTC) emails the admin list when fewer than three posts are queued, with the next open slots.

## Published (17 live as of 2026-09-11) — all Priority 1 pillars are DONE

Hubs (`hub: true`): testing-effect-practice-beats-rereading, how-to-study-for-ncea-exams,
spaced-repetition-for-exams-student-guide, how-to-use-past-papers-mock-exam-strategy,
how-to-beat-test-anxiety-before-exams, how-to-use-ai-to-generate-practice-exam-questions.

Supporting: ncea-credits-explained-how-many-to-pass, ncea-endorsement-merit-excellence,
achieved-merit-excellence-what-examiners-look-for, how-to-study-for-ncea-level-1-maths,
how-to-get-excellence-in-ncea-english, university-entrance-nz-requirements-explained,
how-parents-can-help-with-ncea-exams, how-to-make-a-study-timetable-you-will-follow,
how-to-cram-for-an-exam-the-night-before, chatgpt-for-studying-what-it-gets-wrong,
how-to-study-for-qce-external-exams.

## Queued (written 2026-09-11, publish themselves on these NZ dates)

| Date | Slug | Category |
|---|---|---|
| Mon 2026-09-14 | how-to-study-for-ncea-level-2-maths | Subject Guides |
| Wed 2026-09-16 | how-to-study-for-hsc-exams | Exam Strategy |
| Fri 2026-09-18 | ncea-level-3-calculus-study-guide | Subject Guides |
| Mon 2026-09-21 | how-to-study-for-ncea-biology-externals | Subject Guides |
| Wed 2026-09-23 | vce-exam-study-plan | Exam Strategy |
| Fri 2026-09-25 | ncea-level-3-statistics-study-guide | Subject Guides |
| Mon 2026-09-28 | how-to-study-for-ncea-chemistry-externals | Subject Guides |
| Wed 2026-09-30 | active-recall-how-to-do-it-properly (hub) | Study Methods |
| Fri 2026-10-02 | how-to-study-for-ncea-physics-externals | Subject Guides |
| Mon 2026-10-05 | ncea-exam-timetable-how-to-plan-the-gaps-between-papers | Exam Strategy |
| Wed 2026-10-07 | how-to-revise-for-gcse-mocks | Exam Strategy |
| Fri 2026-10-09 | how-to-study-for-ncea-level-2-english | Subject Guides |

**Next batch is due by Mon 2026-10-05** (to keep a week in hand past 10-09). First open slot: Mon 2026-10-12.

## Next queue (in priority order — one cluster at a time)

1. **Exam-week posts, timed for late October / early November NCEA externals** (Exam Strategy):
   "What to do the morning of an NCEA exam", "How NCEA externals are marked" (link NZQA),
   "How to use the reading time in an NCEA exam", "What to do if you blank in an exam".
   Slots: 10-12, 10-14, 10-16, 10-19.
2. **Remaining NCEA subject guides** (Subject Guides): L3 English, L1 science, L1/L2 statistics
   (the stats strand of L2 maths deserves its own post), geography, history, economics, accounting.
3. **Evergreen study-method posts with global search volume** (Study Methods, hub candidates):
   "Pomodoro for exam revision (when it works and when it doesn't)", "How to take notes you'll
   actually retrieve from", "Interleaving: why mixing topics beats blocking", "How to self-mark
   honestly (and why lenient marking wrecks your grade)".
4. **AU/UK entry points** (Exam Strategy): A-level past-paper strategy, WACE/SACE exam plans,
   "HSC vs VCE vs QCE: how each system scores you" (comparison, honest), GCSE final-run 8-week plan
   (publish in March for the May/June sitting).
5. **US** (Exam Strategy, publish Jan–Mar for spring sittings): SAT 4-week plan, AP exam study
   plan, "What's on the digital SAT".
6. **Parents & Teachers**: "How to help without doing it for them (exam edition)", "What a good
   study plan looks like on the fridge" (a printable-style table).
7. **Comparisons** (only once there is search demand): StudyAce vs Quizlet, vs Khan Academy, vs a
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
