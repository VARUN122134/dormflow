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
    guardianContact:  row.guardian_contact || '',
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

export async function getUserByRegNo(regNo) {
  if (!regNo) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', `${regNo}@%`)
    .limit(1)
    .maybeSingle();
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

export async function updateUserRole(userId, newRole) {
  const validRoles = ['student', 'boys_warden', 'girls_warden', 'security', 'admin', 'mess_incharge'];
  if (!validRoles.includes(newRole)) throw new Error('Invalid role: ' + newRole);
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: newRole })
    .eq('id', userId)
    .select()
    .single();
  if (error) throw error;
  return normProfile(data);
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
  const insertData = {
    leave_id:       leaveId,
    student_id:     user.id,
    type:           leaveData.type,
    reason:         leaveData.reason,
    out_date:       leaveData.outDate,
    in_date:        leaveData.inDate,
    approval_status: 'Pending',
  };
  if (leaveData.guardianContact) {
    insertData.guardian_contact = leaveData.guardianContact;
  }
  const { data, error } = await supabase.from('leaves').insert(insertData).select().single();
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


/* ========================================
   ROOM MANAGEMENT
   ======================================== */

function normRoom(row) {
  if (!row) return null;
  return {
    id: row.id,
    blockName: row.block_name,
    floor: row.floor,
    roomNumber: row.room_number,
    capacity: row.capacity,
    roomType: row.room_type,
    status: row.status,
    genderType: row.gender_type,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normRoomAllocation(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomId: row.room_id,
    studentId: row.student_id,
    allocatedAt: row.allocated_at,
    vacatedAt: row.vacated_at,
    isCurrent: row.is_current,
    approvedBy: row.approved_by,
    student: row.profiles ? normProfile(row.profiles) : undefined,
    room: row.rooms ? normRoom(row.rooms) : undefined,
  };
}

function normMaintenance(row) {
  if (!row) return null;
  return {
    id: row.id,
    roomId: row.room_id,
    studentId: row.student_id,
    issueType: row.issue_type,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    resolvedAt: row.resolved_at,
    resolutionNote: row.resolution_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    student: row.profiles ? normProfile(row.profiles) : undefined,
    room: row.rooms ? normRoom(row.rooms) : undefined,
  };
}

export async function getRooms(filters = {}) {
  let query = supabase.from('rooms').select('*');
  if (filters.blockName) query = query.eq('block_name', filters.blockName);
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.genderType) query = query.eq('gender_type', filters.genderType);
  if (filters.floor !== undefined) query = query.eq('floor', filters.floor);
  query = query.order('block_name').order('floor').order('room_number');
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normRoom);
}

export async function getRoomById(id) {
  const { data, error } = await supabase.from('rooms').select('*').eq('id', id).single();
  if (error) return null;
  return normRoom(data);
}

export async function createRoom(data) {
  const { data: result, error } = await supabase.from('rooms').insert({
    block_name: data.blockName,
    floor: data.floor,
    room_number: data.roomNumber,
    capacity: data.capacity,
    room_type: data.roomType || 'shared',
    gender_type: data.genderType || 'Boys',
    status: data.status || 'available',
  }).select().single();
  if (error) throw error;
  return normRoom(result);
}

export async function updateRoom(id, updates) {
  const patch = {};
  if (updates.blockName !== undefined) patch.block_name = updates.blockName;
  if (updates.floor !== undefined) patch.floor = updates.floor;
  if (updates.roomNumber !== undefined) patch.room_number = updates.roomNumber;
  if (updates.capacity !== undefined) patch.capacity = updates.capacity;
  if (updates.roomType !== undefined) patch.room_type = updates.roomType;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.genderType !== undefined) patch.gender_type = updates.genderType;
  patch.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('rooms').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return normRoom(data);
}

export async function deleteRoom(id) {
  const { error } = await supabase.from('rooms').delete().eq('id', id);
  if (error) throw error;
}

