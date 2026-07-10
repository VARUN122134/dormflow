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
  await updateUser(userId, { isApproved: true });
  const user = getCurrentUser();
  const target = await getUserById(userId);
  if (user && target) {
    logAudit('USER_APPROVED', user.id, 'user', userId, `${target.name} approved by ${user.name}`);
  }
}

export async function createUser(userData) {
  throw new Error('User creation via admin panel is disabled. New users must register through the registration page.');
}

export async function deleteUser(id) {
  const user = getCurrentUser();
  const target = await getUserById(id);
  const { error } = await supabase.from('profiles').delete().eq('id', id);
  if (error) throw error;
  if (user && target) {
    logAudit('USER_DELETED', user.id, 'user', id, `${target.name} deleted by ${user.name}`);
  }
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
  const studentId = leaveData.studentId || user.id;
  const leaveId = genId('LV');
  const { data, error } = await supabase.from('leaves').insert({
    leave_id:       leaveId,
    student_id:     studentId,
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
  const qrData = `UCEIT|${passId}|${leave.studentId}|${leaveId}|${leave.outDate}|${leave.inDate}`;
  const { data: opData, error: opErr } = await supabase.from('outpasses').insert({
    pass_id:    passId,
    leave_id:   leaveId,
    student_id: leave.studentId,
    qr_data:    qrData,
    status:     'Active',
  }).select().single();
  if (opErr) throw opErr;

  const actor = getCurrentUser();
  if (actor) {
    const student = await getUserById(leave.studentId);
    logAudit('LEAVE_APPROVED', actor.id, 'leave', leaveId, `${student?.name || 'Student'}'s leave approved by ${actor.name}`);
  }

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
  const actor = getCurrentUser();
  if (actor) {
    const leave = normLeave(data);
    const student = await getUserById(leave.studentId);
    logAudit('LEAVE_REJECTED', actor.id, 'leave', leaveId, `${student?.name || 'Student'}'s leave rejected by ${actor.name}${reason ? ': ' + reason : ''}`);
  }
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
  if (parts.length < 6 || (parts[0] !== 'UCEIT' && parts[0] !== 'DORMFLOW')) {
    return { success: false, error: 'Invalid QR code format' };
  }

  const passId = parts[1];

  const { data: op, error: opErr } = await supabase
    .from('outpasses').select('*').eq('pass_id', passId).single();
  if (opErr || !op) return { success: false, error: 'Outpass not found' };

  const outpass = normOutpass(op);

  // Validate the full QR payload matches the stored record
  const expectedQrData = `UCEIT|${outpass.passId}|${outpass.studentId}|${outpass.leaveId}|${parts[4]}|${parts[5]}`;
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
    const actor = getCurrentUser();
    if (actor) logAudit('GATE_SCAN_OUT', securityId, 'outpass', passId, `${student.name} scanned OUT by ${actor.name}`);
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
    const actor = getCurrentUser();
    if (actor) logAudit('GATE_SCAN_IN', securityId, 'outpass', passId, `${student.name} scanned IN by ${actor.name}`);
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

/* ========================================
   MESS MENU OPERATIONS
   ======================================== */

function normMenu(row) {
  return {
    id: row.id,
    menuDate: row.menu_date,
    mealType: row.meal_type,
    items: row.items,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normRating(row) {
  return {
    id: row.id,
    menuId: row.menu_id,
    studentId: row.student_id,
    rating: row.rating,
    review: row.review,
    createdAt: row.created_at,
  };
}

export async function getMenuByDate(dateStr) {
  const { data, error } = await supabase
    .from('mess_menu')
    .select('*')
    .eq('menu_date', dateStr)
    .order('meal_type');
  if (error) throw error;
  return (data || []).map(normMenu);
}

export async function getMenuByDateRange(start, end) {
  const { data, error } = await supabase
    .from('mess_menu')
    .select('*')
    .gte('menu_date', start)
    .lte('menu_date', end)
    .order('menu_date')
    .order('meal_type');
  if (error) throw error;
  return (data || []).map(normMenu);
}

export async function createMenuEntry(data) {
  const { data: result, error } = await supabase
    .from('mess_menu')
    .insert({
      menu_date: data.menuDate,
      meal_type: data.mealType,
      items: data.items,
      created_by: data.createdBy,
    })
    .select()
    .single();
  if (error) throw error;
  return normMenu(result);
}

export async function updateMenuEntry(id, data) {
  const patch = {};
  if (data.menuDate !== undefined) patch.menu_date = data.menuDate;
  if (data.mealType !== undefined) patch.meal_type = data.mealType;
  if (data.items !== undefined) patch.items = data.items;
  patch.updated_at = new Date().toISOString();
  const { data: result, error } = await supabase
    .from('mess_menu')
    .update(patch)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return normMenu(result);
}

export async function deleteMenuEntry(id) {
  const { error } = await supabase.from('mess_menu').delete().eq('id', id);
  if (error) throw error;
}

export async function getRatings(menuId) {
  const { data, error } = await supabase
    .from('mess_ratings')
    .select('*')
    .eq('menu_id', menuId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normRating);
}

export async function getMyRating(menuId, studentId) {
  const { data, error } = await supabase
    .from('mess_ratings')
    .select('*')
    .eq('menu_id', menuId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  return data ? normRating(data) : null;
}

export async function submitRating(menuId, studentId, rating, review) {
  const { data: existing } = await supabase
    .from('mess_ratings')
    .select('id')
    .eq('menu_id', menuId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from('mess_ratings')
      .update({ rating, review })
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return normRating(data);
  } else {
    const { data, error } = await supabase
      .from('mess_ratings')
      .insert({ menu_id: menuId, student_id: studentId, rating, review })
      .select()
      .single();
    if (error) throw error;
    return normRating(data);
  }
}

export async function getMenuWithStats(dateStr) {
  const menu = await getMenuByDate(dateStr);
  const result = [];
  for (const item of menu) {
    const ratings = await getRatings(item.id);
    const avgRating = ratings.length
      ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
      : 0;

    // Fetch student names for ratings (reviews are anonymous - just count)
    const ratingCount = ratings.length;
    const ratingDistribution = [0, 0, 0, 0, 0];
    ratings.forEach(r => { ratingDistribution[r.rating - 1]++; });

    result.push({
      ...item,
      averageRating: Math.round(avgRating * 10) / 10,
      ratingCount,
      ratingDistribution,
      ratings,  // anonymous list
    });
  }
  return result;
}


/* ========================================
   ANNOUNCEMENT OPERATIONS
   ======================================== */

function normAnnouncement(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    authorId: row.author_id,
    createdAt: row.created_at,
    type: row.type,
    eventDate: row.event_date,
  };
}

export async function getAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normAnnouncement);
}

export async function getAnnouncementById(id) {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return normAnnouncement(data);
}

export async function createAnnouncement(data) {
  const { data: result, error } = await supabase
    .from('announcements')
    .insert({
      title: data.title,
      content: data.content,
      author_id: data.authorId,
      type: data.type || 'announcement',
      event_date: data.eventDate || null,
    })
    .select()
    .single();
  if (error) throw error;
  return normAnnouncement(result);
}

export async function deleteAnnouncement(id) {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
}


/* ========================================
   POLL OPERATIONS
   ======================================== */

function normPoll(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    createdBy: row.created_by,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    isActive: row.is_active,
  };
}

export async function getPolls() {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(normPoll);
}

export async function getPollById(id) {
  const { data, error } = await supabase
    .from('polls')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return normPoll(data);
}

export async function getPollOptions(pollId) {
  const { data, error } = await supabase
    .from('poll_options')
    .select('*')
    .eq('poll_id', pollId);
  if (error) throw error;
  return data || [];
}

export async function createPoll(data) {
  // data: { title, description, authorId, expiresAt, options: [text, text, ...] }
  const { data: poll, error: pollErr } = await supabase
    .from('polls')
    .insert({
      title: data.title,
      description: data.description || '',
      created_by: data.authorId,
      expires_at: data.expiresAt || null,
    })
    .select()
    .single();
  if (pollErr) throw pollErr;

  if (data.options && data.options.length) {
    const optionsData = data.options.map(text => ({
      poll_id: poll.id,
      option_text: text,
    }));
    const { error: optErr } = await supabase
      .from('poll_options')
      .insert(optionsData);
    if (optErr) throw optErr;
  }

  return normPoll(poll);
}

export async function vote(pollId, optionId, studentId) {
  // Check if already voted
  const { data: existing } = await supabase
    .from('poll_votes')
    .select('id')
    .eq('poll_id', pollId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (existing) throw new Error('You have already voted in this poll');

  const { error } = await supabase.from('poll_votes').insert({
    poll_id: pollId,
    option_id: optionId,
    student_id: studentId,
  });
  if (error) throw error;
}

export async function getPollResults(pollId) {
  const options = await getPollOptions(pollId);
  const { data: votes, error } = await supabase
    .from('poll_votes')
    .select('option_id')
    .eq('poll_id', pollId);
  if (error) throw error;

  const totalVotes = votes ? votes.length : 0;
  const optionVotes = {};
  (votes || []).forEach(v => {
    optionVotes[v.option_id] = (optionVotes[v.option_id] || 0) + 1;
  });

  return options.map(opt => ({
    ...opt,
    votes: optionVotes[opt.id] || 0,
    percentage: totalVotes > 0 ? Math.round((optionVotes[opt.id] || 0) / totalVotes * 100) : 0,
  }));
}

export async function hasVoted(pollId, studentId) {
  const { data, error } = await supabase
    .from('poll_votes')
    .select('id, option_id')
    .eq('poll_id', pollId)
    .eq('student_id', studentId)
    .maybeSingle();
  if (error) throw error;
  return data ? { voted: true, optionId: data.option_id } : { voted: false, optionId: null };
}

export async function deletePoll(id) {
  // Cascade deletes poll_options and poll_votes
  const { error } = await supabase.from('polls').delete().eq('id', id);
  if (error) throw error;
}


/* ========================================
   MESS MEMBER MANAGEMENT
   ======================================== */

export async function toggleMessMember(userId, isMember) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_mess_member: isMember })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMessMembers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('is_mess_member', true);
  if (error) throw error;
  return (data || []).map(normProfile);
}

