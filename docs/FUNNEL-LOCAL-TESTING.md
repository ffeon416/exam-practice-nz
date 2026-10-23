# Testing the free-week funnel locally

Everything runs on your Mac with **Stripe test mode** and a **Clerk development
instance**, so no real card is charged and no real login is touched. Webhooks
reach your machine through the Stripe CLI.

> There is one Supabase database, so test parents land in the real tables.
> They are flagged automatically: `profiles.is_test`, `child_profiles.is_test`,
> `trial_history.is_test`, and `publicMetadata.test = true` on the Clerk user.
> Also use `+test` emails (e.g. `you+test1@gmail.com`) so they're obvious.
> Clean up with `supabase/cleanup-test-accounts.sql` (look first, then delete).

## One-time setup

1. **Stripe test prices.** With your test secret key:
   ```bash
   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe-funnel-prices.mjs prod_XXXX
   ```
   `prod_XXXX` is the Pro product **in test mode** (create one if test mode has none).
2. **Clerk development instance.** Clerk dashboard → switch to *Development* →
   API keys. Turn on *Email verification code* sign-in there too.
3. **Create `.env.development.local`** in the repo root (gitignored; `next dev`
   reads it on top of `.env.local`, so these win):
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=            # the script prints it on first run
   STRIPE_PRICE_FUNNEL_YEARLY=price_...
   STRIPE_PRICE_FUNNEL_MONTHLY=price_...
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_URL=http://localhost:3000
   # optional, to watch Meta events in Events Manager → Test events:
   NEXT_PUBLIC_META_PIXEL_ID=1618418683299914
   META_CAPI_TOKEN=...
   META_TEST_EVENT_CODE=TEST...
   ```
4. `stripe login` is not needed: the script passes your test key.

## Each test run

```bash
bash scripts/dev-funnel.sh
```
It refuses to start if any Stripe or Clerk key is live. Then open
http://localhost:3000 and start a free week. Test cards:

| Card | Use |
|---|---|
| `4242 4242 4242 4242` | Works. Any future date, any CVC. |
| `4000 0025 0000 3155` | Asks for 3-D Secure. |
| `4000 0000 0000 0341` | Saves fine, then the first charge fails. |

To test one free week per person, start a second free week with the same
email, or a different email and the same card: `/invite` should say "You've
already had your free week", and the trial is cancelled in the Stripe test
dashboard with nothing charged.

To skip ahead in time (trial ending, day-6 auto-cancel), use a Stripe **test
clock**: Dashboard (test mode) → Billing → Test clocks.
