-- One free week per person + test-account flags.
-- ADDITIVE ONLY: one new table, two new columns with a default. Nothing is
-- dropped, renamed or rewritten; safe to re-run.

-- Every free week that was started, with the email and Stripe card
-- fingerprint behind it. A later trial matching either is a repeat:
-- cancelled before any charge (repeat = true rows don't count as "had one").
create table if not exists trial_history (
  stripe_subscription_id text primary key,
  checkout_session_id text,
  email text not null,
  card_fingerprint text,
  repeat boolean not null default false,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists trial_history_email on trial_history (email);
create index if not exists trial_history_card on trial_history (card_fingerprint);
alter table trial_history enable row level security;
do $$ begin
  create policy service_all_trial_history on trial_history for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- true = created by a Stripe TEST-mode checkout (local testing). Safe to
-- delete; see supabase/cleanup-test-accounts.sql.
alter table profiles add column if not exists is_test boolean not null default false;
alter table child_profiles add column if not exists is_test boolean not null default false;
