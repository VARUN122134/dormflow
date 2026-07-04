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
          <div class="flex items-center gap-sm">
            ${renderNotifBell()}
            ${renderAvatar(user, 'stitch-avatar-sm')}
          </div>
        </header>
        <div class="page-content">
          <h2 class="m-0 mb-xs fs-20 fw-600">Today's Mess Bill</h2>
          <p class="m-0 mb-md fs-13 c-outline">${new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

          ${bill ? `
            <div class="card mb-sm" style="text-align:center;padding:20px;border-left:4px solid var(--status-success);">
              <div class="fs-13 c-outline mb-sm">Bill already calculated</div>
              <div style="font-size:28px;font-weight:700;color:var(--primary-container);">₹${bill.perStudentCost}</div>
              <div class="fs-12 c-on-surface-variant mt-sm">per student • ${bill.totalStudents} students present</div>
              <div class="fs-12 c-outline mt-sm">Total stock cost: ₹${bill.totalStockCost}</div>
            </div>
          ` : `
            <div class="card mb-sm" style="text-align:center;padding:20px;">
              ${usage && usage.items && usage.items.length > 0 ? `
                <div class="fs-13 c-outline mb-sm">Usage recorded — ready to calculate</div>
                <button class="btn btn-primary" id="calcBillBtn">
                  <span class="material-icons-outlined" style="font-size:18px;">calculate</span> Calculate Today's Bill
                </button>
              ` : `
                <div class="fs-13 c-outline">
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
                <div class="flex justify-between items-center">
                  <div><strong>${b.billDate}</strong></div>
                  <div class="text-right">
                    <div class="fw-600">₹${b.perStudentCost}<span style="font-weight:400;color:var(--outline);font-size:11px;"> / student</span></div>
                    <div class="fs-12 c-outline">${b.totalStudents} students • ₹${b.totalStockCost}</div>
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
