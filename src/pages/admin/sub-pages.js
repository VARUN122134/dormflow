import { getCurrentUser, logout, changePassword } from '../../auth.js';
import { getLeaves } from '../../store.js';
import { navigate } from '../../router.js';
import { adminNav, statusChip, formatDateRange, getInitials, showToast, showModal, renderPageHeader } from '../../helpers.js';

export async function adminLeaves(app) {
  const rawLeaves = await getLeaves();
  const leaves = rawLeaves.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  app.innerHTML = `
    ${renderPageHeader('All Leave Requests', `${leaves.length} total`)}
    <div class="page">
      <div style="display:flex;flex-direction:column;gap:var(--space-sm);" class="stagger">
        ${leaves.map(l => {
          const student = l.student;
          return `
            <div class="leave-card animate-fade-in-up">
              <div class="leave-card-header">
                <div class="leave-card-student">
                  <div class="leave-card-avatar">${getInitials(student?.name || 'U')}</div>
                  <div>
                    <div class="leave-card-name">${student?.name || 'Unknown'}</div>
                    <div class="leave-card-meta">${student?.hostelType || ''} Hostel • ${student?.department || ''}</div>
                  </div>
                </div>
                ${statusChip(l.approvalStatus)}
              </div>
              <div class="leave-card-meta">${formatDateRange(l.outDate, l.inDate)} • ${l.type}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ${adminNav('leaves')}
  `;
}

export function adminProfile(app) {
  const user = getCurrentUser();
  if (!user) return;

  app.innerHTML = `
    ${renderPageHeader('UCE IT', '')}
    <div class="page">
      <div class="profile-avatar-large animate-scale-in">${getInitials(user.name)}</div>
      <div class="profile-name">${user.name}</div>
      <div class="profile-location">System Administrator • University Central</div>

      <div class="profile-section card animate-fade-in">
        <div class="profile-section-title">Admin Details</div>
        <div class="profile-field">
          <span class="profile-field-label">Admin ID</span>
          <span class="profile-field-value">${user.id}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Email</span>
          <span class="profile-field-value">${user.email}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Role</span>
          <span class="chip chip-info">Super Admin</span>
        </div>
      </div>

      <div class="profile-section card animate-fade-in">
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

      <div class="profile-section card animate-fade-in" style="text-align:center;">
        <div class="profile-section-title">About</div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 0;">
          <img id="dev-photo" src="photo.png" alt="Varun C" style="width:48px;height:48px;border-radius:50%;object-fit:cover;margin-bottom:4px;" />
          <div style="font-weight:600;font-size:14px;">Varun C</div>
          <div style="font-size:12px;color:var(--on-surface-variant);">Lead Developer</div>
          <div style="margin-top:8px;padding:6px 16px;background:var(--surface-container);border-radius:var(--radius-full);font-size:11px;font-weight:600;color:var(--primary-container);letter-spacing:0.05em;text-transform:uppercase;">MooN Software Solutions</div>
          <div style="font-size:10px;color:var(--outline);margin-top:6px;">UCE IT v3.0.0</div>
          <a href="https://www.instagram.com/mr_varun_c/" target="_blank" rel="noopener noreferrer" style="display:flex;align-items:center;gap:4px;margin-top:8px;font-size:12px;color:var(--primary-container);text-decoration:none;">
            <span class="material-icons-outlined" style="font-size:16px;">camera_alt</span>
            @mr_varun_c
          </a>
        </div>
      </div>

      <button class="btn btn-danger btn-block animate-fade-in" id="logoutBtn" style="margin-top:var(--space-md);">
        <span class="material-icons-outlined" style="font-size:20px;">logout</span>
        Sign Out
      </button>
    </div>
    ${adminNav('profile')}
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

  document.getElementById('logoutBtn').addEventListener('click', () => {
    showModal('Sign Out', 'Are you sure you want to sign out?', async () => {
      await logout(); showToast('Signed out', 'info'); navigate('#/login');
    }, 'Sign Out', 'btn-danger');
  });

  document.getElementById('changePwBtn').addEventListener('click', async () => {
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
