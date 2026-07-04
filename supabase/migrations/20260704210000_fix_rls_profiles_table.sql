-- Fix all mess RLS policies to check profiles table instead of JWT metadata
-- JWT metadata is set at login and never refreshed when role changes in profiles table

-- Helper: check if user's profile role is in the allowed list
-- Usage: (select role from profiles where id = auth.uid()) = any(array['admin','mess_incharge'])

-- MESS STOCK ITEMS
drop policy if exists "Allow insert mess_stock_items for mess_incharge" on public.mess_stock_items;
create policy "Allow insert mess_stock_items for mess_incharge" on public.mess_stock_items
  for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = any(array['admin', 'mess_incharge']));

drop policy if exists "Allow update mess_stock_items for mess_incharge" on public.mess_stock_items;
create policy "Allow update mess_stock_items for mess_incharge" on public.mess_stock_items
  for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) = any(array['admin', 'mess_incharge']));

-- MESS STOCK PURCHASES
drop policy if exists "Allow insert mess_stock_purchases for mess_incharge" on public.mess_stock_purchases;
create policy "Allow insert mess_stock_purchases for mess_incharge" on public.mess_stock_purchases
  for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = any(array['admin', 'mess_incharge']));

-- MESS DAILY USAGE
drop policy if exists "Allow insert mess_daily_usage for mess_incharge" on public.mess_daily_usage;
create policy "Allow insert mess_daily_usage for mess_incharge" on public.mess_daily_usage
  for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = any(array['admin', 'mess_incharge']));

-- MESS DAILY USAGE ITEMS
drop policy if exists "Allow insert mess_daily_usage_items for mess_incharge" on public.mess_daily_usage_items;
create policy "Allow insert mess_daily_usage_items for mess_incharge" on public.mess_daily_usage_items
  for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = any(array['admin', 'mess_incharge']));

-- MESS WALLETS
drop policy if exists "Allow insert mess_wallets for admin" on public.mess_wallets;
create policy "Allow insert mess_wallets for admin" on public.mess_wallets
  for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = any(array['admin', 'mess_incharge']));

drop policy if exists "Allow update mess_wallets for mess_incharge" on public.mess_wallets;
create policy "Allow update mess_wallets for mess_incharge" on public.mess_wallets
  for update to authenticated
  using ((select role from public.profiles where id = auth.uid()) = any(array['admin', 'mess_incharge']));

-- MESS WALLET TRANSACTIONS
drop policy if exists "Allow insert mess_wallet_transactions for mess_incharge" on public.mess_wallet_transactions;
create policy "Allow insert mess_wallet_transactions for mess_incharge" on public.mess_wallet_transactions
  for insert to authenticated
  with check ((select role from public.profiles where id = auth.uid()) = any(array['admin', 'mess_incharge']));
