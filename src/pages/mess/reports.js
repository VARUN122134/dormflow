import { getCurrentUser } from '../../auth.js';
import { getMonthlyMessReport, getDailyBill, getBillHistory } from '../../store.js';
import { messInchargeNav, showToast, escapeHtml, renderNotifBell, renderAvatar, renderLogoutIcon } from '../../helpers.js';
import { supabase } from '../../supabase.js';

export default async function messReportsPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const history = await getBillHistory(31);

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Mess Reports</span>
          </div>
          <div class="flex items-center gap-sm">
            ${renderLogoutIcon()}
            ${renderNotifBell()}
            ${renderAvatar(user, 'stitch-avatar-sm')}
          </div>
        </header>
        <div class="page-content">
          <h2 class="m-0 mb-xs fs-20 fw-600">Monthly Accounts</h2>
          <p class="m-0 mb-md fs-13 c-outline">Generate and download mess account reports</p>

          <div class="card mb-md p-md">
            <div class="fs-14 fw-600 mb-sm">${year}-${month} Report</div>
            <button class="btn btn-primary btn-sm w-full" id="genReportBtn">
              <span class="material-icons-outlined" style="font-size:18px;">download</span> Generate & Download Monthly Report
            </button>
          </div>

          <div class="section-title">Saved Reports</div>
          <div id="savedReports">
            <p class="text-muted" id="loadingReports">Loading...</p>
          </div>

          <div class="section-title">Daily Bills (Last 31 Days)</div>
          <div id="billHistory">
            ${history.map(b => `
              <div class="card" style="margin-bottom:6px;padding:10px;">
                <div class="flex justify-between fs-12">
                  <span><strong>${b.billDate}</strong></span>
                  <span>₹${b.perStudentCost} × ${b.totalStudents} students = ₹${b.totalStockCost}</span>
                </div>
              </div>
            `).join('') || '<p class="text-muted">No bills yet.</p>'}
          </div>
        </div>
        ${messInchargeNav('reports')}
      </div>
    `;

    document.getElementById('genReportBtn')?.addEventListener('click', generateReport);
    loadSavedReports();
  }

  async function loadSavedReports() {
    try {
      const { data: files } = await supabase.storage.from('attendance-snapshots').list('', { sortBy: { column: 'name', order: 'desc' } });
      const reportFiles = (files || []).filter(f => f.name.includes('mess-accounts'));
      const el = document.getElementById('savedReports');
      if (reportFiles.length === 0) {
        el.innerHTML = '<p class="text-muted">No saved reports yet.</p>';
      } else {
        el.innerHTML = reportFiles.map(f => {
          const { data: { publicUrl } } = supabase.storage.from('attendance-snapshots').getPublicUrl(f.name);
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--surface-container);">
            <span class="fs-12">${f.name}</span>
            <a href="${publicUrl}" target="_blank" class="btn btn-sm btn-primary" style="font-size:11px;text-decoration:none;" download>Download</a>
          </div>`;
        }).join('');
      }
    } catch { document.getElementById('savedReports').innerHTML = '<p class="text-muted">Could not load reports.</p>'; }
  }

  async function generateReport() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const monthStr = String(month).padStart(2, '0');
    try {
      const report = await getMonthlyMessReport(year, month);
      if (Object.keys(report.students).length === 0) { showToast('No data for this month', 'warning'); return; }

      let csv = `Student Name,Department,Year,Register Number,Total Deposited,Total Deducted,Closing Balance\n`;
      report.students.forEach(s => {
        const closing = s.deposits - s.totalDeducted;
        csv += `"${s.name}","${s.department}","${s.year}","${s.regNo}","${s.deposits}","${s.totalDeducted}","${closing}"\n`;
      });
      csv += `\nDaily Bills\nDate,Per Student Cost,Total Students,Total Cost\n`;
      (report.bills || []).forEach(b => {
        csv += `"${b.billDate}","${b.perStudentCost}","${b.totalStudents}","${b.totalStockCost}"\n`;
      });

      const fileName = `mess-accounts-${year}-${monthStr}.csv`;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const file = new File([blob], fileName, { type: 'text/csv' });
      await supabase.storage.from('attendance-snapshots').upload(fileName, file, { upsert: true });

      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = dlUrl; a.download = fileName; a.click();
      URL.revokeObjectURL(dlUrl);
      showToast('Report saved & downloaded', 'success');
      loadSavedReports();
    } catch (e) { showToast('Report failed: ' + e.message, 'error'); }
  }

  render();
}
