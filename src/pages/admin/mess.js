import { getCurrentUser } from '../../auth.js';
import { toggleMessMember, getUsers, getMessMembers } from '../../store.js';
import { adminNav, showToast, escapeHtml, getInitials, renderNotifBell } from '../../helpers.js';

export default async function adminMess(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const allUsers = await getUsers();
    const messMembers = await getMessMembers();
    const messMemberIds = new Set(messMembers.map(m => m.id));

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Mess Management</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderNotifBell()}
            ${user.name ? `<span style="font-size:13px;color:var(--on-surface-variant)">${escapeHtml(user.name.split(' ')[0])}</span>` : ''}
          </div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button class="btn btn-sm btn-primary" id="tabStudents" style="flex:1;">Students</button>
            <button class="btn btn-sm btn-ghost" id="tabMembers" style="flex:1;">Mess Members</button>
          </div>

          <div id="tabContent">
            ${renderStudentsTab(allUsers, messMemberIds)}
          </div>
        </div>

        ${adminNav('mess')}
      </div>
    `;

    document.getElementById('tabStudents').onclick = () => {
      document.getElementById('tabStudents').className = 'btn btn-sm btn-primary';
      document.getElementById('tabMembers').className = 'btn btn-sm btn-ghost';
      document.getElementById('tabContent').innerHTML = renderStudentsTab(allUsers, messMemberIds);
      attachToggleHandlers();
    };
    document.getElementById('tabMembers').onclick = () => {
      document.getElementById('tabMembers').className = 'btn btn-sm btn-primary';
      document.getElementById('tabStudents').className = 'btn btn-sm btn-ghost';
      document.getElementById('tabContent').innerHTML = renderMembersTab(messMembers);
    };

    attachToggleHandlers();
  }

  function renderStudentsTab(users, memberIds) {
    const students = users.filter(u => u.role === 'student');
    if (!students.length) return '<div class="card" style="padding:32px;text-align:center;color:var(--outline);">No students found.</div>';

    return `
      <h3 style="font-size:16px;margin:0 0 12px 0;">Students (${students.length})</h3>
      ${students.map(s => `
        <div class="card" style="margin-bottom:8px;display:flex;align-items:center;gap:12px;">
          <div class="profile-avatar-large" style="width:40px;height:40px;font-size:14px;flex-shrink:0;">${getInitials(s.name)}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:14px;">${escapeHtml(s.name)}</div>
            <div style="font-size:12px;color:var(--outline);">${s.roomNumber || ''} ${s.hostelType || ''}</div>
          </div>
          <label class="toggle-switch" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
            <input type="checkbox" ${memberIds.has(s.id) ? 'checked' : ''} class="mess-member-toggle" data-user-id="${s.id}" style="width:20px;height:20px;accent-color:var(--primary);">
            <span style="font-size:12px;color:var(--outline);">Mess</span>
          </label>
        </div>
      `).join('')}
    `;
  }

  function renderMembersTab(members) {
    if (!members.length) return '<div class="card" style="padding:32px;text-align:center;color:var(--outline);">No mess members assigned.</div>';

    return `
      <h3 style="font-size:16px;margin:0 0 12px 0;">Mess Members (${members.length})</h3>
      ${members.map(m => `
        <div class="card" style="margin-bottom:8px;display:flex;align-items:center;gap:12px;">
          <div class="profile-avatar-large" style="width:40px;height:40px;font-size:14px;flex-shrink:0;">${getInitials(m.name)}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:14px;">${escapeHtml(m.name)}</div>
            <div style="font-size:12px;color:var(--outline);">${m.roomNumber || ''} ${m.hostelType || ''}</div>
          </div>
          <button class="btn btn-danger btn-sm remove-member-btn" data-user-id="${m.id}">Remove</button>
        </div>
      `).join('')}
    `;
  }

  function attachToggleHandlers() {
    app.querySelectorAll('.mess-member-toggle').forEach(cb => {
      cb.onchange = async () => {
        try {
          await toggleMessMember(cb.dataset.userId, cb.checked);
          showToast(cb.checked ? 'Mess member added' : 'Mess member removed', 'success');
        } catch (e) {
          showToast(e.message || 'Failed to update', 'error');
          cb.checked = !cb.checked;
        }
      };
    });

    app.querySelectorAll('.remove-member-btn').forEach(btn => {
      btn.onclick = async () => {
        try {
          await toggleMessMember(btn.dataset.userId, false);
          showToast('Mess member removed', 'success');
          document.getElementById('tabMembers').click();
        } catch (e) {
          showToast(e.message || 'Failed to remove', 'error');
        }
      };
    });
  }

  render();
}
