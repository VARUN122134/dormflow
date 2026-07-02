-- =========================================================================
-- DormFlow v4 — Room Management, Complaints, Attendance, Notifications, Export
-- =========================================================================

-- ─────────────────────────────────────────────────────────────────────────
-- 1. ROOMS TABLE
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.rooms (
    id           uuid primary key default gen_random_uuid(),
    block_name   text not null,
    floor        integer not null,
    room_number  text not null,
    capacity     integer not null default 2,
    room_type    text not null default 'shared' check (room_type in ('single', 'shared')),
    status       text not null default 'available' check (status in ('available', 'occupied', 'maintenance', 'unavailable')),
    gender_type  text not null default 'Boys' check (gender_type in ('Boys', 'Girls')),
    created_at   timestamptz default now(),
    updated_at   timestamptz default now(),
    unique(block_name, room_number)
);

alter table public.rooms enable row level security;

create policy "Allow select rooms for authenticated"
on public.rooms for select to authenticated using (true);

create policy "Allow insert rooms for admin"
on public.rooms for insert to authenticated
with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

create policy "Allow update rooms for admin"
on public.rooms for update to authenticated
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

create policy "Allow update rooms for wardens"
on public.rooms for update to authenticated
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('boys_warden', 'girls_warden'));

create policy "Allow delete rooms for admin"
on public.rooms for delete to authenticated
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

-- ─────────────────────────────────────────────────────────────────────────
-- 2. ROOM ALLOCATIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.room_allocations (
    id            uuid primary key default gen_random_uuid(),
    room_id       uuid references public.rooms(id) on delete cascade not null,
    student_id    uuid references public.profiles(id) on delete cascade not null,
    allocated_at  timestamptz default now(),
    vacated_at    timestamptz,
    is_current    boolean default true,
    approved_by   uuid references public.profiles(id) on delete set null,
    unique(room_id, student_id, is_current)
);

alter table public.room_allocations enable row level security;

create policy "Allow select room_allocations for authenticated"
on public.room_allocations for select to authenticated using (true);

create policy "Allow insert room_allocations for admin"
on public.room_allocations for insert to authenticated
with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

create policy "Allow insert room_allocations for wardens"
on public.room_allocations for insert to authenticated
with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('boys_warden', 'girls_warden'));

create policy "Allow update room_allocations for admin"
on public.room_allocations for update to authenticated
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

create policy "Allow update room_allocations for wardens"
on public.room_allocations for update to authenticated
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('boys_warden', 'girls_warden'));

-- ─────────────────────────────────────────────────────────────────────────
-- 3. ROOM MAINTENANCE TABLE
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.room_maintenance (
    id              uuid primary key default gen_random_uuid(),
    room_id         uuid references public.rooms(id) on delete cascade not null,
    student_id      uuid references public.profiles(id) on delete cascade,
    issue_type      text not null default 'other' check (issue_type in ('plumbing', 'electrical', 'furniture', 'cleaning', 'pest_control', 'other')),
    description     text not null,
    status          text not null default 'pending' check (status in ('pending', 'acknowledged', 'in_progress', 'resolved', 'closed')),
    priority        text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
    assigned_to     uuid references public.profiles(id) on delete set null,
    resolved_at     timestamptz,
    resolution_note text default '',
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

alter table public.room_maintenance enable row level security;

create policy "Allow select room_maintenance for authenticated"
on public.room_maintenance for select to authenticated using (true);

create policy "Allow insert room_maintenance for students"
on public.room_maintenance for insert to authenticated
with check (auth.uid() = student_id);

create policy "Allow update room_maintenance for admin"
on public.room_maintenance for update to authenticated
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

create policy "Allow update room_maintenance for wardens"
on public.room_maintenance for update to authenticated
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('boys_warden', 'girls_warden'));

-- ─────────────────────────────────────────────────────────────────────────
-- 4. COMPLAINTS TABLE
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.complaints (
    id              uuid primary key default gen_random_uuid(),
    student_id      uuid references public.profiles(id) on delete cascade not null,
    category        text not null default 'other' check (category in ('infrastructure', 'hygiene', 'food', 'security', 'staff', 'other')),
    subject         text not null,
    description     text not null,
    is_anonymous    boolean default false,
    status          text not null default 'pending' check (status in ('pending', 'acknowledged', 'in_progress', 'resolved', 'closed')),
    priority        text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
    assigned_to     uuid references public.profiles(id) on delete set null,
    admin_response  text default '',
    resolved_at     timestamptz,
    rating          integer check (rating >= 1 and rating <= 5),
    created_at      timestamptz default now(),
    updated_at      timestamptz default now()
);

