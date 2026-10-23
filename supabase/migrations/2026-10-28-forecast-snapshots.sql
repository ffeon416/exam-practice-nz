-- Nightly grade forecast snapshots ("Updated every night", 6-week trend lines).
-- ADDITIVE ONLY: one new table. Safe to re-run.
create table if not exists forecast_snapshots (
  user_id text not null references profiles(user_id) on delete cascade,
  subject text not null,
  snapshot_date date not null,          -- the student's local date
  now_pct int not null,                 -- recency-weighted mean of the last 6 papers
  trend_per_week numeric(5,1) not null, -- percentage points per week, last 8 papers
  heading_for_pct int,                  -- projected to their exam date (null: no exam date set)
  papers int not null,
  created_at timestamptz not null default now(),
  primary key (user_id, subject, snapshot_date)
);
create index if not exists forecast_snapshots_date on forecast_snapshots (snapshot_date);
alter table forecast_snapshots enable row level security;
do $$ begin
  create policy service_all_forecast_snapshots on forecast_snapshots for all using (true) with check (true);
exception when duplicate_object then null; end $$;