export async function getAvailableRooms(genderType, blockName) {
  let q = supabase.from('rooms').select('*').eq('status', 'available');
  if (genderType) q = q.eq('gender_type', genderType);
  if (blockName) q = q.eq('block_name', blockName);
  q = q.order('block_name').order('room_number');
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(normRoom);
}

export async function allocateRoom(roomId, studentId, approvedBy) {
  const { data: room } = await supabase.from('rooms').select('*').eq('id', roomId).single();
  if (!room) throw new Error('Room not found');
  if (room.status !== 'available' && room.status !== 'occupied') throw new Error('Room is not available');

  const { data: existing } = await supabase.from('room_allocations').select('id').eq('student_id', studentId).eq('is_current', true).maybeSingle();
  if (existing) throw new Error('Student already has an active room allocation');

  const { count } = await supabase.from('room_allocations').select('*', { count: 'exact', head: true }).eq('room_id', roomId).eq('is_current', true);
  if (count >= room.capacity) throw new Error('Room has reached maximum capacity');

  const { data: result, error } = await supabase.from('room_allocations').insert({
    room_id: roomId,
    student_id: studentId,
    allocated_at: new Date().toISOString(),
    is_current: true,
    approved_by: approvedBy,
  }).select().single();
  if (error) throw error;

  await supabase.from('rooms').update({ status: 'occupied', updated_at: new Date().toISOString() }).eq('id', roomId);
  await supabase.from('profiles').update({ room_number: room.room_number, block_name: room.block_name }).eq('id', studentId);

  return normRoomAllocation(result);
}

export async function vacateRoom(allocationId, roomId, studentId) {
  const { error } = await supabase.from('room_allocations').update({
    vacated_at: new Date().toISOString(),
    is_current: false,
  }).eq('id', allocationId);
  if (error) throw error;

  const { count } = await supabase.from('room_allocations').select('*', { count: 'exact', head: true }).eq('room_id', roomId).eq('is_current', true);
  if (count === 0) {
    await supabase.from('rooms').update({ status: 'available', updated_at: new Date().toISOString() }).eq('id', roomId);
  }

  await supabase.from('profiles').update({ room_number: '', block_name: '' }).eq('id', studentId);
}

export async function getMyAllocation(studentId) {
  const { data, error } = await supabase
    .from('room_allocations')
    .select('*, rooms!room_allocations_room_id_fkey(*)')
    .eq('student_id', studentId)
    .eq('is_current', true)
    .maybeSingle();
  if (error) return null;
  if (!data) return null;
  return normRoomAllocation(data);
}

export async function getRoomAllocations(filters = {}) {
  let query = supabase.from('room_allocations').select('*, profiles!room_allocations_student_id_fkey(*), rooms!room_allocations_room_id_fkey(*)').eq('is_current', true);
  if (filters.roomId) query = query.eq('room_id', filters.roomId);
  if (filters.studentId) query = query.eq('student_id', filters.studentId);
  query = query.order('allocated_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normRoomAllocation);
}

export async function getMaintenanceRequests(filters = {}) {
  let query = supabase.from('room_maintenance').select('*, profiles!room_maintenance_student_id_fkey(*), rooms!room_maintenance_room_id_fkey(*)');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.roomId) query = query.eq('room_id', filters.roomId);
  if (filters.studentId) query = query.eq('student_id', filters.studentId);
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normMaintenance);
}

export async function createMaintenanceRequest(data) {
  const { data: result, error } = await supabase.from('room_maintenance').insert({
    room_id: data.roomId,
    student_id: data.studentId,
    issue_type: data.issueType,
    description: data.description,
    priority: data.priority || 'medium',
    status: 'pending',
  }).select().single();
  if (error) throw error;
  return normMaintenance(result);
}

