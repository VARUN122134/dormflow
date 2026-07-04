import { getCurrentUser } from '../../auth.js';
import { getWallet, getWalletTransactions, getDailyBill } from '../../store.js';
import { studentNav, showToast, escapeHtml, renderAvatar } from '../../helpers.js';

export default async function studentWalletPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    let wallet = await getWallet(user.id);
    const txns = await getWalletTransactions(user.id, 200);
    const todayBill = await getDailyBill(new Date().toISOString().slice(0, 10));

    if (!wallet) {
      app.innerHTML = `
        <div class="page-container">
          <header class="stitch-header">
            <div class="stitch-left"><span class="stitch-brand">UCE IT</span><span class="stitch-sub">My Wallet</span></div>
            <div style="display:flex;align-items:center;gap:8px;">${renderAvatar(user, 'stitch-avatar-sm')}</div>
          </header>
          <div style="padding:16px;padding-bottom:80px;text-align:center;padding-top:60px;">
            <span class="material-icons-outlined" style="font-size:64px;color:var(--outline-variant);">account_balance_wallet</span>
            <h3>No Wallet Yet</h3>
            <p style="color:var(--outline);">Your mess wallet hasn't been created. Contact the mess incharge to set it up.</p>
          </div>
          ${studentNav('wallet')}
        </div>
      `;
      return;
    }

    const dailyCosts = {};
    txns.filter(t => t.type === 'deduction').forEach(t => {
      dailyCosts[t.transactionDate] = (dailyCosts[t.transactionDate] || 0) + t.amount;
    });

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">My Wallet</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:13px;color:var(--on-surface-variant);">${escapeHtml(user.name?.split(' ')[0] || '')}</span>
            ${renderAvatar(user, 'stitch-avatar-sm')}
          </div>
        </header>
        <div style="padding:16px;padding-bottom:80px;">
          <div class="card" style="text-align:center;padding:24px;margin-bottom:16px;border-left:4px solid ${wallet.balance < 500 ? 'var(--status-danger)' : 'var(--status-success)'};">
            <div style="font-size:12px;color:var(--outline);margin-bottom:4px;">Current Balance</div>
            <div style="font-size:36px;font-weight:700;color:${wallet.balance < 500 ? 'var(--status-danger)' : 'var(--primary-container)'};">₹${wallet.balance}</div>
            <div style="font-size:12px;color:var(--on-surface-variant);margin-top:4px;">Total deposited: ₹${wallet.totalDeposited}</div>
            ${wallet.balance < 500 ? `<div style="font-size:12px;color:var(--status-danger);margin-top:6px;font-weight:600;"><span class="material-icons-outlined" style="font-size:14px;vertical-align:middle;">warning</span> Low balance — please recharge soon</div>` : ''}
            ${todayBill ? `<div style="font-size:12px;color:var(--on-surface-variant);margin-top:6px;">Today's mess bill: <strong>₹${todayBill.perStudentCost}</strong></div>` : ''}
          </div>

          <div class="section-title">Daily Expense Breakdown</div>
          <div id="dailyBreakdown">
            ${Object.entries(dailyCosts).slice(0, 30).map(([date, cost]) => `
              <div class="card" style="margin-bottom:4px;padding:8px 12px;">
                <div style="display:flex;justify-content:space-between;font-size:12px;">
                  <span>${new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span style="font-weight:600;color:var(--status-warning);">-₹${cost}</span>
                </div>
              </div>
            `).join('') || '<p class="text-muted">No expenses yet.</p>'}
          </div>

          <div class="section-title">Transaction History</div>
          <div id="txnHistory">
            ${txns.map(t => `
              <div class="card" style="margin-bottom:4px;padding:8px 12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div>
                    <div style="font-size:12px;font-weight:500;">${t.type === 'deposit' ? 'Deposit' : t.type === 'deduction' ? 'Mess Bill' : 'Refund'}</div>
                    <div style="font-size:10px;color:var(--outline);">${new Date(t.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}${t.description ? ' • '+escapeHtml(t.description) : ''}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:13px;font-weight:600;color:${t.type === 'deposit' ? 'var(--status-success)' : 'var(--status-warning)'};">${t.type === 'deposit' ? '+' : '-'}₹${t.amount}</div>
                    <div style="font-size:10px;color:var(--outline);">₹${t.balanceAfter}</div>
                  </div>
                </div>
              </div>
            `).join('') || '<p class="text-muted">No transactions yet.</p>'}
          </div>
        </div>
        ${studentNav('wallet')}
      </div>
    `;
  }

  render();
}
