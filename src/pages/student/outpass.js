import { getCurrentUser } from '../../auth.js';
import { getActiveOutpassByStudent, getLeaveById } from '../../store.js';
import { generateQR } from '../../qr.js';
import { studentNav, statusChip, formatDate, formatTime, renderPageHeader, renderAvatar } from '../../helpers.js';

export default async function outpassPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  const outpass = await getActiveOutpassByStudent(user.id);

  if (!outpass) {
    app.innerHTML = `
      ${renderPageHeader('My Outpass', '', `
        <a href="#/student/dashboard" style="color:var(--on-surface-variant);"><span class="material-icons-outlined">arrow_back</span></a>
      `)}
      <div class="page">
        <div class="empty-state">
          <span class="material-icons-outlined">qr_code_2</span>
          <div class="empty-state-title">No Active Outpass</div>
          <div class="empty-state-desc">You don't have an active outpass. Apply for leave and get it approved to receive a QR outpass.</div>
          <a href="#/student/apply" class="btn btn-primary" style="margin-top:var(--space-md);">Apply for Leave</a>
        </div>
      </div>
      ${studentNav('dashboard')}
    `;
    return;
  }

  const leave = await getLeaveById(outpass.leaveId);
  const statusMsg = outpass.status === 'Active' ? 'Ready to Scan at Gate' :
                    outpass.status === 'Used' ? 'Scanned Out \u2014 Show on Return' : 'Completed';
  const statusColor = outpass.status === 'Active' ? 'var(--status-success)' :
                      outpass.status === 'Used' ? 'var(--status-warning)' : 'var(--outline)';

  app.innerHTML = `
    ${renderPageHeader('My Outpass', '', `
      <a href="#/student/dashboard" style="color:var(--on-surface-variant);text-decoration:none;">
        <span class="material-icons-outlined">arrow_back</span>
      </a>
    `)}
    <div class="page">
      <div class="outpass-card animate-scale-in">
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:var(--space-md);">
          <span class="material-icons-outlined" style="color:${statusColor};font-size:20px;">
            ${outpass.status === 'Active' ? 'verified' : outpass.status === 'Used' ? 'pending' : 'task_alt'}
          </span>
          <span style="font-weight:600;color:${statusColor};">${statusMsg}</span>
        </div>

        <div style="display:flex; align-items:center; justify-content:center; gap: var(--space-md); padding: var(--space-sm) var(--space-md); border-bottom: 1px dashed var(--outline-variant); margin-bottom: var(--space-md); text-align:left;">
          ${renderAvatar(user, 'profile-avatar-large')}
          <div>
            <div style="font-weight:700;font-size:var(--headline-sm-size); color:var(--on-surface);">${user.name}</div>
            <div class="label-md text-muted" style="margin-top:4px;">${user.department} • Room ${user.roomNumber}</div>
            <div class="label-md text-muted">${user.hostelType} Hostel</div>
          </div>
        </div>

        <div class="outpass-qr-wrapper">
          <div id="qrCode"></div>
        </div>

        <div class="label-md text-muted" style="margin-top:var(--space-sm);">
          Pass ID: ${outpass.passId}
        </div>

        <div class="outpass-details">
          <div class="outpass-detail-row">
            <span class="outpass-detail-label">Leave Type</span>
            <span class="outpass-detail-value">${leave?.type || '\u2014'}</span>
          </div>
          <div class="outpass-detail-row">
            <span class="outpass-detail-label">Departure</span>
            <span class="outpass-detail-value">${formatDate(leave?.outDate)}</span>
          </div>
          <div class="outpass-detail-row">
            <span class="outpass-detail-label">Return</span>
            <span class="outpass-detail-value">${formatDate(leave?.inDate)}</span>
          </div>
          <div class="outpass-detail-row">
            <span class="outpass-detail-label">Status</span>
            <span>${statusChip(outpass.status)}</span>
          </div>
          ${outpass.outTime ? `
            <div class="outpass-detail-row">
              <span class="outpass-detail-label">Departed</span>
              <span class="outpass-detail-value">${formatTime(outpass.outTime)}, ${formatDate(outpass.outTime)}</span>
            </div>
          ` : ''}
          ${outpass.inTime ? `
            <div class="outpass-detail-row">
              <span class="outpass-detail-label">Returned</span>
              <span class="outpass-detail-value">${formatTime(outpass.inTime)}, ${formatDate(outpass.inTime)}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <div style="text-align:center;margin-top:var(--space-md);">
        <p class="label-sm text-muted">Present this QR code to the gate security for scanning</p>
      </div>
    </div>
    ${studentNav('dashboard')}
  `;

  const qrTimer = setTimeout(async () => {
    await generateQR('qrCode', outpass.qrData, 220);
  }, 100);

  return () => clearTimeout(qrTimer);
}