// ======== ATTENDANCE ========

export async function markAttendance(hostelType, userId) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: students, error: fetchError } = await supabase
    .from('profiles')
    .select('id, hostel_type, department, year, active_status')
    .eq('role', 'student')
    .eq('hostel_type', hostelType);
  if (fetchError) throw fetchError;

  const records = students.map(s => ({
    date: today,
    student_id: s.id,
    hostel_type: s.hostel_type,
    department: s.department,
    year: s.year,
    status: s.active_status === 'IN' ? 'PRESENT' : s.active_status === 'LEAVE' ? 'LEAVE' : 'ABSENT',
    marked_by: userId,
  }));

  const { data, error } = await supabase
    .from('attendance')
    .upsert(records, { onConflict: 'date,student_id', ignoreDuplicates: false })
    .select();
  if (error) throw error;
  return data || [];
}

export async function getAttendance(date, hostelType) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, student:profiles!inner(id, name, email, hostel_type, department, year, room_number, block_name, active_status)')
    .eq('date', date)
    .eq('hostel_type', hostelType)
    .order('department')
    .order('year')
    .order('student(id)');
  if (error) throw error;
  return data || [];
}

export async function getAttendanceByDate(date) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*, student:profiles!inner(id, name, email, hostel_type, department, year, room_number, block_name, active_status)')
    .eq('date', date)
    .order('hostel_type')
    .order('department')
    .order('year');
  if (error) throw error;
  return data || [];
}