export async function updateMaintenanceStatus(id, status, updates = {}) {
  const patch = { status };
  if (status === 'resolved' || status === 'closed') patch.resolved_at = new Date().toISOString();
  if (updates.assignedTo !== undefined) patch.assigned_to = updates.assignedTo;
  if (updates.resolutionNote !== undefined) patch.resolution_note = updates.resolutionNote;
  patch.updated_at = new Date().toISOString();
  const { data, error } = await supabase.from('room_maintenance').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return normMaintenance(data);
}

export async function getRoomStats(genderType) {
  const { data: roomData } = await supabase.from('rooms').select('*');
  const r = genderType ? (roomData || []).filter(r => r.gender_type === genderType) : (roomData || []);
  const total = r.length;
  const available = r.filter(x => x.status === 'available').length;
  const occupied = r.filter(x => x.status === 'occupied').length;
  const maintenance = r.filter(x => x.status === 'maintenance').length;

  const { data: allocations } = await supabase.from('room_allocations').select('*', { count: 'exact', head: true }).eq('is_current', true);
  const totalAllocated = allocations || 0;

  return { totalRooms: total, available, occupied, maintenance, totalAllocated };
}


/* ========================================
   COMPLAINT / FEEDBACK SYSTEM
   ======================================== */

function normComplaint(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id,
    category: row.category,
    subject: row.subject,
    description: row.description,
    isAnonymous: row.is_anonymous,
    status: row.status,
    priority: row.priority,
    assignedTo: row.assigned_to,
    adminResponse: row.admin_response,
    resolvedAt: row.resolved_at,
    rating: row.rating,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    student: row.profiles ? normProfile(row.profiles) : undefined,
  };
}

export async function getComplaints(filters = {}) {
  let query = supabase.from('complaints').select('*, profiles!complaints_student_id_fkey(*)');
  if (filters.status) query = query.eq('status', filters.status);
  if (filters.studentId) query = query.eq('student_id', filters.studentId);
  if (filters.category) query = query.eq('category', filters.category);
  query = query.order('created_at', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normComplaint);
}

export async function getMyComplaints(studentId) {
  return getComplaints({ studentId });
}

export async function createComplaint(data) {
  const { data: result, error } = await supabase.from('complaints').insert({
    student_id: data.studentId,
    category: data.category,
    subject: data.subject,
    description: data.description,
    is_anonymous: data.isAnonymous || false,
    priority: data.priority || 'medium',
  }).select().single();
  if (error) throw error;
  return normComplaint(result);
}

export async function updateComplaintStatus(id, status, updates = {}) {
  const patch = { status, updated_at: new Date().toISOString() };
  if (status === 'resolved' || status === 'closed') patch.resolved_at = new Date().toISOString();
  if (updates.adminResponse !== undefined) patch.admin_response = updates.adminResponse;
  if (updates.assignedTo !== undefined) patch.assigned_to = updates.assignedTo;
  if (updates.rating !== undefined) patch.rating = updates.rating;
  const { data, error } = await supabase.from('complaints').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return normComplaint(data);
}

export async function getComplaintStats() {
  const { data, error } = await supabase.from('complaints').select('status');
  if (error) return { total: 0, pending: 0, inProgress: 0, resolved: 0 };
  const d = data || [];
  return {
    total: d.length,
    pending: d.filter(x => x.status === 'pending').length,
    inProgress: d.filter(x => x.status === 'in_progress' || x.status === 'acknowledged').length,
    resolved: d.filter(x => x.status === 'resolved' || x.status === 'closed').length,
  };
}


/* ========================================
   ATTENDANCE TRACKING
   ======================================== */

function normMessAttendance(row) {
  if (!row) return null;
  return {
    id: row.id,
    studentId: row.student_id,
    menuId: row.menu_id,
    mealType: row.meal_type,
    attendanceDate: row.attendance_date,
    scannedAt: row.scanned_at,
    verifiedBy: row.verified_by,
    student: row.profiles ? normProfile(row.profiles) : undefined,
  };
}

