import { supabase } from './supabase.js';
import { logAudit } from './store.js';

let _currentProfile = null;

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  const profile = await fetchProfile(data.user.id);
  if (!profile) {
    throw new Error('User profile could not be found. Please verify your database RLS policies.');
  }

  if (!profile.isApproved) {
    await supabase.auth.signOut();
    _currentProfile = null;
    throw new Error('Your account is pending admin approval. Please wait for a staff member to approve your registration.');
  }

  _currentProfile = profile;
  logAudit('LOGIN', profile.id, 'user', profile.id, `${profile.name} signed in`);
  return { user: data.user, profile };
}

export async function register(email, password, profileData) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name:           profileData.name,
        role:           profileData.role || 'student',
        gender:         profileData.gender,
        hostel_type:    profileData.hostelType,
        department:     profileData.department,
        year:           profileData.year,
        room_number:    profileData.roomNumber,
        block_name:     profileData.blockName,
        phone:          profileData.phone,
        guardian_name:  profileData.guardianName,
        guardian_phone: profileData.guardianPhone,
      }
    }
  });
  if (error) {
    if (error.status === 429 || (error.message && error.message.toLowerCase().includes('rate'))) {
      throw new Error('Too many registration attempts. Please wait a few minutes and try again. If this persists, disable email confirmation in your Supabase Auth settings.');
    }
    throw error;
  }

  const user = data.user;
  if (!user) throw new Error('Sign up failed');

  const patch = {
    id:             user.id,
    email:          user.email,
    name:           profileData.name,
    role:           profileData.role || 'student',
    gender:         profileData.gender,
    hostel_type:    profileData.hostelType,
    department:     profileData.department,
    year:           profileData.year,
    room_number:    profileData.roomNumber,
    block_name:     profileData.blockName,
    phone:          profileData.phone,
    guardian_name:  profileData.guardianName,
    guardian_phone: profileData.guardianPhone,
    active_status:  'IN',
    is_approved:    false,
  };

  try {
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(patch);
    if (profileError && profileError.code !== '42501') {
      throw profileError;
    }
  } catch (err) {
    console.warn('Profile upsert fallback failed (ok if trigger handles it):', err);
  }

  if (!data.session) {
    return {
      user: null,
      profile: null,
      requiresApproval: true,
      message: 'Registration submitted! An admin will approve your account shortly. Please check back later.',
    };
  }

  let profile = null;
  try {
    profile = await fetchProfile(user.id);
  } catch (err) {
    throw new Error('Account created. Please wait for admin approval before logging in.');
  }

  if (profile && !profile.isApproved) {
    await supabase.auth.signOut();
    _currentProfile = null;
    return {
      user: null,
      profile: null,
      requiresApproval: true,
      message: 'Registration submitted! An admin will approve your account shortly.',
    };
  }

  _currentProfile = profile;
  return { user, profile, requiresApproval: false };
}

export async function logout() {
  const user = _currentProfile;
  _currentProfile = null;
  const { error } = await supabase.auth.signOut();
  if (!error && user) {
    logAudit('LOGOUT', user.id, 'user', user.id, `${user.name} signed out`);
  }
  if (error) throw error;
}

export function getCurrentUser() {
  return _currentProfile;
}

export async function loadCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) { _currentProfile = null; return null; }

  const profile = await fetchProfile(session.user.id);
  if (profile && !profile.isApproved) {
    await supabase.auth.signOut();
    _currentProfile = null;
    return null;
  }

  _currentProfile = profile;
  return profile;
}

async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return normaliseProfile(data);
}

function normaliseProfile(row) {
  const regMatch = row.email ? row.email.match(/^(\d{12})@ucea\.edu\.in$/) : null;
  const registrationNo = regMatch ? regMatch[1] : null;

  return {
    id:             row.id,
    name:           row.name,
    email:          row.email,
    role:           row.role || 'student',
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
    isMessMember:   row.is_mess_member || false,
  };
}

export function isLoggedIn() {
  return !!_currentProfile;
}

export function getRole() {
  return _currentProfile?.role;
}

export function isMessMember() {
  return _currentProfile?.isMessMember === true;
}

export function getHomeRoute(role) {
  if (role === 'admin') return '#/admin/dashboard';
  if (role === 'security') return '#/gate/dashboard';
  if (role === 'boys_warden' || role === 'girls_warden') return '#/warden/dashboard';
  return '#/student/dashboard';
}

export async function changePassword(currentPassword, newPassword) {
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: _currentProfile?.email || '',
    password: currentPassword,
  });
  if (signInError) throw new Error('Current password is incorrect');

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}
