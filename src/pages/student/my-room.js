import { getCurrentUser } from '../../auth.js';
import { getMyAllocation, getMaintenanceRequests, createMaintenanceRequest } from '../../store.js';
import { studentNav, showToast, escapeHtml, statusChip, formatDate, renderPageHeader, renderLogoutIcon } from '../../helpers.js';

export default async function myRoomPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const allocation = await getMyAllocation(user.id);
    const maintenanceReqs = await getMaintenanceRequests({ studentId: user.id });

    app.innerHTML = `
      <div class="page-container">
        ${renderPageHeader('UCE IT', 'My Room', `<div class="flex items-center gap-sm">${renderLogoutIcon()}</div>`)}

        <div style="padding:16px;padding-bottom:80px;">
          ${allocation ? renderRoomInfo(allocation) : renderNoRoom()}

          <h3 style="margin:20px 0 12px 0;font-size:16px;font-weight:600;">Maintenance Requests</h3>
          <button class="btn btn-primary btn-sm btn-block" id="newMaintenanceBtn" style="margin-bottom:12px;">
            <span class="material-icons-outlined" style="font-size:16px;">add</span> Report Issue
          </button>

          ${maintenanceReqs.length === 0
            ? '<div class="card" style="padding:24px;text-align:center;color:var(--outline);font-size:13px;">No maintenance requests</div>'
            : maintenanceReqs.map(m => `
              <div class="card" style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:4px;">
                  <span class="chip ${statusChipClass(m.status)}">${m.status}</span>
                  <span style="font-size:11px;color:var(--outline);">${formatDate(m.createdAt)}</span>
                </div>
                <div style="font-size:13px;font-weight:600;margin-bottom:4px;text-transform:capitalize;">${escapeHtml(m.issueType.replace(/_/g,' '))}</div>
                <div style="font-size:13px;color:var(--on-surface-variant);">${escapeHtml(m.description)}</div>
                ${m.resolutionNote ? `<div style="font-size:12px;color:var(--primary-container);margin-top:4px;">Resolution: ${escapeHtml(m.resolutionNote)}</div>` : ''}
              </div>
            `).join('')}
        </div>

        ${studentNav('profile')}
      </div>
    `;

    document.getElementById('newMaintenanceBtn')?.addEventListener('click', showMaintenanceModal);
  }

  function renderRoomInfo(allocation) {
    const room = allocation.room;
    const statusColor = room.status === 'available' ? 'var(--status-success)' : room.status === 'occupied' ? 'var(--primary-container)' : 'var(--status-warning)';
    return `
      <div class="card card-elevated" style="margin-bottom:16px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="width:56px;height:56px;border-radius:12px;background:var(--primary-fixed);display:flex;align-items:center;justify-content:center;">
            <span class="material-icons-outlined" style="font-size:28px;color:var(--primary-container);">meeting_room</span>
          </div>
          <div>
            <div style="font-size:18px;font-weight:700;">Room ${escapeHtml(room.roomNumber)}</div>
            <div style="font-size:13px;color:var(--on-surface-variant);">${escapeHtml(room.blockName)} • Floor ${room.floor}</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;">
          <div class="stat-card" style="padding:10px;">
            <div class="stat-value" style="font-size:18px;">${room.roomType}</div>
            <div class="stat-label" style="font-size:10px;">Type</div>
          </div>
          <div class="stat-card" style="padding:10px;">
            <div class="stat-value" style="font-size:18px;">${room.capacity}</div>
            <div class="stat-label" style="font-size:10px;">Capacity</div>
          </div>
          <div class="stat-card" style="padding:10px;">
            <div class="stat-value" style="font-size:18px;color:${statusColor};">${room.status}</div>
            <div class="stat-label" style="font-size:10px;">Status</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--outline);margin-top:8px;">Allocated on ${formatDate(allocation.allocatedAt)}</div>
      </div>
    `;
  }

  function renderNoRoom() {
    return `
      <div class="card" style="padding:32px;text-align:center;">
        <span class="material-icons-outlined" style="font-size:48px;color:var(--outline);">hotel</span>
        <h3 style="margin:12px 0 4px 0;">No Room Assigned</h3>
        <p style="font-size:13px;color:var(--on-surface-variant);margin:0;">Contact the warden or admin for room allocation.</p>
      </div>
    `;
  }

  function statusChipClass(status) {
    const map = { pending: 'chip-pending', acknowledged: 'chip-info', in_progress: 'chip-pending', resolved: 'chip-approved', closed: 'chip-neutral' };
    return map[status] || 'chip-neutral';
  }

  function showMaintenanceModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">Report Maintenance Issue</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Issue Type</label>
            <select class="form-input" id="issueType">
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="furniture">Furniture</option>
              <option value="cleaning">Cleaning</option>
              <option value="pest_control">Pest Control</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select class="form-input" id="issuePriority">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input" id="issueDesc" rows="3" placeholder="Describe the issue in detail..."></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="modalConfirm">Submit</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const desc = document.getElementById('issueDesc').value.trim();
      if (!desc) { showToast('Please describe the issue', 'warning'); return; }
      try {
        const alloc = await getMyAllocation(user.id);
        if (!alloc) { showToast('No room assigned', 'error'); backdrop.remove(); return; }
        await createMaintenanceRequest({
          roomId: alloc.roomId,
          studentId: user.id,
          issueType: document.getElementById('issueType').value,
          description: desc,
          priority: document.getElementById('issuePriority').value,
        });
        showToast('Issue reported successfully!', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message || 'Failed to submit', 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  render();
}
