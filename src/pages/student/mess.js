import { getCurrentUser } from '../../auth.js';
import { getMenuWithStats, submitRating, getMyRating } from '../../store.js';
import { renderPageHeader, studentNav, showToast, escapeHtml, renderStars, renderNotifBell } from '../../helpers.js';

export default async function messPage(app) {
  const user = getCurrentUser();
  if (!user) return;
  const today = new Date().toISOString().slice(0, 10);

  async function render() {
    const menuData = await getMenuWithStats(today);
    const mealTypes = ['morning_tea', 'breakfast', 'lunch', 'snacks', 'dinner'];
    const mealLabels = { morning_tea: 'Morning Tea', breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' };
    const mealIcons = { morning_tea: 'coffee', breakfast: 'free_breakfast', lunch: 'ramen_dining', snacks: 'cookies', dinner: 'dinner_dining' };

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Mess Menu</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderNotifBell()}
            <span style="font-size:13px;color:var(--on-surface-variant);">${escapeHtml(user.name?.split(' ')[0] || '')}</span>
          </div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:600;">Today's Mess Menu</h2>
          <p style="margin:0 0 16px 0;font-size:13px;color:var(--outline);">${new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          ${user.isMessMember ? `<a href="#/mess/dashboard" class="btn btn-sm btn-primary mb-md" style="display:inline-flex;align-items:center;gap:4px;"><span class="material-icons-outlined" style="font-size:16px;">dashboard</span> Manage Mess</a>` : ''}

          <div class="meal-tabs" id="mealTabs" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:8px;margin-bottom:16px;">
            ${mealTypes.map((mt, i) => `
              <button class="btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-ghost'}" data-meal="${mt}" style="white-space:nowrap;flex-shrink:0;">
                <span class="material-icons-outlined" style="font-size:16px;margin-right:4px;">${mealIcons[mt]}</span>
                ${mealLabels[mt]}
              </button>
            `).join('')}
          </div>

          <div id="mealContent">
            ${await renderMealContent(menuData, mealTypes[0], user)}
          </div>
        </div>

        ${studentNav('mess', user.isMessMember)}
      </div>
    `;

    // Tab switching
    const tabs = app.querySelectorAll('[data-meal]');
    tabs.forEach(tab => {
      tab.onclick = async () => {
        tabs.forEach(t => { t.className = 'btn btn-sm btn-ghost'; });
        tab.className = 'btn btn-sm btn-primary';
        const el = document.getElementById('mealContent');
        el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--outline);">Loading...</div>';
        el.innerHTML = await renderMealContent(menuData, tab.dataset.meal, user);
        attachRatingHandlers();
      };
    });

    attachRatingHandlers();
  }

  async function renderMealContent(menuData, selectedMeal, user) {
    const mealLabels = { morning_tea: 'Morning Tea', breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' };
    const item = menuData.find(m => m.mealType === selectedMeal);

    if (!item) {
      return `
        <div class="card" style="padding:40px;text-align:center;">
          <span class="material-icons-outlined" style="font-size:48px;color:var(--outline);">restaurant</span>
          <p style="margin:12px 0 0 0;color:var(--outline);">No menu listed for ${mealLabels[selectedMeal] || selectedMeal} today.</p>
        </div>
      `;
    }

    const items = item.items.split('\n').map(s => s.trim()).filter(Boolean);
    const myRating = await getMyRating(item.id, user.id);
    const avgDisplay = item.averageRating > 0 ? `${item.averageRating} / 5` : 'No ratings yet';

    return `
      <div class="card card-elevated" style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <h3 style="margin:0;font-size:18px;">${mealLabels[selectedMeal] || selectedMeal}</h3>
          <div style="text-align:right;">
            <div style="font-size:20px;font-weight:700;color:var(--primary);">${avgDisplay}</div>
            <div style="font-size:11px;color:var(--outline);">${item.ratingCount} review${item.ratingCount !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px;">
          ${items.map(i => `<span class="chip chip-neutral">${escapeHtml(i)}</span>`).join('')}
        </div>
      </div>

      <!-- Rating Section -->
      <div class="card" style="margin-bottom:16px;">
        <h4 style="margin:0 0 12px 0;font-size:15px;">Rate this meal</h4>
        <div class="star-rating-input" id="starInput" style="display:flex;gap:4px;font-size:28px;margin-bottom:12px;cursor:pointer;">
          ${[1,2,3,4,5].map(i => `
            <span class="star ${myRating && myRating.rating >= i ? 'star-filled' : 'star-empty'}" data-val="${i}" style="color:${myRating && myRating.rating >= i ? '#f59e0b' : '#475569'};transition:color 0.15s;">${myRating && myRating.rating >= i ? '\u2605' : '\u2606'}</span>
          `).join('')}
        </div>
        <textarea class="form-input" id="reviewText" rows="2" placeholder="Your review (optional)" style="margin-bottom:12px;">${myRating ? escapeHtml(myRating.review) : ''}</textarea>
        <button class="btn btn-primary btn-sm" id="submitRatingBtn" data-menu-id="${item.id}">${myRating ? 'Update Rating' : 'Submit Rating'}</button>
      </div>

      <!-- Public Reviews -->
      <div class="card">
        <h4 style="margin:0 0 12px 0;font-size:15px;">What others say</h4>
        ${item.ratings && item.ratings.length > 0 ? item.ratings.map(r => `
          <div style="padding:8px 0;border-bottom:1px solid var(--surface-variant);display:flex;align-items:flex-start;gap:8px;">
            <div style="flex-shrink:0;">
              ${renderStars(r.rating)}
            </div>
            <div>
              <div style="font-size:11px;color:var(--outline);">Anonymous · ${new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
              ${r.review ? `<div style="font-size:13px;margin-top:2px;">${escapeHtml(r.review)}</div>` : ''}
            </div>
          </div>
        `).join('') : '<div style="color:var(--outline);font-size:13px;">No reviews yet. Be the first!</div>'}
      </div>
    `;
  }

  function attachRatingHandlers() {
    // Star hover/select
    const stars = app.querySelectorAll('#starInput .star');
    let selectedRating = 0;
    stars.forEach(s => {
      const val = parseInt(s.dataset.val);
      s.onmouseenter = () => {
        stars.forEach(st => {
          const v = parseInt(st.dataset.val);
          st.style.color = v <= val ? '#f59e0b' : '#475569';
          st.innerHTML = v <= val ? '\u2605' : '\u2606';
        });
      };
      s.onmouseleave = () => {
        stars.forEach(st => {
          const v = parseInt(st.dataset.val);
          st.style.color = v <= selectedRating ? '#f59e0b' : '#475569';
          st.innerHTML = v <= selectedRating ? '\u2605' : '\u2606';
        });
      };
      s.onclick = () => {
        selectedRating = val;
        stars.forEach(st => {
          const v = parseInt(st.dataset.val);
          st.style.color = v <= val ? '#f59e0b' : '#475569';
          st.innerHTML = v <= val ? '\u2605' : '\u2606';
        });
      };
    });

    // Submit
    const btn = document.getElementById('submitRatingBtn');
    if (btn) {
      btn.onclick = async () => {
        const menuId = btn.dataset.menuId;
        const review = document.getElementById('reviewText').value.trim();
        if (selectedRating === 0) {
          showToast('Please select a rating', 'warning');
          return;
        }
        try {
          await submitRating(menuId, user.id, selectedRating, review);
          showToast('Rating submitted!', 'success');
          render();
        } catch (e) {
          showToast(e.message || 'Failed to submit rating', 'error');
        }
      };
    }
  }

  render();
}