export async function markMessAttendance(studentId, mealType, verifiedBy) {
  const today = new Date().toISOString().slice(0, 10);
  const { data: existing } = await supabase
    .from('mess_attendance')
    .select('id')
    .eq('student_id', studentId)
    .eq('attendance_date', today)
    .eq('meal_type', mealType)
    .maybeSingle();
  if (existing) throw new Error('Attendance already marked for this meal today');

  const { data: menu } = await supabase
    .from('mess_menu')
    .select('id')
    .eq('menu_date', today)
    .eq('meal_type', mealType)
    .maybeSingle();

  const { data, error } = await supabase.from('mess_attendance').insert({
    student_id: studentId,
    menu_id: menu?.id || null,
    meal_type: mealType,
    attendance_date: today,
    verified_by: verifiedBy,
  }).select().single();
  if (error) throw error;
  return normMessAttendance(data);
}

export async function getMessAttendance(filters = {}) {
  let query = supabase.from('mess_attendance').select('*, profiles!mess_attendance_student_id_fkey(*)');
  if (filters.studentId) query = query.eq('student_id', filters.studentId);
  if (filters.date) query = query.eq('attendance_date', filters.date);
  if (filters.mealType) query = query.eq('meal_type', filters.mealType);
  query = query.order('attendance_date', { ascending: false }).order('meal_type');
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normMessAttendance);
}

export async function getMessAttendanceStats(date, mealType) {
  const filter = {};
  if (date) filter.date = date;
  if (mealType) filter.mealType = mealType;
  const records = await getMessAttendance(filter);
  const uniqueStudents = new Set(records.map(r => r.studentId));
  return {
    totalRecords: records.length,
    uniqueStudents: uniqueStudents.size,
    byMeal: records.reduce((acc, r) => {
      acc[r.mealType] = (acc[r.mealType] || 0) + 1;
      return acc;
    }, {}),
  };
}

function normEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    eventDate: row.event_date,
    eventTime: row.event_time,
    venue: row.venue,
    createdBy: row.created_by,
    createdAt: row.created_at,
    type: row.type,
  };
}

export async function getEvents(filters = {}) {
  let query = supabase.from('events').select('*');
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.upcoming) query = query.gte('event_date', new Date().toISOString().slice(0, 10));
  query = query.order('event_date', { ascending: false });
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normEvent);
}

export async function createEvent(data) {
  const { data: result, error } = await supabase.from('events').insert({
    title: data.title,
    description: data.description || '',
    event_date: data.eventDate,
    event_time: data.eventTime || '',
    venue: data.venue || '',
    created_by: data.createdBy,
    type: data.type || 'cultural',
  }).select().single();
  if (error) throw error;
  return normEvent(result);
}

export async function deleteEvent(id) {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

export async function getEventAttendance(eventId) {
  const { data, error } = await supabase
    .from('event_attendance')
    .select('*, profiles!event_attendance_student_id_fkey(*)')
    .eq('event_id', eventId);
  if (error) throw error;
  return (data || []).map(a => ({
    id: a.id,
    eventId: a.event_id,
    studentId: a.student_id,
    attended: a.attended,
    markedBy: a.marked_by,
    createdAt: a.created_at,
    student: a.profiles ? normProfile(a.profiles) : undefined,
  }));
}

export async function markEventAttendance(eventId, studentIds, markedBy) {
  const records = studentIds.map(sid => ({
    event_id: eventId,
    student_id: sid,
    attended: true,
    marked_by: markedBy,
  }));
  const { data, error } = await supabase.from('event_attendance').insert(records).select();
  if (error) throw error;
  return data;
}

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


/* ========================================
   NOTIFICATIONS
   ======================================== */

function normNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    body: row.body,
    type: row.type,
    referenceType: row.reference_type,
    referenceId: row.reference_id,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}

export async function getNotifications(userId, unreadOnly = false) {
  let query = supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (unreadOnly) query = query.eq('is_read', false);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(normNotification);
}

