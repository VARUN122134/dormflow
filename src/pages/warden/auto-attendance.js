import { getCurrentUser } from '../../auth.js';
import { getUsers } from '../../store.js';
import { wardenNav, showToast, escapeHtml, renderAvatar } from '../../helpers.js';

export default async function wardenAutoAttendance(app) {
  const user = getCurrentUser();
  if (!user) return;
  const hostelType = user.role === 'boys_warden' ? 'Boys' : 'Girls';

  let cachedStudents = [];

  async function render() {
    const all = await getUsers();
    const students = all.filter(s => s.role === 'student' && s.hostelType === hostelType && s.isApproved);
    cachedStudents = students;
    const depts = [...new Set(students.map(s => s.department).filter(Boolean))].sort();
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const present = students.filter(s => s.activeStatus === 'IN');
    const absent = students.filter(s => s.activeStatus === 'OUT');

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Auto Attendance</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <a href="#/warden/profile" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:6px;">${renderAvatar(user, 'stitch-avatar-sm')}</a>
          </div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:600;">${hostelType} Hostel — Daily Attendance</h2>
          <p style="margin:0 0 16px 0;font-size:13px;color:var(--outline);">${today} • Auto-tracked via gate scans (8 PM cutoff)</p>

          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--primary-container);">${students.length}</div><div class="stat-label" style="font-size:10px;">Total</div></div>
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--status-success);">${present.length}</div><div class="stat-label" style="font-size:10px;">Present</div></div>
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--status-danger);">${absent.length}</div><div class="stat-label" style="font-size:10px;">Absent</div></div>
          </div>

          <button class="btn btn-primary btn-sm" id="downloadCsvBtn" style="width:100%;margin-bottom:16px;">
            <span class="material-icons-outlined" style="font-size:18px;">download</span> Download Excel (.csv)
          </button>

          ${depts.map(dept => {
            const deptStudents = students.filter(s => s.department === dept);
            const years = [...new Set(deptStudents.map(s => s.year).filter(Boolean))].sort();
            return `
              <div class="card" style="margin-bottom:12px;">
                <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--primary-container);">${escapeHtml(dept)}</div>
                ${years.map(year => {
                  const yrStudents = deptStudents.filter(s => s.year === year);
                  const yrPresent = yrStudents.filter(s => s.activeStatus === 'IN');
                  const yrAbsent = yrStudents.filter(s => s.activeStatus === 'OUT');
                  return `
                    <div style="margin-bottom:8px;">
                      <div style="font-size:12px;font-weight:500;color:var(--on-surface-variant);margin-bottom:4px;">Year ${escapeHtml(year)} — ${yrPresent.length} Present / ${yrAbsent.length} Absent</div>
                      <table style="width:100%;border-collapse:collapse;font-size:11px;">
                        <thead>
                          <tr style="background:var(--surface-container);">
                            <th style="padding:4px 6px;text-align:left;border:1px solid var(--outline-variant);">Name</th>
                            <th style="padding:4px 6px;text-align:left;border:1px solid var(--outline-variant);">Reg No</th>
                            <th style="padding:4px 6px;text-align:left;border:1px solid var(--outline-variant);">Room</th>
                            <th style="padding:4px 6px;text-align:center;border:1px solid var(--outline-variant);">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${yrStudents.map(s => `
                            <tr>
                              <td style="padding:4px 6px;border:1px solid var(--outline-variant);">${escapeHtml(s.name)}</td>
                              <td style="padding:4px 6px;border:1px solid var(--outline-variant);">${escapeHtml(s.registrationNo)}</td>
                              <td style="padding:4px 6px;border:1px solid var(--outline-variant);">${s.roomNumber ? escapeHtml(s.roomNumber) : '-'}</td>
                              <td style="padding:4px 6px;border:1px solid var(--outline-variant);text-align:center;">
                                <span class="chip ${s.activeStatus === 'IN' ? 'chip-approved' : 'chip-pending'}" style="font-size:10px;">${s.activeStatus === 'IN' ? 'Present' : 'Absent'}</span>
                              </td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  `;
                }).join('')}
              </div>
            `;
          }).join('')}
        </div>
        ${wardenNav('attendance')}
      </div>
    `;

    document.getElementById('downloadCsvBtn')?.addEventListener('click', downloadCsv);
  }

  function downloadCsv() {
    const students = cachedStudents;
    const depts = [...new Set(students.map(s => s.department).filter(Boolean))].sort();

    let csv = `Department,Year,Name,Register Number,Room,Status\n`;
    depts.forEach(dept => {
      const deptStudents = students.filter(s => s.department === dept);
      const years = [...new Set(deptStudents.map(s => s.year).filter(Boolean))].sort();
      years.forEach(year => {
        const yrStudents = deptStudents.filter(s => s.year === year);
        yrStudents.forEach(s => {
          const status = s.activeStatus === 'IN' ? 'Present' : 'Absent';
          csv += `"${dept}","${year}","${s.name}","${s.registrationNo}","${s.roomNumber || ''}","${status}"\n`;
        });
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const dateStr = new Date().toISOString().slice(0, 10);
    a.download = `${hostelType.toLowerCase()}_hostel_attendance_${dateStr}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Download started', 'success');
  }

  render();
}
