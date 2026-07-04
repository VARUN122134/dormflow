import { getCurrentUser, logout, changePassword } from '../../auth.js';
import { getLeaves } from '../../store.js';
import { navigate } from '../../router.js';
import { adminNav, statusChip, formatDateRange, getInitials, showToast, showModal, renderPageHeader, renderAvatar, renderBackButton, escapeHtml } from '../../helpers.js';

export async function adminLeaves(app) {
  const rawLeaves = await getLeaves();
  const leaves = [...rawLeaves].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  app.innerHTML = `
    ${renderPageHeader('All Leave Requests', `${leaves.length} total`, renderBackButton())}
    <div class="page">
      <div style="display:flex;flex-direction:column;gap:var(--space-sm);" class="stagger">
        ${leaves.map(l => {
          const student = l.student;
          return `
            <div class="leave-card animate-fade-in-up">
              <div class="leave-card-header">
                <div class="leave-card-student">
                  ${renderAvatar(student, 'leave-card-avatar')}
                  <div>
                    <div class="leave-card-name">${escapeHtml(student?.name || 'Unknown')}</div>
                    <div class="leave-card-meta">${escapeHtml(student?.hostelType || '')} Hostel • ${escapeHtml(student?.department || '')}</div>
                  </div>
                </div>
                ${statusChip(l.approvalStatus)}
              </div>
              <div class="leave-card-meta">${formatDateRange(l.outDate, l.inDate)} • ${escapeHtml(l.type)}</div>
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
    ${renderPageHeader('UCE IT', '', renderBackButton())}
    <div class="page">
      <div class="profile-avatar-container animate-scale-in mx-auto mb-md" style="position: relative; width: 80px; height: 80px; cursor: pointer; border-radius: 50%;">
        ${renderAvatar(user, 'profile-avatar-large')}
        <div class="avatar-edit-overlay flex items-center justify-center" style="position: absolute; bottom: 0; right: 0; background: var(--primary); color: white; border-radius: 50%; width: 28px; height: 28px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          <span class="material-icons-outlined fs-16">edit</span>
        </div>
        <input type="file" id="avatarInput" accept="image/*" style="display:none;" />
      </div>
      <div class="profile-name">${escapeHtml(user.name)}</div>
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
          <div id="cpError" class="fs-12 text-center" style="display:none;margin-top:8px;padding:8px;background:var(--error-container);color:var(--on-error-container);border-radius:var(--radius-md);"></div>
          <button class="btn btn-secondary btn-block btn-sm mt-md" id="changePwBtn">
            <span class="material-icons-outlined" style="font-size:18px;">lock_reset</span>
            Update Password
          </button>
        </div>
      </div>

      <div class="profile-section card animate-fade-in text-center">
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

      <button class="btn btn-danger btn-block animate-fade-in mt-md" id="logoutBtn">
        <span class="material-icons-outlined fs-20">logout</span>
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

  const avatarContainer = app.querySelector('.profile-avatar-container');
  const avatarInput = app.querySelector('#avatarInput');

  if (avatarContainer && avatarInput) {
    avatarContainer.onclick = () => avatarInput.click();
    avatarInput.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        showToast('Uploading profile picture...', 'info');
        avatarContainer.style.opacity = '0.5';

        const { uploadAvatar } = await import('../../store.js');
        const newUrl = await uploadAvatar(user.id, file);

        user.avatarUrl = newUrl;

        adminProfile(app);
        showToast('Profile picture updated successfully', 'success');
      } catch (err) {
        console.error(err);
        showToast('Failed to upload picture: ' + err.message, 'error');
        avatarContainer.style.opacity = '1';
      }
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
