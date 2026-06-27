-- =========================================================================
-- DormFlow — Supabase Row Level Security (RLS) Configuration
-- Run this script in your Supabase SQL Editor to resolve policy recursion
-- issues and ensure correct, secure access control.
-- =========================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. PROFILES Table Policies
-- ─────────────────────────────────────────────────────────────────────────

-- Dynamically drop all existing policies on 'profiles' to avoid conflicts
do $$
declare
    pol record;
begin
    for pol in (select policyname from pg_policies where tablename = 'profiles' and schemaname = 'public') loop
        execute format('drop policy %I on public.profiles', pol.policyname);
    end loop;
end $$;

alter table public.profiles enable row level security;

-- SELECT: All logged-in users can view profiles (required for dashboards, directory, and lookups)
create policy "Allow select for authenticated"
on public.profiles
for select
to authenticated
using (true);

-- INSERT: Users can insert their own profile row upon registering
create policy "Allow insert for self"
on public.profiles
for insert
with check (auth.uid() = id);

-- UPDATE: Users can update their own profile, and staff can update statuses/records
create policy "Allow update for self"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Allow update for admin"
on public.profiles
for update
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

create policy "Allow update for wardens"
on public.profiles
for update
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('boys_warden', 'girls_warden'));

create policy "Allow update for security"
on public.profiles
for update
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'security');


-- ─────────────────────────────────────────────────────────────────────────
-- 2. LEAVES Table Policies
-- ─────────────────────────────────────────────────────────────────────────

-- Dynamically drop all existing policies on 'leaves' to avoid conflicts
do $$
declare
    pol record;
begin
    for pol in (select policyname from pg_policies where tablename = 'leaves' and schemaname = 'public') loop
        execute format('drop policy %I on public.leaves', pol.policyname);
    end loop;
end $$;

alter table public.leaves enable row level security;

-- SELECT: Students can view their own leaves, staff can view leaves
create policy "Allow select leaves for self"
on public.leaves
for select
using (auth.uid() = student_id);

create policy "Allow select leaves for staff"
on public.leaves
for select
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('boys_warden', 'girls_warden', 'admin', 'security'));

-- INSERT: Students can request leave, admin can insert requests
create policy "Allow insert leaves for self"
on public.leaves
for insert
with check (auth.uid() = student_id);

create policy "Allow insert leaves for admin"
on public.leaves
for insert
with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

-- UPDATE: Students can modify pending requests, wardens/admin can approve/reject
create policy "Allow update leaves for self_pending"
on public.leaves
for update
using (auth.uid() = student_id and approval_status = 'Pending');

create policy "Allow update leaves for staff"
on public.leaves
for update
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('boys_warden', 'girls_warden', 'admin'));


-- ─────────────────────────────────────────────────────────────────────────
-- 3. OUTPASSES Table Policies
-- ─────────────────────────────────────────────────────────────────────────

-- Dynamically drop all existing policies on 'outpasses' to avoid conflicts
do $$
declare
    pol record;
begin
    for pol in (select policyname from pg_policies where tablename = 'outpasses' and schemaname = 'public') loop
        execute format('drop policy %I on public.outpasses', pol.policyname);
    end loop;
end $$;

alter table public.outpasses enable row level security;

-- SELECT: Students can view their own outpasses, staff can view all outpasses
create policy "Allow select outpasses for self"
on public.outpasses
for select
using (auth.uid() = student_id);

create policy "Allow select outpasses for staff"
on public.outpasses
for select
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('boys_warden', 'girls_warden', 'admin', 'security'));

-- INSERT: Wardens and admins can generate outpasses
create policy "Allow insert outpasses for staff"
on public.outpasses
for insert
with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('boys_warden', 'girls_warden', 'admin'));

-- UPDATE: Staff can scan/modify outpasses (check-in/check-out)
create policy "Allow update outpasses for staff"
on public.outpasses
for update
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('boys_warden', 'girls_warden', 'admin', 'security'));


-- ─────────────────────────────────────────────────────────────────────────
-- 4. Automatic User Profile Creation Trigger
-- ─────────────────────────────────────────────────────────────────────────

-- Create a trigger function that automatically copies new user metadata to public.profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    name,
    role,
    gender,
    hostel_type,
    department,
    year,
    room_number,
    block_name,
    phone,
    guardian_name,
    guardian_phone,
    active_status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    coalesce(new.raw_user_meta_data ->> 'gender', ''),
    coalesce(new.raw_user_meta_data ->> 'hostel_type', ''),
    coalesce(new.raw_user_meta_data ->> 'department', ''),
    coalesce(new.raw_user_meta_data ->> 'year', ''),
    coalesce(new.raw_user_meta_data ->> 'room_number', ''),
    coalesce(new.raw_user_meta_data ->> 'block_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'guardian_name', ''),
    coalesce(new.raw_user_meta_data ->> 'guardian_phone', ''),
    'IN'
  );
  return new;
end;
$$;

-- Ensure trigger exists
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

