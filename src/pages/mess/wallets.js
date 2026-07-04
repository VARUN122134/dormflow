import { getCurrentUser } from '../../auth.js';
import { getWallets, depositWallet, getLowBalanceWallets } from '../../store.js';
import { messInchargeNav, wardenNav, adminNav, showToast, escapeHtml, renderNotifBell, renderAvatar, renderBackButton, renderSkeletonPage, renderLogoutIcon } from '../../helpers.js';

export default async function messWalletsPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  function getNav() {
    if (user.role === 'mess_incharge') return messInchargeNav('wallets');
    if (user.role === 'admin') return adminNav('wallets');
    return wardenNav('wallets');
  }

  app.innerHTML = renderSkeletonPage();

  async function render() {
    const wallets = await getWallets();
    const lowBalance = await getLowBalanceWallets(500);
    const totalDeposited = wallets.reduce((s, w) => s + w.totalDeposited, 0);
    const totalBalance = wallets.reduce((s, w) => s + w.balance, 0);

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            ${user.role !== 'mess_incharge' ? renderBackButton() : ''}
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Wallet Overview</span>
          </div>
          <div class="flex items-center gap-sm">
            ${renderLogoutIcon()}
            ${renderNotifBell()}
            ${renderAvatar(user, 'stitch-avatar-sm')}
          </div>
        </header>
        <div class="page-content">
          <h2 class="m-0 mb-xs fs-20 fw-600">Student Wallets</h2>
          <p class="m-0 mb-md fs-13 c-outline">${wallets.length} wallets • ₹${totalDeposited} deposited • ₹${totalBalance} remaining</p>

          <div class="flex gap-sm mb-md">
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--primary-container);">${wallets.length}</div><div class="stat-label" style="font-size:10px;">Wallets</div></div>
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--status-success);">₹${totalDeposited.toLocaleString()}</div><div class="stat-label" style="font-size:10px;">Deposited</div></div>
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--status-warning);">₹${totalBalance.toLocaleString()}</div><div class="stat-label" style="font-size:10px;">Balance</div></div>
          </div>

          ${lowBalance.length > 0 ? `
            <div class="card mb-sm" style="border-left:4px solid var(--status-danger);padding:12px;">
              <div style="font-size:14px;font-weight:600;color:var(--status-danger);margin-bottom:8px;">
                <span class="material-icons-outlined" style="font-size:16px;vertical-align:middle;">warning</span>
                Low Balance Alerts (${lowBalance.length})
              </div>
              ${lowBalance.map(w => `
                <div style="display:flex;justify-content:space-between;font-size:12px;padding:4px 0;border-bottom:1px solid var(--surface-container);">
                  <span>${escapeHtml(w.student?.name || 'Unknown')}</span>
                  <span class="c-danger fw-600">₹${w.balance}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <div class="section-title">All Wallets</div>
          <input class="form-input mb-sm" id="walletSearch" placeholder="Search student...">
          <div id="walletsList">
            ${wallets.map(w => `
              <div class="card wallet-row" style="margin-bottom:6px;padding:10px;" data-name="${(w.student?.name || '').toLowerCase()}">
                <div class="flex justify-between items-center">
                  <div>
                    <div class="fw-600 fs-13">${escapeHtml(w.student?.name || 'Unknown')}</div>
                    <div class="fs-12 c-outline">${w.student?.department || ''} ${w.student?.year ? '• Year '+w.student.year : ''}</div>
                  </div>
                  <div class="text-right">
                    <div style="font-weight:600;font-size:14px;color:${w.balance < 500 ? 'var(--status-danger)' : 'var(--status-success)'};">₹${w.balance}</div>
                    <div class="fs-12 c-outline">Deposited: ₹${w.totalDeposited}</div>
                    <button class="btn btn-sm btn-primary depositBtn" data-student="${w.studentId}" style="font-size:10px;padding:2px 8px;margin-top:2px;min-width:auto;">Deposit</button>
                  </div>
                </div>
              </div>
            `).join('') || '<p class="text-muted">No wallets created yet.</p>'}
          </div>
        </div>
        ${getNav()}
      </div>
    `;

    document.getElementById('walletSearch')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.wallet-row').forEach(r => { r.style.display = r.dataset.name.includes(q) ? '' : 'none'; });
    });
    document.querySelectorAll('.depositBtn').forEach(b => b.addEventListener('click', () => showDepositModal(b.dataset.student)));
  }

  function showDepositModal(studentId) {
    const bd = document.createElement('div'); bd.className = 'modal-backdrop';
    bd.innerHTML = `
      <div class="modal"><div class="modal-title">Deposit to Wallet</div><div class="modal-body">
        <div class="form-group"><label class="form-label">Amount (₹)</label><input class="form-input" id="depositAmount" type="number" step="1" placeholder="15000" value="15000"></div>
      </div><div class="modal-actions"><button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button><button class="btn btn-primary btn-sm" id="modalConfirm">Deposit</button></div></div>`;
    document.body.appendChild(bd);
    bd.querySelector('#modalCancel').onclick = () => bd.remove();
    bd.querySelector('#modalConfirm').onclick = async () => {
      const amt = parseFloat(document.getElementById('depositAmount').value);
      if (!amt || amt <= 0) { showToast('Enter valid amount', 'warning'); return; }
      try { await depositWallet(studentId, amt, user.id); showToast(`₹${amt} deposited`, 'success'); bd.remove(); render(); } catch (e) { showToast(e.message, 'error'); }
    };
    bd.onclick = e => { if (e.target === bd) bd.remove(); };
  }

  render();
}
