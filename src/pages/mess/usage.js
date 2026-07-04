import { getCurrentUser } from '../../auth.js';
import { getStockItems, getDailyUsage, saveDailyUsage } from '../../store.js';
import { messInchargeNav, showToast, escapeHtml, renderNotifBell, renderAvatar } from '../../helpers.js';

export default async function messUsagePage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const items = await getStockItems();
    const today = new Date().toISOString().slice(0, 10);
    const usage = await getDailyUsage(today);
    const usageMap = {};
    (usage?.items || []).forEach(u => { usageMap[u.itemId] = u.quantityUsed; });

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Daily Usage</span>
          </div>
          <div class="flex items-center gap-sm">
            ${renderNotifBell()}
            ${renderAvatar(user, 'stitch-avatar-sm')}
          </div>
        </header>
        <div class="page-content">
          <h2 class="m-0 mb-xs fs-20 fw-600">Today's Stock Usage</h2>
          <p class="m-0 mb-md fs-13 c-outline">${new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

          <div id="usageItems">
            ${items.map(i => `
              <div class="card" style="margin-bottom:6px;padding:10px;">
                <div class="flex justify-between items-center gap-sm">
                  <div style="flex:1;"><strong>${escapeHtml(i.name)}</strong> <span class="chip chip-info" style="font-size:10px;">${i.category}</span></div>
                  <div class="flex items-center gap-xs">
                    <input class="form-input" type="number" step="0.01" min="0" id="usage-${i.id}" value="${usageMap[i.id] || ''}" placeholder="0" style="width:80px;padding:6px;text-align:center;" data-item-id="${i.id}">
                    <span class="fs-12 c-outline" style="min-width:40px;">${i.unit}</span>
                  </div>
                </div>
              </div>
            `).join('') || '<p class="text-muted">No stock items. Add items in Stock Management first.</p>'}
          </div>

          <button class="btn btn-primary btn-block mt-sm" id="saveUsageBtn">
            <span class="material-icons-outlined" style="font-size:18px;">save</span> Save Today's Usage
          </button>
        </div>
        ${messInchargeNav('usage')}
      </div>
    `;

    document.getElementById('saveUsageBtn')?.addEventListener('click', saveUsage);
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
    } catch (e) { showToast(e.message, 'error'); }
  }

  render();
}
