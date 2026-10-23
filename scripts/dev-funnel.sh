#!/usr/bin/env bash
# Local free-week funnel testing: Next dev server + Stripe CLI forwarding
# test-mode webhooks to it. Reads .env.development.local (overrides .env.local
# in `next dev`). Refuses to start with any LIVE Stripe or Clerk key.
#
#   bash scripts/dev-funnel.sh
#
# See docs/FUNNEL-LOCAL-TESTING.md.
set -euo pipefail
cd "$(dirname "$0")/.."

ENV_FILE=.env.development.local
[ -f "$ENV_FILE" ] || { echo "Missing $ENV_FILE — see docs/FUNNEL-LOCAL-TESTING.md"; exit 1; }
val() { grep -E "^$1=" "$ENV_FILE" | tail -1 | cut -d= -f2- | tr -d '"'; }

SK=$(val STRIPE_SECRET_KEY); CK=$(val CLERK_SECRET_KEY); PK=$(val NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)
[[ "$SK" == sk_test_* ]] || { echo "STRIPE_SECRET_KEY in $ENV_FILE must be a TEST key (sk_test_…)."; exit 1; }
[[ "$CK" == sk_test_* ]] || { echo "CLERK_SECRET_KEY in $ENV_FILE must be a Clerk DEVELOPMENT key (sk_test_…)."; exit 1; }
[[ "$PK" == pk_test_* ]] || { echo "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in $ENV_FILE must be a Clerk DEVELOPMENT key (pk_test_…)."; exit 1; }
command -v stripe >/dev/null || { echo "Install the Stripe CLI: brew install stripe/stripe-cli/stripe"; exit 1; }

SECRET=$(stripe listen --api-key "$SK" --print-secret)
if [ "$(val STRIPE_WEBHOOK_SECRET)" != "$SECRET" ]; then
  echo "Set this in $ENV_FILE, then run the script again:"
  echo "  STRIPE_WEBHOOK_SECRET=$SECRET"
  exit 1
fi

EVENTS=checkout.session.completed,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.trial_will_end,invoice.created,invoice.paid
stripe listen --api-key "$SK" --events "$EVENTS" --forward-to localhost:3000/api/stripe-webhook &
LISTEN=$!
trap 'kill $LISTEN 2>/dev/null' EXIT
npm run dev
