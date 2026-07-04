import { getCurrentUser } from '../../auth.js';
import {
  getLeavesByHostel, approveLeave, rejectLeave,
  getHostelStats, getUsers
} from '../../store.js';
import { wardenNav, formatDateRange, getInitials, showToast, showModal, renderAvatar } from '../../helpers.js';
import { Chart } from 'chart.js';

export default async function wardenDashboard(app) {
  const user = getCurrentUser();
  if (!user) return;

  const hostelType = user.role === 'boys_warden' ? 'Boys' : 'Girls';
  let chartInstance = null;

  await render();

  async function render() {
    const freshLeaves = await getLeavesByHostel(hostelType);
    const freshPending = freshLeaves.filter(l => l.approvalStatus === 'Pending');
    const freshStats = await getHostelStats(hostelType);

    app.innerHTML = `
      <header class="stitch-header">
        <div class="stitch-header-left flex items-center gap-sm">
          <img src="logo.png" alt="Anna University Logo" style="width: 28px; height: 28px; object-fit: contain;" />
          <span class="stitch-brand">UCE IT</span>
        </div>
        ${renderAvatar(user, 'stitch-avatar-sm')}
      </header>

      <div class="page page-warden">
        <div class="warden-page-title">
          <h2 class="headline-md">Dashboard Overview</h2>
          <p class="body-md text-muted">Welcome back, Warden. Here's what's happening today.</p>
        </div>

        <div class="warden-stats-banner">
          <div class="warden-stat-banner-item" style="background:var(--primary-container);color:#fff;">
            <span class="material-icons-outlined fs-20">pending_actions</span>
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
            <span class="material-icons-outlined fs-20 c-success">group</span>
            <div>
              <div class="warden-stat-num">${freshStats.totalStudents || 0}</div>
              <div class="warden-stat-sub">Total Residents</div>
            </div>
          </div>
        </div>

        <div class="section-row mt-lg">
          <span class="section-title">Action Required</span>
          ${freshPending.length > 0 ? `<a href="#/warden/requests" class="fs-13" style="color:var(--primary-container);font-weight:500;">View All</a>` : ''}
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
                      <div class="action-name">${student?.name || 'Unknown'}</div>
                      <div class="action-meta">${formatDateRange(l.outDate, l.inDate)} • ${l.reason}</div>
                      <div class="action-meta">${student?.department || ''} — ${l.type}</div>
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
          <div class="card animate-fade-in text-center p-lg mb-md">
            <span class="material-icons-outlined fs-36 c-success mb-xs">task_alt</span>
            <div class="fs-14 c-on-surface-variant">All caught up! No pending requests.</div>
          </div>
        `}

        <div class="mb-lg" style="position:relative;">
          <span class="material-icons-outlined" style="position:absolute;left:10px;top:50%;transform:translateY(-50%);font-size:18px;color:var(--outline);">search</span>
          <input class="form-input" type="text" placeholder="Search students by name or ID..." style="padding-left:36px;cursor:pointer;" readonly onclick="window.location.hash='#/warden/residents'"/>
        </div>

        <div class="section-title">Weekly Leave Trends</div>
        <div class="card animate-fade-in p-md mb-lg">
          <canvas id="wardenChart" height="150"></canvas>
        </div>

        <div class="section-title">Management Tools</div>
        <div class="feature-grid mb-lg">
          <a href="#/warden/rooms" class="feature-card">
            <span class="material-icons-outlined">meeting_room</span>
            <div class="feature-label">Rooms</div>
          </a>
          <a href="#/warden/auto-attendance" class="feature-card">
            <span class="material-icons-outlined">fact_check</span>
            <div class="feature-label">Attendance</div>
          </a>
          <a href="#/notifications" class="feature-card">
            <span class="material-icons-outlined">notifications</span>
            <div class="feature-label">Notifications</div>
          </a>
          <a href="#/warden/announcements" class="feature-card">
            <span class="material-icons-outlined">campaign</span>
            <div class="feature-label">Announce</div>
          </a>
        </div>
      </div>

      <button class="fab" onclick="window.location.hash='#/warden/requests'" title="Leave Requests">
        <span class="material-icons-outlined">event_available</span>
      </button>

      ${wardenNav('dashboard')}
    `;

    renderChart();
    bindActions(freshLeaves);
  }

  function renderChart() {
    const canvas = document.getElementById('wardenChart');
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
