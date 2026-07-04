import { getCurrentUser } from '../../auth.js';
import { getStockInventory, getStockItems, createStockItem, createStockPurchase, getStockPurchases, getDailyUsage, saveDailyUsage, getDailyBill, calculateDailyBill } from '../../store.js';
import { showToast, escapeHtml, renderAvatar, renderNotifBell, renderLogoutIcon } from '../../helpers.js';

export default async function messStockManagerPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const inventory = await getStockInventory();
    const items = await getStockItems();
    const today = new Date().toISOString().slice(0, 10);
    const purchases = await getStockPurchases({ limit: 20 });
    const usage = await getDailyUsage(today);
    const bill = await getDailyBill(today);
    const usageMap = {};
    (usage?.items || []).forEach(u => { usageMap[u.itemId] = u.quantityUsed; });

    const totalStockCost = bill ? bill.totalStockCost : (usage?.items || []).reduce((sum, u) => {
      const q = u.quantityUsed || 0;
      const item = inventory.find(i => i.id === u.itemId);
      const price = item ? (purchases.find(p => p.itemId === u.itemId)?.unitPrice || 0) : 0;
      return sum + q * price;
    }, 0);

    const lowStock = inventory.filter(i => i.remaining <= 0);

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Stock Manager</span>
          </div>
          <div class="flex items-center gap-sm">
            ${renderLogoutIcon()}
            ${renderNotifBell()}
            ${renderAvatar(user, 'stitch-avatar-sm')}
          </div>
        </header>
        <div class="page-content">
          <div class="flex justify-between items-center mb-md">
            <div>
              <h2 class="m-0 fs-20 fw-600">Stock Manager</h2>
              <p class="m-0 fs-13 c-outline">${new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;">
            <div class="card" style="padding:12px;text-align:center;">
              <div class="fs-24 fw-700" style="color:var(--primary-container);">${inventory.length}</div>
              <div class="fs-12 c-outline">Stock Items</div>
            </div>
            <div class="card" style="padding:12px;text-align:center;">
              <div class="fs-24 fw-700" style="color:${lowStock.length > 0 ? 'var(--status-danger)' : 'var(--status-success)'};">${lowStock.length}</div>
              <div class="fs-12 c-outline">Need Refill</div>
            </div>
            <div class="card" style="padding:12px;text-align:center;">
              <div class="fs-24 fw-700" style="color:${bill ? 'var(--status-success)' : 'var(--outline)'};">${bill ? '₹'+bill.perStudentCost : '--'}</div>
              <div class="fs-12 c-outline">${bill ? 'Per Student' : 'Not billed'}</div>
            </div>
          </div>

          <div class="flex gap-sm mb-md">
            <button class="btn btn-primary btn-sm" id="stockAddItemBtn" style="flex:1;"><span class="material-icons-outlined" style="font-size:18px;">add</span> New Item</button>
            <button class="btn btn-secondary btn-sm" id="stockAddPurchaseBtn" style="flex:1;"><span class="material-icons-outlined" style="font-size:18px;">shopping_cart</span> Refill Stock</button>
            <button class="btn btn-secondary btn-sm" id="stockLogUsageBtn" style="flex:1;"><span class="material-icons-outlined" style="font-size:18px;">edit_note</span> Log Usage</button>
          </div>

          ${lowStock.length > 0 ? `
            <div class="card mb-md" style="padding:12px;border-left:4px solid var(--status-danger);background:var(--error-container);">
              <div class="flex items-center gap-sm">
                <span class="material-icons-outlined" style="color:var(--status-danger);">report</span>
                <div>
                  <div class="fw-600 fs-13">${lowStock.length} item(s) need refill</div>
                  <div class="fs-12 c-on-surface-variant">${lowStock.map(i => escapeHtml(i.name)).join(', ')}</div>
                </div>
              </div>
            </div>
          ` : ''}

          <div class="section-title">Current Inventory</div>
          <div id="inventoryList" class="mb-md">
            ${inventory.length === 0 ? '<p class="text-muted">No stock items. Add your first item.</p>' : inventory.map(i => {
              const pct = i.totalPurchased > 0 ? Math.round((i.remaining / i.totalPurchased) * 100) : 0;
              const barColor = pct > 30 ? 'var(--status-success)' : pct > 0 ? 'var(--status-warning)' : 'var(--status-danger)';
              return `
                <div class="card" style="margin-bottom:6px;padding:10px;">
                  <div class="flex justify-between items-center mb-xs">
                    <div><strong>${escapeHtml(i.name)}</strong> <span class="chip chip-info" style="font-size:10px;">${i.category}</span></div>
                    <div class="fs-13"><span class="fw-600" style="color:${i.remaining > 0 ? 'var(--status-success)' : 'var(--status-danger)'};">${i.remaining}</span><span class="c-outline fs-12"> / ${i.unit}</span></div>
                  </div>
                  <div style="height:6px;background:var(--surface-container);border-radius:3px;overflow:hidden;margin-bottom:4px;">
                    <div style="height:100%;width:${Math.min(pct, 100)}%;background:${barColor};border-radius:3px;transition:width 0.3s;"></div>
                  </div>
                  <div class="flex justify-between fs-12 c-outline">
                    <span>Purchased: ${i.totalPurchased} ${i.unit}</span>
                    <span>Used: ${i.totalUsed} ${i.unit}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <div class="section-title">Today's Usage</div>
          <div id="todayUsage" class="mb-md">
            ${items.length === 0 ? '<p class="text-muted">No items yet.</p>' : items.map(i => `
              <div class="card" style="margin-bottom:4px;padding:8px 10px;">
                <div class="flex justify-between items-center gap-sm">
                  <div style="flex:1;"><strong class="fs-13">${escapeHtml(i.name)}</strong></div>
                  <div class="flex items-center gap-xs">
                    <input class="form-input" type="number" step="0.01" min="0" id="usage-${i.id}" value="${usageMap[i.id] || ''}" placeholder="0" style="width:70px;padding:4px 6px;text-align:center;font-size:12px;">
                    <span class="fs-12 c-outline" style="min-width:30px;">${i.unit}</span>
                  </div>
                </div>
              </div>
            `).join('')}
            <button class="btn btn-sm btn-secondary mt-sm" id="saveUsageBtn" style="width:100%;"><span class="material-icons-outlined" style="font-size:16px;">save</span> Save Usage & Continue</button>
          </div>

          <div class="section-title">Bill & Division</div>
          <div class="card mb-md" style="padding:16px;">
            ${bill ? `
              <div style="text-align:center;">
                <div class="fs-12 c-outline mb-xs">Today's mess bill</div>
                <div class="fs-32 fw-700" style="color:var(--primary-container);">₹${bill.perStudentCost}</div>
                <div class="fs-13 c-on-surface-variant">${bill.totalStudents} students attended</div>
                <div class="fs-12 c-outline mt-sm">Total stock cost: ₹${bill.totalStockCost} • ₹${Math.round(bill.totalStockCost / (bill.totalStudents || 1))}/student</div>
                <div class="mt-sm fs-12 c-outline">Calculated at ${new Date(bill.calculatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            ` : `
              <div style="text-align:center;">
                <div class="fs-12 c-outline mb-sm">No bill calculated yet</div>
                ${usage && usage.items && usage.items.length > 0 ? `
                  <button class="btn btn-primary" id="calcBillBtn"><span class="material-icons-outlined" style="font-size:18px;">calculate</span> Calculate Bill</button>
                ` : `
                  <div class="fs-12 c-outline">Record usage above first</div>
                `}
              </div>
            `}
          </div>

          <div class="section-title">Recent Purchases</div>
          <div id="recentPurchases">
            ${purchases.length === 0 ? '<p class="text-muted">No purchases recorded.</p>' : purchases.map(p => `
              <div class="card" style="margin-bottom:4px;padding:8px 10px;">
                <div class="flex justify-between fs-12">
                  <div><strong>${escapeHtml(p.item?.name || 'Unknown')}</strong> <span class="c-outline">${p.quantity} × ₹${p.unitPrice}</span> = <span class="fw-600">₹${p.totalCost}</span></div>
                  <div class="c-outline">${p.purchasedDate}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <nav style="position:fixed;bottom:0;left:0;right:0;display:flex;background:var(--surface);border-top:1px solid var(--outline-variant);padding:4px 0;justify-content:space-around;z-index:100;">
          <a href="#/mess/stock" class="btn btn-ghost btn-sm" style="flex-direction:column;gap:2px;padding:6px 12px;"><span class="material-icons-outlined">inventory_2</span><span class="fs-10">Stock</span></a>
          <a href="#/mess/usage" class="btn btn-ghost btn-sm" style="flex-direction:column;gap:2px;padding:6px 12px;"><span class="material-icons-outlined">edit_note</span><span class="fs-10">Usage</span></a>
          <a href="#/mess/bill" class="btn btn-ghost btn-sm" style="flex-direction:column;gap:2px;padding:6px 12px;"><span class="material-icons-outlined">receipt_long</span><span class="fs-10">Bill</span></a>
          <a href="#/mess/stock-manager" class="btn btn-ghost btn-sm" style="flex-direction:column;gap:2px;padding:6px 12px;color:var(--primary-container);"><span class="material-icons-outlined">dashboard</span><span class="fs-10">Dashboard</span></a>
          <a href="#/mess/wallets" class="btn btn-ghost btn-sm" style="flex-direction:column;gap:2px;padding:6px 12px;"><span class="material-icons-outlined">account_balance_wallet</span><span class="fs-10">Wallets</span></a>
        </nav>
      </div>
    `;

    document.getElementById('stockAddItemBtn')?.addEventListener('click', showAddItemModal);
    document.getElementById('stockAddPurchaseBtn')?.addEventListener('click', () => showAddPurchaseModal(items));
    document.getElementById('stockLogUsageBtn')?.addEventListener('click', () => { document.getElementById('todayUsage')?.scrollIntoView({ behavior: 'smooth' }); });
    document.getElementById('saveUsageBtn')?.addEventListener('click', saveUsage);
    document.getElementById('calcBillBtn')?.addEventListener('click', calcBill);
  }

  function showAddItemModal() {
    const bd = document.createElement('div'); bd.className = 'modal-backdrop';
    bd.innerHTML = `
      <div class="modal"><div class="modal-title">Add Stock Item</div><div class="modal-body">
        <div class="form-group"><label class="form-label">Item Name</label><input class="form-input" id="itemName" placeholder="e.g. Milk"></div>
        <div class="form-group"><label class="form-label">Category</label><select class="form-input" id="itemCategory"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="bulk">Bulk</option></select></div>
        <div class="form-group"><label class="form-label">Unit</label><input class="form-input" id="itemUnit" placeholder="e.g. litre, kg, piece"></div>
      </div><div class="modal-actions"><button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button><button class="btn btn-primary btn-sm" id="modalConfirm">Add</button></div></div>`;
    document.body.appendChild(bd);
    bd.querySelector('#modalCancel').onclick = () => bd.remove();
    bd.querySelector('#modalConfirm').onclick = async () => {
      const name = document.getElementById('itemName').value.trim();
      const category = document.getElementById('itemCategory').value;
      const unit = document.getElementById('itemUnit').value.trim();
      if (!name || !unit) { showToast('Fill all fields', 'warning'); return; }
      try { await createStockItem({ name, category, unit }); showToast('Item added', 'success'); bd.remove(); render(); } catch (e) { showToast(e.message, 'error'); }
    };
    bd.onclick = e => { if (e.target === bd) bd.remove(); };
  }

  function showAddPurchaseModal(items) {
    const bd = document.createElement('div'); bd.className = 'modal-backdrop';
    bd.innerHTML = `
      <div class="modal"><div class="modal-title">Record Purchase</div><div class="modal-body">
        <div class="form-group"><label class="form-label">Item</label><select class="form-input" id="purchaseItem">${items.map(i => `<option value="${i.id}">${escapeHtml(i.name)} (${i.unit})</option>`).join('')}</select></div>
        <div class="form-group"><label class="form-label">Quantity</label><input class="form-input" id="purchaseQty" type="number" step="0.01" placeholder="0"></div>
        <div class="form-group"><label class="form-label">Unit Price (₹)</label><input class="form-input" id="purchasePrice" type="number" step="0.01" placeholder="0"></div>
        <div class="form-group"><label class="form-label">Date</label><input class="form-input" id="purchaseDate" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
        <div class="form-group"><label class="form-label">Notes</label><input class="form-input" id="purchaseNotes" placeholder="Optional"></div>
        <p style="font-size:13px;font-weight:600;" id="purchaseTotal">Total: ₹0</p>
      </div><div class="modal-actions"><button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button><button class="btn btn-primary btn-sm" id="modalConfirm">Save</button></div></div>`;
    document.body.appendChild(bd);
    const calcTotal = () => { const q = parseFloat(document.getElementById('purchaseQty').value) || 0; const p = parseFloat(document.getElementById('purchasePrice').value) || 0; document.getElementById('purchaseTotal').textContent = `Total: ₹${q * p}`; };
    document.getElementById('purchaseQty')?.addEventListener('input', calcTotal);
    document.getElementById('purchasePrice')?.addEventListener('input', calcTotal);
    bd.querySelector('#modalCancel').onclick = () => bd.remove();
    bd.querySelector('#modalConfirm').onclick = async () => {
      const itemId = document.getElementById('purchaseItem').value;
      const quantity = parseFloat(document.getElementById('purchaseQty').value);
      const unitPrice = parseFloat(document.getElementById('purchasePrice').value);
      const date = document.getElementById('purchaseDate').value;
      const notes = document.getElementById('purchaseNotes').value.trim();
      if (!quantity || !unitPrice) { showToast('Enter quantity and price', 'warning'); return; }
      try { await createStockPurchase({ itemId, quantity, unitPrice, totalCost: quantity * unitPrice, purchasedDate: date, purchasedBy: user.id, notes }); showToast('Purchase recorded', 'success'); bd.remove(); render(); } catch (e) { showToast(e.message, 'error'); }
    };
    bd.onclick = e => { if (e.target === bd) bd.remove(); };
  }

  async function saveUsage() {
    const today = new Date().toISOString().slice(0, 10);
    const inputs = document.querySelectorAll('[id^="usage-"]');
    const items = [];
    inputs.forEach(inp => {
      const val = parseFloat(inp.value);
      if (val && val > 0) items.push({ itemId: inp.dataset.itemId, quantityUsed: val });
    });
    if (items.length === 0) { showToast('Enter at least one item usage', 'warning'); return; }
    try {
      await saveDailyUsage(today, items, user.id);
      showToast('Usage saved for today', 'success');
      render();
    } catch (e) { showToast(e.message, 'error'); }
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
