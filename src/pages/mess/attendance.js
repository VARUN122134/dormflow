import { getCurrentUser } from '../../auth.js';
import { markMessAttendance, getMessAttendanceStats, getUsers } from '../../store.js';
import { messMemberNav, showToast, escapeHtml, renderPageHeader, renderNotifBell, renderBackButton } from '../../helpers.js';

export default async function messAttendancePage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const today = new Date().toISOString().slice(0, 10);
    const stats = await getMessAttendanceStats(today);

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            ${renderBackButton()}
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Mess Attendance</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderNotifBell()}
            <span style="font-size:13px;color:var(--on-surface-variant);">${escapeHtml(user.name?.split(' ')[0] || '')}</span>
          </div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:600;">Today's Attendance</h2>
          <p style="margin:0 0 16px 0;font-size:13px;color:var(--outline);">${new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <div class="stat-card" style="padding:10px;">
              <div class="stat-value" style="font-size:18px;color:var(--status-success);">${stats.uniqueStudents}</div>
              <div class="stat-label" style="font-size:10px;">Students</div>
            </div>
            <div class="stat-card" style="padding:10px;">
              <div class="stat-value" style="font-size:18px;color:var(--primary-container);">${stats.totalRecords}</div>
              <div class="stat-label" style="font-size:10px;">Total Meals</div>
            </div>
          </div>

          <div style="margin-bottom:12px;">
            <label class="form-label">Meal Type</label>
            <select class="form-input" id="attendanceMealType">
              <option value="morning_tea">Morning Tea</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="snacks">Snacks</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>

          <div class="form-group" style="margin-bottom:12px;">
            <label class="form-label">Student ID or Registration No.</label>
            <input class="form-input" id="studentSearch" placeholder="Search student...">
            <div id="studentResults" style="margin-top:4px;"></div>
          </div>

          <div id="manualEntry" style="display:none;">
            <button class="btn btn-primary btn-block" id="markAttendanceBtn">
              <span class="material-icons-outlined" style="font-size:18px;">qr_code_scanner</span> Mark Attendance
            </button>
          </div>

          <h3 style="margin:16px 0 8px 0;font-size:14px;">Today's Stats by Meal</h3>
          <div id="mealStats">
            ${Object.entries(stats.byMeal).map(([meal, count]) => `
              <div class="card" style="margin-bottom:4px;padding:8px 12px;display:flex;justify-content:space-between;">
                <span style="font-size:13px;text-transform:capitalize;">${escapeHtml(meal.replace(/_/g,' '))}</span>
                <span style="font-size:13px;font-weight:600;">${count}</span>
              </div>
            `).join('')}
          </div>
        </div>

        ${messMemberNav('dashboard')}
      </div>
    `;

    let selectedStudent = null;

    document.getElementById('studentSearch').addEventListener('input', async (e) => {
      const q = e.target.value.trim().toLowerCase();
      if (q.length < 2) { document.getElementById('studentResults').innerHTML = ''; document.getElementById('manualEntry').style.display = 'none'; return; }
      const allUsers = await getUsers();
      const matches = allUsers.filter(u => u.role === 'student' && (u.name.toLowerCase().includes(q) || u.registrationNo.toLowerCase().includes(q)));
      if (matches.length === 0) {
        document.getElementById('studentResults').innerHTML = '<div style="font-size:12px;color:var(--outline);">No students found</div>';
        document.getElementById('manualEntry').style.display = 'none';
        return;
      }
      document.getElementById('studentResults').innerHTML = matches.slice(0, 5).map(s => `
        <div class="studentResultItem" data-id="${s.id}" style="padding:8px 12px;cursor:pointer;border-radius:6px;background:var(--surface-container);margin-bottom:2px;font-size:13px;">
          ${escapeHtml(s.name)} <span style="color:var(--outline);font-size:11px;">(${s.registrationNo || s.email})</span>
        </div>
      `).join('');

      document.querySelectorAll('.studentResultItem').forEach(el => {
        el.onclick = () => {
          selectedStudent = matches.find(s => s.id === el.dataset.id);
          document.getElementById('studentSearch').value = selectedStudent?.name || '';
          document.getElementById('studentResults').innerHTML = '';
          document.getElementById('manualEntry').style.display = 'block';
        };
      });
    });

    document.getElementById('markAttendanceBtn')?.addEventListener('click', async () => {
      if (!selectedStudent) { showToast('Search and select a student first', 'warning'); return; }
      const mealType = document.getElementById('attendanceMealType').value;
      try {
        await markMessAttendance(selectedStudent.id, mealType, user.id);
        showToast(`Marked ${selectedStudent.name} for ${mealType}`, 'success');
        selectedStudent = null;
        document.getElementById('studentSearch').value = '';
        document.getElementById('manualEntry').style.display = 'none';
        render();
      } catch (e) { showToast(e.message || 'Failed', 'error'); }
    });
  }

  render();
}
