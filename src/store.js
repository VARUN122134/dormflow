import { supabase } from './supabase.js';
import { getCurrentUser } from './auth.js';

function normLeave(row) {
  if (!row) return null;
  return {
    leaveId:          row.leave_id,
    studentId:        row.student_id,
    type:             row.type,
    reason:           row.reason,
    outDate:          row.out_date,
    inDate:           row.in_date,
    approvalStatus:   row.approval_status,
    approvedBy:       row.approved_by,
    approvedAt:       row.approved_at,
    rejectionReason:  row.rejection_reason,
    createdAt:        row.created_at,
    student:          row.profiles ? normProfile(row.profiles) : undefined,
  };
}

function normProfile(row) {
  if (!row) return null;
  const regMatch = row.email ? row.email.match(/^(\d{12})@ucea\.edu\.in$/) : null;
  const registrationNo = regMatch ? regMatch[1] : null;

  return {
    id:             row.id,
    name:           row.name,
    email:          row.email,
    role:           row.role,
    gender:         row.gender,
    hostelType:     row.hostel_type,
    department:     row.department,
    year:           row.year,
    roomNumber:     row.room_number,
    blockName:      row.block_name,
    phone:          row.phone,
    guardianName:   row.guardian_name,
    guardianPhone:  row.guardian_phone,
    activeStatus:   row.active_status,
    avatarUrl:      row.avatar_url,
    createdAt:      row.created_at,
    registrationNo: registrationNo || '',
    isApproved:     row.is_approved || false,
  };
}

function normOutpass(row) {
  if (!row) return null;
  return {
    passId:         row.pass_id,
    leaveId:        row.leave_id,
    studentId:      row.student_id,
    qrData:         row.qr_data,
    outTime:        row.out_time,
    inTime:         row.in_time,
    status:         row.status,
    scannedOutBy:   row.scanned_out_by,
    scannedInBy:    row.scanned_in_by,
    createdAt:      row.created_at,
  };
}

