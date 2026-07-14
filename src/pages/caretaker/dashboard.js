import { getCurrentUser } from '../../auth.js';
import {
  getLeavesByHostel, approveLeave, rejectLeave,
  getHostelStats, getUsers
} from '../../store.js';
import { caretakerNav, formatDateRange, getInitials, showToast, showModal, renderAvatar, escapeHtml } from '../../helpers.js';
import { Chart } from 'chart.js';

export default async function caretakerDashboard(app) {
  const user = getCurrentUser();
  if (!user) return;

  const hostelType = user.role === 'boys_caretaker' ? 'Boys' : 'Girls';
  let chartInstance = null;

  await render();

  async function render() {
    const freshLeaves = await getLeavesByHostel(hostelType);
    const freshPending = freshLeaves.filter(l => l.approvalStatus === 'Pending');
    const freshStats = await getHostelStats(hostelType);

    app.innerHTML = `
      <header class="stitch-header">
        <div class="stitch-header-left" style="display:flex;align-items:center;gap:8px;">
          <img src="logo.png" alt="Anna University Logo" style="width: 28px; height: 28px; object-fit: contain;" />
          <span class="stitch-brand">UCE IT</span>
        </div>
        ${renderAvatar(user, 'stitch-avatar-sm')}
      </header>

      <div class="page page-caretaker">
        <div class="warden-page-title">
          <h2 class="headline-md">Dashboard Overview</h2>
          <p class="body-md text-muted">Welcome back, Caretaker. Here's what's happening today.</p>
        </div>

        <div class="warden-stats-banner">
          <div class="warden-stat-banner-item" style="background:var(--primary-container);color:#fff;">
            <span class="material-icons-outlined" style="font-size:20px;">pending_actions</span>
            <div>
              <div class="warden-stat-num">${freshPending.length}</div>
              <div class="warden-stat-sub">Pending Approvals</div>
            </div>
            ${freshPending.length > 0 ? `<span class="badge-urgent">${freshPending.length} URGENT</span>` : ''}
          </div>
          <div class="warden-stat-banner-item">
            <span class="material-icons-outlined" style="font-size:20px;color:var(--primary-container);">flight_takeoff</span>
            <div>
              <div class="warden-stat-num">${freshStats.studentsOut || 0}</div>
              <div class="warden-stat-sub">Students on leave</div>
            </div>
          </div>
          <div class="warden-stat-banner-item">
            <span class="material-icons-outlined" style="font-size:20px;color:var(--status-success);">group</span>
            <div>
              <div class="warden-stat-num">${freshStats.totalStudents || 0}</div>
              <div class="warden-stat-sub">Total Residents</div>
            </div>
          </div>
        </div>

        <div class="section-row" style="margin-top:var(--space-lg);">
          <span class="section-title">Action Required</span>
          ${freshPending.length > 0 ? `<a href="#/caretaker/requests" style="font-size:13px;color:var(--primary-container);font-weight:500;">View All</a>` : ''}
        </div>

        ${freshPending.length > 0 ? `
          <div class="action-required-list stagger">
            ${freshPending.slice(0, 5).map(l => {
              const student = l.student;
              const lid = l.leaveId;
              return `
                <div class="action-card animate-fade-in-up">
                  <div class="action-card-top">
                    ${renderAvatar(student, 'action-avatar')}
                    <div class="action-info">
                      <div class="action-name">${escapeHtml(student?.name || 'Unknown')}</div>
                      <div class="action-meta">${formatDateRange(l.outDate, l.inDate)} • ${escapeHtml(l.reason || '')}</div>
                      <div class="action-meta">${escapeHtml(student?.department || '')} — ${escapeHtml(l.type || '')}</div>
                    </div>
                  </div>
                  <div class="action-btns">
                    <button class="btn btn-outline-danger btn-sm" data-reject="${lid}">Reject</button>
                    <button class="btn btn-primary btn-sm" data-approve="${lid}">Approve</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        ` : `
          <div class="card animate-fade-in" style="text-align:center;padding:var(--space-xl);margin-bottom:var(--space-md);">
            <span class="material-icons-outlined" style="font-size:36px;color:var(--status-success);margin-bottom:8px;">task_alt</span>
            <div style="font-size:14px;color:var(--on-surface-variant);">All caught up! No pending requests.</div>
          </div>
        `}

        <div style="position:relative;margin-bottom:var(--space-lg);">
          <span class="material-icons-outlined" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:18px;color:var(--outline);">search</span>
          <input class="form-input" type="text" placeholder="Search students by name or ID..." style="padding-left:36px;cursor:pointer;" readonly onclick="window.location.hash='#/caretaker/residents'"/>
        </div>

        <div class="section-title">Weekly Leave Trends</div>
        <div class="card animate-fade-in" style="padding:var(--space-md);margin-bottom:var(--space-lg);">
          <canvas id="caretakerChart" height="150"></canvas>
        </div>

        <div class="section-title">Quick Announcements</div>
        <div class="announcements-list animate-fade-in">
          <div class="announcement-card announcement-maintenance">
            <span class="announcement-tag">MAINTENANCE</span>
            <p class="announcement-text">Block B water supply maintenance tomorrow 10AM–1PM.</p>
          </div>
          <div class="announcement-card announcement-policy">
            <span class="announcement-tag">POLICY UPDATE</span>
            <p class="announcement-text">New late-night entry registration starting next week.</p>
          </div>
        </div>
        <a href="#" class="post-announcement-link" onclick="event.preventDefault();">
          <span class="material-icons-outlined" style="font-size:14px;">add</span>
          Post Announcement
        </a>
      </div>

      <button class="fab" onclick="window.location.hash='#/caretaker/requests'" title="Leave Requests">
        <span class="material-icons-outlined">event_available</span>
      </button>

      ${caretakerNav('dashboard')}
    `;

    renderChart();
    bindActions(freshLeaves);
  }

  function renderChart() {
    const canvas = document.getElementById('caretakerChart');
    if (!canvas) return;

    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: days,
        datasets: [{
          label: 'Leave Requests',
          data: [3, 7, 5, 8, 6, 4, 2],
          backgroundColor: 'rgba(26, 86, 219, 0.7)',
          borderRadius: 6,
          borderSkipped: false,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { font: { family: 'Inter', size: 11 }, stepSize: 2 } },
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
        },
      },
    });
  }

  function bindActions(freshLeaves) {
    document.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', () => {
        const leaveId = btn.dataset.approve;
        const leave = freshLeaves.find(l => l.leaveId === leaveId);
        const student = leave?.student;
        showModal(
          'Approve Leave',
          `Approve <strong>${leave?.type}</strong> for <strong>${student?.name}</strong>? A QR outpass will be generated automatically.`,
          async () => {
            try {
              await approveLeave(leaveId, user.id);
              showToast(`Approved QR pass generated for ${student?.name?.split(' ')[0]}`, 'success');
            } catch (err) {
              showToast(err.message || 'Failed to approve', 'error');
            }
            await render();
          },
          'Approve',
          'btn-primary'
        );
      });
    });

    document.querySelectorAll('[data-reject]').forEach(btn => {
      btn.addEventListener('click', () => {
        const leaveId = btn.dataset.reject;
        const leave = freshLeaves.find(l => l.leaveId === leaveId);
        const student = leave?.student;
        showModal(
          'Reject Leave',
          `Reject <strong>${leave?.type}</strong> for <strong>${student?.name}</strong>? This action cannot be undone.`,
          async () => {
            await rejectLeave(leaveId, user.id, 'Rejected by Warden');
            showToast(`Leave rejected for ${student?.name?.split(' ')[0]}`, 'info');
            await render();
          },
          'Reject',
          'btn-danger'
        );
      });
    });
  }

  return () => {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  };
}
