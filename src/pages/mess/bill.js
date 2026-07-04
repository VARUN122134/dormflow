import { getCurrentUser } from '../../auth.js';
import { getDailyBill, getBillHistory, calculateDailyBill, getDailyUsage } from '../../store.js';
import { messInchargeNav, showToast, escapeHtml, renderNotifBell, renderAvatar } from '../../helpers.js';

export default async function messBillPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const today = new Date().toISOString().slice(0, 10);
    const bill = await getDailyBill(today);
    const history = await getBillHistory(15);
    const usage = await getDailyUsage(today);

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Daily Bill</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderNotifBell()}
            ${renderAvatar(user, 'stitch-avatar-sm')}
          </div>
        </header>
        <div style="padding:16px;padding-bottom:80px;">
          <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:600;">Today's Mess Bill</h2>
          <p style="margin:0 0 16px 0;font-size:13px;color:var(--outline);">${new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

          ${bill ? `
            <div class="card" style="margin-bottom:12px;text-align:center;padding:20px;border-left:4px solid var(--status-success);">
              <div style="font-size:13px;color:var(--outline);margin-bottom:8px;">Bill already calculated</div>
              <div style="font-size:28px;font-weight:700;color:var(--primary-container);">₹${bill.perStudentCost}</div>
              <div style="font-size:12px;color:var(--on-surface-variant);margin-top:4px;">per student • ${bill.totalStudents} students present</div>
              <div style="font-size:11px;color:var(--outline);margin-top:4px;">Total stock cost: ₹${bill.totalStockCost}</div>
            </div>
          ` : `
            <div class="card" style="margin-bottom:12px;text-align:center;padding:20px;">
              ${usage && usage.items && usage.items.length > 0 ? `
                <div style="font-size:13px;color:var(--outline);margin-bottom:8px;">Usage recorded — ready to calculate</div>
                <button class="btn btn-primary" id="calcBillBtn">
                  <span class="material-icons-outlined" style="font-size:18px;">calculate</span> Calculate Today's Bill
                </button>
              ` : `
                <div style="font-size:13px;color:var(--outline);">
                  <span class="material-icons-outlined" style="font-size:40px;color:var(--outline-variant);display:block;margin-bottom:8px;">edit_note</span>
                  Record stock usage first in Daily Usage
                </div>
              `}
            </div>
          `}

          ${history.length > 0 ? `
            <div class="section-title">Bill History</div>
            ${history.map(b => `
              <div class="card" style="margin-bottom:6px;padding:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div><strong>${b.billDate}</strong></div>
                  <div style="text-align:right;">
                    <div style="font-weight:600;">₹${b.perStudentCost}<span style="font-weight:400;color:var(--outline);font-size:11px;"> / student</span></div>
                    <div style="font-size:11px;color:var(--outline);">${b.totalStudents} students • ₹${b.totalStockCost}</div>
                  </div>
                </div>
              </div>
            `).join('')}
          ` : ''}
        </div>
        ${messInchargeNav('bill')}
      </div>
    `;

    document.getElementById('calcBillBtn')?.addEventListener('click', calcBill);
  }

  async function calcBill() {
    const today = new Date().toISOString().slice(0, 10);
    try {
      await calculateDailyBill(today, user.id);
      showToast('Bill calculated and deducted from wallets!', 'success');
      render();
    } catch (e) { showToast(e.message, 'error'); }
  }

  render();
}
