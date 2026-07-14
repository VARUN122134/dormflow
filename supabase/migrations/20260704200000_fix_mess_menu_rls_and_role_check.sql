-- Fix mess_menu RLS: check profiles table instead of JWT metadata
-- The existing policy checks auth.jwt() for is_mess_member which never exists in JWT

drop policy if exists "mess_menu_insert_mess_admin" on public.mess_menu;
create policy "mess_menu_insert_mess_admin" on public.mess_menu
  for insert to authenticated
  with check (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    or
    (select is_mess_member from public.profiles where id = auth.uid()) = true
  );

drop policy if exists "mess_menu_update_mess_admin" on public.mess_menu;
create policy "mess_menu_update_mess_admin" on public.mess_menu
  for update to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    or
    (select is_mess_member from public.profiles where id = auth.uid()) = true
  );

drop policy if exists "mess_menu_delete_mess_admin" on public.mess_menu;
create policy "mess_menu_delete_mess_admin" on public.mess_menu
  for delete to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = 'admin'
    or
    (select is_mess_member from public.profiles where id = auth.uid()) = true
  );

-- Fix profiles role CHECK constraint to include mess_incharge
-- Supabase may have auto-generated a constraint that doesn't include mess_incharge
do $$
begin
  -- Drop existing check constraint if it exists
  if exists (
    select 1 from pg_constraint
    where conname = 'profiles_role_check'
    and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles drop constraint profiles_role_check;
  end if;

  -- Add new check constraint with mess_incharge included
  alter table public.profiles add constraint profiles_role_check
    check (role = any (array['student', 'boys_caretaker', 'girls_caretaker', 'security', 'admin', 'mess_incharge']));
end $$;
