import { register, getHomeRoute } from '../auth.js';
import { navigate } from '../router.js';
import { showToast } from '../helpers.js';

export default function registerPage(app) {
  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-header">
        <div class="auth-header-icon" style="background: transparent; box-shadow: none; border-radius: 0; width: 64px; height: 64px;">
          <img src="logo.png" alt="Anna University Logo" style="width: 64px; height: 64px; object-fit: contain;" />
        </div>
        <h1>Register</h1>
        <p>Create your hostel account</p>
      </div>

      <div class="auth-body">
        <form id="registerForm">
          <div class="form-group">
            <label class="form-label" for="regName">Full Name</label>
            <input class="form-input" type="text" id="regName" placeholder="Enter your full name" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="regNum">12-Digit Registration Number</label>
            <input class="form-input" type="text" id="regNum" placeholder="e.g. 312221104001" required pattern="\\d{12}" title="Please enter exactly 12 digits" />
          </div>

          <div class="form-group">
            <label class="form-label" for="regPassword">Password</label>
            <input class="form-input" type="password" id="regPassword" placeholder="Create a password" required minlength="6" />
          </div>

          <div class="form-group">
            <label class="form-label">Gender</label>
            <div class="radio-group">
              <label class="radio-option"><input type="radio" name="gender" value="Male" required /> Male</label>
              <label class="radio-option"><input type="radio" name="gender" value="Female" /> Female</label>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label" for="regHostel">Hostel Type</label>
            <select class="form-select" id="regHostel" required>
              <option value="">Select hostel</option>
              <option value="Boys">Boys Hostel</option>
              <option value="Girls">Girls Hostel</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="regDept">Department</label>
            <select class="form-select" id="regDept" required>
              <option value="">Select department</option>
              <option value="CSE">Computer Science (CSE)</option>
              <option value="ECE">Electronics (ECE)</option>
              <option value="MECH">Mechanical (MECH)</option>
              <option value="CIVIL">Civil (CIVIL)</option>
              <option value="EEE">Electrical (EEE)</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="regYear">Year</label>
            <select class="form-select" id="regYear" required>
              <option value="">Select year</option>
              <option value="1st">1st Year</option>
              <option value="2nd">2nd Year</option>
              <option value="3rd">3rd Year</option>
              <option value="4th">4th Year</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label" for="regRoom">Room Number</label>
            <input class="form-input" type="text" id="regRoom" placeholder="e.g. B-402" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="regBlock">Block Name</label>
            <input class="form-input" type="text" id="regBlock" placeholder="e.g. Block B" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="regPhone">Phone Number</label>
            <input class="form-input" type="tel" id="regPhone" placeholder="10-digit phone number" required pattern="[0-9]{10}" />
          </div>

          <div class="form-group">
            <label class="form-label" for="regGuardian">Guardian Name</label>
            <input class="form-input" type="text" id="regGuardian" placeholder="Parent / Guardian name" required />
          </div>

          <div class="form-group">
            <label class="form-label" for="regGuardianPhone">Guardian Phone</label>
            <input class="form-input" type="tel" id="regGuardianPhone" placeholder="Guardian phone number" required pattern="[0-9]{10}" />
          </div>

          <div id="registerError" style="display:none;margin-top:var(--space-md);padding:10px;background:var(--error-container);color:var(--on-error-container);border-radius:var(--radius-md);font-size:var(--body-md-size);text-align:center;"></div>

          <button type="submit" class="btn btn-primary btn-block" style="margin-top:var(--space-lg);" id="registerBtn">
            <span class="material-icons-outlined" style="font-size:20px;">how_to_reg</span>
            Create Account
          </button>
        </form>

        <div class="auth-link">
          Already have an account? <a href="#/login">Login</a>
        </div>
      </div>

      <div class="auth-footer">
        <div class="auth-footer-brand">Powered by MooN Software Solutions</div>
        <div>UCE IT Management System v3.0.0</div>
      </div>
    </div>
  `;

  const form = document.getElementById('registerForm');
  const errorDiv = document.getElementById('registerError');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorDiv.style.display = 'none';

    const regNum = document.getElementById('regNum').value.trim();
    const email = `${regNum}@ucea.edu.in`;
    const password = document.getElementById('regPassword').value;
    const gender = form.querySelector('input[name="gender"]:checked')?.value;
    if (!gender) {
      errorDiv.textContent = 'Please select your gender';
      errorDiv.style.display = 'block';
      return;
    }

    const userData = {
      name: document.getElementById('regName').value.trim(),
      email,
      role: 'student',
      gender,
      hostelType: document.getElementById('regHostel').value,
      department: document.getElementById('regDept').value,
      year: document.getElementById('regYear').value,
      roomNumber: document.getElementById('regRoom').value.trim(),
      blockName: document.getElementById('regBlock').value.trim(),
      phone: document.getElementById('regPhone').value.trim(),
      guardianName: document.getElementById('regGuardian').value.trim(),
      guardianPhone: document.getElementById('regGuardianPhone').value.trim(),
    };

    const submitBtn = document.getElementById('registerBtn');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Creating account...';

    try {
      const result = await register(email, password, userData);

      if (result.requiresApproval) {
        app.innerHTML = `
          <div class="auth-screen">
            <div class="auth-header">
              <div class="auth-header-icon" style="background: transparent; box-shadow: none; border-radius: 0; width: 64px; height: 64px;">
                <img src="logo.png" alt="Anna University Logo" style="width: 64px; height: 64px; object-fit: contain;" />
              </div>
              <h1>Registration Submitted</h1>
              <p>Admin approval required</p>
            </div>
            <div class="auth-body" style="display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:48px 32px;">
              <span class="material-icons-outlined" style="font-size:72px;color:var(--status-success);margin-bottom:24px;">how_to_reg</span>
              <h2 style="margin-bottom:16px;">Account Created!</h2>
              <p style="color:var(--on-surface-variant);margin-bottom:24px;line-height:1.6;">
                Your registration has been submitted successfully. An administrator will review and approve your account shortly.
              </p>
              <div style="background:var(--surface-container-low);padding:16px;border-radius:8px;margin-bottom:24px;width:100%;">
                <p style="font-size:13px;color:var(--on-surface-variant);">
                  <span class="material-icons-outlined" style="font-size:16px;vertical-align:-3px;">info</span>
                  You will not be able to log in until an admin approves your account.
                </p>
              </div>
              <a href="#/login" class="btn btn-primary" style="text-decoration:none;">
                <span class="material-icons-outlined" style="font-size:20px;">login</span>
                Go to Login
              </a>
            </div>
            <div class="auth-footer">
              <div class="auth-footer-brand">Powered by MooN Software Solutions</div>
            </div>
          </div>
        `;
      } else {
        showToast('Account created successfully!', 'success');
        navigate(getHomeRoute(result.profile.role));
      }
    } catch (err) {
      errorDiv.textContent = err.message || 'Error creating account. Please try again.';
      errorDiv.style.display = 'block';
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalText;
    }
  });
}
