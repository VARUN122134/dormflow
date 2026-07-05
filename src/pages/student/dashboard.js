import { getCurrentUser } from '../../auth.js';
import { getLeavesByStudent, getActiveOutpassByStudent, getAnnouncements } from '../../store.js';
import { navigate } from '../../router.js';
import { studentNav, formatDateRange, formatRelativeTime, getInitials, escapeHtml } from '../../helpers.js';

export default async function studentDashboard(app) {
  const user = getCurrentUser();
  if (!user) return;

  const leaves = await getLeavesByStudent(user.id);
  const announcements = (await getAnnouncements()).slice(0, 5);
  const approvedLeaves = leaves.filter(l => l.approvalStatus === 'Approved');
  const stats = {
    remainingDays: Math.max(0, 30 - approvedLeaves.length * 3),
    approvedCount: approvedLeaves.length,
  };

  const activeOutpass = await getActiveOutpassByStudent(user.id);
  const activeLeave = approvedLeaves.find(l => {
    if (!activeOutpass) return false;
    return l.leaveId === activeOutpass.leaveId && activeOutpass.status !== 'Completed';
  });

  const recentLeaves = leaves.slice(0, 3);

  const activityItems = recentLeaves.map(l => {
    let icon, iconBg, title, desc;
    if (l.approvalStatus === 'Approved') {
      icon = 'check_circle'; iconBg = 'var(--status-success)';
      title = 'Request Approved';
      desc = `${escapeHtml(l.type)} • ${formatDateRange(l.outDate, l.inDate)} approved`;
    } else if (l.approvalStatus === 'Pending') {
      icon = 'pending'; iconBg = 'var(--status-warning)';
      title = 'Request Submitted';
      desc = `${escapeHtml(l.type)} • Awaiting verification`;
    } else {
      icon = 'cancel'; iconBg = 'var(--error)';
      title = 'Request Rejected';
      desc = `${escapeHtml(l.type)} • ${escapeHtml(l.rejectionReason || 'See details')}`;
    }
    return { icon, iconBg, title, desc, time: formatRelativeTime(l.createdAt) };
  });

  app.innerHTML = `
    <header class="stitch-header">
      <div class="stitch-header-left" style="display:flex;align-items:center;gap:8px;">
        <img src="logo.png" alt="Anna University Logo" style="width: 28px; height: 28px; object-fit: contain;" />
          <span class="stitch-brand">UCE IT</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;">
        <button class="icon-btn" id="notifBtn" aria-label="notifications" style="padding:4px;position:relative;">
          <span class="material-icons-outlined">notifications</span>
          ${announcements.length > 0 ? `<span class="notif-dot" style="position:absolute;top:4px;right:4px;width:8px;height:8px;background:var(--error);border-radius:50%;border:2px solid var(--surface);"></span>` : ''}
        </button>
        <div class="stitch-avatar-sm" onclick="location.hash='#/student/profile'" style="cursor:pointer;">${getInitials(user.name)}</div>
      </div>
    </header>

    <div class="notif-panel" id="notifPanel" style="display:none;position:absolute;top:56px;right:12px;left:12px;background:var(--surface);border:1px solid var(--surface-variant);border-radius:var(--radius-lg);box-shadow:0 8px 32px rgba(0,0,0,0.15);z-index:100;max-height:60vh;overflow-y:auto;">
      <div style="padding:12px 16px;border-bottom:1px solid var(--surface-variant);font-weight:600;font-size:14px;display:flex;align-items:center;gap:8px;">
        <span class="material-icons-outlined" style="font-size:18px;">notifications</span>
        Notifications
      </div>
      ${announcements.length > 0 ? announcements.map(a => `
        <div style="padding:12px 16px;border-bottom:1px solid var(--surface-variant);">
          <div style="font-size:13px;font-weight:500;">${escapeHtml(a.title)}</div>
          ${a.content ? `<div style="font-size:12px;color:var(--on-surface-variant);margin-top:2px;">${escapeHtml(a.content)}</div>` : ''}
          <div style="font-size:11px;color:var(--outline);margin-top:4px;">
            <span class="chip" style="font-size:9px;padding:1px 6px;">${escapeHtml(a.type || 'announcement')}</span>
            ${a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''}
          </div>
        </div>
      `).join('') : `
        <div style="padding:24px;text-align:center;color:var(--outline);font-size:13px;">
          <span class="material-icons-outlined" style="font-size:32px;display:block;margin-bottom:8px;">notifications_off</span>
          No new notifications
        </div>
      `}
      <div style="padding:10px 16px;text-align:center;">
        <a href="#/student/announcements" style="font-size:12px;color:var(--primary-container);font-weight:500;">View All Announcements</a>
      </div>
    </div>

    <div class="page page-student">
      <div class="welcome-section">
        <h1 class="welcome-name">Welcome back, ${escapeHtml(user.name.split(' ')[0])}</h1>
        <p class="welcome-meta">${escapeHtml(user.blockName || 'Block B')} • Room ${escapeHtml(user.roomNumber || '402')}</p>
      </div>

      <div class="section-block">
        <div class="section-row">
          <span class="section-title">Active Leaves</span>
          ${activeLeave ? `<span class="chip chip-info" style="font-size:11px;">1 Ongoing</span>` : ''}
        </div>
        ${activeLeave ? `
          <div class="active-leave-card">
            <div class="active-leave-accent"></div>
            <div class="active-leave-body">
              <div class="active-leave-type">${escapeHtml(activeLeave.type)}</div>
              <div class="active-leave-dates">${formatDateRange(activeLeave.outDate, activeLeave.inDate)}</div>
              <div class="active-leave-status">Status: ${activeLeave.approvalStatus === 'Approved' ? 'Approved by Warden' : escapeHtml(activeLeave.approvalStatus)}</div>
            </div>
            <button class="icon-btn-sm" onclick="window.location.hash='#/student/outpass'" aria-label="view QR">
              <span class="material-icons-outlined">qr_code_2</span>
            </button>
          </div>
        ` : `
          <div class="active-leave-card active-leave-empty">
            <span class="material-icons-outlined" style="color:var(--outline);font-size:20px;">event_busy</span>
            <span style="color:var(--on-surface-variant);font-size:13px;">No active leave</span>
          </div>
        `}
      </div>

      <button class="btn btn-primary btn-block" id="applyBtn" style="margin-bottom:var(--space-lg);">
        <span class="material-icons-outlined" style="font-size:20px;">add_circle</span>
        Apply for Leave
      </button>

      <div class="stats-row">
        <div class="stat-box">
          <div class="stat-box-value">${stats.remainingDays}</div>
          <div class="stat-box-label">Remaining</div>
          <div class="stat-box-sub">Days this semester</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-value">${String(stats.approvedCount).padStart(2, '0')}</div>
          <div class="stat-box-label">Requests</div>
          <div class="stat-box-sub">Approved total</div>
        </div>
      </div>

      <div class="section-block" style="margin-top:var(--space-lg);">
        <div class="section-row">
          <span class="section-title">Recent Activity</span>
          <a href="#/student/history" style="font-size:13px;font-weight:500;color:var(--primary-container);">View All</a>
        </div>
        <div class="activity-list">
          ${activityItems.length > 0 ? activityItems.map(a => `
            <div class="activity-row">
              <div class="activity-icon-circle" style="background:${a.iconBg}15;color:${a.iconBg};">
                <span class="material-icons-outlined" style="font-size:18px;">${a.icon}</span>
              </div>
              <div class="activity-info">
                <div class="activity-title">${a.title}</div>
                <div class="activity-desc">${a.desc}</div>
              </div>
              <div class="activity-time">${a.time}</div>
            </div>
          `).join('') : `
            <div style="text-align:center;padding:24px;color:var(--on-surface-variant);font-size:13px;">
              No recent activity
            </div>
          `}
        </div>
      </div>
    </div>

    ${studentNav('dashboard')}
  `;

  const notifBtn = document.getElementById('notifBtn');
  const notifPanel = document.getElementById('notifPanel');
  if (notifBtn && notifPanel) {
    notifBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = notifPanel.style.display !== 'none';
      notifPanel.style.display = isVisible ? 'none' : 'block';
    });
    document.addEventListener('click', (e) => {
      if (!notifPanel.contains(e.target) && e.target !== notifBtn && !notifBtn.contains(e.target)) {
        notifPanel.style.display = 'none';
      }
    });
  }

  document.getElementById('applyBtn').addEventListener('click', () => navigate('#/student/apply'));
}
