import { getCurrentUser } from '../../auth.js';
import { getNotifications, markNotificationRead, markAllNotificationsRead, getUnreadCount } from '../../store.js';
import { studentNav, wardenNav, adminNav, showToast, escapeHtml, formatRelativeTime, renderPageHeader, renderNotifBell, renderBackButton, renderLogoutIcon } from '../../helpers.js';

export default async function notificationsPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const notifications = await getNotifications(user.id);

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            ${renderBackButton()}
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Notifications</span>
          </div>
          <div class="flex items-center gap-sm">
            ${renderLogoutIcon()}
            ${renderNotifBell()}
            <span class="fs-13 c-on-surface-variant">${escapeHtml(user.name?.split(' ')[0] || '')}</span>
          </div>
        </header>

        <div class="page-content">
          <div class="flex justify-between items-center mb-md">
            <h2 class="m-0 fs-20 fw-600">Notifications</h2>
            ${notifications.some(n => !n.isRead) ? `<button class="btn btn-ghost btn-sm" id="markAllRead">Mark all read</button>` : ''}
          </div>

          ${notifications.length === 0
            ? '<div class="card p-lg text-center c-outline"><span class="material-icons-outlined" style="font-size:48px;">notifications_none</span><p style="margin:8px 0 0;">No notifications yet</p></div>'
            : notifications.map(n => `
              <div class="card" style="margin-bottom:6px;${!n.isRead ? 'border-left:3px solid var(--primary-container);background:var(--primary-fixed);' : ''}cursor:pointer;" data-id="${n.id}">
                <div class="flex" style="gap:10px;align-items:flex-start;">
                  <span class="material-icons-outlined" style="font-size:20px;color:${n.type === 'error' ? 'var(--error)' : n.type === 'warning' ? 'var(--status-warning)' : n.type === 'success' ? 'var(--status-success)' : 'var(--primary-container)'};">${n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : n.type === 'success' ? 'check_circle' : 'info'}</span>
                  <div style="flex:1;">
                    <div class="fs-13" style="font-weight:${!n.isRead ? '600' : '400'};">${escapeHtml(n.title)}</div>
                    <div class="fs-12 c-on-surface-variant">${escapeHtml(n.body)}</div>
                    <div class="fs-12 c-outline mt-sm">${formatRelativeTime(n.createdAt)}</div>
                  </div>
                  ${!n.isRead ? '<span style="width:8px;height:8px;border-radius:50%;background:var(--primary-container);flex-shrink:0;"></span>' : ''}
                </div>
              </div>
            `).join('')}
        </div>

        ${user.role === 'student' ? studentNav('profile', user.isMessMember) : user.role === 'admin' ? adminNav('dashboard') : wardenNav('profile')}
      </div>
    `;

    document.getElementById('markAllRead')?.addEventListener('click', async () => {
      await markAllNotificationsRead(user.id);
      showToast('All marked as read', 'success');
      render();
    });

    app.querySelectorAll('[data-id]').forEach(el => {
      el.onclick = async () => {
        await markNotificationRead(el.dataset.id);
        render();
      };
    });
  }

  render();
}