alter table public.complaints enable row level security;

create policy "Allow select complaints for self"
on public.complaints for select to authenticated
using (auth.uid() = student_id or coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden'));

create policy "Allow insert complaints for students"
on public.complaints for insert to authenticated
with check (auth.uid() = student_id);

create policy "Allow update complaints for admin"
on public.complaints for update to authenticated
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

create policy "Allow update complaints for wardens"
on public.complaints for update to authenticated
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('boys_warden', 'girls_warden'));

-- ─────────────────────────────────────────────────────────────────────────
-- 5. ATTENDANCE TABLES
-- ─────────────────────────────────────────────────────────────────────────
-- Mess attendance tracking
create table if not exists public.mess_attendance (
    id            uuid primary key default gen_random_uuid(),
    student_id    uuid references public.profiles(id) on delete cascade not null,
    menu_id       uuid references public.mess_menu(id) on delete cascade,
    meal_type     text not null check (meal_type in ('morning_tea','breakfast','lunch','snacks','dinner')),
    attendance_date date not null default current_date,
    scanned_at    timestamptz default now(),
    verified_by   uuid references public.profiles(id) on delete set null,
    unique(student_id, attendance_date, meal_type)
);

alter table public.mess_attendance enable row level security;

create policy "Allow select mess_attendance for authenticated"
on public.mess_attendance for select to authenticated using (true);

create policy "Allow insert mess_attendance for mess staff"
on public.mess_attendance for insert to authenticated
with check (true);

-- Event attendance tracking
create table if not exists public.events (
    id            uuid primary key default gen_random_uuid(),
    title         text not null,
    description   text default '',
    event_date    date not null,
    event_time    text default '',
    venue         text default '',
    created_by    uuid references public.profiles(id) on delete set null,
    created_at    timestamptz default now(),
    type          text default 'cultural' check (type in ('cultural', 'sports', 'meeting', 'workshop', 'other'))
);

alter table public.events enable row level security;

create policy "Allow select events for authenticated"
on public.events for select to authenticated using (true);

create policy "Allow insert events for admin"
on public.events for insert to authenticated
with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

create policy "Allow insert events for wardens"
on public.events for insert to authenticated
with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('boys_warden', 'girls_warden'));

create policy "Allow delete events for admin"
on public.events for delete to authenticated
using (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'admin');

create table if not exists public.event_attendance (
    id            uuid primary key default gen_random_uuid(),
    event_id      uuid references public.events(id) on delete cascade not null,
    student_id    uuid references public.profiles(id) on delete cascade not null,
    attended      boolean default true,
    marked_by     uuid references public.profiles(id) on delete set null,
    created_at    timestamptz default now(),
    unique(event_id, student_id)
);

alter table public.event_attendance enable row level security;

create policy "Allow select event_attendance for authenticated"
on public.event_attendance for select to authenticated using (true);

create policy "Allow insert event_attendance for admin/warden"
on public.event_attendance for insert to authenticated
with check (coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') in ('admin', 'boys_warden', 'girls_warden'));

-- ─────────────────────────────────────────────────────────────────────────
-- 6. NOTIFICATIONS TABLE
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.notifications (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid references public.profiles(id) on delete cascade not null,
    title           text not null,
    body            text not null,
    type            text default 'info' check (type in ('info', 'success', 'warning', 'error')),
    reference_type  text default '' check (reference_type in ('leave', 'outpass', 'complaint', 'maintenance', 'announcement', 'attendance', '')),
    reference_id    text default '',
    is_read         boolean default false,
    created_at      timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Allow select notifications for self"
on public.notifications for select to authenticated
using (auth.uid() = user_id);

create policy "Allow insert notifications for authenticated"
on public.notifications for insert to authenticated
with check (true);

create policy "Allow update notifications for self"
on public.notifications for update to authenticated
using (auth.uid() = user_id);

create index if not exists idx_notifications_user_read on public.notifications(user_id, is_read);
create index if not exists idx_notifications_created on public.notifications(created_at desc);
create index if not exists idx_rooms_gender_status on public.rooms(gender_type, status);
create index if not exists idx_room_allocations_current on public.room_allocations(room_id, is_current);
create index if not exists idx_room_allocations_student on public.room_allocations(student_id, is_current);
create index if not exists idx_complaints_status on public.complaints(status);
create index if not exists idx_mess_attendance_date on public.mess_attendance(attendance_date);
create index if not exists idx_event_attendance_event on public.event_attendance(event_id);

-- Enable Realtime for notifications (supports in-app push without Firebase)
alter publication supabase_realtime add table public.notifications;
