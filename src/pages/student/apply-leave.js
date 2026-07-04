/* ========================================
   Apply for Leave
   ======================================== */

import { getCurrentUser } from '../../auth.js';
import { createLeave } from '../../store.js';
import { navigate } from '../../router.js';
import { studentNav, showToast, renderPageHeader, renderBackButton } from '../../helpers.js';

export default function applyLeavePage(app) {
  const user = getCurrentUser();
  if (!user) return;

  // Get tomorrow's date as min
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  const today = new Date().toISOString().split('T')[0];

  app.innerHTML = `
    ${renderPageHeader('Leave Application', '', renderBackButton('#/student/dashboard'))}
    <div class="page">
      <p class="body-md text-muted" style="margin-bottom:var(--space-lg);">
        Complete the form below to submit your leave request for approval.
      </p>

      <!-- Submission Policy -->
      <div class="policy-card animate-fade-in">
        <div class="policy-card-title">Submission Policy</div>
        <div class="policy-item">
          <span class="material-icons-outlined">check_circle</span>
          24h advance notice
        </div>
        <div class="policy-item">
          <span class="material-icons-outlined">check_circle</span>
          Guardian confirmation
        </div>
        <div class="policy-item">
          <span class="material-icons-outlined">check_circle</span>
          Return by 9 PM
        </div>
      </div>

      <!-- Leave Form -->
      <form id="leaveForm">
        <div class="form-group">
          <label class="form-label" for="leaveType">Leave Type</label>
          <select class="form-select" id="leaveType" required>
            <option value="">Select leave type</option>
            <option value="Home Visit">Home Visit</option>
            <option value="Medical">Medical Leave</option>
            <option value="Weekend">Weekend Leave</option>
            <option value="Family Event">Family Event</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label" for="outDate">Departure Date</label>
          <input class="form-input" type="date" id="outDate" required min="${today}" />
        </div>

        <div class="form-group">
          <label class="form-label" for="inDate">Return Date</label>
          <input class="form-input" type="date" id="inDate" required min="${today}" />
        </div>

        <div class="form-group">
          <label class="form-label" for="leaveReason">Reason</label>
          <textarea class="form-textarea" id="leaveReason" placeholder="Describe the reason for your leave request..." required rows="4"></textarea>
          <div class="label-sm text-muted" style="margin-top:4px;">This field is required for processing your application.</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="guardianContact">Guardian Contact</label>
          <input class="form-input" type="tel" id="guardianContact" value="${user.guardianPhone || ''}" placeholder="Guardian phone number" required />
        </div>

        <div id="formError" style="display:none;margin-top:var(--space-md);padding:10px;background:var(--error-container);color:var(--on-error-container);border-radius:var(--radius-md);font-size:var(--body-md-size);text-align:center;"></div>

        <button type="submit" class="btn btn-primary btn-block" style="margin-top:var(--space-lg);" id="submitLeave">
          <span class="material-icons-outlined" style="font-size:20px;">send</span>
          Submit Request
        </button>

        <div class="consent-text">
          By submitting, you agree to the hostel code of conduct.
        </div>
      </form>
    </div>
    ${studentNav('apply')}
  `;

  // Date validation
  document.getElementById('outDate').addEventListener('change', () => {
    const outDate = document.getElementById('outDate').value;
    document.getElementById('inDate').min = outDate;
  });

  // Form submit
  document.getElementById('leaveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('formError');
    errorDiv.style.display = 'none';

    const outDate = document.getElementById('outDate').value;
    const inDate = document.getElementById('inDate').value;

    if (new Date(inDate) < new Date(outDate)) {
      errorDiv.textContent = 'Return date must be after departure date';
      errorDiv.style.display = 'block';
      return;
    }

    try {
      await createLeave({
        studentId: user.id,
        type: document.getElementById('leaveType').value,
        reason: document.getElementById('leaveReason').value.trim(),
        outDate,
        inDate,
        guardianContact: document.getElementById('guardianContact').value.trim(),
      });

      showToast('Leave request submitted successfully!', 'success');
      navigate('#/student/dashboard');
    } catch (err) {
      errorDiv.textContent = err.message || 'Error submitting leave request. Please try again.';
      errorDiv.style.display = 'block';
    }
  });
}
