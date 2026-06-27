-- =========================================================================
-- DormFlow — Create Test Accounts (Warden, Security, Admin, Student)
-- Run this script in your Supabase SQL Editor to populate test users.
-- =========================================================================

-- Enable pgcrypto extension if not already enabled
create extension if not exists pgcrypto;

-- 1. Boys Warden Account
-- Email: boyswarden@ucea.edu.in | Password: Test@1234
insert into auth.users (
    instance_id, id, aud, role, email, 
    encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at
)
values (
    '00000000-0000-0000-0000-000000000000', 
    gen_random_uuid(), 
    'authenticated', 
    'authenticated', 
    'boyswarden@ucea.edu.in', 
    extensions.crypt('Test@1234', extensions.gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"name":"Arjun Kumar","role":"boys_warden"}', 
    now(), 
    now()
)
on conflict (email) do nothing;

-- 2. Girls Warden Account
-- Email: girlswarden@ucea.edu.in | Password: Test@1234
insert into auth.users (
    instance_id, id, aud, role, email, 
    encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at
)
values (
    '00000000-0000-0000-0000-000000000000', 
    gen_random_uuid(), 
    'authenticated', 
    'authenticated', 
    'girlswarden@ucea.edu.in', 
    extensions.crypt('Test@1234', extensions.gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"name":"Priya Sen","role":"girls_warden"}', 
    now(), 
    now()
)
on conflict (email) do nothing;

-- 3. Gate Security Account
-- Email: security@ucea.edu.in | Password: Test@1234
insert into auth.users (
    instance_id, id, aud, role, email, 
    encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at
)
values (
    '00000000-0000-0000-0000-000000000000', 
    gen_random_uuid(), 
    'authenticated', 
    'authenticated', 
    'security@ucea.edu.in', 
    extensions.crypt('Test@1234', extensions.gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"name":"Ramesh Guard","role":"security"}', 
    now(), 
    now()
)
on conflict (email) do nothing;

-- 4. Admin Account
-- Email: admin@ucea.edu.in | Password: Test@1234
insert into auth.users (
    instance_id, id, aud, role, email, 
    encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at
)
values (
    '00000000-0000-0000-0000-000000000000', 
    gen_random_uuid(), 
    'authenticated', 
    'authenticated', 
    'admin@ucea.edu.in', 
    extensions.crypt('Test@1234', extensions.gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"name":"Suresh Admin","role":"admin"}', 
    now(), 
    now()
)
on conflict (email) do nothing;

-- 5. Student Account (Example Registration Number)
-- Reg No: 312221104001 | Password: Test@1234
insert into auth.users (
    instance_id, id, aud, role, email, 
    encrypted_password, email_confirmed_at, 
    raw_app_meta_data, raw_user_meta_data, 
    created_at, updated_at
)
values (
    '00000000-0000-0000-0000-000000000000', 
    gen_random_uuid(), 
    'authenticated', 
    'authenticated', 
    '312221104001@ucea.edu.in', 
    extensions.crypt('Test@1234', extensions.gen_salt('bf')), 
    now(), 
    '{"provider":"email","providers":["email"]}', 
    '{"name":"Arjun Student","role":"student"}', 
    now(), 
    now()
)
on conflict (email) do nothing;


-- ─────────────────────────────────────────────────────────────────────────
-- 6. Link/Configure Profiles
-- Run these updates to configure names, hostel types, and default values.
-- ─────────────────────────────────────────────────────────────────────────

-- Boys Warden Profile setup
update public.profiles 
set name = 'Arjun Kumar', role = 'boys_warden', hostel_type = 'Boys', active_status = 'IN' 
where email = 'boyswarden@ucea.edu.in';

-- Girls Warden Profile setup
update public.profiles 
set name = 'Priya Sen', role = 'girls_warden', hostel_type = 'Girls', active_status = 'IN' 
where email = 'girlswarden@ucea.edu.in';

-- Gate Security Profile setup
update public.profiles 
set name = 'Ramesh Guard', role = 'security', active_status = 'IN' 
where email = 'security@ucea.edu.in';

-- Admin Profile setup
update public.profiles 
set name = 'Suresh Admin', role = 'admin', active_status = 'IN' 
where email = 'admin@ucea.edu.in';

-- Student Profile setup
update public.profiles 
set name = 'Arjun Student', role = 'student', hostel_type = 'Boys', active_status = 'IN', 
    department = 'CSE', year = '3rd', room_number = '208', block_name = 'Block B', phone = '9489610076'
where email = '312221104001@ucea.edu.in';
