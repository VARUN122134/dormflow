import { getCurrentUser } from '../../auth.js';
import { markAttendance, getAttendance, hasAttendanceForDate, getMonthlyAttendance } from '../../store.js';
import { caretakerNav, showToast, escapeHtml, renderPageHeader } from '../../helpers.js';

export default async function caretakerAttendance(app) {
  const user = getCurrentUser();
  if (!user) return;

  const hostelType = user.hostelType || (user.role === 'boys_caretaker' ? 'Boys' : 'Girls');
  const today = new Date().toISOString().slice(0, 10);
  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth() + 1;

  let view = 'daily';
  let selectedDate = today;
  let selYear = curYear;
  let selMonth = curMonth;
  let attendanceData = [];
  let alreadyMarked = false;

  await render();

  async function render() {
    if (view === 'daily') {
      alreadyMarked = await hasAttendanceForDate(selectedDate, hostelType);
      attendanceData = alreadyMarked ? await getAttendance(selectedDate, hostelType) : [];
    } else {
      attendanceData = await getMonthlyAttendance(selYear, selMonth);
    }

    const hour = now.getHours();
    const min = now.getMinutes();
    const isAfter8pm = hour > 20 || (hour === 20 && min >= 5);
    const isToday = selectedDate === today;

    const groups = groupByYearDept(attendanceData);
    const monthlyMatrix = view === 'monthly' ? buildMonthlyMatrix(attendanceData, selYear, selMonth) : null;

    app.innerHTML = `
      ${renderPageHeader('Attendance', `${hostelType} Hostel`)}
      <div class="page">
        <div class="filter-tabs" id="viewTabs" style="margin-bottom:var(--space-md);">
          <button class="filter-tab ${view === 'daily' ? 'active' : ''}" data-view="daily">Daily</button>
          <button class="filter-tab ${view === 'monthly' ? 'active' : ''}" data-view="monthly">Monthly Report</button>
        </div>

        ${view === 'daily' ? `
          <div style="display:flex;gap:var(--space-sm);align-items:center;margin-bottom:var(--space-md);">
            <label style="font-size:13px;font-weight:500;white-space:nowrap;">Date:</label>
            <input class="form-input" type="date" id="attDate" value="${selectedDate}" max="${today}" style="flex:1;" />
          </div>

          ${isToday && !alreadyMarked && isAfter8pm ? `
            <div style="background:var(--status-warning-bg);padding:12px 16px;border-radius:var(--radius-md);margin-bottom:var(--space-md);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="material-icons-outlined" style="color:var(--status-warning);">pending_actions</span>
              <span style="font-size:13px;color:var(--status-warning-text);flex:1;">Attendance not yet marked for today. It's past 8:05 PM — click below to mark now.</span>
              <button class="btn btn-primary btn-sm" id="markAttendanceBtn">
                <span class="material-icons-outlined" style="font-size:18px;">fact_check</span>
                Mark Attendance
              </button>
            </div>
          ` : ''}

          ${alreadyMarked ? `
            <div style="background:var(--surface-container-low);padding:12px 16px;border-radius:var(--radius-md);margin-bottom:var(--space-md);display:flex;align-items:center;gap:8px;">
              <span class="material-icons-outlined" style="color:var(--status-success);">check_circle</span>
              <span style="font-size:13px;color:var(--on-surface-variant);">Attendance already marked for ${formatDateDisplay(selectedDate)}</span>
              <button class="btn btn-secondary btn-sm" id="reMarkBtn" style="margin-left:auto;">
                <span class="material-icons-outlined" style="font-size:16px;">refresh</span>
                Re-mark
              </button>
            </div>
          ` : ''}

          ${!alreadyMarked && !(isToday && isAfter8pm) ? `
            <div class="card" style="padding:32px;text-align:center;">
              <span class="material-icons-outlined" style="font-size:48px;color:var(--outline);">fact_check</span>
              <p style="margin:12px 0 0 0;color:var(--outline);font-size:14px;">
                ${isToday ? 'Attendance will be available after 8:05 PM today.' : 'No attendance record for this date.'}
              </p>
            </div>
          ` : ''}

          ${alreadyMarked && Object.keys(groups).length > 0 ? `
            <div class="attendance-summary" style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-md);flex-wrap:wrap;">
              <div class="stat-card" style="flex:1;min-width:80px;text-align:center;padding:12px;">
                <div class="stat-value" style="color:var(--status-success);">${countStatus(attendanceData, 'PRESENT')}</div>
                <div class="stat-label">Present</div>
              </div>
              <div class="stat-card" style="flex:1;min-width:80px;text-align:center;padding:12px;">
                <div class="stat-value" style="color:var(--error);">${countStatus(attendanceData, 'ABSENT')}</div>
                <div class="stat-label">Absent</div>
              </div>
              <div class="stat-card" style="flex:1;min-width:80px;text-align:center;padding:12px;">
                <div class="stat-value" style="color:var(--status-warning);">${countStatus(attendanceData, 'LEAVE')}</div>
                <div class="stat-label">On Leave</div>
              </div>
              <div class="stat-card" style="flex:1;min-width:80px;text-align:center;padding:12px;">
                <div class="stat-value">${attendanceData.length}</div>
                <div class="stat-label">Total</div>
              </div>
            </div>
            <div style="margin-bottom:var(--space-md);">
              <button class="btn btn-secondary btn-sm" id="downloadDailyCsvBtn">
                <span class="material-icons-outlined" style="font-size:16px;">download</span>
                Download CSV
              </button>
            </div>
            ${renderDailyGroups(groups)}
          ` : ''}
        ` : ''}

        ${view === 'monthly' ? `
          <div style="display:flex;gap:var(--space-sm);align-items:center;margin-bottom:var(--space-md);">
            <label style="font-size:13px;font-weight:500;white-space:nowrap;">Month:</label>
            <input class="form-input" type="month" id="attMonth" value="${selYear}-${String(selMonth).padStart(2, '0')}" max="${curYear}-${String(curMonth).padStart(2, '0')}" style="flex:1;" />
          </div>

          ${monthlyMatrix && monthlyMatrix.students.length > 0 ? `
            <div style="background:var(--surface-container-low);padding:12px 16px;border-radius:var(--radius-md);margin-bottom:var(--space-md);display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              <span class="material-icons-outlined" style="color:var(--primary-container);">calendar_month</span>
              <span style="font-size:13px;color:var(--on-surface-variant);flex:1;">
                Monthly Report — ${monthName(selMonth)} ${selYear}
                <span style="display:block;font-size:11px;color:var(--outline);">${monthlyMatrix.students.length} students • Both hostels combined</span>
              </span>
              <button class="btn btn-secondary btn-sm" id="downloadMonthlyCsvBtn">
                <span class="material-icons-outlined" style="font-size:16px;">download</span>
                Download Report
              </button>
            </div>

            <div class="monthly-summary" style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-md);flex-wrap:wrap;">
              <div class="stat-card" style="flex:1;min-width:80px;text-align:center;padding:12px;">
                <div class="stat-value" style="color:var(--status-success);">${monthlyMatrix.students.reduce((s, st) => s + st.present, 0)}</div>
                <div class="stat-label">Total Present</div>
              </div>
              <div class="stat-card" style="flex:1;min-width:80px;text-align:center;padding:12px;">
                <div class="stat-value" style="color:var(--error);">${monthlyMatrix.students.reduce((s, st) => s + st.absent, 0)}</div>
                <div class="stat-label">Total Absent</div>
              </div>
              <div class="stat-card" style="flex:1;min-width:80px;text-align:center;padding:12px;">
                <div class="stat-value" style="color:var(--status-warning);">${monthlyMatrix.students.reduce((s, st) => s + st.leave, 0)}</div>
                <div class="stat-label">Total Leave</div>
              </div>
              <div class="stat-card" style="flex:1;min-width:80px;text-align:center;padding:12px;">
                <div class="stat-value">${monthlyMatrix.days}</div>
                <div class="stat-label">Days</div>
              </div>
            </div>

            <div style="overflow-x:auto;margin-bottom:var(--space-md);">
              <table style="width:100%;border-collapse:collapse;font-size:11px;min-width:600px;">
                <thead>
                  <tr style="background:var(--surface-container-low);">
                    <th style="text-align:left;padding:6px 8px;border:1px solid var(--surface-variant);position:sticky;left:0;background:var(--surface-container-low);z-index:1;">Student</th>
                    <th style="text-align:left;padding:6px 8px;border:1px solid var(--surface-variant);">Dept</th>
                    <th style="text-align:left;padding:6px 8px;border:1px solid var(--surface-variant);">Year</th>
                    <th style="text-align:left;padding:6px 8px;border:1px solid var(--surface-variant);">Hostel</th>
                    ${monthlyMatrix.dayNumbers.map(d => `
                      <th style="text-align:center;padding:4px 2px;border:1px solid var(--surface-variant);min-width:22px;font-weight:${d === now.getDate() && selMonth === curMonth && selYear === curYear ? '700' : '400'};">${d}</th>
                    `).join('')}
                    <th style="text-align:center;padding:6px 8px;border:1px solid var(--surface-variant);background:var(--status-success-bg);color:var(--status-success);">P</th>
                    <th style="text-align:center;padding:6px 8px;border:1px solid var(--surface-variant);background:var(--error-bg);color:var(--error);">A</th>
                    <th style="text-align:center;padding:6px 8px;border:1px solid var(--surface-variant);background:var(--status-warning-bg);color:var(--status-warning-text);">L</th>
                  </tr>
                </thead>
                <tbody>
                  ${monthlyMatrix.students.map(st => `
                    <tr style="border-bottom:1px solid var(--surface-variant);">
                      <td style="padding:4px 8px;border:1px solid var(--surface-variant);position:sticky;left:0;background:var(--surface);white-space:nowrap;">${escapeHtml(st.name)}</td>
                      <td style="padding:4px 8px;border:1px solid var(--surface-variant);">${escapeHtml(st.dept)}</td>
                      <td style="padding:4px 8px;border:1px solid var(--surface-variant);">${escapeHtml(st.year)}</td>
                      <td style="padding:4px 8px;border:1px solid var(--surface-variant);">${escapeHtml(st.hostel)}</td>
                      ${monthlyMatrix.dayNumbers.map(d => {
                        const dayKey = `${selYear}-${String(selMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const cell = st.days[dayKey];
                        let cls = '', icon = '';
                        if (!cell) { cls = 'color:var(--outline);'; icon = '\u2014'; }
                        else if (cell === 'PRESENT') { cls = 'color:var(--status-success);font-weight:600;'; icon = 'P'; }
                        else if (cell === 'ABSENT') { cls = 'color:var(--error);font-weight:600;'; icon = 'A'; }
                        else if (cell === 'LEAVE') { cls = 'color:var(--status-warning);font-weight:600;'; icon = 'L'; }
                        return `<td style="text-align:center;padding:4px 2px;border:1px solid var(--surface-variant);${cls}">${icon}</td>`;
                      }).join('')}
                      <td style="text-align:center;padding:4px 8px;border:1px solid var(--surface-variant);font-weight:600;color:var(--status-success);background:var(--status-success-bg);">${st.present}</td>
                      <td style="text-align:center;padding:4px 8px;border:1px solid var(--surface-variant);font-weight:600;color:var(--error);background:var(--error-bg);">${st.absent}</td>
                      <td style="text-align:center;padding:4px 8px;border:1px solid var(--surface-variant);font-weight:600;color:var(--status-warning);background:var(--status-warning-bg);">${st.leave}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : `
            <div class="card" style="padding:32px;text-align:center;">
              <span class="material-icons-outlined" style="font-size:48px;color:var(--outline);">calendar_view_month</span>
              <p style="margin:12px 0 0 0;color:var(--outline);font-size:14px;">No attendance data for ${monthName(selMonth)} ${selYear}.</p>
            </div>
          `}
        ` : ''}
      </div>
      ${caretakerNav('attendance')}
    `;

    document.getElementById('viewTabs')?.querySelectorAll('[data-view]').forEach(tab => {
      tab.addEventListener('click', async () => {
        view = tab.dataset.view;
        await render();
      });
    });

    document.getElementById('attDate')?.addEventListener('change', async (e) => {
      selectedDate = e.target.value;
      await render();
    });

    document.getElementById('attMonth')?.addEventListener('change', async (e) => {
      const parts = e.target.value.split('-');
      selYear = parseInt(parts[0]);
      selMonth = parseInt(parts[1]);
      await render();
    });

    document.getElementById('markAttendanceBtn')?.addEventListener('click', async () => {
      try {
        const btn = document.getElementById('markAttendanceBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;animation:spin 1s linear infinite;">refresh</span> Marking...';
        await markAttendance(hostelType, user.id);
        showToast(`Attendance marked for ${hostelType} Hostel`, 'success');
        await render();
      } catch (err) {
        showToast(err.message || 'Failed to mark attendance', 'error');
      }
    });

    document.getElementById('reMarkBtn')?.addEventListener('click', async () => {
      try {
        await markAttendance(hostelType, user.id);
        showToast('Attendance re-marked successfully', 'success');
        await render();
      } catch (err) {
        showToast(err.message || 'Failed to re-mark', 'error');
      }
    });

    document.getElementById('downloadDailyCsvBtn')?.addEventListener('click', () => {
      downloadDailyCsv(attendanceData, hostelType, selectedDate);
    });

    document.getElementById('downloadMonthlyCsvBtn')?.addEventListener('click', () => {
      downloadMonthlyCsv(monthlyMatrix, selYear, selMonth);
    });
  }
}

function renderDailyGroups(groups) {
  return Object.entries(groups).map(([year, depts]) => `
    <div class="card" style="margin-bottom:var(--space-md);">
      <div class="card-header" style="padding:12px 16px;border-bottom:1px solid var(--surface-variant);font-weight:600;font-size:15px;background:var(--surface-container-low);border-radius:var(--radius-md) var(--radius-md) 0 0;">
        ${escapeHtml(year)} Year
      </div>
      ${Object.entries(depts).map(([dept, records]) => `
        <div style="padding:8px 16px;">
          <div style="font-size:13px;font-weight:600;color:var(--primary-container);margin-bottom:4px;">${escapeHtml(dept)}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;">
            ${records.map(r => {
              const statusIcon = r.status === 'PRESENT' ? 'check_circle' : r.status === 'LEAVE' ? 'flight_takeoff' : 'cancel';
              const statusColor = r.status === 'PRESENT' ? 'var(--status-success)' : r.status === 'LEAVE' ? 'var(--status-warning)' : 'var(--error)';
              const student = r.student || {};
              return `
                <span class="chip" style="background:var(--surface-variant);padding:4px 10px;font-size:12px;display:inline-flex;align-items:center;gap:4px;">
                  <span class="material-icons-outlined" style="font-size:14px;color:${statusColor};">${statusIcon}</span>
                  ${escapeHtml(student.name || 'Unknown')}
                </span>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function buildMonthlyMatrix(records, year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const dayNumbers = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const studentMap = {};

  for (const r of records) {
    const student = r.student || {};
    const key = student.id;
    if (!key) continue;
    if (!studentMap[key]) {
      studentMap[key] = {
        name: student.name || 'Unknown',
        dept: r.department || student.department || '',
        year: r.year || student.year || '',
        hostel: r.hostel_type || student.hostel_type || '',
        days: {},
        present: 0,
        absent: 0,
        leave: 0,
      };
    }
    const dayNum = new Date(r.date + 'T00:00:00').getDate();
    studentMap[key].days[r.date] = r.status;
    if (r.status === 'PRESENT') studentMap[key].present++;
    else if (r.status === 'ABSENT') studentMap[key].absent++;
    else if (r.status === 'LEAVE') studentMap[key].leave++;
  }

  return {
    days: daysInMonth,
    dayNumbers,
    students: Object.values(studentMap),
  };
}

function groupByYearDept(records) {
  const groups = {};
  for (const r of records) {
    const year = r.year || 'Unknown';
    const dept = r.department || 'Unknown';
    if (!groups[year]) groups[year] = {};
    if (!groups[year][dept]) groups[year][dept] = [];
    groups[year][dept].push(r);
  }
  return groups;
}

function countStatus(records, status) {
  return records.filter(r => r.status === status).length;
}

function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function monthName(m) {
  return ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][m - 1] || '';
}

function downloadDailyCsv(records, hostelType, dateStr) {
  const header = 'Name,Department,Year,Room Number,Status,Date';
  const rows = records.map(r => {
    const student = r.student || {};
    const name = (student.name || 'Unknown').replace(/,/g, '');
    const dept = (r.department || '').replace(/,/g, '');
    const year = (r.year || '').replace(/,/g, '');
    const room = (student.roomNumber || '').replace(/,/g, '');
    return `${name},${dept},${year},${room},${r.status},${dateStr}`;
  });
  const csv = [header, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `attendance_${hostelType}_${dateStr}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function downloadMonthlyCsv(matrix, year, month) {
  const monthStr = `${year}-${String(month).padStart(2, '0')}`;
  const headerRow = ['Name', 'Department', 'Year', 'Hostel', ...matrix.dayNumbers.map(String), 'Present', 'Absent', 'Leave'];
  const rows = matrix.students.map(st => {
    const dayCols = matrix.dayNumbers.map(d => {
      const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const cell = st.days[dayKey];
      if (!cell) return '';
      if (cell === 'PRESENT') return 'P';
      if (cell === 'ABSENT') return 'A';
      if (cell === 'LEAVE') return 'L';
      return '';
    });
    return [
      st.name.replace(/,/g, ''),
      st.dept.replace(/,/g, ''),
      st.year.replace(/,/g, ''),
      st.hostel.replace(/,/g, ''),
      ...dayCols,
      st.present,
      st.absent,
      st.leave,
    ];
  });

  const csv = [headerRow.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `attendance_monthly_${monthStr}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
