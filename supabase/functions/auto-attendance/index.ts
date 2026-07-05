// ========================================
// Auto Attendance — runs daily at 8:05 PM
// Deploy: supabase functions deploy auto-attendance
// Schedule: supabase functions cron create auto-attendance "5 20 * * *" "https://PROJECT_REF.supabase.co/functions/v1/auto-attendance"
// ========================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { encode as encodeCsv } from 'https://deno.land/std@0.168.0/encoding/csv.ts';

serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().slice(0, 10);
    const hostelTypes = ['Boys', 'Girls'];
    const results = { Boys: 0, Girls: 0 };

    for (const hostelType of hostelTypes) {
      const { data: students, error: fetchError } = await supabase
        .from('profiles')
        .select('id, hostel_type, department, year, active_status')
        .eq('role', 'student')
        .eq('hostel_type', hostelType);

      if (fetchError) {
        console.error(`Error fetching ${hostelType} students:`, fetchError);
        continue;
      }

      const records = students.map(s => ({
        date: today,
        student_id: s.id,
        hostel_type: s.hostel_type,
        department: s.department,
        year: s.year,
        status: s.active_status === 'IN' ? 'PRESENT' : s.active_status === 'LEAVE' ? 'LEAVE' : 'ABSENT',
        marked_by: null,
      }));

      const { error: upsertError } = await supabase
        .from('attendance')
        .upsert(records, { onConflict: 'date,student_id', ignoreDuplicates: false });

      if (upsertError) {
        console.error(`Error upserting ${hostelType} attendance:`, upsertError);
        continue;
      }

      results[hostelType] = records.length;
    }

    return new Response(
      JSON.stringify({ success: true, date: today, results }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
});
