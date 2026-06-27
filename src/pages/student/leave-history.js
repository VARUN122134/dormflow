/* ========================================
   Leave History (Supabase)
   ======================================== */

import { getCurrentUser } from '../../auth.js';
import { getLeavesByStudent, getOutpassByLeave } from '../../store.js';
import { studentNav, statusChip, formatDateRange, renderPageHeader } from '../../helpers.js';

export default async function leaveHistoryPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  let filter = 'All';
  await render();

  async function render() {
    const leaves = await getLeavesByStudent(user.id);

    // Fetch outpasses in parallel
    const outpassResults = await Promise.all(
      leaves.map(async (l) => {
        const op = await getOutpassByLeave(l.leaveId);
        return { leaveId: l.leaveId, outpass: op };
      })
    );
    const opMap = {};
    outpassResults.forEach(item => {
      opMap[item.leaveId] = item.outpass;
    });

    const filtered = filter === 'All' ? leaves : leaves.filter(l => {
      if (filter === 'Completed') {
        const op = opMap[l.leaveId];
        return op && op.status === 'Completed';
      }
      return l.approvalStatus === filter;
    });

    app.innerHTML = `
      ${renderPageHeader('DormFlow', '')}
      <div class="page">
        <h2 style="margin-bottom:var(--space-xs);">Leave History</h2>
        <p class="body-md text-muted" style="margin-bottom:var(--space-md);">
          Track your past and active leave applications here.
        </p>

        <!-- Filter Tabs -->
        <div class="filter-tabs" id="filterTabs">
          ${['All', 'Approved', 'Pending', 'Rejected'].map(f => `
            <button class="filter-tab ${filter === f ? 'active' : ''}" data-filter="${f}">${f}</button>
          `).join('')}
        </div>

        <!-- Leave Cards -->
        <div style="margin-top:var(--space-md);" class="stagger">
          ${filtered.length > 0 ? filtered.map(l => {
            const outpass = opMap[l.leaveId];
            const statusClass = l.approvalStatus.toLowerCase();
            return `
              <div class="history-card ${statusClass} animate-fade-in-up" style="padding-left:calc(var(--space-md) + 8px);">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                  <div class="history-card-dates">${formatDateRange(l.outDate, l.inDate)}</div>
                  ${statusChip(outpass?.status === 'Completed' ? 'Completed' : l.approvalStatus)}
                </div>
                <div class="history-card-type">${l.type}</div>
                ${l.reason ? `<div class="body-md text-muted" style="margin-top:4px;font-size:12px;padding-left:var(--space-sm);">${l.reason.slice(0, 80)}${l.reason.length > 80 ? '...' : ''}</div>` : ''}
                ${outpass && (outpass.status === 'Active' || outpass.status === 'Used') ? `
                  <a href="#/student/outpass" class="btn btn-ghost btn-sm" style="margin-top:var(--space-sm);padding-left:var(--space-sm);">
                    <span class="material-icons-outlined" style="font-size:16px;">qr_code_2</span>
                    View QR
                  </a>
                ` : ''}
              </div>
            `;
          }).join('') : `
            <div class="empty-state">
              <span class="material-icons-outlined">event_busy</span>
              <div class="empty-state-title">No leaves found</div>
              <div class="empty-state-desc">You haven't applied for any ${filter !== 'All' ? filter.toLowerCase() : ''} leaves yet.</div>
            </div>
          `}
        </div>
      </div>
      ${studentNav('history')}
    `;

    // Attach filter handlers
    document.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', async () => {
        filter = tab.dataset.filter;
        await render();
      });
    });
  }
}
