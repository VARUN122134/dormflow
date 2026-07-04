import { getCurrentUser, logout, changePassword } from '../../auth.js';
import { getRecentGateActivity, getUsers } from '../../store.js';
import { gateNav, statusChip, formatTime, formatDate, getInitials, renderPageHeader, showToast, showModal, escapeHtml } from '../../helpers.js';

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
              <div class="activity-title">${escapeHtml(a.studentName)}</div>
              <div class="activity-desc">${escapeHtml(a.hostelType)} • ${escapeHtml(a.department)} • Pass ${escapeHtml(a.passId)}</div>
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
            <div class="user-card-avatar">${escapeHtml(getInitials(s.name))}</div>
            <div class="user-card-info">
              <div class="user-card-name">${escapeHtml(s.name)}</div>
              <div class="user-card-id">${escapeHtml(s.hostelType)} • ${escapeHtml(s.department)} • Room ${escapeHtml(s.roomNumber)}</div>
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
      <div class="card mb-md">
        <div class="profile-section-title">Gate Officer</div>
        <div class="profile-field">
          <span class="profile-field-label">Name</span>
          <span class="profile-field-value">${escapeHtml(user?.name || '\u2014')}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">ID</span>
          <span class="profile-field-value">${escapeHtml(user?.id || '\u2014')}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Email</span>
          <span class="profile-field-value">${escapeHtml(user?.email || '\u2014')}</span>
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

      <div class="card animate-fade-in mt-md">
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
          <div id="cpError" class="fs-12 text-center" style="display:none;margin-top:8px;padding:8px;background:var(--error-container);color:var(--on-error-container);border-radius:var(--radius-md);"></div>
          <button class="btn btn-secondary btn-block btn-sm mt-md" id="changePwBtn">
            <span class="material-icons-outlined" style="font-size:18px;">lock_reset</span>
            Update Password
          </button>
        </div>
      </div>

      <div class="card animate-fade-in text-center mt-md">
        <div class="profile-section-title">About</div>
        <div class="flex flex-col items-center gap-sm" style="padding:8px 0;">
          <img id="dev-photo" src="photo.png" alt="Varun C" style="width:48px;height:48px;border-radius:50%;object-fit:cover;margin-bottom:4px;" />
          <div class="fw-600 fs-14">Varun C</div>
          <div class="fs-12 c-on-surface-variant">Lead Developer</div>
          <div class="text-upp" style="margin-top:8px;padding:6px 16px;background:var(--surface-container);border-radius:var(--radius-full);font-size:11px;font-weight:600;color:var(--primary-container);letter-spacing:0.05em;">MooN Software Solutions</div>
          <div class="c-outline" style="font-size:10px;margin-top:6px;">UCE IT v3.0.0</div>
          <a href="https://www.instagram.com/mr_varun_c/" target="_blank" rel="noopener noreferrer" class="flex items-center gap-sm mt-md fs-12" style="color:var(--primary-container);text-decoration:none;">
            <span class="material-icons-outlined fs-16">camera_alt</span>
            @mr_varun_c
          </a>
        </div>
      </div>

      <button class="btn btn-danger btn-block mt-lg" id="logoutBtn">
        <span class="material-icons-outlined fs-20">logout</span>
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

  document.getElementById('logoutBtn')?.addEventListener('click', () => {
    showModal('Sign Out', 'Are you sure you want to sign out?', async () => {
      await logout();
      showToast('Signed out', 'info');
      window.location.hash = '#/login';
    }, 'Sign Out', 'btn-danger');
  });

  document.getElementById('changePwBtn')?.addEventListener('click', async () => {
    const current = document.getElementById('cpCurrent').value;
    const newPw = document.getElementById('cpNew').value;
    const cpConfirmEl = document.getElementById('cpConfirm').value;
    const cpError = document.getElementById('cpError');
    cpError.style.display = 'none';

    if (!current || !newPw || !cpConfirmEl) {
      cpError.textContent = 'Please fill in all password fields';
      cpError.style.display = 'block';
      return;
    }
    if (newPw.length < 6) {
      cpError.textContent = 'New password must be at least 6 characters';
      cpError.style.display = 'block';
      return;
    }
    if (newPw !== cpConfirmEl) {
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
