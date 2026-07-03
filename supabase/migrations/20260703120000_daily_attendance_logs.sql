create table if not exists public.daily_attendance_logs (
    id            uuid primary key default gen_random_uuid(),
    hostel_type   text not null,
    snapshot_date date not null default current_date,
    csv_content   text not null,
    total_count   int default 0,
    present_count int default 0,
    absent_count  int default 0,
    generated_by  uuid references public.profiles(id) on delete set null,
    generated_at  timestamptz default now()
);

alter table public.daily_attendance_logs enable row level security;

create policy "Allow select daily_attendance_logs for authenticated"
  on public.daily_attendance_logs for select to authenticated using (true);

create policy "Allow insert daily_attendance_logs for warden/admin"
  on public.daily_attendance_logs for insert to authenticated
  with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden'));

create index if not exists idx_daily_attendance_date on public.daily_attendance_logs(snapshot_date);
