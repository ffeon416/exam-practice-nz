-- Phase 4 of the free-week funnel: parent emails + the auto-cancel promise.
-- ADDITIVE ONLY: one new table and two new nullable columns. Nothing is
-- dropped, renamed or rewritten; safe to re-run. Apply after 2026-10-26.

-- One row per email ever sent (key e.g. "welcome:<childId>"). Claimed before
-- sending so retries and overlapping cron runs never send twice; a failed
-- send deletes its claim so the next run retries.
create table if not exists email_log (
  key text primary key,
  template text not null,
  to_email text not null,
  resend_id text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists email_log_template on email_log (template, created_at desc);
alter table email_log enable row level security;
do $$ begin
  create policy service_all_email_log on email_log for all using (true) with check (true);
exception when duplicate_object then null; end $$;

-- When (and by which layer) the promise cancelled a free week.
alter table child_profiles add column if not exists auto_cancelled_at timestamptz;
alter table child_profiles add column if not exists auto_cancel_how text;  -- cron | invoice-guard | refund

-- "Keep the plan going" (day-5 email): the parent chose to be charged on day 7
-- even without a grade check. Also stored on the Stripe subscription
-- (metadata keep_opt_in), which the promise layers read first.
alter table child_profiles add column if not exists keep_opt_in_at timestamptz;

