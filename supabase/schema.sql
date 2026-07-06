-- Study Ace database schema
-- Run this in your Supabase SQL editor (Project → SQL Editor → New query)

-- ── PROFILES ─────────────────────────────────────────────
-- One row per Clerk user. Tracks subscription tier and Stripe customer.
create table if not exists profiles (
  user_id text primary key,
  email text,
  tier text not null default 'free' check (tier in ('free', 'student', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  current_period_end timestamptz,
  -- Referral system: who invited this user, how many they've invited,
  -- and time-bounded Student-tier reward (cheap for us — no tutor calls).
  -- referral_credited gates the referrer's reward behind the referee
  -- actually using the product (taking their first marked exam) to
  -- prevent farming.
  referrer_id text,
  referrals_count int not null default 0,
  student_until timestamptz,
  bonus_exams_remaining int not null default 0,
  referral_credited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent migration for existing deployments — run after schema is in place.
-- pro_until was the v1 reward column; replaced by student_until so referrals
-- don't grant the expensive AI-tutor tier.
alter table profiles drop column if exists pro_until;
alter table profiles add column if not exists referrer_id text;
alter table profiles add column if not exists referrals_count int not null default 0;
alter table profiles add column if not exists student_until timestamptz;
alter table profiles add column if not exists bonus_exams_remaining int not null default 0;
alter table profiles add column if not exists referral_credited boolean not null default false;
-- Attribution: how the user first heard about StudyAce (set once, during /welcome onboarding).
alter table profiles add column if not exists heard_about text;
create index if not exists profiles_referrer_idx on profiles(referrer_id);

-- ── CUSTOM EXAMS ─────────────────────────────────────────
-- Generated practice exams. Persists across devices.
create table if not exists custom_exams (
  id text primary key,
  user_id text not null references profiles(user_id) on delete cascade,
  title text not null,
  subject text not null,
  level int not null,
  topic text,
  questions jsonb not null,
  total_marks int not null,
  time_minutes int not null,
  created_at timestamptz not null default now()
);

create index if not exists custom_exams_user_idx on custom_exams(user_id, created_at desc);

-- ── EXAM ATTEMPTS ────────────────────────────────────────
-- Each time a user takes an exam, store the result.
create table if not exists exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references profiles(user_id) on delete cascade,
  exam_id text not null,
  exam_title text,
  subject text,
  level int,
  mode text not null default 'practice',
  answers jsonb not null,
  results jsonb not null,
  total_marks int not null,
  max_marks int not null,
  overall_grade text not null,
  taken_at timestamptz not null default now()
);

create index if not exists exam_attempts_user_idx on exam_attempts(user_id, taken_at desc);

-- ── TOPIC SCORES ─────────────────────────────────────────
-- Per-user, per-topic running stats for adaptive difficulty + weak spots.
create table if not exists topic_scores (
  user_id text not null references profiles(user_id) on delete cascade,
  topic text not null,
  topic_label text,
  attempts int not null default 0,
  correct_rate float not null default 0,
  trend text default 'stable',
  history int[] default '{}',
  rating int default 1200,
  last_attempted timestamptz,
  primary key (user_id, topic)
);

-- ── REVIEW QUEUE ─────────────────────────────────────────
-- Spaced repetition review items.
create table if not exists reviews (
  user_id text not null references profiles(user_id) on delete cascade,
  question_id text not null,
  exam_id text not null,
  question_text text not null,
  topics text[] not null default '{}',
  ease float not null default 2.5,
  interval_days int not null default 1,
  repetitions int not null default 0,
  next_review timestamptz not null,
  last_reviewed timestamptz,
  primary key (user_id, question_id)
);

create index if not exists reviews_due_idx on reviews(user_id, next_review);

-- ── STUDY PLANS ──────────────────────────────────────────
-- One active plan per user.
create table if not exists study_plans (
  user_id text primary key references profiles(user_id) on delete cascade,
  exam_date date not null,
  subjects text[] not null,
  year_level int not null,
  weeks jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── USAGE TRACKING ───────────────────────────────────────
-- Track free-tier limits (exams per week, tutor messages per day, etc.)
create table if not exists usage (
  user_id text not null references profiles(user_id) on delete cascade,
  feature text not null,
  count int not null default 0,
  period_start timestamptz not null default now(),
  primary key (user_id, feature)
);

-- ── ROW LEVEL SECURITY ───────────────────────────────────
-- Lock everything down so users can only see their own data.
-- We use Clerk for auth, so the API will set the user_id on every query.
-- Service role from server bypasses RLS.
alter table profiles enable row level security;
alter table custom_exams enable row level security;
alter table exam_attempts enable row level security;
alter table topic_scores enable row level security;
alter table reviews enable row level security;
alter table study_plans enable row level security;
alter table usage enable row level security;

-- Allow service role full access (server-side)
create policy "service_all_profiles" on profiles for all using (true) with check (true);
create policy "service_all_exams" on custom_exams for all using (true) with check (true);
create policy "service_all_attempts" on exam_attempts for all using (true) with check (true);
create policy "service_all_topics" on topic_scores for all using (true) with check (true);
create policy "service_all_reviews" on reviews for all using (true) with check (true);
create policy "service_all_plans" on study_plans for all using (true) with check (true);
create policy "service_all_usage" on usage for all using (true) with check (true);

-- ── ACCESS CODES (free-trial / school codes) ─────────────
-- A redeemable code grants a time-boxed tier (e.g. Pro for 30 days) with NO
-- payment. Used to hand a school 50 free Pro trials via a single code.
-- pro_until mirrors student_until: getTier() returns 'pro' while it's in the
-- future, then the grant simply lapses (no charge, nothing to cancel).
alter table profiles add column if not exists pro_until timestamptz;

create table if not exists access_codes (
  code text primary key,
  tier text not null default 'pro' check (tier in ('student', 'pro')),
  days int not null default 30,                 -- length of the grant per redeem
  max_redemptions int not null default 50,      -- how many students can use it
  redemptions_count int not null default 0,     -- display-only running tally
  label text,                                   -- e.g. 'Noosa school pilot'
  expires_at timestamptz,                       -- when the CODE itself stops working
  created_at timestamptz not null default now()
);

create table if not exists code_redemptions (
  code text not null references access_codes(code) on delete cascade,
  user_id text not null,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)                   -- one redeem per user per code
);
create index if not exists code_redemptions_user_idx on code_redemptions(user_id);

alter table access_codes enable row level security;
alter table code_redemptions enable row level security;
drop policy if exists "service_all_access_codes" on access_codes;
drop policy if exists "service_all_code_redemptions" on code_redemptions;
create policy "service_all_access_codes" on access_codes for all using (true) with check (true);
create policy "service_all_code_redemptions" on code_redemptions for all using (true) with check (true);

-- Te Kura school pilot code: 55 students, 30 days of Pro each.
-- The code itself stops working after 60 days (a window for the school to roll
-- it out); each student who redeems gets a full 30 days from their redeem date.
insert into access_codes (code, tier, days, max_redemptions, label, expires_at)
values ('TEKURA11', 'pro', 30, 55, 'Te Kura school pilot', now() + interval '60 days')
on conflict (code) do nothing;

-- ── PAGE VIEWS (first-party analytics) ───────────────────
-- Lightweight, privacy-friendly traffic tracking surfaced in /admin instead of
-- Google Analytics. No cookies, no personal data: visitor_id is a random id the
-- browser keeps in localStorage purely to estimate unique visitors. user_id is
-- set only when the viewer is signed in (no FK — a view can happen before the
-- Clerk webhook creates the profile, and we never want a missing profile to
-- block a view insert).
create table if not exists page_views (
  id uuid primary key default gen_random_uuid(),
  path text not null,                 -- e.g. '/', '/pricing', '/blog/slug'
  referrer text,                      -- external referrer host, null for direct
  visitor_id text,                    -- anon localStorage id (unique-visitor estimate)
  user_id text,                       -- Clerk id if signed in, else null
  country text,                       -- 2-letter code from the Vercel edge header
  device text check (device in ('mobile', 'desktop')),
  created_at timestamptz not null default now()
);
create index if not exists page_views_created_idx on page_views(created_at desc);
create index if not exists page_views_visitor_idx on page_views(visitor_id);
create index if not exists page_views_path_idx on page_views(path);

alter table page_views enable row level security;
drop policy if exists "service_all_page_views" on page_views;
create policy "service_all_page_views" on page_views for all using (true) with check (true);

-- ── EVENTS (conversion funnel) ───────────────────────────
-- Server-logged product events that power the /admin conversion funnel
-- (checkout started, subscription paid, ...). Logged fire-and-forget so a
-- failed insert never blocks checkout or a webhook. No FK on user_id — an event
-- can precede the profile row, and a missing profile must never block a log.
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- 'checkout_started' | 'subscription_paid'
  user_id text,                       -- Clerk id if known, else null
  props jsonb,                        -- optional { tier, billing, plan, ... }
  created_at timestamptz not null default now()
);
create index if not exists events_name_created_idx on events(name, created_at desc);
create index if not exists events_user_idx on events(user_id);

alter table events enable row level security;
drop policy if exists "service_all_events" on events;
create policy "service_all_events" on events for all using (true) with check (true);

-- ── SESSION RECORDINGS (first-party screen replay) ───────
-- rrweb DOM recordings so we can watch what users did INSIDE /admin, with no
-- third-party. `recording_chunks` holds the rrweb event batches; `recordings`
-- is one metadata row per session. All text input is masked client-side, so
-- typed answers, messages and passwords are never stored. Retention: chunks
-- older than 30 days are pruned opportunistically in /api/rec to bound cost.
create table if not exists recordings (
  session_id text primary key,
  visitor_id text,
  user_id text,
  page text,
  country text,
  device text,
  started_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
create index if not exists recordings_last_seen_idx on recordings(last_seen desc);

create table if not exists recording_chunks (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  seq int not null,
  events jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists recording_chunks_session_idx on recording_chunks(session_id, seq);
create index if not exists recording_chunks_created_idx on recording_chunks(created_at);

alter table recordings enable row level security;
alter table recording_chunks enable row level security;
drop policy if exists "service_all_recordings" on recordings;
drop policy if exists "service_all_recording_chunks" on recording_chunks;
create policy "service_all_recordings" on recordings for all using (true) with check (true);
create policy "service_all_recording_chunks" on recording_chunks for all using (true) with check (true);
