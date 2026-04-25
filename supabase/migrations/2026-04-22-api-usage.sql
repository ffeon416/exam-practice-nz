-- Per-call Claude API usage tracking
-- Run in Supabase SQL Editor to enable /admin cost dashboard.

create table if not exists api_usage (
  id bigserial primary key,
  user_id text references profiles(user_id) on delete cascade,
  feature text not null,                  -- 'tutor' | 'mark' | 'generate_paper' | 'essay' | 'practice_question'
  model text not null,                    -- 'claude-haiku-4-5-...' or 'claude-sonnet-4-5-...'
  input_tokens int not null default 0,
  output_tokens int not null default 0,
  cost_usd numeric(10, 6) not null default 0,   -- computed server-side
  created_at timestamptz not null default now()
);

create index if not exists api_usage_user_idx on api_usage(user_id, created_at desc);
create index if not exists api_usage_created_idx on api_usage(created_at desc);

alter table api_usage enable row level security;
create policy "service_all_api_usage" on api_usage for all using (true) with check (true);
