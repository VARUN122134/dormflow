import { getCurrentUser } from '../../auth.js';
import { getMessAttendance, getEvents, getEventAttendance } from '../../store.js';
import { studentNav, showToast, escapeHtml, formatDate, renderNotifBell, renderBackButton } from '../../helpers.js';

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
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderNotifBell()}
            <span style="font-size:13px;color:var(--on-surface-variant);">${escapeHtml(user.name?.split(' ')[0] || '')}</span>
          </div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:600;">My Attendance</h2>
          <p style="margin:0 0 16px 0;font-size:13px;color:var(--outline);">${uniqueDays} days • ${totalMeals} meals recorded</p>

          <div class="card card-elevated" style="margin-bottom:16px;">
            <h3 style="margin:0 0 12px 0;font-size:15px;">Today's Meals</h3>
            <div style="display:flex;flex-wrap:wrap;gap:6px;">
              ${['morning_tea','breakfast','lunch','snacks','dinner'].map(mt => {
                const marked = todayMeals.some(r => r.mealType === mt);
                return `<span class="chip ${marked ? 'chip-approved' : 'chip-neutral'}"><span class="material-icons-outlined" style="font-size:14px;margin-right:2px;">${marked ? 'check_circle' : 'radio_button_unchecked'}</span> ${mealLabels[mt]}</span>`;
              }).join('')}
            </div>
          </div>

          <h3 style="margin:0 0 12px 0;font-size:15px;">Upcoming Events</h3>
          ${events.slice(0, 5).length === 0
            ? '<div class="card" style="padding:16px;text-align:center;color:var(--outline);font-size:13px;">No upcoming events</div>'
            : events.slice(0, 5).map(e => `
              <div class="card" style="margin-bottom:8px;display:flex;align-items:center;gap:12px;">
                <div style="width:44px;height:44px;border-radius:8px;background:var(--primary-fixed);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                  <span class="material-icons-outlined" style="color:var(--primary-container);">event</span>
                </div>
                <div style="flex:1;">
                  <div style="font-size:13px;font-weight:600;">${escapeHtml(e.title)}</div>
                  <div style="font-size:11px;color:var(--on-surface-variant);">${formatDate(e.eventDate)}${e.venue ? ` • ${escapeHtml(e.venue)}` : ''}</div>
                </div>
              </div>
            `).join('')}

          <h3 style="margin:16px 0 12px 0;font-size:15px;">Recent Meal History</h3>
          ${messRecords.slice(0, 10).length === 0
            ? '<div class="card" style="padding:24px;text-align:center;color:var(--outline);">No attendance records yet</div>'
            : messRecords.slice(0, 10).map(r => `
              <div class="card" style="margin-bottom:4px;padding:8px 12px;display:flex;justify-content:space-between;align-items:center;">
                <div><span class="chip chip-approved" style="font-size:10px;">${mealLabels[r.mealType] || r.mealType}</span></div>
                <div style="font-size:11px;color:var(--outline);">${formatDate(r.attendanceDate)}</div>
              </div>
            `).join('')}
        </div>

        ${studentNav('profile')}
      </div>
    `;
  }

  render();
}
