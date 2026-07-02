import { getCurrentUser } from '../../auth.js';
import { getMenuWithStats, getRatings } from '../../store.js';
import { messMemberNav, showToast, escapeHtml, renderStars, renderNotifBell } from '../../helpers.js';

export default async function messDashboard(app) {
  const user = getCurrentUser();
  if (!user) return;
  const today = new Date().toISOString().slice(0, 10);
  const mealLabels = { morning_tea: 'Morning Tea', breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' };

  async function render() {
    const menuData = await getMenuWithStats(today);

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Mess Dashboard</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderNotifBell()}
            ${user.name ? `<span style="font-size:13px;color:var(--on-surface-variant)">${escapeHtml(user.name.split(' ')[0])}</span>` : ''}
          </div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:600;">Mess Dashboard</h2>
          <p style="margin:0 0 16px 0;font-size:13px;color:var(--outline);">${new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div class="stat-card">
              <div class="stat-value">${menuData.length}</div>
              <div class="stat-label">Meals Listed</div>
            </div>
            <div class="stat-card">
              <div class="stat-value">${menuData.reduce((s, m) => s + m.ratingCount, 0)}</div>
              <div class="stat-label">Reviews Today</div>
            </div>
          </div>

          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <a href="#/mess/manage-menu" class="btn btn-primary btn-sm" style="flex:1;text-align:center;text-decoration:none;">
              <span class="material-icons-outlined" style="font-size:16px;vertical-align:text-bottom;">edit_note</span> Manage Menu
            </a>
            <a href="#/mess/ratings" class="btn btn-secondary btn-sm" style="flex:1;text-align:center;text-decoration:none;">
              <span class="material-icons-outlined" style="font-size:16px;vertical-align:text-bottom;">star_half</span> View Ratings
            </a>
          </div>

          <h3 style="font-size:16px;margin:0 0 12px 0;">Today's Menu Summary</h3>
          ${menuData.length === 0 ? '<div class="card" style="padding:32px;text-align:center;color:var(--outline);">No menu listed for today. <a href="#/mess/manage-menu" style="color:var(--primary);">Add menu</a></div>' : ''}

          ${menuData.map(item => `
            <div class="card" style="margin-bottom:8px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span style="font-weight:600;font-size:15px;">${mealLabels[item.mealType] || item.mealType}</span>
                <span style="font-size:12px;color:var(--outline);">${renderStars(Math.round(item.averageRating))} ${item.averageRating > 0 ? item.averageRating : '-'}</span>
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:4px;">
                ${item.items.split('\n').filter(Boolean).map(i => `<span class="chip chip-neutral" style="font-size:11px;">${escapeHtml(i.trim())}</span>`).join('')}
              </div>
            </div>
          `).join('')}
        </div>

        ${messMemberNav('dashboard')}
      </div>
    `;
  }

  render();
}
