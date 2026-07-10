import { supabase } from '../supabase.js';
import { navigate } from '../router.js';
import { showToast } from '../helpers.js';

export default function resetPasswordPage(app) {
  const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  const accessToken = hashParams.get('access_token') || '';
  const type = hashParams.get('type') || '';

  if (type === 'recovery' && accessToken) {
    supabase.auth.setSession({ access_token: accessToken, refresh_token: '' }).catch(() => {});
  }

  app.innerHTML = `
    <div class="login-root">
      <div class="login-hero">
        <div class="login-emblem" style="background: transparent; border-radius: 0;">
          <img src="logo.png" alt="Anna University Logo" style="width: 80px; height: 80px; object-fit: contain;" />
        </div>
        <h1 class="login-title">Reset Password</h1>
        <p class="login-subtitle">University College of Engineering Ariyalur</p>
      </div>

      <div class="login-card">
        <div class="form-group">
          <label class="form-label">
            <span class="material-icons-outlined" style="font-size:14px;vertical-align:-2px;">lock</span>
            New Password
          </label>
          <input class="form-input" id="newPassword" type="password" placeholder="Min 6 characters" minlength="6" />
        </div>

        <div class="form-group">
          <label class="form-label">
            <span class="material-icons-outlined" style="font-size:14px;vertical-align:-2px;">lock</span>
            Confirm Password
          </label>
          <input class="form-input" id="confirmPassword" type="password" placeholder="Re-enter new password" />
        </div>

        <div id="resetError" style="display:none;margin-top:var(--space-md);padding:12px;background:var(--error-container);color:var(--on-error-container);border-radius:var(--radius-md);font-size:var(--body-md-size);text-align:center;"></div>

        <button class="btn btn-primary btn-block" id="resetBtn" style="margin-top:8px;">
          <span class="material-icons-outlined" style="font-size:18px;">lock_reset</span>
          Update Password
        </button>

        <p class="login-footer" style="margin-top:16px;">
          <a href="#/login" style="color:var(--primary-container);font-size:13px;">Back to Login</a>
        </p>
      </div>
    </div>
  `;

  document.getElementById('resetBtn').addEventListener('click', async () => {
    const newPw = document.getElementById('newPassword').value;
    const confirm = document.getElementById('confirmPassword').value;
    const errorDiv = document.getElementById('resetError');
    errorDiv.style.display = 'none';

    if (!newPw || !confirm) {
      errorDiv.textContent = 'Please fill in both fields';
      errorDiv.style.display = 'block';
      return;
    }
    if (newPw.length < 6) {
      errorDiv.textContent = 'Password must be at least 6 characters';
      errorDiv.style.display = 'block';
      return;
    }
    if (newPw !== confirm) {
      errorDiv.textContent = 'Passwords do not match';
      errorDiv.style.display = 'block';
      return;
    }

    const btn = document.getElementById('resetBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;animation:spin 1s linear infinite;">refresh</span> Updating...';

    try {
      const { error } = await supabase.auth.updateUser({ password: newPw });
      if (error) throw error;
      showToast('Password updated successfully!', 'success');
      navigate('#/login');
    } catch (err) {
      errorDiv.textContent = err.message || 'Failed to update password';
      errorDiv.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;">lock_reset</span> Update Password';
    }
  });

  document.getElementById('confirmPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('resetBtn').click();
  });
}
