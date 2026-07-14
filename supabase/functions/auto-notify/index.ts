// ========================================
// Auto-Notify — Supabase Edge Function
// Trigger: Database webhook on INSERT
// Tables: complaints, room_maintenance
// Creates notifications for relevant users
// ========================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const payload = await req.json();
  const { type, table, record } = payload;

  if (type !== 'INSERT') return new Response('ok', { status: 200 });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    if (table === 'complaints') {
      // Notify all admins about new complaint
      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'boys_caretaker', 'girls_caretaker']);

      const notifications = (admins || []).map(a => ({
        user_id: a.id,
        title: 'New Complaint',
        body: `${record.subject} — ${record.category}`,
        type: 'warning',
        reference_type: 'complaint',
        reference_id: record.id,
      }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
    }

    if (table === 'room_maintenance') {
      // Notify wardens about new maintenance request
      const { data: room } = await supabase
        .from('rooms')
        .select('gender_type')
        .eq('id', record.room_id)
        .single();

      const caretakerRoles = room?.gender_type === 'Girls' ? ['girls_caretaker'] : ['boys_caretaker'];

      const { data: wardens } = await supabase
        .from('profiles')
        .select('id')
        .in('role', [...caretakerRoles, 'admin']);

      const notifications = (wardens || []).map(w => ({
        user_id: w.id,
        title: 'Maintenance Request',
        body: `${record.issue_type} — ${record.description?.slice(0, 100)}`,
        type: 'warning',
        reference_type: 'maintenance',
        reference_id: record.id,
      }));

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
    }

    if (table === 'leaves' && record.approval_status === 'Approved') {
      // Notify student that leave was approved
      await supabase.from('notifications').insert({
        user_id: record.student_id,
        title: 'Leave Approved',
        body: 'Your leave request has been approved. QR outpass generated.',
        type: 'success',
        reference_type: 'leave',
        reference_id: record.leave_id,
      });
    }

    if (table === 'leaves' && record.approval_status === 'Rejected') {
      await supabase.from('notifications').insert({
        user_id: record.student_id,
        title: 'Leave Rejected',
        body: record.rejection_reason || 'Your leave request was rejected.',
        type: 'error',
        reference_type: 'leave',
        reference_id: record.leave_id,
      });
    }

    return new Response('notifications created', { status: 200 });
  } catch (err) {
    console.error('Auto-notify error:', err);
    return new Response(err.message, { status: 500 });
  }
});
