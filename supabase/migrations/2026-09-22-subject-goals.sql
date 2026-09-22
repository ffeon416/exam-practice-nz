-- Subject goals (currently stored as append-only `subject_goal` rows in
-- `events`; move to this table once DDL can be applied, and switch
-- src/app/api/goals/route.ts to read/write it).
create table if not exists subject_goals (
  user_id text not null references profiles(user_id) on delete cascade,
  subject text not null,
  curriculum_id text not null default 'nz-ncea',
  year int not null,
  goal_band text not null,
  exam_date date not null,
  baseline_pct int,
  updated_at timestamptz not null default now(),
  primary key (user_id, subject)
);
alter table subject_goals enable row level security;
create policy service_all_subject_goals on subject_goals for all using (true) with check (true);
