import { getCurrentUser } from '../../auth.js';
import { getAppConfig, updateAppConfig } from '../../store.js';
import { adminNav, showToast, renderPageHeader, escapeHtml } from '../../helpers.js';

export async function adminConfiguration(app) {
  const user = getCurrentUser();
  if (!user) return;

  app.innerHTML = `
    ${renderPageHeader('Configuration', 'App settings')}
    <div class="page">
      <div id="configForm" style="display:flex;flex-direction:column;gap:var(--space-md);">
        <div style="text-align:center;padding:var(--space-lg);">
          <span class="material-icons-outlined" style="font-size:40px;color:var(--outline-variant);display:block;margin-bottom:8px;">hourglass_empty</span>
          Loading configuration...
        </div>
      </div>
    </div>
    ${adminNav('config')}
  `;

  const config = await getAppConfig();
  const form = document.getElementById('configForm');

  const labels = {
    hostel_name: 'Hostel Name',
    contact_phone: 'Contact Phone',
    contact_email: 'Contact Email',
    gate_out_timeout_hours: 'Gate Out Timeout (hours)',
    app_title: 'App Title',
  };

  form.innerHTML = Object.entries(config).map(([key, value]) => `
    <div class="card animate-fade-in">
      <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px;color:var(--on-surface-variant);">${escapeHtml(labels[key] || key)}</label>
      <div style="display:flex;gap:8px;">
        <input class="form-input" type="text" id="cfg-${escapeHtml(key)}" value="${escapeHtml(value)}" style="flex:1;" />
        <button class="btn btn-secondary btn-sm" data-key="${escapeHtml(key)}" style="white-space:nowrap;">
          <span class="material-icons-outlined" style="font-size:18px;">save</span> Save
        </button>
      </div>
    </div>
  `).join('');

  form.querySelectorAll('button[data-key]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      const input = document.getElementById(`cfg-${key}`);
      const value = input.value.trim();
      if (!value) { showToast('Value cannot be empty', 'error'); return; }
      btn.disabled = true;
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;">sync</span> Saving...';
      try {
        await updateAppConfig(key, value, user.id);
        showToast(`${labels[key] || key} updated`, 'success');
      } catch (err) {
        showToast(err.message || 'Failed to update', 'error');
      }
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;">save</span> Save';
    });
  });
}
