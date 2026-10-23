-- Phase 1 of the free-week funnel: Meta ads tracking + sign-up attribution.
-- ADDITIVE ONLY: new nullable columns and one new table. Nothing is dropped,
-- renamed or rewritten, and every statement is safe to re-run. The app
-- tolerates this not being applied yet (writes are skipped on 42703/42P01).

-- Where a paying parent came from, saved once at sign-up.
alter table profiles add column if not exists utm_source text;
alter table profiles add column if not exists utm_medium text;
alter table profiles add column if not exists utm_campaign text;
alter table profiles add column if not exists utm_content text;
alter table profiles add column if not exists utm_term text;
alter table profiles add column if not exists landing_page text;
alter table profiles add column if not exists first_referrer text;
alter table profiles add column if not exists signup_country text;
alter table profiles add column if not exists attributed_at timestamptz;

-- Meta: whether this parent allowed ad measurement at checkout, and the
-- browser identifiers (fbp, fbc, ip, user agent) needed to match later
-- server-side events (KidStarted, GradeCheckCompleted) to their ad click.
-- Only filled when meta_consent is true.
alter table profiles add column if not exists meta_consent boolean;
alter table profiles add column if not exists meta_identity jsonb;

-- One row per server-originated Meta event (StartTrial, Purchase, the custom
-- kid-side events), claimed BEFORE sending so a retried Stripe webhook can't
-- double-count. Browser-relayed PageView/ViewContent are not logged here.
create table if not exists meta_events (
  event_id text primary key,
  event_name text not null,
  user_id text,
  created_at timestamptz not null default now()
);
create index if not exists meta_events_name_created on meta_events (event_name, created_at desc);
alter table meta_events enable row level security;
do $$ begin
  create policy service_all_meta_events on meta_events for all using (true) with check (true);
exception when duplicate_object then null; end $$;
