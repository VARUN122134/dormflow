import { getCurrentUser } from '../../auth.js';
import { getUsers, createNotification } from '../../store.js';
import { adminNav, showToast, escapeHtml, renderPageHeader, renderNotifBell, renderBackButton } from '../../helpers.js';

export default async function adminSendNotificationsPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const allUsers = await getUsers();

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            ${renderBackButton()}
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Notifications</span>
          </div>
          <div class="flex items-center gap-sm">
            ${renderNotifBell()}
            <span class="fs-13 c-on-surface-variant">${escapeHtml(user.name?.split(' ')[0] || '')}</span>
          </div>
        </header>

        <div class="page-content">
          <h2 class="m-0 mb-md fs-20 fw-600">Send Notification</h2>

          <div class="card mb-md">
            <div class="form-group">
              <label class="form-label">Target Users</label>
              <select class="form-input" id="notifTarget">
                <option value="all">All Users</option>
                <option value="students">All Students</option>
                <option value="boys">Boys Hostel</option>
                <option value="girls">Girls Hostel</option>
                <option value="staff">Staff (Wardens, Security)</option>
                <option value="admin">Admins Only</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Type</label>
              <select class="form-input" id="notifType">
                <option value="info">Info</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Reference</label>
              <select class="form-input" id="notifRef">
                <option value="">None</option>
                <option value="announcement">Announcement</option>
                <option value="complaint">Complaint</option>
                <option value="maintenance">Maintenance</option>
                <option value="attendance">Attendance</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Title</label>
              <input class="form-input" id="notifTitle" placeholder="Notification title">
            </div>
            <div class="form-group">
              <label class="form-label">Message</label>
              <textarea class="form-input" id="notifBody" rows="3" placeholder="Notification message..."></textarea>
            </div>
            <button class="btn btn-primary btn-block mt-md" id="sendNotifBtn">
              <span class="material-icons-outlined" style="font-size:18px;">send</span> Send Notification
            </button>
          </div>

          <div id="sendStatus"></div>
        </div>

        ${adminNav('dashboard')}
      </div>
    `;

    document.getElementById('sendNotifBtn').addEventListener('click', async () => {
      const title = document.getElementById('notifTitle').value.trim();
      const body = document.getElementById('notifBody').value.trim();
      if (!title || !body) { showToast('Title and message required', 'warning'); return; }

      const target = document.getElementById('notifTarget').value;
      const notifType = document.getElementById('notifType').value;
      const refType = document.getElementById('notifRef').value;
      const statusDiv = document.getElementById('sendStatus');

      let recipients = [];
      if (target === 'all') recipients = allUsers;
      else if (target === 'students') recipients = allUsers.filter(u => u.role === 'student');
      else if (target === 'boys') recipients = allUsers.filter(u => u.role === 'student' && u.hostelType === 'Boys');
      else if (target === 'girls') recipients = allUsers.filter(u => u.role === 'student' && u.hostelType === 'Girls');
      else if (target === 'staff') recipients = allUsers.filter(u => u.role !== 'student');
      else if (target === 'admin') recipients = allUsers.filter(u => u.role === 'admin');

      statusDiv.innerHTML = `<div class="fs-13" style="color:var(--primary-container);">Sending to ${recipients.length} user(s)...</div>`;

      let sent = 0;
      for (const r of recipients) {
        try {
          await createNotification({ userId: r.id, title, body, type: notifType, referenceType: refType });
          sent++;
        } catch (e) { console.warn('Failed to notify', r.id, e); }
      }

      statusDiv.innerHTML = `<div class="fs-13 c-success">✓ Sent to ${sent} user(s)</div>`;
      showToast(`Notification sent to ${sent} user(s)`, 'success');
    });
  }

  render();
}
