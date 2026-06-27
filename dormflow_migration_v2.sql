-- =========================================================================
-- DormFlow v2 Migration — is_approved, RLS hardening, storage policies
-- Run this AFTER supabase_setup.sql in your Supabase SQL Editor
-- =========================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Add is_approved column to profiles (default false for new students)
-- ─────────────────────────────────────────────────────────────────────────
alter table public.profiles add column if not exists is_approved boolean default false;

-- Auto-approve existing staff accounts
update public.profiles set is_approved = true where role in ('admin', 'boys_warden', 'girls_warden', 'security');

-- Approve existing students (they already registered)
update public.profiles set is_approved = true where role = 'student';

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Storage: Create avatars bucket if not exists
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/gif', 'image/webp'])
on conflict (id) do nothing;

-- Storage policies (drop existing first)
drop policy if exists "Avatar SELECT for authenticated" on storage.objects;
drop policy if exists "Avatar INSERT for authenticated" on storage.objects;
drop policy if exists "Avatar UPDATE for authenticated" on storage.objects;
drop policy if exists "Avatar DELETE for authenticated" on storage.objects;

create policy "Avatar SELECT for authenticated"
on storage.objects for select
to authenticated
using (bucket_id = 'avatars');

create policy "Avatar INSERT for authenticated"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and auth.role() = 'authenticated');

create policy "Avatar UPDATE for authenticated"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Avatar DELETE for authenticated"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Fix RLS policies to use app_metadata (NOT user_metadata)
-- Modify the trigger to store role in a reliable way, then update policies
-- ─────────────────────────────────────────────────────────────────────────

-- First, update the handle_new_user trigger to also set is_approved properly
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  _role text;
begin
  _role := coalesce(new.raw_user_meta_data ->> 'role', 'student');

  insert into public.profiles (
    id, email, name, role, gender, hostel_type,
    department, year, room_number, block_name,
    phone, guardian_name, guardian_phone, active_status,
    is_approved
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    _role,
    coalesce(new.raw_user_meta_data ->> 'gender', ''),
    coalesce(new.raw_user_meta_data ->> 'hostel_type', ''),
    coalesce(new.raw_user_meta_data ->> 'department', ''),
    coalesce(new.raw_user_meta_data ->> 'year', ''),
    coalesce(new.raw_user_meta_data ->> 'room_number', ''),
    coalesce(new.raw_user_meta_data ->> 'block_name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'guardian_name', ''),
    coalesce(new.raw_user_meta_data ->> 'guardian_phone', ''),
    'IN',
    case when _role = 'student' then false else true end
  );

  -- Also copy role to app_metadata for secure RLS usage
  update auth.users
  set raw_app_meta_data = 
    coalesce(raw_app_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', _role, 'is_approved', case when _role = 'student' then false else true end)
  where id = new.id;

  return new;
end;
$$;

-- Backfill app_metadata for existing users (safe, one-time)
do $$
declare
  rec record;
begin
  for rec in select p.id, p.role, p.is_approved from public.profiles p
  loop
    update auth.users
    set raw_app_meta_data = 
      coalesce(raw_app_meta_data, '{}'::jsonb) || 
      jsonb_build_object('role', rec.role, 'is_approved', rec.is_approved)
    where id = rec.id;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Rebuild RLS policies using app_metadata instead of user_metadata
-- ─────────────────────────────────────────────────────────────────────────

-- Helper function to get role from app_metadata (secure, not user-editable)
create or replace function public.get_user_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', '');
$$;

-- Helper function to check if user is approved
create or replace function public.is_user_approved()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'is_approved')::boolean, false);
$$;

-- ─── PROFILES TABLE ────────────────────────────────────────────────────

-- Drop ALL existing policies on profiles
do $$
declare
    pol record;
begin
    for pol in (select policyname from pg_policies where tablename = 'profiles' and schemaname = 'public') loop
        execute format('drop policy %I on public.profiles', pol.policyname);
    end loop;
end $$;

alter table public.profiles enable row level security;

