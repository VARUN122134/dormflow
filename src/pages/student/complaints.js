import { getCurrentUser } from '../../auth.js';
import { getMyComplaints, createComplaint } from '../../store.js';
import { studentNav, statusChip, showToast, renderPageHeader, escapeHtml } from '../../helpers.js';

export default async function complaintsPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const complaints = await getMyComplaints(user.id);

    app.innerHTML = `
      ${renderPageHeader('Complaints', 'Submit and track complaints')}
      <div class="page">
        <button class="btn btn-primary btn-block" id="newComplaintBtn" style="margin-bottom:var(--space-md);">
          <span class="material-icons-outlined" style="font-size:18px;">add</span>
          New Complaint
        </button>

        <div class="pending-list stagger">
          ${complaints.length > 0 ? complaints.map(c => `
            <div class="leave-card animate-fade-in-up">
              <div class="leave-card-header">
                <div class="leave-card-student" style="flex:1;">
                  <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
                    <div class="leave-card-name">${escapeHtml(c.title)}</div>
                    <div class="leave-card-meta">${escapeHtml(c.category)}</div>
                  </div>
                </div>
                ${statusChip(c.status)}
              </div>
              <div class="leave-card-reason" style="margin-top:4px;">${escapeHtml(c.description)}</div>
              ${c.adminResponse ? `
                <div class="leave-card-meta" style="margin-top:6px;padding-top:6px;border-top:1px solid var(--surface-container);">
                  <strong>Response:</strong> ${escapeHtml(c.adminResponse)}
                </div>
              ` : ''}
              <div class="leave-card-meta" style="margin-top:4px;font-size:11px;color:var(--outline);">
                ${new Date(c.createdAt).toLocaleDateString('en-IN')}
              </div>
            </div>
          `).join('') : `
            <div class="empty-state">
              <span class="material-icons-outlined">report_problem</span>
              <div class="empty-state-title">No complaints</div>
              <div class="empty-state-desc">You haven't submitted any complaints yet.</div>
            </div>
          `}
        </div>
      </div>
      ${studentNav('updates')}
    `;

    document.getElementById('newComplaintBtn').addEventListener('click', showForm);
  }

  function showForm() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop';
    overlay.innerHTML = `
      <div class="modal" style="max-width:500px;">
        <div class="modal-title">Submit a Complaint</div>
        <div class="modal-body" style="text-align:left;">
          <div class="form-group">
            <label class="form-label">Title</label>
            <input class="form-input" id="complaintTitle" placeholder="Brief title" />
          </div>
          <div class="form-group">
            <label class="form-label">Category</label>
            <select class="form-select" id="complaintCategory">
              <option value="Food">Food</option>
              <option value="Hygiene">Hygiene</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Staff">Staff</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input" id="complaintDesc" rows="4" placeholder="Describe your complaint in detail"></textarea>
          </div>
          <div id="complaintError" style="display:none;padding:8px;background:var(--error-container);color:var(--on-error-container);border-radius:var(--radius-md);font-size:12px;text-align:center;"></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="complaintCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="complaintSubmit">Submit</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#complaintCancel').onclick = () => overlay.remove();
    overlay.querySelector('#complaintSubmit').onclick = async () => {
      const title = document.getElementById('complaintTitle').value.trim();
      const category = document.getElementById('complaintCategory').value;
      const desc = document.getElementById('complaintDesc').value.trim();
      const errEl = document.getElementById('complaintError');

      if (!title || !desc) {
        errEl.textContent = 'Please fill in all fields';
        errEl.style.display = 'block';
        return;
      }

      const btn = document.getElementById('complaintSubmit');
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      try {
        await createComplaint({ studentId: user.id, title, category, description: desc });
        showToast('Complaint submitted', 'success');
        overlay.remove();
        await render();
      } catch (err) {
        errEl.textContent = err.message || 'Failed to submit';
        errEl.style.display = 'block';
        btn.disabled = false;
        btn.textContent = 'Submit';
      }
    };
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
  }

  await render();
}