export async function hasAttendanceForDate(date, hostelType) {
  const { data, error } = await supabase
    .from('attendance')
    .select('id', { count: 'exact', head: true })
    .eq('date', date)
    .eq('hostel_type', hostelType)
    .limit(1);
  if (error) throw error;
  return (data || []).length > 0;
}

export async function getMonthlyAttendance(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0);
  const end = `${year}-${String(month).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('attendance')
    .select('*, student:profiles!inner(id, name, email, hostel_type, department, year, room_number, block_name)')
    .gte('date', start)
    .lte('date', end)
    .order('hostel_type')
    .order('department')
    .order('year')
    .order('student(name)')
    .order('date');
  if (error) throw error;
  return data || [];
}

// ======== AUTO ATTENDANCE SUPPORT ========

export async function saveAttendanceSnapshot(hostelType, students) {
  const present = students.filter(s => s.activeStatus === 'IN');
  const absent = students.filter(s => s.activeStatus === 'OUT');
  const depts = [...new Set(students.map(s => s.department).filter(Boolean))].sort();

  let csv = `Department,Year,Name,Register Number,Room,Status\n`;
  depts.forEach(dept => {
    const deptStudents = students.filter(s => s.department === dept);
    const years = [...new Set(deptStudents.map(s => s.year).filter(Boolean))].sort();
    years.forEach(year => {
      deptStudents.filter(s => s.year === year).forEach(s => {
        csv += `"${dept}","${year}","${s.name}","${s.registrationNo}","${s.roomNumber || ''}","${s.activeStatus === 'IN' ? 'Present' : 'Absent'}"\n`;
      });
    });
  });

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${hostelType.toLowerCase()}_hostel_attendance_${dateStr}.csv`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const file = new File([blob], fileName, { type: 'text/csv' });

  const { error } = await supabase.storage.from('attendance-snapshots').upload(fileName, file, { upsert: true });
  if (error) throw error;
  return csv;
}