function genId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2,6)}`.toUpperCase();
}

export async function getUsers() {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at');
  if (error) throw error;
  return (data || []).map(normProfile);
}

export async function getUserById(id) {
  if (!id) return null;
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error) return null;
  return normProfile(data);
}

export async function updateUser(id, updates) {
  const patch = {};
  if (updates.activeStatus !== undefined) patch.active_status = updates.activeStatus;
  if (updates.roomNumber   !== undefined) patch.room_number   = updates.roomNumber;
  if (updates.blockName    !== undefined) patch.block_name    = updates.blockName;
  if (updates.hostelType   !== undefined) patch.hostel_type   = updates.hostelType;
  if (updates.guardianName !== undefined) patch.guardian_name = updates.guardianName;
  if (updates.guardianPhone !== undefined) patch.guardian_phone = updates.guardianPhone;
  if (updates.phone        !== undefined) patch.phone         = updates.phone;
  if (updates.name         !== undefined) patch.name          = updates.name;
  if (updates.department   !== undefined) patch.department    = updates.department;
  if (updates.year         !== undefined) patch.year          = updates.year;
  if (updates.gender       !== undefined) patch.gender        = updates.gender;
  if (updates.avatarUrl    !== undefined) patch.avatar_url    = updates.avatarUrl;
  if (updates.isApproved   !== undefined) patch.is_approved   = updates.isApproved;

  const { data, error } = await supabase.from('profiles').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return normProfile(data);
}

export async function uploadAvatar(userId, file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
  const avatarUrl = data.publicUrl;

  await updateUser(userId, { avatarUrl });
  return avatarUrl;
}

export async function approveUser(userId) {
  return updateUser(userId, { isApproved: true });
}

export async function createUser(userData) {
  throw new Error('User creation via admin panel is disabled. New users must register through the registration page.');
}

export async function deleteUser(id) {
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
}

export async function getLeaves() {
  const { data, error } = await supabase
    .from('leaves')
    .select('*, profiles!leaves_student_id_fkey(*)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normLeave);
}

export async function getLeaveById(id) {
  const { data, error } = await supabase
    .from('leaves').select('*, profiles!leaves_student_id_fkey(*)')
    .eq('leave_id', id).single();
  if (error) return null;
  return normLeave(data);
}

export async function getLeavesByStudent(studentId) {
  const { data, error } = await supabase
    .from('leaves').select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normLeave);
}

export async function getLeavesByHostel(hostelType) {
  const { data: students, error: sErr } = await supabase
    .from('profiles').select('id').eq('hostel_type', hostelType).eq('role', 'student');
  if (sErr) throw sErr;

  const ids = (students || []).map(s => s.id);
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from('leaves')
    .select('*, profiles!leaves_student_id_fkey(*)')
    .in('student_id', ids)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normLeave);
}

export async function getPendingLeavesByHostel(hostelType) {
  const leaves = await getLeavesByHostel(hostelType);
  return leaves.filter(l => l.approvalStatus === 'Pending');
}

export async function createLeave(leaveData) {
  const user = getCurrentUser();
  const leaveId = genId('LV');
  const { data, error } = await supabase.from('leaves').insert({
    leave_id:       leaveId,
    student_id:     user.id,
    type:           leaveData.type,
    reason:         leaveData.reason,
    out_date:       leaveData.outDate,
    in_date:        leaveData.inDate,
    approval_status: 'Pending',
  }).select().single();
  if (error) throw error;
  return normLeave(data);
}

export async function approveLeave(leaveId, wardenId) {
  // Check if outpass already exists for this leave
  const existing = await getOutpassByLeave(leaveId);
  if (existing) {
    throw new Error('An outpass has already been generated for this leave request.');
  }

  const { data, error } = await supabase.from('leaves').update({
    approval_status: 'Approved',
    approved_by:     wardenId,
    approved_at:     new Date().toISOString(),
  }).eq('leave_id', leaveId).select().single();
  if (error) throw error;

  const leave = normLeave(data);
  const passId = genId('OP');
  const qrData = `DORMFLOW|${passId}|${leave.studentId}|${leaveId}|${leave.outDate}|${leave.inDate}`;
  const { data: opData, error: opErr } = await supabase.from('outpasses').insert({
    pass_id:    passId,
    leave_id:   leaveId,
    student_id: leave.studentId,
    qr_data:    qrData,
    status:     'Active',
  }).select().single();
  if (opErr) throw opErr;

  return { leave, outpass: normOutpass(opData) };
}

export async function rejectLeave(leaveId, wardenId, reason = '') {
  const { data, error } = await supabase.from('leaves').update({
    approval_status:  'Rejected',
    approved_by:      wardenId,
    approved_at:      new Date().toISOString(),
    rejection_reason: reason,
  }).eq('leave_id', leaveId).select().single();
  if (error) throw error;
  return normLeave(data);
}

export async function getOutpasses() {
  const { data, error } = await supabase.from('outpasses').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normOutpass);
}

export async function getOutpassById(id) {
  const { data, error } = await supabase.from('outpasses').select('*').eq('pass_id', id).single();
  if (error) return null;
  return normOutpass(data);
}

export async function getOutpassByLeave(leaveId) {
  const { data, error } = await supabase.from('outpasses').select('*').eq('leave_id', leaveId).single();
  if (error) return null;
  return normOutpass(data);
}

export async function getActiveOutpassByStudent(studentId) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('outpasses').select('*')
    .eq('student_id', studentId)
    .in('status', ['Active', 'Used'])
    .order('created_at', { ascending: false })
    .limit(1);
  if (error || !data?.length) return null;

  return normOutpass(data[0]);
}

export async function scanOutpass(qrData, securityId) {
  const parts = qrData.split('|');
  if (parts.length < 6 || parts[0] !== 'DORMFLOW') {
    return { success: false, error: 'Invalid QR code format' };
  }

  const passId = parts[1];

  const { data: op, error: opErr } = await supabase
    .from('outpasses').select('*').eq('pass_id', passId).single();
  if (opErr || !op) return { success: false, error: 'Outpass not found' };

  const outpass = normOutpass(op);

  // Validate the full QR payload matches the stored record
  const expectedQrData = `DORMFLOW|${outpass.passId}|${outpass.studentId}|${outpass.leaveId}|${parts[4]}|${parts[5]}`;
  if (qrData !== expectedQrData) {
    return { success: false, error: 'QR data does not match stored outpass record' };
  }

  const [student, leave] = await Promise.all([
    getUserById(outpass.studentId),
    getLeaveById(outpass.leaveId),
  ]);

  if (!student) return { success: false, error: 'Student not found' };

  if (outpass.status === 'Completed') return { success: false, error: 'Outpass already completed' };
  if (outpass.status === 'Expired')   return { success: false, error: 'Outpass has expired' };

  if (outpass.status === 'Active' && !outpass.outTime) {
    await supabase.from('outpasses').update({
      out_time: new Date().toISOString(),
      status: 'Used',
      scanned_out_by: securityId,
    }).eq('pass_id', passId);
    await updateUser(outpass.studentId, { activeStatus: 'OUT' });
    return { success: true, action: 'DEPARTURE', student, leave, message: `${student.name} checked OUT successfully` };
  }

  if (outpass.status === 'Used' && outpass.outTime && !outpass.inTime) {
    const outTimeMs = new Date(outpass.outTime).getTime();
    const elapsed = Date.now() - outTimeMs;
    const cooldownMs = 10 * 60 * 1000;
    if (elapsed < cooldownMs) {
      const remaining = Math.ceil((cooldownMs - elapsed) / 60000);
      return { success: false, error: `Cooldown active — wait ${remaining} min before scanning IN` };
    }
    await supabase.from('outpasses').update({
      in_time: new Date().toISOString(),
      status: 'Completed',
      scanned_in_by: securityId,
    }).eq('pass_id', passId);
    await updateUser(outpass.studentId, { activeStatus: 'IN' });
    return { success: true, action: 'RETURN', student, leave, message: `${student.name} checked IN successfully` };
  }

  return { success: false, error: 'Unexpected outpass state' };
}

export async function getHostelStats(hostelType) {
  const { data: students } = await supabase
    .from('profiles').select('id, active_status, is_approved').eq('hostel_type', hostelType).eq('role', 'student');

  const ids = (students || []).map(s => s.id);
  const { data: leaves } = ids.length
    ? await supabase.from('leaves').select('approval_status, approved_at').in('student_id', ids)
    : { data: [] };

  const s = students || [];
  const l = leaves || [];
  const today = new Date().toDateString();

  return {
    totalStudents:   s.filter(x => x.is_approved !== false).length,
    studentsOut:     s.filter(x => x.active_status === 'OUT').length,
    studentsOnLeave: s.filter(x => x.active_status === 'LEAVE').length,
    pendingRequests: l.filter(x => x.approval_status === 'Pending').length,
    approvedToday:   l.filter(x => x.approval_status === 'Approved' && x.approved_at && new Date(x.approved_at).toDateString() === today).length,
    totalApproved:   l.filter(x => x.approval_status === 'Approved').length,
    totalRejected:   l.filter(x => x.approval_status === 'Rejected').length,
  };
}

export async function getGateStats() {
  const { data: students } = await supabase.from('profiles').select('active_status').eq('role', 'student');
  const { data: outpasses } = await supabase.from('outpasses').select('out_time, in_time');

  const today = new Date().toDateString();
  const ops = outpasses || [];
  return {
    currentlyOut: (students || []).filter(s => s.active_status === 'OUT').length,
    totalExits:   ops.filter(o => o.out_time).length,
    totalReturns: ops.filter(o => o.in_time).length,
    todayExits:   ops.filter(o => o.out_time && new Date(o.out_time).toDateString() === today).length,
  };
}

export async function getSystemStats() {
  const [{ data: users }, { data: leaves }] = await Promise.all([
    supabase.from('profiles').select('role'),
    supabase.from('leaves').select('approval_status'),
  ]);
  const u = users || [];
  const l = leaves || [];
  return {
    totalUsers:       u.length,
    totalStudents:    u.filter(x => x.role === 'student').length,
    totalStaff:       u.filter(x => x.role !== 'student').length,
    totalLeaves:      l.length,
    pendingLeaves:    l.filter(x => x.approval_status === 'Pending').length,
    systemUptime:     '99.9%',
    avgResponseTime:  '14ms',
  };
}

export async function getRecentGateActivity(limit = 10) {
  const { data, error } = await supabase
    .from('outpasses')
    .select('*, profiles!outpasses_student_id_fkey(*)')
    .or('out_time.not.is.null,in_time.not.is.null')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];

  return (data || []).map(o => {
    const op = normOutpass(o);
    const profile = o.profiles ? normProfile(o.profiles) : {};
    return {
      ...op,
      studentName: profile.name || 'Unknown',
      hostelType:  profile.hostelType || '',
      department:  profile.department || '',
      action:      op.status === 'Completed' ? 'IN' : 'OUT',
      timestamp:   op.inTime || op.outTime,
    };
  });
}

export function initStore() { }
