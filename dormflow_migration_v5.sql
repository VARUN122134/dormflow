-- =========================================================================
-- UCE IT v5 Migration — RLS Security Fix + Stock/Wallet + Storage Buckets
-- =========================================================================
-- Run this in your Supabase SQL Editor after dormflow_migration_v4.sql
-- =========================================================================

-- =========================================================================
-- 0. HELPER FUNCTION: Get role from JWT (app_metadata preferred, fallback user_metadata)
-- =========================================================================
create or replace function public.get_jwt_role()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  );
$$;

create or replace function public.get_jwt_is_mess_member()
returns boolean
language sql
stable
as $$
  select coalesce(
    (auth.jwt() -> 'app_metadata' ->> 'is_mess_member')::boolean,
    (auth.jwt() -> 'user_metadata' ->> 'is_mess_member')::boolean,
    false
  );
$$;

-- =========================================================================
-- 1. PROFILES — Add is_approved column (if not exists)
-- =========================================================================
alter table public.profiles
  add column if not exists is_approved boolean default false;

create index if not exists idx_profiles_is_approved on public.profiles(is_approved);
create index if not exists idx_profiles_role on public.profiles(role);

-- =========================================================================
-- 2. FIX ALL RLS POLICIES — Migrate from user_metadata to app_metadata
-- =========================================================================

-- PROFILES TABLE
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'profiles' and schemaname = 'public') loop
    execute format('drop policy %I on public.profiles', pol.policyname);
  end loop;
end $$;

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_update_admin" on public.profiles
  for update to authenticated
  using (public.get_jwt_role() = 'admin');

create policy "profiles_update_wardens" on public.profiles
  for update to authenticated
  using (public.get_jwt_role() in ('boys_warden', 'girls_warden'));

create policy "profiles_update_security" on public.profiles
  for update to authenticated
  using (public.get_jwt_role() = 'security');

-- LEAVES TABLE
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'leaves' and schemaname = 'public') loop
    execute format('drop policy %I on public.leaves', pol.policyname);
  end loop;
end $$;

create policy "leaves_select_self" on public.leaves
  for select to authenticated
  using (auth.uid() = student_id);

create policy "leaves_select_staff" on public.leaves
  for select to authenticated
  using (public.get_jwt_role() in ('boys_warden', 'girls_warden', 'admin', 'security'));

create policy "leaves_insert_self" on public.leaves
  for insert to authenticated
  with check (auth.uid() = student_id);

create policy "leaves_insert_admin" on public.leaves
  for insert to authenticated
  with check (public.get_jwt_role() = 'admin');

create policy "leaves_update_self_pending" on public.leaves
  for update to authenticated
  using (auth.uid() = student_id and approval_status = 'Pending');

create policy "leaves_update_staff" on public.leaves
  for update to authenticated
  using (public.get_jwt_role() in ('boys_warden', 'girls_warden', 'admin'));

-- OUTPASSES TABLE
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'outpasses' and schemaname = 'public') loop
    execute format('drop policy %I on public.outpasses', pol.policyname);
  end loop;
end $$;

create policy "outpasses_select_self" on public.outpasses
  for select to authenticated
  using (auth.uid() = student_id);

create policy "outpasses_select_staff" on public.outpasses
  for select to authenticated
  using (public.get_jwt_role() in ('boys_warden', 'girls_warden', 'admin', 'security'));

create policy "outpasses_insert_staff" on public.outpasses
  for insert to authenticated
  with check (public.get_jwt_role() in ('boys_warden', 'girls_warden', 'admin'));

create policy "outpasses_update_staff" on public.outpasses
  for update to authenticated
  using (public.get_jwt_role() in ('boys_warden', 'girls_warden', 'admin', 'security'));

-- ROOMS TABLE
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'rooms' and schemaname = 'public') loop
    execute format('drop policy %I on public.rooms', pol.policyname);
  end loop;
end $$;

create policy "rooms_select_authenticated" on public.rooms
  for select to authenticated using (true);

create policy "rooms_insert_admin" on public.rooms
  for insert to authenticated
  with check (public.get_jwt_role() = 'admin');

create policy "rooms_update_admin" on public.rooms
  for update to authenticated
  using (public.get_jwt_role() = 'admin');

create policy "rooms_update_wardens" on public.rooms
  for update to authenticated
  using (public.get_jwt_role() in ('boys_warden', 'girls_warden'));

create policy "rooms_delete_admin" on public.rooms
  for delete to authenticated
  using (public.get_jwt_role() = 'admin');

-- ROOM ALLOCATIONS
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'room_allocations' and schemaname = 'public') loop
    execute format('drop policy %I on public.room_allocations', pol.policyname);
  end loop;
end $$;

create policy "room_allocations_select_authenticated" on public.room_allocations
  for select to authenticated using (true);

create policy "room_allocations_insert_admin" on public.room_allocations
  for insert to authenticated
  with check (public.get_jwt_role() = 'admin');

create policy "room_allocations_insert_wardens" on public.room_allocations
  for insert to authenticated
  with check (public.get_jwt_role() in ('boys_warden', 'girls_warden'));

