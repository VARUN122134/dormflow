import { getCurrentUser, logout, changePassword } from '../../auth.js';
import { getRecentGateActivity, getUsers } from '../../store.js';
import { gateNav, statusChip, formatTime, formatDate, getInitials, renderPageHeader, showToast } from '../../helpers.js';

export async function gateHistory(app) {
  const activity = await getRecentGateActivity(30);

  app.innerHTML = `
    ${renderPageHeader('Gate History', 'All scan records')}
    <div class="page">
      <div class="card">
        ${activity.length > 0 ? activity.map(a => `
          <div class="activity-item">
            <div class="activity-icon ${a.action === 'IN' ? 'icon-success' : 'icon-warning'}">
              <span class="material-icons-outlined">${a.action === 'IN' ? 'login' : 'logout'}</span>
            </div>
            <div class="activity-content">
              <div class="activity-title">${a.studentName}</div>
              <div class="activity-desc">${a.hostelType} • ${a.department} • Pass ${a.passId}</div>
            </div>
            <div style="text-align:right;">
              <div class="activity-time">${formatTime(a.timestamp)}</div>
              <div class="label-sm text-muted">${formatDate(a.timestamp)}</div>
            </div>
          </div>
        `).join('') : `
          <div class="empty-state">
            <span class="material-icons-outlined">history</span>
            <div class="empty-state-title">No history yet</div>
          </div>
        `}
      </div>
    </div>
    ${gateNav('history')}
  `;
}

export async function gateInHouse(app) {
  const allUsers = await getUsers();
  const students = allUsers.filter(u => u.role === 'student' && u.activeStatus === 'IN');

  app.innerHTML = `
    ${renderPageHeader('In-House Students', `${students.length} currently inside`)}
    <div class="page">
      <div style="display:flex;flex-direction:column;gap:var(--space-sm);" class="stagger">
        ${students.map(s => `
          <div class="user-card animate-fade-in-up">
            <div class="user-card-avatar">${getInitials(s.name)}</div>
            <div class="user-card-info">
              <div class="user-card-name">${s.name}</div>
              <div class="user-card-id">${s.hostelType} • ${s.department} • Room ${s.roomNumber}</div>
            </div>
            ${statusChip('IN')}
          </div>
        `).join('')}
      </div>
    </div>
    ${gateNav('inhouse')}
  `;
}

