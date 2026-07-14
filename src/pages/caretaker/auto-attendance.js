import { getCurrentUser } from '../../auth.js';
import { getUsers, saveAttendanceSnapshot } from '../../store.js';
import { caretakerNav, showToast, escapeHtml, renderAvatar, renderLogoutIcon } from '../../helpers.js';
import { supabase } from '../../supabase.js';

export default async function caretakerAutoAttendance(app) {
  const user = getCurrentUser();
  if (!user) return;
  const hostelType = user.role === 'boys_caretaker' ? 'Boys' : 'Girls';

  let cachedStudents = [];

  async function render() {
    const all = await getUsers();
    const students = all.filter(s => s.role === 'student' && s.hostelType === hostelType && s.isApproved);
    cachedStudents = students;
    const depts = [...new Set(students.map(s => s.department).filter(Boolean))].sort();
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const present = students.filter(s => s.activeStatus === 'IN');
    const absent = students.filter(s => s.activeStatus === 'OUT');

    let snapshotsHtml = '';
    try {
      const { data: files, error } = await supabase.storage.from('attendance-snapshots').list('', { sortBy: { column: 'name', order: 'desc' } });
      if (!error && files) {
        const hostelFiles = files.filter(f => f.name.startsWith(hostelType.toLowerCase()));
        if (hostelFiles.length > 0) {
          snapshotsHtml = `
            <div class="card mb-sm">
              <div class="fs-14 fw-600 mb-sm">Past Snapshots</div>
              ${hostelFiles.map(f => {
                const { data: { publicUrl } } = supabase.storage.from('attendance-snapshots').getPublicUrl(f.name);
                const datePart = f.name.replace(/^.+_(\d{4}-\d{2}-\d{2})\.csv$/, '$1');
                return `
                  <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--surface-container);">
                    <span class="fs-12">${datePart}</span>
                    <a href="${publicUrl}" target="_blank" class="btn btn-sm btn-primary" style="font-size:11px;padding:4px 8px;text-decoration:none;" download>
                      <span class="material-icons-outlined" style="font-size:14px;">download</span> CSV
                    </a>
                  </div>
                `;
              }).join('')}
            </div>
          `;
        }
      }
    } catch {}

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Auto Attendance</span>
          </div>
          <div class="flex items-center gap-sm">
            ${renderLogoutIcon()}
            <a href="#/caretaker/profile" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:6px;">${renderAvatar(user, 'stitch-avatar-sm')}</a>
          </div>
        </header>

        <div class="page-content">
          <h2 class="m-0 mb-xs fs-20 fw-600">${hostelType} Hostel ΓÇö Daily Attendance</h2>
          <p class="m-0 mb-md fs-13 c-outline">${today} ΓÇó Auto-tracked via gate scans (8 PM cutoff)</p>

          <div class="flex gap-sm mb-md">
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--primary-container);">${students.length}</div><div class="stat-label" style="font-size:10px;">Total</div></div>
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--status-success);">${present.length}</div><div class="stat-label" style="font-size:10px;">Present</div></div>
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--status-danger);">${absent.length}</div><div class="stat-label" style="font-size:10px;">Absent</div></div>
          </div>

          <button class="btn btn-primary btn-sm w-full mb-md" id="downloadCsvBtn">
            <span class="material-icons-outlined" style="font-size:18px;">download</span> Download & Save Today's CSV
          </button>

          ${snapshotsHtml}

          ${depts.map(dept => {
            const deptStudents = students.filter(s => s.department === dept);
            const years = [...new Set(deptStudents.map(s => s.year).filter(Boolean))].sort();
            return `
              <div class="card mb-sm">
                <div style="font-size:15px;font-weight:600;margin-bottom:8px;color:var(--primary-container);">${escapeHtml(dept)}</div>
                ${years.map(year => {
                  const yrStudents = deptStudents.filter(s => s.year === year);
                  const yrPresent = yrStudents.filter(s => s.activeStatus === 'IN');
                  const yrAbsent = yrStudents.filter(s => s.activeStatus === 'OUT');
                  return `
                    <div style="margin-bottom:8px;">
                      <div style="font-size:12px;font-weight:500;color:var(--on-surface-variant);margin-bottom:4px;">Year ${escapeHtml(year)} ΓÇö ${yrPresent.length} Present / ${yrAbsent.length} Absent</div>
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
        ${caretakerNav('attendance')}
      </div>
    `;

    document.getElementById('downloadCsvBtn')?.addEventListener('click', downloadCsv);
  }

  async function downloadCsv() {
    const students = cachedStudents;
    try {
      const csv = await saveAttendanceSnapshot(hostelType, students);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      a.download = `${hostelType.toLowerCase()}_hostel_attendance_${dateStr}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Saved & downloaded', 'success');
      render();
    } catch (e) {
      showToast('Save failed: ' + e.message, 'error');
      console.error('Attendance save error:', e);
    }
  }

  render();
}
