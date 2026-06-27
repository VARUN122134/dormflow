-- =========================================================================
-- Reset ALL user passwords to Test@1234
-- Run this in your Supabase SQL Editor
-- =========================================================================

update auth.users
set encrypted_password = extensions.crypt('Test@1234', extensions.gen_salt('bf')),
    updated_at = now()
where true;

-- Verify
select email, raw_user_meta_data->>'name' as name, raw_user_meta_data->>'role' as role
from auth.users
order by email;