export async function getDailyBill(dateStr) {
  try {
    const { data, error } = await supabase.from('mess_daily_bills').select('*').eq('bill_date', dateStr).maybeSingle();
    if (error) return null;
    return data ? { id: data.id, billDate: data.bill_date, totalStockCost: data.total_stock_cost, totalStudents: data.total_students, perStudentCost: data.per_student_cost, calculatedAt: data.calculated_at, calculatedBy: data.calculated_by } : null;
  } catch { return null; }
}

export async function getDailyUsage(dateStr) {
  try {
    const { data, error } = await supabase.from('mess_daily_usage').select('*, mess_daily_usage_items!mess_daily_usage_items_usage_id_fkey(*, mess_stock_items!mess_daily_usage_items_item_id_fkey(*))').eq('usage_date', dateStr).maybeSingle();
    if (error) return null;
    if (!data) return null;
    return { id: data.id, usageDate: data.usage_date, createdAt: data.created_at, items: (data.mess_daily_usage_items || []).map(i => ({ id: i.id, itemId: i.item_id, quantityUsed: i.quantity_used, item: i.mess_stock_items ? { id: i.mess_stock_items.id, name: i.mess_stock_items.name } : undefined })) };
  } catch { return null; }
}

export async function calculateDailyBill(dateStr, userId) {
  try {
    const usage = await getDailyUsage(dateStr);
    if (!usage || !usage.items || usage.items.length === 0) return null;
    let totalStockCost = 0;
    for (const u of usage.items) {
      const { data: purchases } = await supabase.from('mess_stock_purchases').select('unit_price').eq('item_id', u.itemId).order('purchased_date', { ascending: false }).limit(1);
      const price = (purchases && purchases.length > 0) ? purchases[0].unit_price : 0;
      totalStockCost += u.quantityUsed * price;
    }
    const { data: attendance } = await supabase.from('mess_attendance').select('student_id').eq('attendance_date', dateStr);
    const uniqueStudents = [...new Set((attendance || []).map(a => a.student_id))];
    if (uniqueStudents.length === 0) return null;
    const perStudentCost = Math.round((totalStockCost / uniqueStudents.length) * 100) / 100;
    const { data: bill } = await supabase.from('mess_daily_bills').upsert({ bill_date: dateStr, total_stock_cost: totalStockCost, total_students: uniqueStudents.length, per_student_cost: perStudentCost, calculated_by: userId }).select().single();
    return bill;
  } catch { return null; }
}

/* ========================================
   AUDIT LOGS
   ======================================== */

export async function logAudit(action, actorId, targetType, targetId, details) {
  try {
    await supabase.from('audit_logs').insert({
      action,
      actor_id: actorId,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  } catch { /* silent */ }
}

export async function getAuditLogs(limit = 50) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, actor:profiles!audit_logs_actor_id_fkey(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data || []).map(r => ({
    id: r.id,
    action: r.action,
    actorName: r.actor?.name || 'System',
    actorId: r.actor_id,
    targetType: r.target_type,
    targetId: r.target_id,
    details: r.details,
    createdAt: r.created_at,
  }));
}

/* ========================================
   APP CONFIG
   ======================================== */

export async function getAppConfig() {
  const { data, error } = await supabase.from('app_config').select('*');
  if (error) return {};
  const config = {};
  (data || []).forEach(r => { config[r.key] = r.value; });
  return config;
}

export async function updateAppConfig(key, value, userId) {
  const { data, error } = await supabase
    .from('app_config')
    .upsert({ key, value, updated_at: new Date().toISOString(), updated_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ========================================
   MONTHLY LEAVE TRENDS (for chart)
   ======================================== */

export async function getMonthlyLeaveTrends(monthsBack = 6) {
  const months = [];
  const now = new Date();
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    months.push({ label: d.toLocaleString('en-US', { month: 'short' }), year: y, month: m, start: `${y}-${m}-01` });
  }

  const { data: leaves, error } = await supabase
    .from('leaves')
    .select('created_at, profiles!leaves_student_id_fkey(hostel_type)')
    .gte('created_at', months[0].start);
  if (error) return { labels: months.map(m => m.label), boys: months.map(() => 0), girls: months.map(() => 0) };

  const boys = months.map(() => 0);
  const girls = months.map(() => 0);

  (leaves || []).forEach(l => {
    const created = new Date(l.created_at);
    const monthStr = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    const idx = months.findIndex(m => `${m.year}-${m.month}` === monthStr);
    if (idx === -1) return;
    const hostel = l.profiles?.hostel_type || '';
    if (hostel.toLowerCase().includes('boys')) {
      boys[idx]++;
    } else if (hostel.toLowerCase().includes('girls')) {
      girls[idx]++;
    }
  });

  return { labels: months.map(m => m.label), boys, girls };
}
