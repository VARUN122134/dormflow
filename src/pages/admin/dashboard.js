import { getCurrentUser } from '../../auth.js';
import { getSystemStats, getRecentGateActivity, getUsers } from '../../store.js';
import { adminNav, formatRelativeTime, renderPageHeader, getInitials } from '../../helpers.js';
import { Chart } from 'chart.js';

export default async function adminDashboard(app) {
  const user = getCurrentUser();
  if (!user) return;

  const stats = await getSystemStats();
  const recentActivity = await getRecentGateActivity(5);
  const allUsers = await getUsers();
  const wardens = allUsers.filter(u => u.role === 'boys_warden' || u.role === 'girls_warden');
  const security = allUsers.filter(u => u.role === 'security');
  let chartInstance = null;

  app.innerHTML = `
    <header class="page-header">
      <div style="display:flex;align-items:center;gap:12px;">
        <img src="logo.png" alt="Anna University Logo" style="width: 36px; height: 36px; object-fit: contain;" />
        <div>
          <div class="page-header-title">UCE IT</div>
          <div class="page-header-subtitle">System Admin</div>
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:var(--space-sm);">
        <span class="material-icons-outlined" style="color:var(--on-surface-variant);cursor:pointer;">notifications</span>
        <div style="width:36px;height:36px;border-radius:50%;background:var(--primary-fixed);color:var(--primary-container);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;">${getInitials(user.name)}</div>
      </div>
    </header>

    <nav class="sidebar-nav">
      <a href="#/admin/dashboard" class="sidebar-item active">
        <span class="material-icons-outlined">analytics</span> System Reports
      </a>
      <a href="#/admin/users" class="sidebar-item">
        <span class="material-icons-outlined">badge</span> Staff Management
      </a>
      <a href="#" class="sidebar-item" onclick="event.preventDefault();">
        <span class="material-icons-outlined">settings_applications</span> Configurations
      </a>
      <a href="#" class="sidebar-item" onclick="event.preventDefault();">
        <span class="material-icons-outlined">history_edu</span> Audit Logs
      </a>
      <a href="#" class="sidebar-item" onclick="event.preventDefault();">
        <span class="material-icons-outlined">settings</span> Settings
      </a>
    </nav>

    <div class="page">
      <h2 style="margin-bottom:var(--space-xs);">System Health Overview</h2>

      <div class="admin-health-grid" style="margin-top:var(--space-md);">
        <div class="stat-card animate-fade-in">
          <div class="stat-value">${stats.totalUsers.toLocaleString()}</div>
          <div class="stat-label">Active Users</div>
          <div class="stat-trend up">
            <span class="material-icons-outlined" style="font-size:14px;">trending_up</span> +12%
          </div>
        </div>
        <div class="stat-card animate-fade-in">
          <div class="stat-value">${stats.systemUptime}</div>
          <div class="stat-label">Uptime</div>
          <div class="stat-trend neutral">
            <span class="material-icons-outlined" style="font-size:14px;">check_circle</span> OK
          </div>
        </div>
        <div class="stat-card animate-fade-in">
          <div class="stat-value">${stats.avgResponseTime}</div>
          <div class="stat-label">Latency</div>
          <div class="stat-trend up">
            <span class="material-icons-outlined" style="font-size:14px;">speed</span> Fast
          </div>
        </div>
      </div>

      <div class="section-title">Monthly Leave Trends</div>
      <div class="chart-container animate-fade-in">
        <canvas id="monthlyChart"></canvas>
      </div>

      <div class="section-title">Staff Capacity</div>
      <div class="card animate-fade-in" style="margin-bottom:var(--space-lg);">
        <p class="body-md text-muted">
          Managing <strong>${wardens.length}</strong> active Wardens and <strong>${security.length}</strong> Gate Security Officers across campus.
        </p>
        <div style="display:flex;gap:var(--space-sm);margin-top:var(--space-md);flex-wrap:wrap;">
          ${wardens.map(w => `
            <div class="chip chip-info">${w.name} — ${w.hostelType || 'Staff'}</div>
          `).join('')}
          ${security.map(s => `
            <div class="chip chip-neutral">${s.name} — Gate</div>
          `).join('')}
        </div>
      </div>

      <div class="section-title">Management</div>
      <div class="feature-grid" style="margin-bottom:var(--space-lg);">
        <a href="#/admin/rooms" class="feature-card">
          <span class="material-icons-outlined">meeting_room</span>
          <div class="feature-label">Room Management</div>
        </a>
        <a href="#/admin/complaints" class="feature-card">
          <span class="material-icons-outlined">feedback</span>
          <div class="feature-label">Complaints</div>
        </a>
        <a href="#/notifications" class="feature-card">
          <span class="material-icons-outlined">notifications</span>
          <div class="feature-label">Notifications</div>
        </a>
        <a href="#/admin/send-notifications" class="feature-card">
          <span class="material-icons-outlined">send</span>
          <div class="feature-label">Send Notif</div>
        </a>
      </div>

      <div class="section-title">Recent System Activity</div>
      <div class="card animate-fade-in">
        ${recentActivity.length > 0 ? recentActivity.map(a => `
          <div class="activity-item">
            <div class="activity-icon ${a.action === 'IN' ? 'icon-success' : 'icon-warning'}">
              <span class="material-icons-outlined">${a.action === 'IN' ? 'login' : 'logout'}</span>
            </div>
            <div class="activity-content">
              <div class="activity-title">${a.studentName}</div>
              <div class="activity-desc">${a.hostelType} Hostel • Gate ${a.action}</div>
            </div>
            <div class="activity-time">${formatRelativeTime(a.timestamp)}</div>
          </div>
        `).join('') : `
          <div class="body-md text-muted" style="padding:var(--space-md);text-align:center;">No recent system activity</div>
        `}
      </div>
    </div>
    ${adminNav('dashboard')}
  `;

  renderMonthlyChart();

  return () => {
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
  };

  function renderMonthlyChart() {
    const canvas = document.getElementById('monthlyChart');
    if (!canvas) return;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    chartInstance = new Chart(canvas, {
      type: 'line',
      data: {
        labels: months,
        datasets: [
          {
            label: 'Boys Hostel',
            data: [45, 52, 38, 65, 58, 72],
            borderColor: 'rgba(26, 86, 219, 0.8)',
            backgroundColor: 'rgba(26, 86, 219, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#1a56db',
          },
          {
            label: 'Girls Hostel',
            data: [32, 40, 35, 48, 42, 55],
            borderColor: 'rgba(173, 59, 0, 0.8)',
            backgroundColor: 'rgba(173, 59, 0, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: '#ad3b00',
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 }, usePointStyle: true } },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { font: { family: 'Inter', size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } },
        },
      },
    });
  }
}
