-- Mess Wallet & Stock Management System
-- Tables for tracking stock, daily bills, student wallets

-- Stock Items Catalog
create table if not exists public.mess_stock_items (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    category    text not null check (category in ('daily', 'weekly', 'bulk')),
    unit        text not null,
    created_at  timestamptz default now()
);
alter table public.mess_stock_items enable row level security;
drop policy if exists "Allow select mess_stock_items for authenticated" on public.mess_stock_items;
create policy "Allow select mess_stock_items for authenticated" on public.mess_stock_items for select to authenticated using (true);
drop policy if exists "Allow insert mess_stock_items for mess_incharge" on public.mess_stock_items;
create policy "Allow insert mess_stock_items for mess_incharge" on public.mess_stock_items for insert to authenticated with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'mess_incharge'));
drop policy if exists "Allow update mess_stock_items for mess_incharge" on public.mess_stock_items;
create policy "Allow update mess_stock_items for mess_incharge" on public.mess_stock_items for update to authenticated using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'mess_incharge'));

-- Stock Purchases (every refill recorded)
create table if not exists public.mess_stock_purchases (
    id              uuid primary key default gen_random_uuid(),
    item_id         uuid references public.mess_stock_items(id) on delete cascade not null,
    quantity        decimal not null,
    unit_price      decimal not null,
    total_cost      decimal not null,
    purchased_date  date not null default current_date,
    purchased_by    uuid references public.profiles(id) on delete set null,
    notes           text default '',
    created_at      timestamptz default now()
);
alter table public.mess_stock_purchases enable row level security;
drop policy if exists "Allow select mess_stock_purchases for authenticated" on public.mess_stock_purchases;
create policy "Allow select mess_stock_purchases for authenticated" on public.mess_stock_purchases for select to authenticated using (true);
drop policy if exists "Allow insert mess_stock_purchases for mess_incharge" on public.mess_stock_purchases;
create policy "Allow insert mess_stock_purchases for mess_incharge" on public.mess_stock_purchases for insert to authenticated with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'mess_incharge'));

-- Daily Stock Usage
create table if not exists public.mess_daily_usage (
    id          uuid primary key default gen_random_uuid(),
    usage_date  date not null default current_date unique,
    created_at  timestamptz default now()
);
alter table public.mess_daily_usage enable row level security;
drop policy if exists "Allow select mess_daily_usage for authenticated" on public.mess_daily_usage;
create policy "Allow select mess_daily_usage for authenticated" on public.mess_daily_usage for select to authenticated using (true);
drop policy if exists "Allow insert mess_daily_usage for mess_incharge" on public.mess_daily_usage;
create policy "Allow insert mess_daily_usage for mess_incharge" on public.mess_daily_usage for insert to authenticated with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'mess_incharge'));

create table if not exists public.mess_daily_usage_items (
    id              uuid primary key default gen_random_uuid(),
    usage_id        uuid references public.mess_daily_usage(id) on delete cascade not null,
    item_id         uuid references public.mess_stock_items(id) on delete cascade not null,
    quantity_used   decimal not null,
    created_at      timestamptz default now()
);
alter table public.mess_daily_usage_items enable row level security;
drop policy if exists "Allow select mess_daily_usage_items for authenticated" on public.mess_daily_usage_items;
create policy "Allow select mess_daily_usage_items for authenticated" on public.mess_daily_usage_items for select to authenticated using (true);
drop policy if exists "Allow insert mess_daily_usage_items for mess_incharge" on public.mess_daily_usage_items;
create policy "Allow insert mess_daily_usage_items for mess_incharge" on public.mess_daily_usage_items for insert to authenticated with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'mess_incharge'));

-- Daily Mess Bills
create table if not exists public.mess_daily_bills (
    id                  uuid primary key default gen_random_uuid(),
    bill_date           date not null default current_date unique,
    total_stock_cost    decimal not null,
    total_students      int not null,
    per_student_cost    decimal not null,
    calculated_at       timestamptz default now(),
    calculated_by       uuid references public.profiles(id) on delete set null
);
alter table public.mess_daily_bills enable row level security;
drop policy if exists "Allow select mess_daily_bills for authenticated" on public.mess_daily_bills;
create policy "Allow select mess_daily_bills for authenticated" on public.mess_daily_bills for select to authenticated using (true);

-- Student Wallets
create table if not exists public.mess_wallets (
    id                      uuid primary key default gen_random_uuid(),
    student_id              uuid references public.profiles(id) on delete cascade unique not null,
    balance                 decimal not null default 0,
    total_deposited         decimal not null default 0,
    semester                int default 1,
    academic_year           text default '',
    minimum_balance_alert   decimal not null default 500,
    updated_at              timestamptz default now()
);
alter table public.mess_wallets enable row level security;
drop policy if exists "Allow select mess_wallets for authenticated" on public.mess_wallets;
create policy "Allow select mess_wallets for authenticated" on public.mess_wallets for select to authenticated using (true);
drop policy if exists "Allow insert mess_wallets for admin" on public.mess_wallets;
create policy "Allow insert mess_wallets for admin" on public.mess_wallets for insert to authenticated with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'mess_incharge'));
drop policy if exists "Allow update mess_wallets for mess_incharge" on public.mess_wallets;
create policy "Allow update mess_wallets for mess_incharge" on public.mess_wallets for update to authenticated using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'mess_incharge'));

-- Wallet Transactions
create table if not exists public.mess_wallet_transactions (
    id              uuid primary key default gen_random_uuid(),
    student_id      uuid references public.profiles(id) on delete cascade not null,
    type            text not null check (type in ('deposit', 'deduction', 'refund')),
    amount          decimal not null,
    balance_before  decimal not null,
    balance_after   decimal not null,
    bill_id         uuid references public.mess_daily_bills(id) on delete set null,
    description     text default '',
    transaction_date date not null default current_date,
    created_at      timestamptz default now()
);
alter table public.mess_wallet_transactions enable row level security;
drop policy if exists "Allow select mess_wallet_transactions for authenticated" on public.mess_wallet_transactions;
create policy "Allow select mess_wallet_transactions for authenticated" on public.mess_wallet_transactions for select to authenticated using (true);
drop policy if exists "Allow insert mess_wallet_transactions for mess_incharge" on public.mess_wallet_transactions;
create policy "Allow insert mess_wallet_transactions for mess_incharge" on public.mess_wallet_transactions for insert to authenticated with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'mess_incharge'));
