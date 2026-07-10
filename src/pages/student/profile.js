import { getCurrentUser, logout, changePassword } from '../../auth.js';
import { navigate } from '../../router.js';
import { studentNav, getInitials, showToast, showModal, renderPageHeader, renderAvatar, escapeHtml } from '../../helpers.js';

export default function profilePage(app) {
  const user = getCurrentUser();
  if (!user) return;

  app.innerHTML = `
    ${renderPageHeader('UCE IT', '')}
    <div class="page">
      <div class="profile-avatar-container animate-scale-in" style="position: relative; width: 80px; height: 80px; margin: 0 auto var(--space-md); cursor: pointer; border-radius: 50%;">
        ${renderAvatar(user, 'profile-avatar-large')}
        <div class="avatar-edit-overlay" style="position: absolute; bottom: 0; right: 0; background: var(--primary); color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
          <span class="material-icons-outlined" style="font-size:16px;">edit</span>
        </div>
        <input type="file" id="avatarInput" accept="image/*" style="display:none;" />
      </div>
      
      <div class="profile-name">${escapeHtml(user.name)}</div>
      <div class="profile-location">${escapeHtml(user.blockName)} • Room ${escapeHtml(user.roomNumber)}</div>

      <div class="profile-section card animate-fade-in">
        <div class="profile-section-title">Personal Details</div>
        <div class="profile-field">
          <span class="profile-field-label">Student ID</span>
          <span class="profile-field-value">${escapeHtml(user.id)}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">${user.registrationNo ? 'Reg No' : 'Email'}</span>
          <span class="profile-field-value">${escapeHtml(user.registrationNo || user.email)}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Phone</span>
          <span class="profile-field-value">${escapeHtml(user.phone || '\u2014')}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Gender</span>
          <span class="profile-field-value">${escapeHtml(user.gender)}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Department</span>
          <span class="profile-field-value">${escapeHtml(user.department)}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Year</span>
          <span class="profile-field-value">${escapeHtml(user.year)}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Hostel</span>
          <span class="profile-field-value">${escapeHtml(user.hostelType)} Hostel</span>
        </div>
      </div>

      <div class="profile-section card animate-fade-in">
        <div class="profile-section-title">Guardian Information</div>
        <div class="profile-field">
          <span class="profile-field-label">Guardian Name</span>
          <span class="profile-field-value">${escapeHtml(user.guardianName || '\u2014')}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Guardian Phone</span>
          <span class="profile-field-value">${escapeHtml(user.guardianPhone || '\u2014')}</span>
        </div>
      </div>

      <div class="profile-section card animate-fade-in">
        <div class="profile-section-title">Account & Security</div>
        <div class="profile-field">
          <span class="profile-field-label">Status</span>
          <span class="chip ${user.activeStatus === 'IN' ? 'chip-in' : 'chip-out'}">${user.activeStatus}</span>
        </div>
        <div class="profile-field">
          <span class="profile-field-label">Account Created</span>
          <span class="profile-field-value">${new Date(user.createdAt).toLocaleDateString('en-IN')}</span>
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
          <div style="font-size:10px;color:var(--outline);margin-top:6px;">UCE IT v3.0.7</div>
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
    ${studentNav('profile')}
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
        
        profilePage(app);
        showToast('Profile picture updated successfully', 'success');
      } catch (err) {
        console.error(err);
        showToast('Failed to upload picture: ' + err.message, 'error');
        avatarContainer.style.opacity = '1';
      }
    };
  }

  document.getElementById('logoutBtn').addEventListener('click', () => {
    showModal(
      'Sign Out',
      'Are you sure you want to sign out of UCE IT?',
      async () => {
        await logout();
        showToast('Signed out successfully', 'info');
        navigate('#/login');
      },
      'Sign Out',
      'btn-danger'
    );
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
