/* ========================================
   Caretaker - Leave Requests List (Supabase)
   ======================================== */

import { getCurrentUser } from '../../auth.js';
import { getLeavesByHostel, approveLeave, rejectLeave } from '../../store.js';
import { caretakerNav, statusChip, formatDateRange, getInitials, showToast, showModal, renderPageHeader, renderAvatar, escapeHtml } from '../../helpers.js';

export default async function caretakerRequests(app) {
  const user = getCurrentUser();
  if (!user) return;

  const hostelType = user.hostelType || (user.role === 'boys_caretaker' ? 'Boys' : 'Girls');
  let filter = 'All';
  let deptFilter = 'All';

  await render();

  async function render() {
    let leaves = await getLeavesByHostel(hostelType);

    if (filter !== 'All') {
      leaves = leaves.filter(l => l.approvalStatus === filter);
    }
    if (deptFilter !== 'All') {
      leaves = leaves.filter(l => {
        const s = l.student;
        return s && s.department === deptFilter;
      });
    }

    app.innerHTML = `
      ${renderPageHeader('Leave Requests', `${hostelType} Hostel`)}
      <div class="page">
        <!-- Status Filters -->
        <div class="filter-tabs" id="statusFilters">
          ${['All', 'Pending', 'Approved', 'Rejected'].map(f => `
            <button class="filter-tab ${filter === f ? 'active' : ''}" data-filter="${f}">${f}</button>
          `).join('')}
        </div>

        <!-- Department Filter -->
        <div style="margin-top:var(--space-sm);margin-bottom:var(--space-md);">
          <select class="form-select" id="deptFilter" style="padding:8px 12px;font-size:12px;">
            <option value="All">All Departments</option>
            <option value="CSE" ${deptFilter === 'CSE' ? 'selected' : ''}>CSE</option>
            <option value="ECE" ${deptFilter === 'ECE' ? 'selected' : ''}>ECE</option>
            <option value="MECH" ${deptFilter === 'MECH' ? 'selected' : ''}>MECH</option>
            <option value="CIVIL" ${deptFilter === 'CIVIL' ? 'selected' : ''}>CIVIL</option>
            <option value="EEE" ${deptFilter === 'EEE' ? 'selected' : ''}>EEE</option>
          </select>
        </div>

        <div class="pending-list stagger">
          ${leaves.length > 0 ? leaves.map(l => {
            const student = l.student;
            if (!student) return '';
            return `
              <div class="leave-card animate-fade-in-up">
                <div class="leave-card-header">
                  <div class="leave-card-student">
                    ${renderAvatar(student, 'leave-card-avatar')}
                    <div>
                      <div class="leave-card-name">${escapeHtml(student.name)}</div>
                      <div class="leave-card-meta">${escapeHtml(student.department)} • ${escapeHtml(student.year)} Year</div>
                    </div>
                  </div>
                  ${statusChip(l.approvalStatus)}
                </div>
                <div class="leave-card-meta" style="margin:4px 0;">
                  ${formatDateRange(l.outDate, l.inDate)} • ${escapeHtml(l.type)}
                </div>
                ${l.reason ? `<div class="leave-card-reason">"${escapeHtml(l.reason)}"</div>` : ''}
                ${l.approvalStatus === 'Pending' ? `
                  ${student.guardianName ? `
                    <div class="leave-card-guardian">
                      <span class="material-icons-outlined" style="font-size:16px;">phone_in_talk</span>
                      <span>${escapeHtml(student.guardianName)} ${student.guardianPhone ? `• ${escapeHtml(student.guardianPhone)}` : ''}</span>
                      ${student.guardianPhone ? `<a href="tel:${escapeHtml(student.guardianPhone)}" class="btn btn-outline btn-sm" style="padding:2px 8px;font-size:11px;margin-left:auto;text-decoration:none;display:flex;align-items:center;gap:4px;"><span class="material-icons-outlined" style="font-size:14px;">call</span> Call</a>` : ''}
                    </div>
                  ` : ''}
                  <div class="leave-card-actions">
                    <button class="btn btn-success btn-sm" style="flex:1;" data-approve="${l.leaveId}">Approve</button>
                    <button class="btn btn-danger btn-sm" style="flex:1;" data-reject="${l.leaveId}">Reject</button>
                  </div>
                ` : ''}
              </div>
            `;
          }).join('') : `
            <div class="empty-state">
              <span class="material-icons-outlined">inbox</span>
              <div class="empty-state-title">No requests found</div>
              <div class="empty-state-desc">No ${filter !== 'All' ? filter.toLowerCase() : ''} leave requests.</div>
            </div>
          `}
        </div>
      </div>
      ${caretakerNav('leaves')}
    `;

    // Filter handlers
    document.querySelectorAll('[data-filter]').forEach(tab => {
      tab.addEventListener('click', async () => { filter = tab.dataset.filter; await render(); });
    });
    document.getElementById('deptFilter')?.addEventListener('change', async (e) => {
      deptFilter = e.target.value; await render();
    });

    // Approve / Reject
    document.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', () => {
        showModal('Approve Leave', 'Generate QR outpass for this student?', async () => {
          await approveLeave(btn.dataset.approve, user.id);
          showToast('Approved! QR generated.', 'success');
          await render();
        }, 'Approve', 'btn-success');
      });
    });
    document.querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', () => {
        showModal('Reject Leave', 'Reject this leave request?', async () => {
          await rejectLeave(btn.dataset.reject, user.id, 'Not approved');
          showToast('Request rejected.', 'error');
          await render();
        }, 'Reject', 'btn-danger');
      });
    });
  }
}
