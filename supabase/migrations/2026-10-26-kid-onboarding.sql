-- Phase 3 of the free-week funnel: the kid's invite, onboarding and first
-- grade check, plus web-push reminders.
-- ADDITIVE ONLY: new nullable columns (or columns with a default) on
-- child_profiles and one new table. Nothing is dropped, renamed or rewritten;
-- safe to re-run. Apply AFTER 2026-10-24-free-week.sql and 2026-10-25-one-free-week.sql.

-- Invite link: version bump = every older link stops working.
alter table child_profiles add column if not exists invite_version int not null default 1;
alter table child_profiles add column if not exists invite_sent_at timestamptz;
alter table child_profiles add column if not exists invite_channel text;      -- sms | whatsapp | email | qr | copy
alter table child_profiles add column if not exists invite_opened_at timestamptz;

-- What the kid picked on their first screen.
alter table child_profiles add column if not exists curriculum_id text;
alter table child_profiles add column if not exists year_level int;
alter table child_profiles add column if not exists subjects text[];
alter table child_profiles add column if not exists check_subject text;
alter table child_profiles add column if not exists target_band text;

-- The first grade check. grade_check_paper holds the 8 questions WITH the
-- marking guides, server-side only (the kid's browser never sees the guides).
-- grade_check is the summary the parent email (Phase 4) is built from.
alter table child_profiles add column if not exists grade_check_paper jsonb;
alter table child_profiles add column if not exists grade_check_generated int not null default 0;
alter table child_profiles add column if not exists grade_check_completed_at timestamptz;
alter table child_profiles add column if not exists grade_check jsonb;

-- "Not now, remind me at 7pm".
alter table child_profiles add column if not exists remind_at timestamptz;
alter table child_profiles add column if not exists reminded_at timestamptz;
alter table child_profiles add column if not exists timezone text;

create index if not exists child_profiles_remind on child_profiles (remind_at) where reminded_at is null;

-- Browser push subscriptions (one row per device).
create table if not exists push_subscriptions (
  endpoint text primary key,
  user_id text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on push_subscriptions (user_id);
alter table push_subscriptions enable row level security;
do $$ begin
  create policy service_all_push_subscriptions on push_subscriptions for all using (true) with check (true);
exception when duplicate_object then null; end $$;
