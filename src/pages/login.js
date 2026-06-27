import { login } from '../auth.js';
import { navigate } from '../router.js';
import { showToast } from '../helpers.js';

export default function loginPage(app) {
  app.innerHTML = `
    <div class="login-root">
      <div class="login-hero">
        <div class="login-emblem" style="background: transparent; border-radius: 0;">
          <img src="logo.png" alt="Anna University Logo" style="width: 80px; height: 80px; object-fit: contain;" />
        </div>
        <h1 class="login-title">Sign In</h1>
        <p class="login-subtitle">University College of Engineering Ariyalur</p>
      </div>

      <div class="login-card">
        <div class="role-selector-label">
          <span class="material-icons-outlined" style="font-size:16px;color:var(--outline);">manage_accounts</span>
          <span class="label-md" style="text-transform:none;font-size:12px;color:var(--on-surface-variant);">Select Role</span>
        </div>
        <div class="role-tabs" id="roleTabs">
          <button class="role-tab active" data-role="student">Student</button>
          <button class="role-tab" data-role="warden">Warden</button>
          <button class="role-tab" data-role="security">Gate Staff</button>
          <button class="role-tab" data-role="admin">Admin</button>
        </div>

        <div class="form-group">
          <label class="form-label">
            <span class="material-icons-outlined" style="font-size:14px;vertical-align:-2px;">badge</span>
            User ID
          </label>
          <input class="form-input" id="loginEmail" type="email" placeholder="12-digit ID or email" autocomplete="email"/>
        </div>

        <div class="form-group">
          <label class="form-label">
            <span class="material-icons-outlined" style="font-size:14px;vertical-align:-2px;">lock</span>
            Password
          </label>
          <div style="position:relative;">
            <input class="form-input" id="loginPassword" type="password" placeholder="••••••••" autocomplete="current-password" style="padding-right:44px;"/>
            <button id="togglePw" tabindex="-1" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;padding:4px;color:var(--outline);">
              <span class="material-icons-outlined" style="font-size:20px;">visibility</span>
            </button>
          </div>
          <div style="text-align:right;margin-top:6px;">
            <a href="#" style="font-size:12px;color:var(--primary-container);">Forgot password?</a>
          </div>
        </div>

        <div id="loginError" style="display:none;margin-top:var(--space-md);padding:12px;background:var(--error-container);color:var(--on-error-container);border-radius:var(--radius-md);font-size:var(--body-md-size);text-align:center;"></div>

        <button class="btn btn-primary btn-block" id="loginBtn" style="margin-top:8px;">
          <span class="material-icons-outlined" style="font-size:18px;">login</span>
          Login
        </button>

        <p class="login-register-link">
          Don't have an account? <a href="#/register">Register</a>
        </p>

        <p class="login-footer">Powered by MooN software solutions</p>
      </div>
    </div>
  `;

  let selectedRole = 'student';
  document.querySelectorAll('.role-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.role-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedRole = tab.dataset.role;
    });
  });

  document.getElementById('togglePw').addEventListener('click', () => {
    const pw = document.getElementById('loginPassword');
    const icon = document.querySelector('#togglePw .material-icons-outlined');
    if (pw.type === 'password') { pw.type = 'text'; icon.textContent = 'visibility_off'; }
    else { pw.type = 'password'; icon.textContent = 'visibility'; }
  });

  document.getElementById('loginBtn').addEventListener('click', async () => {
    let email      = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorDiv = document.getElementById('loginError');
    errorDiv.style.display = 'none';

    if (!email || !password) { showToast('Please enter your credentials', 'error'); return; }

    if (/^\d{12}$/.test(email)) {
      email = `${email}@ucea.edu.in`;
    }

    const btn = document.getElementById('loginBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;animation:spin 1s linear infinite;">refresh</span> Signing in\u2026';

    try {
      const { profile } = await login(email, password);
      showToast(`Welcome back, ${profile.name.split(' ')[0]}!`, 'success');
      const homeRoutes = {
        student:      '#/student/dashboard',
        boys_warden:  '#/warden/dashboard',
        girls_warden: '#/warden/dashboard',
        security:     '#/gate/dashboard',
        admin:        '#/admin/dashboard',
      };
      navigate(homeRoutes[profile.role] || '#/student/dashboard');
    } catch (err) {
      const msg = err.message || 'Invalid credentials. Please try again.';
      errorDiv.textContent = msg;
      errorDiv.style.display = 'block';
      btn.disabled = false;
      btn.innerHTML = '<span class="material-icons-outlined" style="font-size:18px;">login</span> Login';
    }
  });

  document.getElementById('loginPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  });
}
