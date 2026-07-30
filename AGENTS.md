<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Study Ace — project guide for Claude Code

Study Ace (studyace.co) is a New Zealand NCEA exam-practice web app: unlimited AI-generated,
NCEA-style practice across 19 subjects (Levels 1–3), with honest AI marking, a study planner,
referrals, a blog, and a first-party analytics/admin panel.

## Stack
- **Next.js 16.2** (App Router, Turbopack), **React 19.2**, **Tailwind CSS 4**, TypeScript. Node **24**.
- **Clerk** — auth (`@clerk/nextjs`). Production keys on custom domain `clerk.studyace.co`.
- **Supabase** — Postgres DB (server-side via service-role key; SQL in `supabase/`).
- **Stripe** — payments, **live mode**. Tiers: Free, Student, Pro (monthly/yearly price IDs in env).
- **Anthropic API** (`@anthropic-ai/sdk`) — all AI generation + marking. Wrapper: `src/lib/claude.ts`.
- **Resend** — optional contact-form email.
- **Hosting: Vercel.** Push to `main` → auto-deploys to production. That's the deploy process.

## Where things live
- `src/app/` — routes. Pages: `/subjects`, `/exam/[examId]`, `/practice`, `/plan`, `/dashboard`,
  `/pricing`, `/refer`, `/redeem`, `/blog`, `/admin`, `/demo`, etc.
- `src/app/api/` — server routes. Key ones: `generate-paper` (creates AI papers),
  `mark` / `mark-essay` / `demo-mark` (AI marking), `stripe-webhook` (subscription state),
  `checkout` / `customer-portal` (Stripe), `refer` / `redeem`, `track` (first-party analytics),
  `cron` (daily revalidate + jobs), `admin` (dashboard data).
- `src/lib/` — logic. Notables: `claude.ts` (AI calls), `checkTier.ts` + `tierLimits.ts` (entitlements),
  `scoring.ts` (marking scheme), `studyPlanner.ts`, `spacedRepetition.ts`, `adaptiveDifficulty.ts`,
  `questionGuard.ts` (validates generated questions), `userScope.ts`, `supabase.ts`, `stripe.ts`.
- `src/data/` — `curricula.ts`, `topics.ts`, subject/exam definitions, past-paper JSON under `exams/`.
- `supabase/` — `schema.sql`, `create-tables.sql`, `migrations/`.
- `scripts/stamp-sw.mjs` — runs in `npm run build`; stamps the service worker with the commit SHA.

## Rules — these are firm, do not break them
1. **AI marking is HONEST. No leniency, ever.** Hedged / "it could be either" answers score **0**.
   Never inflate scores or people-please. Marking scheme is **1+1** (1 mark working + 1 mark answer = /2;
   multiple-choice = /1; essays marked holistically then rescaled). See `src/lib/scoring.ts`.
2. **No Google Analytics, no PostHog.** Both were removed because their per-click JS made the site
   ~2s slower per interaction (60× on the picker). Do **not** re-add any third-party analytics/replay
   without an explicit ask. Traffic is measured first-party via `/api/track` → `/admin`.
3. **Never claim real / NZQA past papers** in any user-facing copy or marketing. Position strictly as
   *unlimited AI-generated NCEA-style practice*. (Past-paper JSON exists in code but is not a selling point.)
4. **No UI flashes / wrong-tier flicker.** Gate tier-conditional UI on `tierLoading`; scope any
   `localStorage` by `userId`. Users must never briefly see the wrong tier.
5. **Multiple-choice questions must always include an `options` array.**
6. **Never modify the original graphs/charts** in past-paper data.
7. **PWA service worker is network-first only** — don't make it cache app assets. It's auto-stamped
   per deploy (`scripts/stamp-sw.mjs`) so installed iOS PWAs update hands-free. Test fresh builds in a
   Safari **private** tab (installed PWAs otherwise resume stale JS).
8. **Payments are legally under Rowan Clifford** (adult account holder). Keep that in mind for anything
   touching Stripe / billing / company identity.

## Local dev
```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # stamps SW + next build (run before assuming a deploy will succeed)
npm run lint
```
Requires `.env.local` (not in git — get it from the project owner). Var names are in `.env.example`.

## Deploying
Commit to a branch or push to `main`. **Push to `main` = production deploy on Vercel.**
There is no separate deploy command — Vercel builds on push.
