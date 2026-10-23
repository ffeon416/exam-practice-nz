-- Phase 2 of the free-week funnel: parent accounts + linked child profiles.
-- ADDITIVE ONLY: two new nullable columns on profiles and one new table.
-- Nothing is dropped, renamed or rewritten; safe to re-run. The app tolerates
-- this not being applied yet (writes skipped on 42703 / 42P01), but child
-- profiles are only saved once it is.

-- 'parent' for free-week buyers; 'student' (Phase 3) for kids who join from an
-- invite. NULL = every existing account, which keeps working exactly as now.
alter table profiles add column if not exists role text;
alter table profiles add column if not exists trial_ends_at timestamptz;

-- One row per child per checkout. kid_user_id is filled in Phase 3 when the
-- child opens their invite link and gets their own login.
create table if not exists child_profiles (
  id uuid primary key default gen_random_uuid(),
  parent_user_id text not null references profiles(user_id) on delete cascade,
  first_name text not null,
  kid_user_id text unique,
  checkout_session_id text unique,
  stripe_subscription_id text,
  -- One-time sign-in tickets issued to the parent on /invite (capped).
  parent_tickets_issued int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists child_profiles_parent on child_profiles (parent_user_id);
create index if not exists child_profiles_sub on child_profiles (stripe_subscription_id);
alter table child_profiles enable row level security;
do $$ begin
  create policy service_all_child_profiles on child_profiles for all using (true) with check (true);
exception when duplicate_object then null; end $$;
