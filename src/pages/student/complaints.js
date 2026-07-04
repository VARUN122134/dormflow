import { getCurrentUser } from '../../auth.js';
import { getMyComplaints, createComplaint } from '../../store.js';
import { studentNav, showToast, escapeHtml, formatDate, renderNotifBell, renderBackButton } from '../../helpers.js';

export default async function studentComplaintsPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const complaints = await getMyComplaints(user.id);

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
          <button class="btn btn-primary btn-block" id="newComplaintBtn" style="margin-bottom:16px;">
            <span class="material-icons-outlined" style="font-size:20px;">add_circle</span>
            Submit Complaint / Feedback
          </button>

          <h3 style="margin:0 0 12px 0;font-size:16px;font-weight:600;">My Complaints</h3>

          ${complaints.length === 0
            ? '<div class="card" style="padding:32px;text-align:center;color:var(--outline);"><span class="material-icons-outlined" style="font-size:48px;">feedback</span><p style="margin:8px 0 0;">No complaints submitted yet.</p></div>'
            : complaints.map(c => `
              <div class="card" style="margin-bottom:8px;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                  <div style="display:flex;gap:4px;flex-wrap:wrap;">
                    <span class="chip ${c.priority === 'urgent' ? 'chip-rejected' : c.priority === 'high' ? 'chip-pending' : 'chip-neutral'}">${c.priority}</span>
                    <span class="chip ${statusClass(c.status)}">${c.status}</span>
                  </div>
                  <span style="font-size:11px;color:var(--outline);white-space:nowrap;">${formatDate(c.createdAt)}</span>
                </div>
                <div style="font-size:13px;font-weight:600;margin-bottom:2px;text-transform:capitalize;">${escapeHtml(c.subject)}</div>
                <div style="font-size:12px;color:var(--on-surface-variant);">${escapeHtml(c.description)}</div>
                ${c.adminResponse ? `<div style="margin-top:8px;padding:8px;background:var(--primary-fixed);border-radius:6px;font-size:12px;"><strong>Response:</strong> ${escapeHtml(c.adminResponse)}</div>` : ''}
                ${c.status === 'resolved' && !c.rating ? `<button class="btn btn-sm btn-ghost rateComplaint" data-id="${c.id}" style="margin-top:6px;color:var(--status-warning);">Rate Resolution</button>` : ''}
              </div>
            `).join('')}
        </div>

        ${studentNav('profile')}
      </div>
    `;

    document.getElementById('newComplaintBtn').addEventListener('click', showComplaintModal);
    app.querySelectorAll('.rateComplaint').forEach(btn => btn.onclick = () => rateComplaint(btn.dataset.id));
  }

  function statusClass(status) {
    const map = { pending: 'chip-pending', acknowledged: 'chip-info', in_progress: 'chip-pending', resolved: 'chip-approved', closed: 'chip-neutral' };
    return map[status] || 'chip-neutral';
  }

  function showComplaintModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal" style="max-width:400px;">
        <div class="modal-title">Submit Complaint</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-input" id="compCategory">
              <option value="infrastructure">Infrastructure</option>
              <option value="hygiene">Hygiene / Cleanliness</option>
              <option value="food">Food / Mess</option>
              <option value="security">Security</option>
              <option value="staff">Staff / Management</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Priority</label>
            <select class="form-input" id="compPriority">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Subject</label>
            <input class="form-input" id="compSubject" placeholder="Brief subject">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input" id="compDesc" rows="3" placeholder="Describe your complaint in detail..."></textarea>
          </div>
          <div class="form-group" style="flex-direction:row;align-items:center;gap:8px;">
            <input type="checkbox" id="compAnonymous" style="width:18px;height:18px;">
            <label class="form-label" for="compAnonymous" style="cursor:pointer;text-transform:none;letter-spacing:0;">Submit anonymously</label>
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
      const subject = document.getElementById('compSubject').value.trim();
      const desc = document.getElementById('compDesc').value.trim();
      if (!subject || !desc) { showToast('Subject and description required', 'warning'); return; }
      try {
        await createComplaint({
          studentId: user.id,
          category: document.getElementById('compCategory').value,
          subject,
          description: desc,
          isAnonymous: document.getElementById('compAnonymous').checked,
          priority: document.getElementById('compPriority').value,
        });
        showToast('Complaint submitted!', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message || 'Failed', 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  async function rateComplaint(id) {
    const rating = prompt('Rate the resolution (1-5):');
    const num = parseInt(rating);
    if (isNaN(num) || num < 1 || num > 5) { showToast('Enter a rating between 1 and 5', 'warning'); return; }
    try {
      const { updateComplaintStatus } = await import('../../store.js');
      await updateComplaintStatus(id, 'closed', { rating: num });
      showToast('Thank you for your feedback!', 'success');
      render();
    } catch (e) { showToast(e.message, 'error'); }
  }

  render();
}
