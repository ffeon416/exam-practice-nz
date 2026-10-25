# Free-week funnel: go-live steps

For whoever has access to the StudyAce Vercel project, live Stripe account and
Supabase. Do them in this order. Nothing here drops or renames data.

## 1. Supabase (SQL editor)

Dashboard → SQL Editor → New query. Paste and run each file, in this order:

1. `supabase/migrations/2026-10-23-meta-tracking.sql`
2. `supabase/migrations/2026-10-24-free-week.sql`
3. `supabase/migrations/2026-10-25-one-free-week.sql`
4. `supabase/migrations/2026-10-26-kid-onboarding.sql`
5. `supabase/migrations/2026-10-27-free-week-emails-promise.sql`
6. `supabase/migrations/2026-10-28-forecast-snapshots.sql`

They only add tables and columns, and they're safe to run again if one has
already been run.

## 2. Stripe (live mode)

1. Create the funnel prices. Pass the existing Pro product id from
   Dashboard → Products:
   `STRIPE_SECRET_KEY=sk_live_... node scripts/stripe-funnel-prices.mjs prod_XXXX --live`
   It prints `STRIPE_PRICE_FUNNEL_YEARLY` and `STRIPE_PRICE_FUNNEL_MONTHLY`.
   It never edits existing prices.
2. Developers → Webhooks → the studyace.co endpoint → add the events
   `invoice.created` and `invoice.paid`. The auto-cancel promise needs both.
   Keep the events that are already ticked.

## 3. Vercel environment variables (Production)

| Name | Value |
| --- | --- |
| `STRIPE_PRICE_FUNNEL_YEARLY`, `STRIPE_PRICE_FUNNEL_MONTHLY` | from step 2 |
| `INVITE_SECRET` | the production value Rowan has |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | the production pair Rowan has |
| `VAPID_SUBJECT` | `mailto:hello@studyace.co` |
| `NEXT_PUBLIC_META_PIXEL_ID` | `1618418683299914` |
| `META_CAPI_TOKEN` | Meta Events Manager → the pixel → Settings → Conversions API → Generate access token |
| `PROMISE_ALERT_EMAILS` | `ffeon.io@gmail.com,rowanclifford1@gmail.com` |

`CRON_SECRET` is already set. Leave it as it is: the cron-job.org jobs use it.

## 4. Deploy

Merge `studyace-funnel` into `main`, push, then from the repo root run
`vercel --prod --yes`. Check that `curl -s https://studyace.co/sw.js | grep BUILD_VERSION`
matches `git rev-parse HEAD`.

## 5. Switch on the crons

Turn on the three paused StudyAce jobs at cron-job.org. Rowan can do this, or
run `scripts/setup-cron-jobs.mjs --enable` (see docs/CRONS.md). Then check the
free-week job's first run returns 200 and not 401.
