import { getCurrentUser } from '../../auth.js';
import { getComplaints, updateComplaintStatus, getComplaintStats } from '../../store.js';
import { adminNav, showToast, escapeHtml, formatDate, renderPageHeader, renderNotifBell, renderBackButton } from '../../helpers.js';

export default async function adminComplaintsPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const [complaints, stats] = await Promise.all([
      getComplaints(),
      getComplaintStats(),
    ]);

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            ${renderBackButton()}
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Complaints</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderNotifBell()}
            <span style="font-size:13px;color:var(--on-surface-variant);">${escapeHtml(user.name?.split(' ')[0] || '')}</span>
          </div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <div style="display:flex;gap:6px;margin-bottom:16px;">
            <div class="stat-card" style="padding:8px;"><div class="stat-value" style="font-size:16px;">${stats.total}</div><div class="stat-label" style="font-size:9px;">Total</div></div>
            <div class="stat-card" style="padding:8px;"><div class="stat-value" style="font-size:16px;color:var(--status-warning);">${stats.pending}</div><div class="stat-label" style="font-size:9px;">Pending</div></div>
            <div class="stat-card" style="padding:8px;"><div class="stat-value" style="font-size:16px;color:var(--primary-container);">${stats.inProgress}</div><div class="stat-label" style="font-size:9px;">In Progress</div></div>
            <div class="stat-card" style="padding:8px;"><div class="stat-value" style="font-size:16px;color:var(--status-success);">${stats.resolved}</div><div class="stat-label" style="font-size:9px;">Resolved</div></div>
          </div>

          <div class="filter-tabs" id="compFilter" style="margin-bottom:12px;">
            <button class="filter-tab active" data-cf="all">All</button>
            <button class="filter-tab" data-cf="pending">Pending</button>
            <button class="filter-tab" data-cf="in_progress">In Progress</button>
            <button class="filter-tab" data-cf="resolved">Resolved</button>
          </div>

          <div id="complaintsList">
            ${complaints.map(c => renderComplaintCard(c)).join('')}
          </div>
        </div>

        ${adminNav('manage')}
      </div>
    `;

    document.querySelectorAll('#compFilter .filter-tab').forEach(tab => {
      tab.onclick = async () => {
        document.querySelectorAll('#compFilter .filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const all = await getComplaints();
        const filtered = tab.dataset.cf === 'all' ? all : all.filter(c => c.status === tab.dataset.cf);
        document.getElementById('complaintsList').innerHTML = filtered.map(c => renderComplaintCard(c)).join('');
        bindActions();
      };
    });

    bindActions();
  }

  function renderComplaintCard(c) {
    return `
      <div class="card" style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <div style="display:flex;gap:4px;margin-bottom:4px;flex-wrap:wrap;">
              <span class="chip ${c.priority === 'urgent' ? 'chip-rejected' : c.priority === 'high' ? 'chip-pending' : 'chip-neutral'}">${c.priority}</span>
              <span class="chip ${statusClass(c.status)}">${c.status}</span>
              <span class="chip chip-info" style="text-transform:capitalize;">${c.category}</span>
            </div>
            <div style="font-size:14px;font-weight:600;">${escapeHtml(c.subject)}</div>
            <div style="font-size:12px;color:var(--on-surface-variant);margin:2px 0;">
              ${c.isAnonymous ? 'Anonymous' : escapeHtml(c.student?.name || 'Unknown')} • ${escapeHtml(c.student?.department || '')}
            </div>
            <div style="font-size:12px;margin:4px 0;">${escapeHtml(c.description)}</div>
            ${c.adminResponse ? `<div style="margin-top:6px;padding:6px;background:var(--primary-fixed);border-radius:4px;font-size:12px;"><strong>Response:</strong> ${escapeHtml(c.adminResponse)}</div>` : ''}
            ${c.rating ? `<div style="font-size:11px;color:var(--status-warning);margin-top:4px;">Rating: ${'★'.repeat(c.rating)}${'☆'.repeat(5-c.rating)}</div>` : ''}
            <div style="font-size:10px;color:var(--outline);margin-top:4px;">${formatDate(c.createdAt)}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;min-width:80px;">
            ${c.status === 'pending' ? `<button class="btn btn-sm btn-primary acknowledgeComp" data-id="${c.id}">Acknowledge</button>` : ''}
            ${c.status === 'acknowledged' ? `<button class="btn btn-sm btn-pending inProgressComp" data-id="${c.id}">In Progress</button>` : ''}
            ${c.status === 'in_progress' ? `<button class="btn btn-sm btn-success resolveComp" data-id="${c.id}">Resolve</button>` : ''}
            ${c.status !== 'closed' ? `<button class="btn btn-sm btn-ghost closeComp" data-id="${c.id}" style="color:var(--outline);">Close</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function statusClass(status) {
    const map = { pending: 'chip-pending', acknowledged: 'chip-info', in_progress: 'chip-pending', resolved: 'chip-approved', closed: 'chip-neutral' };
    return map[status] || 'chip-neutral';
  }

  function bindActions() {
    app.querySelectorAll('.acknowledgeComp').forEach(btn => btn.onclick = () => updateStatus(btn.dataset.id, 'acknowledged'));
    app.querySelectorAll('.inProgressComp').forEach(btn => btn.onclick = () => updateStatus(btn.dataset.id, 'in_progress'));
    app.querySelectorAll('.resolveComp').forEach(btn => btn.onclick = () => showResolveModal(btn.dataset.id));
    app.querySelectorAll('.closeComp').forEach(btn => btn.onclick = () => updateStatus(btn.dataset.id, 'closed'));
  }

  async function updateStatus(id, status) {
    try {
      await updateComplaintStatus(id, status);
      showToast(`Complaint ${status}`, 'success');
      render();
    } catch (e) { showToast(e.message, 'error'); }
  }

  function showResolveModal(id) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">Resolve Complaint</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Response / Resolution</label>
            <textarea class="form-input" id="resolveResponse" rows="3" placeholder="Write your response..."></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-success btn-sm" id="modalConfirm">Resolve</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const response = document.getElementById('resolveResponse').value.trim();
      try {
        await updateComplaintStatus(id, 'resolved', { adminResponse: response || 'Resolved' });
        showToast('Complaint resolved!', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message, 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  render();
}
