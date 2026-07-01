-- =========================================================================
-- UCE IT v3 Migration — Mess Menu, Announcements, Polls & Voting
-- Run this script in your Supabase SQL Editor after dormflow_migration_v2.sql
-- =========================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. PROFILES — Add is_mess_member column
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists is_mess_member boolean default false;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. MESS MENU TABLE
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.mess_menu (
  id uuid primary key default gen_random_uuid(),
  menu_date date not null,
  meal_type text not null check (meal_type in ('morning_tea', 'breakfast', 'lunch', 'snacks', 'dinner')),
  items text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Unique per-date-per-meal
delete from public.mess_menu where exists (
  select 1 from public.mess_menu m2
  where m2.menu_date = mess_menu.menu_date
  and m2.meal_type = mess_menu.meal_type
  and m2.id < mess_menu.id
);
alter table public.mess_menu add constraint mess_menu_date_meal_unique unique (menu_date, meal_type);

create index if not exists idx_mess_menu_date on public.mess_menu(menu_date);

-- RLS
alter table public.mess_menu enable row level security;

do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'mess_menu' and schemaname = 'public') loop
    execute format('drop policy %I on public.mess_menu', pol.policyname);
  end loop;
end $$;

create policy "mess_menu_select_authenticated" on public.mess_menu
  for select to authenticated using (true);

create policy "mess_menu_insert_mess_admin" on public.mess_menu
  for insert to authenticated
  with check (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'is_mess_member', 'false')::boolean = true
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

create policy "mess_menu_update_mess_admin" on public.mess_menu
  for update to authenticated
  using (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'is_mess_member', 'false')::boolean = true
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );

create policy "mess_menu_delete_mess_admin" on public.mess_menu
  for delete to authenticated
  using (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'user_metadata' ->> 'is_mess_member', 'false')::boolean = true
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin'
  );


-- ─────────────────────────────────────────────────────────────────────────
-- 3. MESS RATINGS TABLE
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.mess_ratings (
  id uuid primary key default gen_random_uuid(),
  menu_id uuid references public.mess_menu(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  review text default '',
  created_at timestamptz default now(),
  unique(menu_id, student_id)
);

-- RLS
alter table public.mess_ratings enable row level security;

do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'mess_ratings' and schemaname = 'public') loop
    execute format('drop policy %I on public.mess_ratings', pol.policyname);
  end loop;
end $$;

create policy "mess_ratings_select_authenticated" on public.mess_ratings
  for select to authenticated using (true);

create policy "mess_ratings_insert_self" on public.mess_ratings
  for insert to authenticated
  with check (auth.uid() = student_id);

create policy "mess_ratings_update_self" on public.mess_ratings
  for update to authenticated
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);


-- ─────────────────────────────────────────────────────────────────────────
-- 4. ANNOUNCEMENTS TABLE
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  author_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  type text not null default 'announcement' check (type in ('announcement', 'event', 'news')),
  event_date date
);

create index if not exists idx_announcements_created on public.announcements(created_at desc);

-- RLS
alter table public.announcements enable row level security;

do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'announcements' and schemaname = 'public') loop
    execute format('drop policy %I on public.announcements', pol.policyname);
  end loop;
end $$;

create policy "announcements_select_authenticated" on public.announcements
  for select to authenticated using (true);

create policy "announcements_insert_admin_warden" on public.announcements
  for insert to authenticated
  with check (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
  );

create policy "announcements_update_admin_warden" on public.announcements
  for update to authenticated
  using (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
  );

create policy "announcements_delete_admin_warden" on public.announcements
  for delete to authenticated
  using (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
  );


-- ─────────────────────────────────────────────────────────────────────────
-- 5. POLLS TABLE
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.polls (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  expires_at timestamptz,
  is_active boolean default true
);

-- RLS
alter table public.polls enable row level security;

do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'polls' and schemaname = 'public') loop
    execute format('drop policy %I on public.polls', pol.policyname);
  end loop;
end $$;

create policy "polls_select_authenticated" on public.polls
  for select to authenticated using (true);

create policy "polls_insert_admin_warden" on public.polls
  for insert to authenticated
  with check (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
  );

create policy "polls_update_admin_warden" on public.polls
  for update to authenticated
  using (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
  );

create policy "polls_delete_admin" on public.polls
  for delete to authenticated
  using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin'
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') = 'admin');


-- ─────────────────────────────────────────────────────────────────────────
-- 6. POLL OPTIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.polls(id) on delete cascade not null,
  option_text text not null
);

-- RLS
alter table public.poll_options enable row level security;

do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'poll_options' and schemaname = 'public') loop
    execute format('drop policy %I on public.poll_options', pol.policyname);
  end loop;
end $$;

create policy "poll_options_select_authenticated" on public.poll_options
  for select to authenticated using (true);

create policy "poll_options_insert_admin_warden" on public.poll_options
  for insert to authenticated
  with check (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
  );

create policy "poll_options_delete_admin_warden" on public.poll_options
  for delete to authenticated
  using (
    coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
    or coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden')
  );


-- ─────────────────────────────────────────────────────────────────────────
-- 7. POLL VOTES TABLE
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references public.polls(id) on delete cascade not null,
  option_id uuid references public.poll_options(id) on delete cascade not null,
  student_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamptz default now(),
  unique(poll_id, student_id)
);

-- RLS
alter table public.poll_votes enable row level security;

do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'poll_votes' and schemaname = 'public') loop
    execute format('drop policy %I on public.poll_votes', pol.policyname);
  end loop;
end $$;

create policy "poll_votes_select_authenticated" on public.poll_votes
  for select to authenticated using (true);

create policy "poll_votes_insert_self" on public.poll_votes
  for insert to authenticated
  with check (auth.uid() = student_id);


-- ─────────────────────────────────────────────────────────────────────────
-- 8. INDEXES
-- ─────────────────────────────────────────────────────────────────────────

create index if not exists idx_mess_ratings_menu on public.mess_ratings(menu_id);
create index if not exists idx_mess_ratings_student on public.mess_ratings(student_id);
create index if not exists idx_poll_options_poll on public.poll_options(poll_id);
create index if not exists idx_poll_votes_poll on public.poll_votes(poll_id);
create index if not exists idx_poll_votes_student on public.poll_votes(student_id);
create index if not exists idx_profiles_mess_member on public.profiles(is_mess_member) where is_mess_member = true;
