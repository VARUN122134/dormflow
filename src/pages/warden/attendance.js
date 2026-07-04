import { getCurrentUser } from '../../auth.js';
import { getMessAttendance, getMessAttendanceStats, getEvents, getEventAttendance } from '../../store.js';
import { wardenNav, showToast, escapeHtml, formatDate, renderPageHeader, renderNotifBell, renderBackButton, renderLogoutIcon } from '../../helpers.js';

export default async function wardenAttendancePage(app) {
  const user = getCurrentUser();
  if (!user) return;
  const hostelType = user.role === 'boys_warden' ? 'Boys' : 'Girls';

  async function render() {
    const today = new Date().toISOString().slice(0, 10);
    const [messStats, events] = await Promise.all([
      getMessAttendanceStats(today),
      getEvents(),
    ]);

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
          <div class="flex gap-sm mb-md">
            <button class="btn btn-sm btn-primary" id="tabMessAtt" style="flex:1;">Mess</button>
            <button class="btn btn-sm btn-ghost" id="tabEvents" style="flex:1;">Events</button>
          </div>

          <div id="tabContent">
            ${renderMessTab(today, messStats)}
          </div>
        </div>

        ${wardenNav('profile')}
      </div>
    `;

    document.getElementById('tabMessAtt').onclick = async () => {
      document.getElementById('tabMessAtt').className = 'btn btn-sm btn-primary';
      document.getElementById('tabEvents').className = 'btn btn-sm btn-ghost';
      const s = await getMessAttendanceStats(today);
      document.getElementById('tabContent').innerHTML = renderMessTab(today, s);
    };
    document.getElementById('tabEvents').onclick = async () => {
      document.getElementById('tabEvents').className = 'btn btn-sm btn-primary';
      document.getElementById('tabMessAtt').className = 'btn btn-sm btn-ghost';
      const e = await getEvents();
      document.getElementById('tabContent').innerHTML = renderEventsTab(e);
      bindEventHandlers();
    };

    bindEventHandlers();
  }

  function renderMessTab(today, stats) {
    return `
      <h3 class="m-0 mb-md fs-16">Mess Attendance — ${formatDate(today)}</h3>
      <div class="flex gap-sm mb-sm">
        <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;">${stats.uniqueStudents}</div><div class="stat-label" style="font-size:10px;">Students</div></div>
        <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;">${stats.totalRecords}</div><div class="stat-label" style="font-size:10px;">Total Meals</div></div>
      </div>
      ${Object.keys(stats.byMeal).length === 0
        ? '<div class="card p-md text-center c-outline fs-13">No attendance recorded yet today</div>'
        : Object.entries(stats.byMeal).map(([meal, count]) => `
          <div class="card p-sm flex justify-between items-center" style="margin-bottom:4px;">
            <span class="fs-13 text-cap" style="font-weight:500;">${escapeHtml(meal.replace(/_/g,' '))}</span>
            <span class="chip chip-approved">${count}</span>
          </div>
        `).join('')}
    `;
  }

  function renderEventsTab(events) {
    return `
      <div class="flex gap-sm mb-sm">
        <button class="btn btn-primary btn-sm" id="createEventBtn" style="flex:1;">
          <span class="material-icons-outlined" style="font-size:16px;">add</span> Create Event
        </button>
      </div>
      ${events.length === 0
        ? '<div class="card p-lg text-center c-outline">No events</div>'
        : events.map(e => `
          <div class="card mb-sm">
            <div class="flex justify-between items-start">
              <div>
                <div class="fs-14 fw-600">${escapeHtml(e.title)}</div>
                <div class="fs-12 c-on-surface-variant">${formatDate(e.eventDate)}${e.venue ? ` • ${escapeHtml(e.venue)}` : ''}</div>
                <div class="fs-12 c-outline mt-sm text-cap">${e.type}</div>
              </div>
              <button class="btn btn-sm btn-ghost markEventAtt" data-event-id="${e.id}" style="color:var(--primary-container);">Mark</button>
            </div>
          </div>
        `).join('')}
    `;
  }

  function bindEventHandlers() {
    document.getElementById('createEventBtn')?.addEventListener('click', showCreateEventModal);
    app.querySelectorAll('.markEventAtt').forEach(btn => btn.onclick = () => showMarkAttendance(btn.dataset.eventId));
  }

  function showCreateEventModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">Create Event</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Title</label>
            <input class="form-input" id="evTitle" placeholder="Event name">
          </div>
          <div class="form-group">
            <label class="form-label">Description</label>
            <textarea class="form-input" id="evDesc" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Date</label>
            <input type="date" class="form-input" id="evDate">
          </div>
          <div class="form-group">
            <label class="form-label">Time</label>
            <input type="time" class="form-input" id="evTime">
          </div>
          <div class="form-group">
            <label class="form-label">Venue</label>
            <input class="form-input" id="evVenue" placeholder="Venue">
          </div>
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="form-input" id="evType">
              <option value="cultural">Cultural</option>
              <option value="sports">Sports</option>
              <option value="meeting">Meeting</option>
              <option value="workshop">Workshop</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="modalConfirm">Create</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const title = document.getElementById('evTitle').value.trim();
      if (!title) { showToast('Title required', 'warning'); return; }
      try {
        const { createEvent } = await import('../../store.js');
        await createEvent({
          title,
          description: document.getElementById('evDesc').value.trim(),
          eventDate: document.getElementById('evDate').value,
          eventTime: document.getElementById('evTime').value,
          venue: document.getElementById('evVenue').value.trim(),
          createdBy: user.id,
          type: document.getElementById('evType').value,
        });
        showToast('Event created!', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message, 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  function showMarkAttendance(eventId) {
    showToast('Mark attendance: select students from residents page', 'info');
  }

  render();
}
