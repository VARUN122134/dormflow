import { getCurrentUser } from '../../auth.js';
import { getLeavesByStudent, getActiveOutpassByStudent } from '../../store.js';
import { navigate } from '../../router.js';
import { studentNav, formatDateRange, formatRelativeTime, getInitials, renderAvatar } from '../../helpers.js';

export default async function studentDashboard(app) {
  const user = getCurrentUser();
  if (!user) return;

  const leaves = await getLeavesByStudent(user.id);
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
      desc = `${l.type} • ${formatDateRange(l.outDate, l.inDate)} approved`;
    } else if (l.approvalStatus === 'Pending') {
      icon = 'pending'; iconBg = 'var(--status-warning)';
      title = 'Request Submitted';
      desc = `${l.type} • Awaiting verification`;
    } else {
      icon = 'cancel'; iconBg = 'var(--error)';
      title = 'Request Rejected';
      desc = `${l.type} • ${l.rejectionReason || 'See details'}`;
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
        <button class="icon-btn" aria-label="notifications" style="padding:4px;">
          <span class="material-icons-outlined">notifications</span>
        </button>
        <a href="#/student/profile" style="text-decoration:none;color:inherit;">${renderAvatar(user, 'stitch-avatar-sm')}</a>
      </div>
    </header>

    <div class="page page-student">
      <div class="welcome-section">
        <h1 class="welcome-name">Welcome back, ${user.name.split(' ')[0]}</h1>
        <p class="welcome-meta">${user.block || 'Block B'} • Room ${user.roomNumber || '402'}</p>
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
              <div class="active-leave-type">${activeLeave.type}</div>
              <div class="active-leave-dates">${formatDateRange(activeLeave.outDate, activeLeave.inDate)}</div>
              <div class="active-leave-status">Status: ${activeLeave.approvalStatus === 'Approved' ? 'Approved by Warden' : activeLeave.approvalStatus}</div>
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
          <span class="section-title">Quick Access</span>
        </div>
        <div class="feature-grid" style="margin-bottom:var(--space-md);">
          <a href="#/student/room" class="feature-card">
            <span class="material-icons-outlined">meeting_room</span>
            <div class="feature-label">My Room</div>
          </a>
          <a href="#/student/complaints" class="feature-card">
            <span class="material-icons-outlined">feedback</span>
            <div class="feature-label">Complaints</div>
          </a>
          <a href="#/student/attendance" class="feature-card">
            <span class="material-icons-outlined">fact_check</span>
            <div class="feature-label">Attendance</div>
          </a>
          <a href="#/notifications" class="feature-card">
            <span class="material-icons-outlined">notifications</span>
            <div class="feature-label">Notifications</div>
          </a>
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

  document.getElementById('applyBtn').addEventListener('click', () => navigate('#/student/apply'));
}
