/* ========================================
   UCE IT — Supabase Client
   ======================================== */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://oekdpzoewzkznxghmgby.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9la2Rwem9ld3prem54Z2htZ2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MjU1MDMsImV4cCI6MjA5NjMwMTUwM30.r_Im6_fzocAFee9d7KfjKBYfApW1QAktd5MdqWn23Ok';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
