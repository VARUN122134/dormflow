import { getCurrentUser } from '../../auth.js';
import { getAllComplaints, updateComplaintStatus } from '../../store.js';
import { adminNav, statusChip, showToast, renderPageHeader, escapeHtml } from '../../helpers.js';

export default async function adminComplaints(app) {
  const user = getCurrentUser();
  if (!user) return;

  let filter = 'All';

  async function render() {
    let complaints = await getAllComplaints();

    if (filter !== 'All') {
      complaints = complaints.filter(c => c.status === filter);
    }

    app.innerHTML = `
      ${renderPageHeader('Complaints', 'Student complaints management')}
      <div class="page">
        <div class="filter-tabs" id="statusFilters">
          ${['All', 'pending', 'acknowledged', 'in_progress', 'resolved', 'closed'].map(f => `
            <button class="filter-tab ${filter === f ? 'active' : ''}" data-filter="${f}">${f}</button>
          `).join('')}
        </div>

        <div class="pending-list stagger" style="margin-top:var(--space-md);">
          ${complaints.length > 0 ? complaints.map(c => `
            <div class="leave-card animate-fade-in-up">
              <div class="leave-card-header">
                <div class="leave-card-student" style="flex:1;">
                  ${c.studentName ? `<div><div class="leave-card-name">${escapeHtml(c.title)}</div>
                  <div class="leave-card-meta">${escapeHtml(c.studentName)} • ${escapeHtml(c.category)}</div></div>` : `
                  <div><div class="leave-card-name">${escapeHtml(c.title)}</div>
                  <div class="leave-card-meta">${escapeHtml(c.category)}</div></div>`}
                </div>
                ${statusChip(c.status)}
              </div>
              <div class="leave-card-reason">${escapeHtml(c.description)}</div>
              <div class="leave-card-meta" style="margin-top:4px;font-size:11px;color:var(--outline);">
                ${new Date(c.createdAt).toLocaleDateString('en-IN')}
              </div>
              ${c.adminResponse ? `
                <div style="margin-top:6px;padding:8px;background:var(--surface-container);border-radius:var(--radius-md);font-size:12px;">
                  <strong>Response:</strong> ${escapeHtml(c.adminResponse)}
                </div>
              ` : ''}
              <div class="leave-card-actions" style="margin-top:8px;">
                <select class="form-select" data-status="${c.id}" style="padding:6px 10px;font-size:12px;flex:1;">
                  <option value="pending" ${c.status === 'pending' ? 'selected' : ''}>Pending</option>
                  <option value="acknowledged" ${c.status === 'acknowledged' ? 'selected' : ''}>Acknowledged</option>
                  <option value="in_progress" ${c.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                  <option value="resolved" ${c.status === 'resolved' ? 'selected' : ''}>Resolved</option>
                  <option value="closed" ${c.status === 'closed' ? 'selected' : ''}>Closed</option>
                </select>
                <button class="btn btn-primary btn-sm" data-respond="${c.id}" style="padding:6px 12px;font-size:12px;">Respond</button>
              </div>
            </div>
          `).join('') : `
            <div class="empty-state">
              <span class="material-icons-outlined">report_problem</span>
              <div class="empty-state-title">No complaints</div>
              <div class="empty-state-desc">No ${filter !== 'All' ? filter.toLowerCase() : ''} complaints found.</div>
            </div>
          `}
        </div>
      </div>
      ${adminNav('manage')}
    `;

    document.querySelectorAll('[data-filter]').forEach(tab => {
      tab.addEventListener('click', async () => { filter = tab.dataset.filter; await render(); });
    });

    document.querySelectorAll('[data-status]').forEach(sel => {
      sel.addEventListener('change', async () => {
        try {
          await updateComplaintStatus(sel.dataset.status, sel.value, user.id);
          showToast('Status updated', 'success');
          await render();
        } catch (err) {
          showToast('Failed to update: ' + err.message, 'error');
        }
      });
    });

    document.querySelectorAll('[data-respond]').forEach(btn => {
      btn.addEventListener('click', () => showRespondForm(btn.dataset.respond));
    });
  }

  function showRespondForm(complaintId) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `
      <div class="modal" style="max-width:500px;">
        <div class="modal-title">Respond to Complaint</div>
        <div class="modal-body" style="text-align:left;">
          <div class="form-group">
            <label class="form-label">Admin Response</label>
            <textarea class="form-input" id="responseText" rows="4" placeholder="Write your response"></textarea>
          </div>
          <div id="responseError" style="display:none;padding:8px;background:var(--error-container);color:var(--on-error-container);border-radius:var(--radius-md);font-size:12px;text-align:center;"></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="responseCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="responseSubmit">Submit</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#responseCancel').onclick = () => overlay.remove();
    overlay.querySelector('#responseSubmit').onclick = async () => {
      const response = document.getElementById('responseText').value.trim();
      const errEl = document.getElementById('responseError');

      if (!response) {
        errEl.textContent = 'Please write a response';
        errEl.style.display = 'block';
        return;
      }

      const btn = document.getElementById('responseSubmit');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      try {
        await updateComplaintStatus(complaintId, 'resolved', user.id, response);
        showToast('Response submitted', 'success');
        overlay.remove();
        await render();
      } catch (err) {
        errEl.textContent = err.message || 'Failed to respond';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Submit';
      }
    };
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  await render();
}
