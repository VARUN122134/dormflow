import { getCurrentUser } from '../../auth.js';
import { getStockItems, createStockItem, updateStockItem, getStockPurchases, createStockPurchase } from '../../store.js';
import { messInchargeNav, showToast, escapeHtml, renderNotifBell, renderAvatar } from '../../helpers.js';

export default async function messStockPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const items = await getStockItems();
    const purchases = await getStockPurchases({ limit: 50 });

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Stock Management</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderNotifBell()}
            ${renderAvatar(user, 'stitch-avatar-sm')}
          </div>
        </header>
        <div style="padding:16px;padding-bottom:80px;">
          <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:600;">Mess Stock</h2>
          <p style="margin:0 0 16px 0;font-size:13px;color:var(--outline);">Manage stock items and record purchases</p>

          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button class="btn btn-primary btn-sm" id="addItemBtn" style="flex:1;"><span class="material-icons-outlined" style="font-size:18px;">add</span> New Item</button>
            <button class="btn btn-secondary btn-sm" id="addPurchaseBtn" style="flex:1;"><span class="material-icons-outlined" style="font-size:18px;">shopping_cart</span> Record Purchase</button>
          </div>

          <div class="section-title">Stock Items</div>
          <div id="itemsList" style="margin-bottom:16px;">
            ${items.map(i => `
              <div class="card" style="margin-bottom:6px;padding:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <div><strong>${escapeHtml(i.name)}</strong> <span class="chip chip-info" style="font-size:10px;">${i.category}</span> <span style="font-size:11px;color:var(--outline);">${i.unit}</span></div>
                  <div style="display:flex;gap:4px;">
                    <button class="btn btn-sm btn-ghost editItem" data-id="${i.id}" data-name="${escapeHtml(i.name)}" data-category="${i.category}" data-unit="${escapeHtml(i.unit)}" style="font-size:11px;">Edit</button>
                  </div>
                </div>
              </div>
            `).join('') || '<p class="text-muted">No items. Add your first stock item.</p>'}
          </div>

          <div class="section-title">Recent Purchases</div>
          <div id="purchasesList">
            ${purchases.map(p => `
              <div class="card" style="margin-bottom:6px;padding:10px;">
                <div style="display:flex;justify-content:space-between;font-size:12px;">
                  <div><strong>${escapeHtml(p.item?.name || 'Unknown')}</strong> — ${p.quantity} × ₹${p.unitPrice} = <strong>₹${p.totalCost}</strong></div>
                  <div style="color:var(--outline);">${p.purchasedDate}</div>
                </div>
                ${p.notes ? `<div style="font-size:11px;color:var(--on-surface-variant);margin-top:2px;">${escapeHtml(p.notes)}</div>` : ''}
              </div>
            `).join('') || '<p class="text-muted">No purchases recorded yet.</p>'}
          </div>
        </div>
        ${messInchargeNav('stock')}
      </div>
    `;

    document.getElementById('addItemBtn')?.addEventListener('click', showAddItemModal);
    document.getElementById('addPurchaseBtn')?.addEventListener('click', () => showAddPurchaseModal(items));
    document.querySelectorAll('.editItem').forEach(b => b.addEventListener('click', () => showEditItemModal(b.dataset.id, b.dataset.name, b.dataset.category, b.dataset.unit)));
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

  function showEditItemModal(id, name, category, unit) {
    const bd = document.createElement('div'); bd.className = 'modal-backdrop';
    bd.innerHTML = `
      <div class="modal"><div class="modal-title">Edit Item</div><div class="modal-body">
        <div class="form-group"><label class="form-label">Name</label><input class="form-input" id="itemName" value="${escapeHtml(name)}"></div>
        <div class="form-group"><label class="form-label">Category</label><select class="form-input" id="itemCategory"><option value="daily"${category==='daily'?' selected':''}>Daily</option><option value="weekly"${category==='weekly'?' selected':''}>Weekly</option><option value="bulk"${category==='bulk'?' selected':''}>Bulk</option></select></div>
        <div class="form-group"><label class="form-label">Unit</label><input class="form-input" id="itemUnit" value="${escapeHtml(unit)}"></div>
      </div><div class="modal-actions"><button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button><button class="btn btn-primary btn-sm" id="modalConfirm">Save</button></div></div>`;
    document.body.appendChild(bd);
    bd.querySelector('#modalCancel').onclick = () => bd.remove();
    bd.querySelector('#modalConfirm').onclick = async () => {
      try { await updateStockItem(id, { name: document.getElementById('itemName').value.trim(), category: document.getElementById('itemCategory').value, unit: document.getElementById('itemUnit').value.trim() }); showToast('Updated', 'success'); bd.remove(); render(); } catch (e) { showToast(e.message, 'error'); }
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

  render();
}
