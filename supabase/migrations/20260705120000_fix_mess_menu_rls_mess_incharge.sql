-- Fix mess_menu RLS policies to allow mess_incharge role
-- Before: only admin or is_mess_member=true could insert/update/delete
-- After: mess_incharge also has full access (same as admin)

-- Backup of current policies before changing
-- Current insert policy: (select role from public.profiles where id = auth.uid()) = 'admin' OR (select is_mess_member from public.profiles where id = auth.uid()) = true
-- Current update policy: (select role from public.profiles where id = auth.uid()) = 'admin' OR (select is_mess_member from public.profiles where id = auth.uid()) = true
-- Current delete policy: (select role from public.profiles where id = auth.uid()) = 'admin' OR (select is_mess_member from public.profiles where id = auth.uid()) = true

drop policy if exists "mess_menu_insert_mess_admin" on public.mess_menu;
create policy "mess_menu_insert_mess_admin" on public.mess_menu
  for insert to authenticated
  with check (
    (select role from public.profiles where id = auth.uid()) = any(array['admin', 'mess_incharge'])
    or
    (select is_mess_member from public.profiles where id = auth.uid()) = true
  );

drop policy if exists "mess_menu_update_mess_admin" on public.mess_menu;
create policy "mess_menu_update_mess_admin" on public.mess_menu
  for update to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = any(array['admin', 'mess_incharge'])
    or
    (select is_mess_member from public.profiles where id = auth.uid()) = true
  );

drop policy if exists "mess_menu_delete_mess_admin" on public.mess_menu;
create policy "mess_menu_delete_mess_admin" on public.mess_menu
  for delete to authenticated
  using (
    (select role from public.profiles where id = auth.uid()) = any(array['admin', 'mess_incharge'])
    or
    (select is_mess_member from public.profiles where id = auth.uid()) = true
  );
