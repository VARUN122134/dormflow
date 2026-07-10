import { getCurrentUser } from '../../auth.js';
import { getUsers, getLeaves, getOutpasses } from '../../store.js';
import { adminNav, renderPageHeader, showToast, escapeHtml } from '../../helpers.js';

export async function adminSettings(app) {
  const user = getCurrentUser();
  if (!user) return;

  app.innerHTML = `
    ${renderPageHeader('Settings', 'System information')}
    <div class="page">
      <div class="card animate-fade-in" style="margin-bottom:var(--space-md);">
        <div class="profile-section-title">System Status</div>
        <div id="sysStats">
          <div style="text-align:center;padding:var(--space-md);">
            <span class="material-icons-outlined" style="font-size:40px;color:var(--outline-variant);display:block;margin-bottom:8px;">hourglass_empty</span>
            Loading...
          </div>
        </div>
      </div>

      <div class="card animate-fade-in" style="margin-bottom:var(--space-md);">
        <div class="profile-section-title">About</div>
        <div style="display:flex;flex-direction:column;gap:8px;padding:8px 0;">
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--on-surface-variant);">Application</span>
            <span style="font-weight:600;">UCE IT</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--on-surface-variant);">Version</span>
            <span style="font-weight:600;">v3.0.4</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--on-surface-variant);">Developer</span>
            <span style="font-weight:600;">Varun C</span>
          </div>
          <div style="display:flex;justify-content:space-between;">
            <span style="color:var(--on-surface-variant);">Platform</span>
            <span style="font-weight:600;">Supabase + Capacitor</span>
          </div>
        </div>
      </div>

      <div class="card animate-fade-in" style="margin-bottom:var(--space-md);">
        <div class="profile-section-title">Data Summary</div>
        <div id="dataSummary">
          <div style="text-align:center;padding:var(--space-md);">
            <span class="material-icons-outlined" style="font-size:40px;color:var(--outline-variant);display:block;margin-bottom:8px;">hourglass_empty</span>
            Loading...
          </div>
        </div>
      </div>

      <div class="card animate-fade-in" style="text-align:center;">
        <div class="profile-section-title">Maintenance</div>
        <p style="font-size:13px;color:var(--on-surface-variant);margin-bottom:var(--space-md);">
          Server-side maintenance actions.
        </p>
        <button class="btn btn-secondary btn-sm" id="refreshStatsBtn" style="margin-bottom:8px;">
          <span class="material-icons-outlined" style="font-size:18px;">refresh</span> Refresh Statistics
        </button>
        <p style="font-size:11px;color:var(--outline);margin-top:4px;">v3.0.4</p>
      </div>
    </div>
    ${adminNav('settings')}
  `;

  const [allUsers, allLeaves, allOutpasses] = await Promise.all([
    getUsers(), getLeaves(), getOutpasses(),
  ]);

  const dataSummary = document.getElementById('dataSummary');
  dataSummary.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 0;">
      <div style="text-align:center;padding:12px;background:var(--surface-container);border-radius:var(--radius-md);">
        <div style="font-size:24px;font-weight:700;">${allUsers.length}</div>
        <div style="font-size:12px;color:var(--on-surface-variant);">Total Users</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--surface-container);border-radius:var(--radius-md);">
        <div style="font-size:24px;font-weight:700;">${allLeaves.length}</div>
        <div style="font-size:12px;color:var(--on-surface-variant);">Leave Requests</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--surface-container);border-radius:var(--radius-md);">
        <div style="font-size:24px;font-weight:700;">${allOutpasses.length}</div>
        <div style="font-size:12px;color:var(--on-surface-variant);">Gate Passes</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--surface-container);border-radius:var(--radius-md);">
        <div style="font-size:24px;font-weight:700;">${allUsers.filter(u => u.role === 'student').length}</div>
        <div style="font-size:12px;color:var(--on-surface-variant);">Students</div>
      </div>
    </div>
  `;

  const students = allUsers.filter(u => u.role === 'student');
  const out = students.filter(s => s.activeStatus === 'OUT');
  const staff = allUsers.filter(u => u.role !== 'student');
  const pending = allLeaves.filter(l => l.approvalStatus === 'Pending');

  const sysStats = document.getElementById('sysStats');
  sysStats.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 0;">
      <div style="text-align:center;padding:12px;background:var(--surface-container);border-radius:var(--radius-md);">
        <div style="font-size:13px;color:var(--status-success);">Online</div>
        <div style="font-size:11px;color:var(--on-surface-variant);">Database</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--surface-container);border-radius:var(--radius-md);">
        <div style="font-size:24px;font-weight:700;">${out.length}</div>
        <div style="font-size:12px;color:var(--on-surface-variant);">Students Out</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--surface-container);border-radius:var(--radius-md);">
        <div style="font-size:24px;font-weight:700;">${staff.length}</div>
        <div style="font-size:12px;color:var(--on-surface-variant);">Staff</div>
      </div>
      <div style="text-align:center;padding:12px;background:var(--surface-container);border-radius:var(--radius-md);">
        <div style="font-size:24px;font-weight:700;">${pending.length}</div>
        <div style="font-size:12px;color:var(--status-warning);">Pending Leaves</div>
      </div>
    </div>
  `;

  document.getElementById('refreshStatsBtn')?.addEventListener('click', async () => {
    showToast('Refreshing...', 'info');
    window.location.hash = '#/admin/settings';
  });
}