export function gateSystem(app) {
  const user = getCurrentUser();

  app.innerHTML = `
    ${renderPageHeader('System', 'Gate Terminal')}
    <div class="page">
      <div class="card" style="margin-bottom:var(--space-md);">
        <div class="profile-section-title">Gate Officer</div>
        <div class="profile-field">
          <span class="profile-field-label">Name</span>
          <span class="profile-field-value">${user?.name || '\u2014'}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">ID</span>
          <span class="profile-field-value">${user?.id || '\u2014'}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Email</span>
          <span class="profile-field-value">${user?.email || '\u2014'}</span>
        </div>
      </div>

      <div class="card">
        <div class="profile-section-title">System Status</div>
        <div class="profile-field">
          <span class="profile-field-label">Scanner</span>
          <span class="chip chip-approved">Online</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Version</span>
          <span class="profile-field-value">v2.4.0</span>
        </div>
      </div>

      <div class="card animate-fade-in" style="margin-top:var(--space-md);">
        <div class="profile-section-title">Change Password</div>
        <div id="changePasswordForm">
          <div class="form-group">
            <label class="form-label" for="cpCurrent">Current Password</label>
            <input class="form-input" type="password" id="cpCurrent" placeholder="Enter current password" />
          </div>
          <div class="form-group">
            <label class="form-label" for="cpNew">New Password</label>
            <input class="form-input" type="password" id="cpNew" placeholder="Enter new password (min 6 chars)" minlength="6" />
          </div>
          <div class="form-group">
            <label class="form-label" for="cpConfirm">Confirm New Password</label>
            <input class="form-input" type="password" id="cpConfirm" placeholder="Confirm new password" />
          </div>
          <div id="cpError" style="display:none;margin-top:8px;padding:8px;background:var(--error-container);color:var(--on-error-container);border-radius:var(--radius-md);font-size:12px;text-align:center;"></div>
          <button class="btn btn-secondary btn-block btn-sm" style="margin-top:12px;" id="changePwBtn">
            <span class="material-icons-outlined" style="font-size:18px;">lock_reset</span>
            Update Password
          </button>
        </div>
      </div>

      <div class="card animate-fade-in" style="text-align:center;margin-top:var(--space-md);">
        <div class="profile-section-title">About</div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;">
          <img id="dev-photo" src="photo.png" alt="Varun C" style="width:48px;height:48px;border-radius:50%;object-fit:cover;margin-bottom:4px;" />
          <div style="font-weight:600;font-size:14px;">Varun C</div>
          <div style="font-size:12px;color:var(--on-surface-variant);">Lead Developer</div>
          <div style="margin-top:8px;padding:6px 16px;background:var(--surface-container);border-radius:var(--radius-full);font-size:11px;font-weight:600;color:var(--primary-container);letter-spacing:0.05em;text-transform:uppercase;">MooN Software Solutions</div>
          <div style="font-size:10px;color:var(--outline);margin-top:6px;">DormFlow v3.0.0</div>
          <a href="https://www.instagram.com/mr_varun_c/" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:4px;margin-top:8px;font-size:12px;color:var(--primary-container);text-decoration:none;">
            <span class="material-icons-outlined" style="font-size:16px;">camera_alt</span>
            @mr_varun_c
          </a>
        </div>
      </div>

      <button class="btn btn-danger btn-block" style="margin-top:var(--space-lg);" id="logoutBtn">
        <span class="material-icons-outlined" style="font-size:20px;">logout</span>
        Sign Out
      </button>
    </div>
    ${gateNav('system')}
  `;

  const devPhoto = app.querySelector('#dev-photo');
  if (devPhoto) {
    devPhoto.onerror = function() {
      this.onerror = null;
      this.style.display = 'none';
      const fb = document.createElement('div');
      fb.style.cssText = 'width:48px;height:48px;border-radius:50%;background:var(--primary-fixed);color:var(--primary-container);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;margin-bottom:4px;';
      fb.textContent = 'VC';
      this.parentNode.insertBefore(fb, this.nextSibling);
    };
  }

  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    await logout();
    window.location.hash = '#/login';
  });

  document.getElementById('changePwBtn')?.addEventListener('click', async () => {
    const current = document.getElementById('cpCurrent').value;
    const newPw = document.getElementById('cpNew').value;
    const confirm = document.getElementById('cpConfirm').value;
    const cpError = document.getElementById('cpError');
    cpError.style.display = 'none';

    if (!current || !newPw || !confirm) {
      cpError.textContent = 'Please fill in all password fields';
      cpError.style.display = 'block';
      return;
    }
    if (newPw.length < 6) {
      cpError.textContent = 'New password must be at least 6 characters';
      cpError.style.display = 'block';
      return;
    }
    if (newPw !== confirm) {
      cpError.textContent = 'New passwords do not match';
      cpError.style.display = 'block';
      return;
    }

    const btn = document.getElementById('changePwBtn');
    btn.disabled = true;
    btn.innerHTML = 'Updating...';

    try {
      await changePassword(current, newPw);
      showToast('Password updated successfully', 'success');
      document.getElementById('cpCurrent').value = '';
      document.getElementById('cpNew').value = '';
      document.getElementById('cpConfirm').value = '';
    } catch (err) {
      cpError.textContent = err.message || 'Failed to update password';
      cpError.style.display = 'block';
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;">lock_reset</span> Update Password';
    }
  });
}
