import { getCurrentUser } from '../../auth.js';
import { getAuditLogs } from '../../store.js';
import { adminNav, formatTime, formatDate, renderPageHeader, escapeHtml } from '../../helpers.js';

export async function adminAuditLogs(app) {
  const user = getCurrentUser();
  if (!user) return;

  app.innerHTML = `
    ${renderPageHeader('Audit Logs', 'System activity log')}
    <div class="page">
      <div class="card" id="auditLogContainer">
        <div style="text-align:center;padding:var(--space-lg);">
          <span class="material-icons-outlined" style="font-size:40px;color:var(--outline-variant);display:block;margin-bottom:8px;">hourglass_empty</span>
          Loading audit logs...
        </div>
      </div>
    </div>
    ${adminNav('audit')}
  `;

  const logs = await getAuditLogs(100);
  const container = document.getElementById('auditLogContainer');

  if (logs.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:var(--space-lg);">
        <span class="material-icons-outlined" style="font-size:40px;color:var(--outline-variant);display:block;margin-bottom:8px;">history</span>
        <div style="font-weight:600;">No audit logs yet</div>
      </div>
    `;
    return;
  }

  const actionIcons = {
    LOGIN: 'login', LOGOUT: 'logout', LEAVE_APPROVED: 'check_circle',
    LEAVE_REJECTED: 'cancel', GATE_SCAN_OUT: 'logout', GATE_SCAN_IN: 'login',
    USER_APPROVED: 'verified', USER_DELETED: 'person_remove',
  };

  container.innerHTML = `
    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="border-bottom:1px solid var(--outline-variant);">
            <th style="padding:8px 12px;text-align:left;color:var(--on-surface-variant);font-weight:600;">Action</th>
            <th style="padding:8px 12px;text-align:left;color:var(--on-surface-variant);font-weight:600;">Actor</th>
            <th style="padding:8px 12px;text-align:left;color:var(--on-surface-variant);font-weight:600;">Details</th>
            <th style="padding:8px 12px;text-align:right;color:var(--on-surface-variant);font-weight:600;">Time</th>
          </tr>
        </thead>
        <tbody>
          ${logs.map(log => `
            <tr style="border-bottom:1px solid var(--surface-container);">
              <td style="padding:10px 12px;">
                <span class="material-icons-outlined" style="font-size:18px;vertical-align:middle;color:var(--primary-container);">${actionIcons[log.action] || 'info'}</span>
                <span style="margin-left:6px;">${escapeHtml(log.action.replace(/_/g, ' '))}</span>
              </td>
              <td style="padding:10px 12px;">${escapeHtml(log.actorName)}</td>
              <td style="padding:10px 12px;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(log.details || '')}</td>
              <td style="padding:10px 12px;text-align:right;white-space:nowrap;color:var(--on-surface-variant);font-size:12px;">
                ${formatTime(log.createdAt)}<br>${formatDate(log.createdAt)}
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
