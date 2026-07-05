import { getCurrentUser } from '../../auth.js';
import { getMenuByDate, createMenuEntry, updateMenuEntry, deleteMenuEntry } from '../../store.js';
import { messMemberNav, showToast, escapeHtml, showModal } from '../../helpers.js';

export default async function manageMenu(app) {
  const user = getCurrentUser();
  if (!user) return;

  const mealLabels = { morning_tea: 'Morning Tea', breakfast: 'Breakfast', lunch: 'Lunch', snacks: 'Snacks', dinner: 'Dinner' };
  const mealTypes = ['morning_tea', 'breakfast', 'lunch', 'snacks', 'dinner'];

  let selectedDate = new Date().toISOString().slice(0, 10);

  async function render() {
    const menuData = await getMenuByDate(selectedDate);

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Manage Menu</span>
          </div>
          <div class="stitch-right">${user.name ? `<span style="font-size:13px;color:var(--on-surface-variant)">${escapeHtml(user.name.split(' ')[0])}</span>` : ''}</div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:600;">Manage Menu</h2>

          <div style="margin-bottom:16px;">
            <label class="form-label">Select Date</label>
            <input type="date" class="form-input" id="menuDate" value="${selectedDate}" style="margin-bottom:12px;">
          </div>

          <div id="mealForms">
            ${mealTypes.map(mt => {
              const existing = menuData.find(m => m.mealType === mt);
              return renderMealForm(mt, existing);
            }).join('')}
          </div>
        </div>

        ${messMemberNav('menu')}
      </div>
    `;

    // Date change handler
    document.getElementById('menuDate').onchange = async (e) => {
      selectedDate = e.target.value;
      render();
    };

    // Save handlers for each meal type
    mealTypes.forEach(mt => {
      const btn = document.getElementById(`saveBtn_${mt}`);
      if (btn) {
        btn.onclick = async () => {
          const items = document.getElementById(`items_${mt}`).value.trim();
          if (!items) {
            showToast('Please enter food items', 'warning');
            return;
          }
          try {
            const existing = menuData.find(m => m.mealType === mt);
            if (existing) {
              await updateMenuEntry(existing.id, { items });
              showToast(`${mealLabels[mt]} menu updated!`, 'success');
            } else {
              await createMenuEntry({
                menuDate: selectedDate,
                mealType: mt,
                items: items,
                createdBy: user.id,
              });
              showToast(`${mealLabels[mt]} menu added!`, 'success');
            }
            render();
          } catch (e) {
            showToast(e.message || 'Failed to save', 'error');
          }
        };
      }

      const delBtn = document.getElementById(`deleteBtn_${mt}`);
      if (delBtn) {
        delBtn.onclick = async () => {
          const existing = menuData.find(m => m.mealType === mt);
          if (!existing) return;
          showModal(
            'Delete Menu',
            `Delete ${mealLabels[mt]} menu for ${selectedDate}?`,
            async () => {
              try {
                await deleteMenuEntry(existing.id);
                showToast('Menu deleted', 'success');
                render();
              } catch (e) {
                showToast(e.message || 'Failed to delete', 'error');
              }
            },
            'Delete',
            'btn-danger'
          );
        };
      }
    });
  }

  function renderMealForm(mealType, existing) {
    return `
      <div class="card" style="margin-bottom:12px;">
        <h3 style="margin:0 0 8px 0;font-size:15px;">${mealLabels[mealType]}</h3>
        <div class="form-group">
          <label class="form-label">Food Items (one per line)</label>
          <textarea class="form-input" id="items_${mealType}" rows="3" placeholder="Dosa&#10;Sambar&#10;Chutney">${existing ? escapeHtml(existing.items) : ''}</textarea>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn btn-primary btn-sm" id="saveBtn_${mealType}" style="flex:1;">
            <span class="material-icons-outlined" style="font-size:16px;vertical-align:text-bottom;">save</span> ${existing ? 'Update' : 'Add'}
          </button>
          ${existing ? `<button class="btn btn-danger btn-sm" id="deleteBtn_${mealType}"><span class="material-icons-outlined" style="font-size:16px;vertical-align:text-bottom;">delete</span></button>` : ''}
        </div>
      </div>
    `;
  }

  render();
}
