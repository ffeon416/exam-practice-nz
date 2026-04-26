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
  -- and time-bounded rewards (Pro for the referrer, bonus exams for the referee).
  referrer_id text,
  referrals_count int not null default 0,
  pro_until timestamptz,
  bonus_exams_remaining int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent migration for existing deployments — run after schema is in place.
alter table profiles add column if not exists referrer_id text;
alter table profiles add column if not exists referrals_count int not null default 0;
alter table profiles add column if not exists pro_until timestamptz;
alter table profiles add column if not exists bonus_exams_remaining int not null default 0;
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