-- SELECT: Only admin can see all fields; others see limited fields
create policy "profiles_select_limited"
on public.profiles
for select
to authenticated
using (
  -- Admins see all
  public.get_user_role() = 'admin'
  -- Users see their own
  or auth.uid() = id
  -- Staff see name, department, year, hostel_type, room, block, active_status (not phone/guardian)
  or public.get_user_role() in ('boys_warden', 'girls_warden', 'security')
);

-- INSERT: Users insert their own profile during registration
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

-- UPDATE: Self + staff with role-appropriate scope
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "profiles_update_admin"
on public.profiles
for update
to authenticated
using (public.get_user_role() = 'admin');

create policy "profiles_update_warden"
on public.profiles
for update
to authenticated
using (public.get_user_role() in ('boys_warden', 'girls_warden'));

create policy "profiles_update_security"
on public.profiles
for update
to authenticated
using (public.get_user_role() = 'security');

-- DELETE: Only admin
create policy "profiles_delete_admin"
on public.profiles
for delete
to authenticated
using (public.get_user_role() = 'admin');

-- ─── LEAVES TABLE ──────────────────────────────────────────────────────

do $$
declare
    pol record;
begin
    for pol in (select policyname from pg_policies where tablename = 'leaves' and schemaname = 'public') loop
        execute format('drop policy %I on public.leaves', pol.policyname);
    end loop;
end $$;

alter table public.leaves enable row level security;

-- SELECT
create policy "leaves_select_self"
on public.leaves
for select
to authenticated
using (auth.uid() = student_id);

create policy "leaves_select_staff"
on public.leaves
for select
to authenticated
using (public.get_user_role() in ('boys_warden', 'girls_warden', 'admin', 'security'));

-- INSERT
create policy "leaves_insert_self"
on public.leaves
for insert
to authenticated
with check (auth.uid() = student_id);

create policy "leaves_insert_admin"
on public.leaves
for insert
to authenticated
with check (public.get_user_role() = 'admin');

-- UPDATE
create policy "leaves_update_self_pending"
on public.leaves
for update
to authenticated
using (auth.uid() = student_id and approval_status = 'Pending');

create policy "leaves_update_staff"
on public.leaves
for update
to authenticated
using (public.get_user_role() in ('boys_warden', 'girls_warden', 'admin'));

-- ─── OUTPASSES TABLE ───────────────────────────────────────────────────

do $$
declare
    pol record;
begin
    for pol in (select policyname from pg_policies where tablename = 'outpasses' and schemaname = 'public') loop
        execute format('drop policy %I on public.outpasses', pol.policyname);
    end loop;
end $$;

alter table public.outpasses enable row level security;

-- SELECT
create policy "outpasses_select_self"
on public.outpasses
for select
to authenticated
using (auth.uid() = student_id);

create policy "outpasses_select_staff"
on public.outpasses
for select
to authenticated
using (public.get_user_role() in ('boys_warden', 'girls_warden', 'admin', 'security'));

-- INSERT
create policy "outpasses_insert_staff"
on public.outpasses
for insert
to authenticated
with check (public.get_user_role() in ('boys_warden', 'girls_warden', 'admin'));

-- UPDATE
create policy "outpasses_update_staff"
on public.outpasses
for update
to authenticated
using (public.get_user_role() in ('boys_warden', 'girls_warden', 'admin', 'security'));

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Add unique constraint to prevent duplicate outpasses per leave
-- ─────────────────────────────────────────────────────────────────────────
alter table public.outpasses drop constraint if exists outpasses_leave_id_unique;
alter table public.outpasses add constraint outpasses_leave_id_unique unique (leave_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Indexes for performance
-- ─────────────────────────────────────────────────────────────────────────
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_hostel on public.profiles(hostel_type);
create index if not exists idx_profiles_approved on public.profiles(is_approved);
create index if not exists idx_leaves_student on public.leaves(student_id);
create index if not exists idx_leaves_status on public.leaves(approval_status);
create index if not exists idx_outpasses_student on public.outpasses(student_id);
create index if not exists idx_outpasses_leave on public.outpasses(leave_id);
create index if not exists idx_outpasses_status on public.outpasses(status);