export async function markNotificationRead(id) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId) {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
  if (error) throw error;
}

export async function createNotification(data) {
  const { data: result, error } = await supabase.from('notifications').insert({
    user_id: data.userId,
    title: data.title,
    body: data.body,
    type: data.type || 'info',
    reference_type: data.referenceType || '',
    reference_id: data.referenceId || '',
  }).select().single();
  if (error) throw error;
  return normNotification(result);
}

export async function getUnreadCount(userId) {
  const { count, error } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_read', false);
  if (error) return 0;
  return count || 0;
}


/* ========================================
   DATA EXPORT
   ======================================== */

export function exportToCSV(data, filename = 'export.csv') {
  if (!data || !data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(',')];
  for (const row of data) {
    const values = headers.map(h => {
      let val = row[h];
      if (val === null || val === undefined) val = '';
      val = String(val).replace(/"/g, '""');
      if (val.includes(',') || val.includes('"') || val.includes('\n')) val = `"${val}"`;
      return val;
    });
    csvRows.push(values.join(','));
  }
  const csvString = csvRows.join('\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export async function exportToPDF(elementId, filename = 'export.pdf') {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  const { default: html2pdf } = await import('html2pdf.js');
  const opt = {
    margin: 0.5,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' },
  };
  await html2pdf().set(opt).from(element).save();
}

/* ========================================
   MESS WALLET & STOCK MANAGEMENT
   ======================================== */

function normStockItem(row) {
  if (!row) return null;
  return { id: row.id, name: row.name, category: row.category, unit: row.unit, createdAt: row.created_at };
}

export async function getStockInventory() {
  const items = await getStockItems();
  const { data: purchases } = await supabase.from('mess_stock_purchases').select('item_id, quantity');
  const { data: usageItems } = await supabase.from('mess_daily_usage_items').select('item_id, quantity_used');
  const purchased = {}; const used = {};
  (purchases || []).forEach(p => { purchased[p.item_id] = (purchased[p.item_id] || 0) + p.quantity; });
  (usageItems || []).forEach(u => { used[u.item_id] = (used[u.item_id] || 0) + u.quantity_used; });
  return items.map(i => ({
    ...i,
    totalPurchased: Math.round((purchased[i.id] || 0) * 100) / 100,
    totalUsed: Math.round((used[i.id] || 0) * 100) / 100,
    remaining: Math.round(((purchased[i.id] || 0) - (used[i.id] || 0)) * 100) / 100,
  }));
}

export async function getStockItems() {
  const { data, error } = await supabase.from('mess_stock_items').select('*').order('name');
  if (error) throw error;
  return (data || []).map(normStockItem);
}

export async function createStockItem(data) {
  const { data: result, error } = await supabase.from('mess_stock_items').insert({ name: data.name, category: data.category, unit: data.unit }).select().single();
  if (error) throw error;
  return normStockItem(result);
}

export async function updateStockItem(id, data) {
  const patch = {};
  if (data.name !== undefined) patch.name = data.name;
  if (data.category !== undefined) patch.category = data.category;
  if (data.unit !== undefined) patch.unit = data.unit;
  const { data: result, error } = await supabase.from('mess_stock_items').update(patch).eq('id', id).select().single();
  if (error) throw error;
  return normStockItem(result);
}

function normStockPurchase(row) {
  if (!row) return null;
  return { id: row.id, itemId: row.item_id, quantity: row.quantity, unitPrice: row.unit_price, totalCost: row.total_cost, purchasedDate: row.purchased_date, purchasedBy: row.purchased_by, notes: row.notes, createdAt: row.created_at, item: row.mess_stock_items ? normStockItem(row.mess_stock_items) : undefined };
}

export async function getStockPurchases(filters = {}) {
  let q = supabase.from('mess_stock_purchases').select('*, mess_stock_items!mess_stock_purchases_item_id_fkey(*)').order('purchased_date', { ascending: false }).order('created_at', { ascending: false });
  if (filters.itemId) q = q.eq('item_id', filters.itemId);
  if (filters.fromDate) q = q.gte('purchased_date', filters.fromDate);
  if (filters.toDate) q = q.lte('purchased_date', filters.toDate);
  if (filters.limit) q = q.limit(filters.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data || []).map(normStockPurchase);
}

export async function createStockPurchase(data) {
  const { data: result, error } = await supabase.from('mess_stock_purchases').insert({ item_id: data.itemId, quantity: data.quantity, unit_price: data.unitPrice, total_cost: data.totalCost, purchased_date: data.purchasedDate || new Date().toISOString().slice(0, 10), purchased_by: data.purchasedBy, notes: data.notes || '' }).select().single();
  if (error) throw error;
  return normStockPurchase(result);
}

function normDailyUsage(row) {
  if (!row) return null;
  return { id: row.id, usageDate: row.usage_date, createdAt: row.created_at, items: (row.mess_daily_usage_items || []).map(i => ({ id: i.id, itemId: i.item_id, quantityUsed: i.quantity_used, item: i.mess_stock_items ? normStockItem(i.mess_stock_items) : undefined })) };
}

export async function getDailyUsage(dateStr) {
  const { data, error } = await supabase.from('mess_daily_usage').select('*, mess_daily_usage_items!mess_daily_usage_items_usage_id_fkey(*, mess_stock_items!mess_daily_usage_items_item_id_fkey(*))').eq('usage_date', dateStr).maybeSingle();
  if (error) throw error;
  return normDailyUsage(data);
}

export async function saveDailyUsage(dateStr, items, userId) {
  let { data: usage } = await supabase.from('mess_daily_usage').select('id').eq('usage_date', dateStr).maybeSingle();
  if (!usage) {
    const { data: ins, error: ie } = await supabase.from('mess_daily_usage').insert({ usage_date: dateStr }).select().single();
    if (ie) throw ie;
    usage = ins;
  }
  await supabase.from('mess_daily_usage_items').delete().eq('usage_id', usage.id);
  if (items.length > 0) {
    const rows = items.map(i => ({ usage_id: usage.id, item_id: i.itemId, quantity_used: i.quantityUsed }));
    const { error } = await supabase.from('mess_daily_usage_items').insert(rows);
    if (error) throw error;
  }
  return getDailyUsage(dateStr);
}

function normDailyBill(row) {
  if (!row) return null;
  return { id: row.id, billDate: row.bill_date, totalStockCost: row.total_stock_cost, totalStudents: row.total_students, perStudentCost: row.per_student_cost, calculatedAt: row.calculated_at, calculatedBy: row.calculated_by };
}

export async function getDailyBill(dateStr) {
  const { data, error } = await supabase.from('mess_daily_bills').select('*').eq('bill_date', dateStr).maybeSingle();
  if (error) throw error;
  return normDailyBill(data);
}

export async function getBillHistory(limit = 30) {
  const { data, error } = await supabase.from('mess_daily_bills').select('*').order('bill_date', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).map(normDailyBill);
}

export async function calculateDailyBill(dateStr, userId) {
  const usage = await getDailyUsage(dateStr);
  if (!usage || !usage.items || usage.items.length === 0) throw new Error('No stock usage recorded for this date');

  let totalStockCost = 0;
  for (const u of usage.items) {
    const { data: purchases } = await supabase.from('mess_stock_purchases').select('unit_price').eq('item_id', u.itemId).order('purchased_date', { ascending: false }).limit(1);
    const price = (purchases && purchases.length > 0) ? purchases[0].unit_price : 0;
    totalStockCost += u.quantityUsed * price;
  }

  const { data: attendance } = await supabase.from('mess_attendance').select('student_id').eq('attendance_date', dateStr);
  const uniqueStudents = [...new Set((attendance || []).map(a => a.student_id))];
  if (uniqueStudents.length === 0) throw new Error('No students attended mess today');

  const perStudentCost = Math.round((totalStockCost / uniqueStudents.length) * 100) / 100;

  const { data: bill, error: be } = await supabase.from('mess_daily_bills').upsert({ bill_date: dateStr, total_stock_cost: totalStockCost, total_students: uniqueStudents.length, per_student_cost: perStudentCost, calculated_by: userId }).select().single();
  if (be) throw be;

  const { data: wallets } = await supabase.from('mess_wallets').select('*').in('student_id', uniqueStudents);
  const walletMap = {};
  (wallets || []).forEach(w => { walletMap[w.student_id] = w; });

  const schedulerUser = getCurrentUser();
  for (const sid of uniqueStudents) {
    const wallet = walletMap[sid];
    if (!wallet || wallet.balance < perStudentCost) continue;
    const newBalance = Math.round((wallet.balance - perStudentCost) * 100) / 100;
    await supabase.from('mess_wallets').update({ balance: newBalance, updated_at: new Date().toISOString() }).eq('id', wallet.id);
    await supabase.from('mess_wallet_transactions').insert({ student_id: sid, type: 'deduction', amount: perStudentCost, balance_before: wallet.balance, balance_after: newBalance, bill_id: bill.id, description: `Mess bill for ${dateStr}` });
    const minAlert = wallet.minimum_balance_alert ?? 500;
    if (newBalance < minAlert && newBalance >= 0) {
      await createNotification({ userId: sid, title: 'Low Wallet Balance', body: `Your mess wallet balance is ₹${newBalance}. Please recharge soon.`, type: 'warning', referenceType: 'wallet', referenceId: bill.id });
      const { data: wardens } = await supabase.from('profiles').select('id').in('role', ['boys_warden', 'girls_warden']);
      if (wardens) {
        for (const w of wardens) {
          await createNotification({ userId: w.id, title: 'Student Low Balance', body: `Student wallet ₹${newBalance}. Please notify them.`, type: 'warning', referenceType: 'wallet', referenceId: bill.id });
        }
      }
    }
  }
  return normDailyBill(bill);
}

function normWallet(row) {
  if (!row) return null;
  return { id: row.id, studentId: row.student_id, balance: row.balance, totalDeposited: row.total_deposited, semester: row.semester, academicYear: row.academic_year, minimumBalanceAlert: row.minimum_balance_alert, updatedAt: row.updated_at, student: row.profiles ? (() => { const p = normProfile(row.profiles); return p ? { id: p.id, name: p.name, department: p.department, year: p.year, registrationNo: p.registrationNo, hostelType: p.hostelType } : null; })() : undefined };
}

export async function getWallet(studentId) {
  const { data, error } = await supabase.from('mess_wallets').select('*, profiles!mess_wallets_student_id_fkey(*)').eq('student_id', studentId).maybeSingle();
  if (error) throw error;
  return normWallet(data);
}

export async function getWallets() {
  const { data, error } = await supabase.from('mess_wallets').select('*, profiles!mess_wallets_student_id_fkey(*)').order('student_id');
  if (error) throw error;
  return (data || []).map(normWallet);
}

export async function createWallet(studentId, semester, academicYear) {
  const { data, error } = await supabase.from('mess_wallets').insert({ student_id: studentId, balance: 0, total_deposited: 0, semester: semester || 1, academic_year: academicYear || '' }).select().single();
  if (error) throw error;
  return normWallet(data);
}

export async function depositWallet(studentId, amount, userId) {
  let { data: wallet } = await supabase.from('mess_wallets').select('*').eq('student_id', studentId).maybeSingle();
  if (!wallet) {
    const { data: ins, error: ie } = await supabase.from('mess_wallets').insert({ student_id: studentId, balance: 0, total_deposited: 0, semester: 1, academic_year: '' }).select().single();
    if (ie) throw ie;
    wallet = ins;
  }
  const newBalance = Math.round((wallet.balance + amount) * 100) / 100;
  const newDeposited = Math.round((wallet.total_deposited + amount) * 100) / 100;
  await supabase.from('mess_wallets').update({ balance: newBalance, total_deposited: newDeposited, updated_at: new Date().toISOString() }).eq('id', wallet.id);
  await supabase.from('mess_wallet_transactions').insert({ student_id: studentId, type: 'deposit', amount, balance_before: wallet.balance, balance_after: newBalance, description: `Deposit of ₹${amount}` });
  if (userId) {
    await createNotification({ userId: studentId, title: 'Wallet Recharged', body: `₹${amount} has been added to your mess wallet.`, type: 'success', referenceType: 'wallet', referenceId: wallet.id });
  }
  return getWallet(studentId);
}

export async function getWalletTransactions(studentId, limit = 100) {
  const { data, error } = await supabase.from('mess_wallet_transactions').select('*').eq('student_id', studentId).order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return (data || []).map(r => ({ id: r.id, studentId: r.student_id, type: r.type, amount: r.amount, balanceBefore: r.balance_before, balanceAfter: r.balance_after, billId: r.bill_id, description: r.description, transactionDate: r.transaction_date, createdAt: r.created_at }));
}

export async function getLowBalanceWallets(threshold) {
  const { data, error } = await supabase.from('mess_wallets').select('*, profiles!mess_wallets_student_id_fkey(*)').lt('balance', threshold || 500).order('balance');
  if (error) throw error;
  return (data || []).map(normWallet);
}

export async function getMonthlyMessReport(year, month) {
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const startDate = `${prefix}-01`;
  const endDate = `${prefix}-31`;
  const { data: bills } = await supabase.from('mess_daily_bills').select('*').gte('bill_date', startDate).lte('bill_date', endDate).order('bill_date');
  const { data: txns } = await supabase.from('mess_wallet_transactions').select('*, profiles!mess_wallet_transactions_student_id_fkey(*)').gte('transaction_date', startDate).lte('transaction_date', endDate).order('transaction_date');
  const students = {};
  (txns || []).forEach(t => {
    if (!students[t.student_id]) {
      const p = t.profiles;
      students[t.student_id] = { name: p?.name || 'Unknown', department: p?.department || '', year: p?.year || '', regNo: (p?.email || '').split('@')[0] || '', deposits: 0, deductions: 0, totalDeducted: 0, days: {} };
    }
    if (t.type === 'deposit') {
      students[t.student_id].deposits += t.amount;
    } else if (t.type === 'deduction') {
      students[t.student_id].deductions += t.amount;
      students[t.student_id].totalDeducted += t.amount;
      students[t.student_id].days[t.transaction_date] = (students[t.student_id].days[t.transaction_date] || 0) + t.amount;
    }
  });
  return { bills: (bills || []).map(normDailyBill), students: Object.entries(students).map(([id, s]) => ({ studentId: id, ...s })) };
}

export function exportLeavesToCSV(leaves) {
  const data = leaves.map(l => ({
    'Leave ID': l.leaveId,
    'Student Name': l.student?.name || '',
    'Department': l.student?.department || '',
    'Type': l.type,
    'Reason': l.reason,
    'Out Date': l.outDate,
    'In Date': l.inDate,
    'Status': l.approvalStatus,
    'Applied On': l.createdAt,
  }));
  exportToCSV(data, 'leaves-export.csv');
}

export function exportUsersToCSV(users) {
  const data = users.map(u => ({
    Name: u.name,
    Email: u.email,
    Role: u.role,
    Department: u.department,
    Year: u.year,
    'Room No': u.roomNumber,
    Block: u.blockName,
    Phone: u.phone,
    Status: u.activeStatus,
    Joined: u.createdAt,
  }));
  exportToCSV(data, 'users-export.csv');
}
