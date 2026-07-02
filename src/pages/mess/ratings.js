import { getCurrentUser } from '../../auth.js';
import { getMenuWithStats } from '../../store.js';
import { messMemberNav, escapeHtml, renderStars, formatDate, renderNotifBell } from '../../helpers.js';

export default async function messRatings(app) {
  const user = getCurrentUser();
  if (!user) return;

  const mealLabels = { morning_tea: 'Morning Tea', breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' };
  const today = new Date().toISOString().slice(0, 10);

  async function render() {
    const menuData = await getMenuWithStats(today);

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Ratings</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderNotifBell()}
            ${user.name ? `<span style="font-size:13px;color:var(--on-surface-variant)">${escapeHtml(user.name.split(' ')[0])}</span>` : ''}
          </div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:600;">Food Ratings</h2>
          <p style="margin:0 0 16px 0;font-size:13px;color:var(--outline);">${new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>

          ${menuData.length === 0 ? '<div class="card" style="padding:32px;text-align:center;color:var(--outline);">No menu listed for today.</div>' : ''}

          ${menuData.map(item => {
            const avgDisplay = item.averageRating > 0 ? item.averageRating : 'No ratings';
            return `
              <div class="card" style="margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <h3 style="margin:0;font-size:16px;">${mealLabels[item.mealType] || item.mealType}</h3>
                  <div style="text-align:right;">
                    <div style="font-size:18px;font-weight:700;color:var(--primary);">${avgDisplay}</div>
                    <div style="font-size:11px;color:var(--outline);">${item.ratingCount} review${item.ratingCount !== 1 ? 's' : ''}</div>
                  </div>
                </div>

                <div style="display:flex;gap:4px;margin-bottom:12px;">
                  ${[0,1,2,3,4].map(i => {
                    const count = item.ratingDistribution ? item.ratingDistribution[i] : 0;
                    const maxCount = item.ratingDistribution ? Math.max(...item.ratingDistribution, 1) : 1;
                    const pct = (count / maxCount) * 100;
                    return `
                      <div style="flex:1;text-align:center;">
                        <div style="font-size:11px;color:var(--outline);margin-bottom:2px;">${5 - i}★</div>
                        <div style="height:40px;background:var(--surface-variant);border-radius:4px;position:relative;overflow:hidden;">
                          <div style="position:absolute;bottom:0;left:0;width:100%;height:${pct}%;background:var(--primary);border-radius:4px 4px 0 0;transition:height 0.3s;"></div>
                        </div>
                        <div style="font-size:10px;color:var(--outline);margin-top:2px;">${count}</div>
                      </div>
                    `;
                  }).join('')}
                </div>

                ${item.ratings && item.ratings.length > 0 ? `
                  <h4 style="font-size:13px;margin:0 0 8px 0;color:var(--outline);">Recent Reviews</h4>
                  ${item.ratings.slice(0, 10).map(r => `
                    <div style="padding:6px 0;border-bottom:1px solid var(--surface-variant);display:flex;align-items:flex-start;gap:8px;">
                      <div style="flex-shrink:0;">${renderStars(r.rating)}</div>
                      <div>
                        <div style="font-size:11px;color:var(--outline);">Anonymous</div>
                        ${r.review ? `<div style="font-size:13px;margin-top:2px;">${escapeHtml(r.review)}</div>` : ''}
                      </div>
                    </div>
                  `).join('')}
                  ${item.ratings.length > 10 ? `<div style="font-size:12px;color:var(--outline);margin-top:6px;">+${item.ratings.length - 10} more reviews</div>` : ''}
                ` : '<div style="font-size:13px;color:var(--outline);">No reviews yet.</div>'}
              </div>
            `;
          }).join('')}
        </div>

        ${messMemberNav('ratings')}
      </div>
    `;
  }

  render();
}