create policy "room_allocations_update_admin" on public.room_allocations
  for update to authenticated
  using (public.get_jwt_role() = 'admin');

create policy "room_allocations_update_wardens" on public.room_allocations
  for update to authenticated
  using (public.get_jwt_role() in ('boys_warden', 'girls_warden'));

-- ROOM MAINTENANCE
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'room_maintenance' and schemaname = 'public') loop
    execute format('drop policy %I on public.room_maintenance', pol.policyname);
  end loop;
end $$;

create policy "room_maintenance_select_authenticated" on public.room_maintenance
  for select to authenticated using (true);

create policy "room_maintenance_insert_students" on public.room_maintenance
  for insert to authenticated
  with check (auth.uid() = student_id);

create policy "room_maintenance_update_admin" on public.room_maintenance
  for update to authenticated
  using (public.get_jwt_role() = 'admin');

create policy "room_maintenance_update_wardens" on public.room_maintenance
  for update to authenticated
  using (public.get_jwt_role() in ('boys_warden', 'girls_warden'));

-- COMPLAINTS
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'complaints' and schemaname = 'public') loop
    execute format('drop policy %I on public.complaints', pol.policyname);
  end loop;
end $$;

create policy "complaints_select_self" on public.complaints
  for select to authenticated
  using (auth.uid() = student_id or public.get_jwt_role() in ('admin', 'boys_warden', 'girls_warden'));

create policy "complaints_insert_students" on public.complaints
  for insert to authenticated
  with check (auth.uid() = student_id);

create policy "complaints_update_admin" on public.complaints
  for update to authenticated
  using (public.get_jwt_role() = 'admin');

create policy "complaints_update_wardens" on public.complaints
  for update to authenticated
  using (public.get_jwt_role() in ('boys_warden', 'girls_warden'));

-- EVENTS
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'events' and schemaname = 'public') loop
    execute format('drop policy %I on public.events', pol.policyname);
  end loop;
end $$;

create policy "events_select_authenticated" on public.events
  for select to authenticated using (true);

create policy "events_insert_admin" on public.events
  for insert to authenticated
  with check (public.get_jwt_role() = 'admin');

create policy "events_insert_wardens" on public.events
  for insert to authenticated
  with check (public.get_jwt_role() in ('boys_warden', 'girls_warden'));

create policy "events_delete_admin" on public.events
  for delete to authenticated
  using (public.get_jwt_role() = 'admin');

-- EVENT ATTENDANCE
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'event_attendance' and schemaname = 'public') loop
    execute format('drop policy %I on public.event_attendance', pol.policyname);
  end loop;
end $$;

create policy "event_attendance_select_authenticated" on public.event_attendance
  for select to authenticated using (true);

create policy "event_attendance_insert_staff" on public.event_attendance
  for insert to authenticated
  with check (public.get_jwt_role() in ('admin', 'boys_warden', 'girls_warden'));

-- MESS MENU
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'mess_menu' and schemaname = 'public') loop
    execute format('drop policy %I on public.mess_menu', pol.policyname);
  end loop;
end $$;

create policy "mess_menu_select_authenticated" on public.mess_menu
  for select to authenticated using (true);

create policy "mess_menu_insert_staff" on public.mess_menu
  for insert to authenticated
  with check (
    public.get_jwt_role() = 'admin'
    or public.get_jwt_is_mess_member() = true
  );

create policy "mess_menu_update_staff" on public.mess_menu
  for update to authenticated
  using (
    public.get_jwt_role() = 'admin'
    or public.get_jwt_is_mess_member() = true
  );

create policy "mess_menu_delete_staff" on public.mess_menu
  for delete to authenticated
  using (
    public.get_jwt_role() = 'admin'
    or public.get_jwt_is_mess_member() = true
  );

-- ANNOUNCEMENTS
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'announcements' and schemaname = 'public') loop
    execute format('drop policy %I on public.announcements', pol.policyname);
  end loop;
end $$;

create policy "announcements_select_authenticated" on public.announcements
  for select to authenticated using (true);

create policy "announcements_insert_staff" on public.announcements
  for insert to authenticated
  with check (public.get_jwt_role() in ('admin', 'boys_warden', 'girls_warden'));

create policy "announcements_update_staff" on public.announcements
  for update to authenticated
  using (public.get_jwt_role() in ('admin', 'boys_warden', 'girls_warden'));

create policy "announcements_delete_staff" on public.announcements
  for delete to authenticated
  using (public.get_jwt_role() in ('admin', 'boys_warden', 'girls_warden'));

-- POLLS
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'polls' and schemaname = 'public') loop
    execute format('drop policy %I on public.polls', pol.policyname);
  end loop;
end $$;

create policy "polls_select_authenticated" on public.polls
  for select to authenticated using (true);

create policy "polls_insert_staff" on public.polls
  for insert to authenticated
  with check (public.get_jwt_role() in ('admin', 'boys_warden', 'girls_warden'));

