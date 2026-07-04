import { getCurrentUser } from '../../auth.js';
import { getMessAttendance, getEvents, getEventAttendance } from '../../store.js';
import { studentNav, showToast, escapeHtml, formatDate, renderNotifBell, renderBackButton, renderLogoutIcon } from '../../helpers.js';

export default async function studentAttendancePage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const [messRecords, events] = await Promise.all([
      getMessAttendance({ studentId: user.id }),
      getEvents({ upcoming: true }),
    ]);

    const mealLabels = { morning_tea: 'Morning Tea', breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' };
    const today = new Date().toISOString().slice(0, 10);
    const todayMeals = messRecords.filter(r => r.attendanceDate === today);
    const totalMeals = messRecords.length;
    const uniqueDays = new Set(messRecords.map(r => r.attendanceDate)).size;

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            ${renderBackButton()}
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Attendance</span>
          </div>
          <div class="flex items-center gap-sm">
            ${renderLogoutIcon()}
            ${renderNotifBell()}
            <span class="fs-13 c-on-surface-variant">${escapeHtml(user.name?.split(' ')[0] || '')}</span>
          </div>
        </header>

        <div class="page-content">
          <h2 class="m-0 mb-xs fs-20 fw-600">My Attendance</h2>
          <p class="m-0 mb-md fs-13 c-outline">${uniqueDays} days • ${totalMeals} meals recorded</p>

          <div class="card card-elevated mb-md">
            <h3 class="m-0 mb-md fs-16">Today's Meals</h3>
            <div class="flex gap-xs" style="flex-wrap:wrap;">
              ${['morning_tea','breakfast','lunch','snacks','dinner'].map(mt => {
                const marked = todayMeals.some(r => r.mealType === mt);
                return `<span class="chip ${marked ? 'chip-approved' : 'chip-neutral'}"><span class="material-icons-outlined" style="font-size:14px;margin-right:2px;">${marked ? 'check_circle' : 'radio_button_unchecked'}</span> ${mealLabels[mt]}</span>`;
              }).join('')}
            </div>
          </div>

          <h3 class="m-0 mb-md fs-16">Upcoming Events</h3>
          ${events.slice(0, 5).length === 0
            ? '<div class="card p-md text-center c-outline fs-13">No upcoming events</div>'
            : events.slice(0, 5).map(e => `
              <div class="card mb-sm flex items-center" style="gap:12px;">
                <div style="width:44px;height:44px;border-radius:8px;background:var(--primary-fixed);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <span class="material-icons-outlined" style="color:var(--primary-container);">event</span>
                </div>
                <div style="flex:1;">
                  <div class="fs-13 fw-600">${escapeHtml(e.title)}</div>
                  <div class="fs-12 c-on-surface-variant">${formatDate(e.eventDate)}${e.venue ? ` • ${escapeHtml(e.venue)}` : ''}</div>
                </div>
              </div>
            `).join('')}

          <h3 class="mt-md mb-md fs-16">Recent Meal History</h3>
          ${messRecords.slice(0, 10).length === 0
            ? '<div class="card p-lg text-center c-outline">No attendance records yet</div>'
            : messRecords.slice(0, 10).map(r => `
              <div class="card mb-xs p-sm flex justify-between items-center">
                <div><span class="chip chip-approved" style="font-size:10px;">${mealLabels[r.mealType] || r.mealType}</span></div>
                <div class="fs-12 c-outline">${formatDate(r.attendanceDate)}</div>
              </div>
            `).join('')}
        </div>

        ${studentNav('profile', user.isMessMember)}
      </div>
    `;
  }

  render();
}