create policy "polls_update_staff" on public.polls
  for update to authenticated
  using (public.get_jwt_role() in ('admin', 'boys_warden', 'girls_warden'));

create policy "polls_delete_admin" on public.polls
  for delete to authenticated
  using (public.get_jwt_role() = 'admin');

-- POLL OPTIONS
do $$
declare pol record;
begin
  for pol in (select policyname from pg_policies where tablename = 'poll_options' and schemaname = 'public') loop
    execute format('drop policy %I on public.poll_options', pol.policyname);
  end loop;
end $$;

create policy "poll_options_select_authenticated" on public.poll_options
  for select to authenticated using (true);

create policy "poll_options_insert_staff" on public.poll_options
  for insert to authenticated
  with check (public.get_jwt_role() in ('admin', 'boys_warden', 'girls_warden'));

create policy "poll_options_delete_staff" on public.poll_options
  for delete to authenticated
  using (public.get_jwt_role() in ('admin', 'boys_warden', 'girls_warden'));

-- =========================================================================
-- 3. STORAGE BUCKETS & POLICIES
-- =========================================================================

-- Avatars bucket
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'avatars_select' and schemaname = 'storage') then
    create policy "avatars_select" on storage.objects
      for select to authenticated
      using (bucket_id = 'avatars');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'avatars_insert' and schemaname = 'storage') then
    create policy "avatars_insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'avatars');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'avatars_update' and schemaname = 'storage') then
    create policy "avatars_update" on storage.objects
      for update to authenticated
      using (bucket_id = 'avatars');
  end if;
end $$;

-- Attendance snapshots bucket
insert into storage.buckets (id, name, public)
values ('attendance-snapshots', 'attendance-snapshots', true)
on conflict (id) do nothing;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'attendance_snapshots_select' and schemaname = 'storage') then
    create policy "attendance_snapshots_select" on storage.objects
      for select to authenticated
      using (bucket_id = 'attendance-snapshots');
  end if;
  if not exists (select 1 from pg_policies where tablename = 'objects' and policyname = 'attendance_snapshots_insert' and schemaname = 'storage') then
    create policy "attendance_snapshots_insert" on storage.objects
      for insert to authenticated
      with check (bucket_id = 'attendance-snapshots');
  end if;
end $$;

-- =========================================================================
-- 4. UPDATE AUTO-PROFILE TRIGGER — Use app_metadata
-- =========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  meta jsonb := new.raw_user_meta_data;
begin
  insert into public.profiles (
    id, email, name, role, gender, hostel_type, department, year,
    room_number, block_name, phone, guardian_name, guardian_phone,
    active_status, is_approved
  )
  values (
    new.id,
    new.email,
    coalesce(meta ->> 'name', ''),
    coalesce(meta ->> 'role', 'student'),
    coalesce(meta ->> 'gender', ''),
    coalesce(meta ->> 'hostel_type', ''),
    coalesce(meta ->> 'department', ''),
    coalesce(meta ->> 'year', ''),
    coalesce(meta ->> 'room_number', ''),
    coalesce(meta ->> 'block_name', ''),
    coalesce(meta ->> 'phone', ''),
    coalesce(meta ->> 'guardian_name', ''),
    coalesce(meta ->> 'guardian_phone', ''),
    'IN',
    false
  );

  -- Sync role into app_metadata for RLS
  update auth.users
  set raw_app_meta_data = jsonb_set(
    coalesce(raw_app_meta_data, '{}'),
    '{role}',
    to_jsonb(coalesce(meta ->> 'role', 'student'))
  )
  where id = new.id;

  return new;
end;
$$;

-- Backfill app_metadata for existing users
update auth.users u
set raw_app_meta_data = jsonb_set(
  coalesce(raw_app_meta_data, '{}'),
  '{role}',
  to_jsonb(coalesce(p.role, 'student'))
)
from public.profiles p
where u.id = p.id
  and (
    raw_app_meta_data is null
    or raw_app_meta_data ->> 'role' is null
    or raw_app_meta_data ->> 'role' != p.role
  );

-- =========================================================================
-- 5. ADDITIONAL INDEXES
-- =========================================================================
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_hostel_role on public.profiles(hostel_type, role);
create index if not exists idx_leaves_student on public.leaves(student_id);
create index if not exists idx_leaves_status on public.leaves(approval_status);
create index if not exists idx_leaves_warden on public.leaves(approved_by);
create index if not exists idx_outpasses_student on public.outpasses(student_id);
create index if not exists idx_outpasses_status on public.outpasses(status);
create index if not exists idx_outpasses_leave on public.outpasses(leave_id);

-- Enable Realtime for key tables
alter publication supabase_realtime add table if not exists public.notifications;
alter publication supabase_realtime add table if not exists public.announcements;
alter publication supabase_realtime add table if not exists public.mess_menu;
alter publication supabase_realtime add table if not exists public.mess_ratings;
alter publication supabase_realtime add table if not exists public.leaves;
alter publication supabase_realtime add table if not exists public.outpasses;
alter publication supabase_realtime add table if not exists public.profiles;
