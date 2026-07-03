/* ========================================
   Gate Staff Dashboard (Supabase)
   Scanner keeps running continuously.
   ======================================== */

import { getCurrentUser } from '../../auth.js';
import { scanOutpass, getGateStats, getRecentGateActivity, getOutpasses } from '../../store.js';
import { startScanner, stopScanner } from '../../qr.js';
import { gateNav, statusChip, formatTime, getInitials, showToast, renderAvatar } from '../../helpers.js';

export default async function gateDashboard(app) {
  const user = getCurrentUser();
  if (!user) return;

  let scanner = null;
  let scannerActive = false;
  let scanLock = false;

  await render();

  async function render() {
    const stats = await getGateStats();
    const recentActivity = await getRecentGateActivity(8);

    app.innerHTML = `
      <div class="gate-header">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
          <img src="logo.png" alt="Anna University Logo" style="width: 36px; height: 36px; object-fit: contain;" />
          <h1 style="margin:0;font-size:24px;font-weight:700;">UCE IT</h1>
        </div>
        <p>UC Engineering Ariyalur • Gate Security</p>
      </div>

      <div class="gate-stats">
        <div class="stat-card">
          <div class="stat-label">Currently Out</div>
          <div class="stat-value" style="color:var(--status-warning);">${stats.currentlyOut}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Exits</div>
          <div class="stat-value" style="color:var(--primary-container);">${stats.totalExits}</div>
        </div>
      </div>

      <div class="page" style="padding-top:var(--space-sm);">
        <div class="section-title">
          <span class="material-icons-outlined" style="font-size:20px;vertical-align:middle;">qr_code_scanner</span>
          Scan Pass
        </div>
        <div class="card" style="margin-bottom:var(--space-md);">
          <div id="scannerContainer" style="width:100%;max-width:300px;margin:0 auto;">
            ${!scannerActive ? `
              <div style="text-align:center;padding:var(--space-lg);">
                <div class="scanner-frame" style="background:var(--surface-container);display:flex;align-items:center;justify-content:center;height:200px;max-width:250px;margin:0 auto;">
                  <div style="text-align:center;">
                    <span class="material-icons-outlined" style="font-size:64px;color:var(--outline-variant);">qr_code_scanner</span>
                    <p class="label-sm text-muted" style="margin-top:var(--space-sm);">Tap to activate camera</p>
                  </div>
                </div>
                <button class="btn btn-primary" style="margin-top:var(--space-md);" id="startScanBtn">
                  <span class="material-icons-outlined" style="font-size:20px;">camera_alt</span>
                  Start Scanner
                </button>
              </div>
            ` : `
              <div id="qrReader" style="width:100%;"></div>
              <button class="btn btn-secondary btn-block btn-sm" style="margin-top:var(--space-sm);" id="stopScanBtn">Stop Scanner</button>
            `}
          </div>
          <p class="label-sm text-muted text-center" style="margin-top:var(--space-sm);">Align QR code within the frame</p>
        </div>

        <div id="scanResult"></div>

        <div class="section-title">Manual ID Entry</div>
        <div class="manual-entry-section" style="margin:0 0 var(--space-md);">
          <div class="manual-entry-row">
            <input class="form-input" type="text" id="manualInput" placeholder="Enter outpass QR data or pass ID..." />
            <button class="btn btn-primary" id="manualScanBtn" style="white-space:nowrap;">
              <span class="material-icons-outlined" style="font-size:20px;">search</span>
            </button>
          </div>
        </div>

        <div class="section-title">Live Activity Log</div>
        <p class="label-sm text-muted" style="margin-bottom:var(--space-sm);">Real-time gate traffic updates</p>
        <div class="card" id="activityLogContainer">
          ${renderActivityLog(recentActivity)}
        </div>
      </div>
      ${gateNav('scan')}
    `;

    bindEvents();
  }

  function renderActivityLog(activity) {
    if (activity.length > 0) {
      return activity.map(a => `
        <div class="activity-item">
          <div class="activity-icon ${a.action === 'IN' ? 'icon-success' : 'icon-warning'}">
            <span class="material-icons-outlined">${a.action === 'IN' ? 'login' : 'logout'}</span>
          </div>
          <div class="activity-content">
            <div class="activity-title">${a.studentName}</div>
            <div class="activity-desc">${a.hostelType} • ${a.department}</div>
          </div>
          <div style="text-align:right;">
            <div class="activity-time">${formatTime(a.timestamp)}</div>
            ${statusChip(a.action)}
          </div>
        </div>
      `).join('');
    }
    return `
      <div class="body-md text-muted" style="padding:var(--space-lg);text-align:center;">
        <span class="material-icons-outlined" style="font-size:40px;color:var(--outline-variant);display:block;margin-bottom:8px;">history</span>
        No gate activity yet
      </div>
    `;
  }

  async function refreshActivityLog() {
    const container = document.getElementById('activityLogContainer');
    if (!container) return;
    const activity = await getRecentGateActivity(8);
    container.innerHTML = renderActivityLog(activity);
  }

  function bindEvents() {
    document.getElementById('startScanBtn')?.addEventListener('click', () => {
      scannerActive = true;
      const container = document.getElementById('scannerContainer');
      if (!container) return;
      container.innerHTML = `
        <div id="qrReader" style="width:100%;"></div>
        <button class="btn btn-secondary btn-block btn-sm" style="margin-top:var(--space-sm);" id="stopScanBtn">Stop Scanner</button>
      `;
      document.getElementById('stopScanBtn')?.addEventListener('click', stopScanning);
      scanner = startScanner('qrReader', handleScan);
    });

    document.getElementById('stopScanBtn')?.addEventListener('click', stopScanning);

    document.getElementById('manualScanBtn')?.addEventListener('click', () => {
      const input = document.getElementById('manualInput').value.trim();
      if (input) handleScan(input);
    });

    document.getElementById('manualInput')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const input = e.target.value.trim();
        if (input) handleScan(input);
      }
    });
  }

  function stopScanning() {
    stopScanner(scanner);
    scanner = null;
    scannerActive = false;
    const container = document.getElementById('scannerContainer');
    if (container) {
      container.innerHTML = `
        <div style="text-align:center;padding:var(--space-lg);">
          <div class="scanner-frame" style="background:var(--surface-container);display:flex;align-items:center;justify-content:center;height:200px;max-width:250px;margin:0 auto;">
            <div style="text-align:center;">
              <span class="material-icons-outlined" style="font-size:64px;color:var(--outline-variant);">qr_code_scanner</span>
              <p class="label-sm text-muted" style="margin-top:var(--space-sm);">Tap to activate camera</p>
            </div>
          </div>
          <button class="btn btn-primary" style="margin-top:var(--space-md);" id="startScanBtn">
            <span class="material-icons-outlined" style="font-size:20px;">camera_alt</span>
            Start Scanner
          </button>
        </div>
      `;
      document.getElementById('startScanBtn')?.addEventListener('click', () => {
        scannerActive = true;
        const c = document.getElementById('scannerContainer');
        if (!c) return;
        c.innerHTML = `
          <div id="qrReader" style="width:100%;"></div>
          <button class="btn btn-secondary btn-block btn-sm" style="margin-top:var(--space-sm);" id="stopScanBtn">Stop Scanner</button>
        `;
        document.getElementById('stopScanBtn')?.addEventListener('click', stopScanning);
        scanner = startScanner('qrReader', handleScan);
      });
    }
  }

  async function handleScan(data) {
    if (scanLock) return;
    scanLock = true;

    const resultDiv = document.getElementById('scanResult');
    if (!resultDiv) { scanLock = false; return; }

    resultDiv.innerHTML = `
      <div style="text-align:center;padding:var(--space-md);">
        <p class="body-md">Processing scan, please wait...</p>
      </div>
    `;

    let result = await scanOutpass(data, user.id);

    if (!result.success && !data.startsWith('UCEIT') && !data.startsWith('DORMFLOW')) {
      const outpasses = await getOutpasses();
      const match = outpasses.find(o => o.passId === data);
      if (match) {
        result = await scanOutpass(match.qrData, user.id);
      }
    }

    if (result.success) {
      showToast(result.message, 'success');
      resultDiv.innerHTML = `
        <div class="scan-result scan-success animate-scale-in" style="margin-bottom:var(--space-md); padding: var(--space-md);">
          <div style="display: flex; align-items: center; justify-content: center; gap: var(--space-md); text-align: left;">
            ${renderAvatar(result.student, 'profile-avatar-large')}
            <div>
              <h3 style="margin:0 0 4px 0; display:flex; align-items:center; gap:6px; font-size:var(--headline-sm-size);">
                ${result.student.name}
                <span class="material-icons-outlined" style="font-size:20px; color:var(--status-success);">
                  ${result.action === 'DEPARTURE' ? 'logout' : 'login'}
                </span>
              </h3>
              <p style="margin:2px 0; color:var(--on-surface-variant); font-size:var(--body-md-size);">${result.student.department} • ${result.student.year} Year</p>
              <p style="margin:2px 0; color:var(--on-surface-variant); font-size:var(--body-md-size);">${result.student.hostelType} Hostel • Room ${result.student.roomNumber}</p>
              <p style="margin:6px 0 0 0; font-size:var(--body-md-size); font-weight:600; color:var(--status-success);">
                ${result.action === 'DEPARTURE' ? 'Checked OUT successfully' : 'Checked IN successfully'}
              </p>
            </div>
          </div>
        </div>
      `;
      refreshActivityLog();
      // Show success overlay for 150ms then go back
      const overlay = document.createElement('div');
      overlay.id = 'scanSuccessOverlay';
      overlay.innerHTML = `
        <div style="position:fixed;inset:0;z-index:9999;background:rgba(22,163,74,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;animation:fadeIn 0.3s ease forwards;">
          <span class="material-icons-outlined" style="font-size:80px;color:#fff;animation:scaleIn 0.3s ease forwards;">check_circle</span>
          <p style="color:#fff;font-size:20px;font-weight:600;margin-top:12px;">${result.action === 'DEPARTURE' ? 'Checked OUT' : 'Checked IN'}</p>
        </div>
      `;
      document.body.appendChild(overlay);
      setTimeout(() => {
        const o = document.getElementById('scanSuccessOverlay');
        if (o) o.remove();
        window.history.back();
      }, 300);
    } else {
      showToast(result.error, 'error');
      resultDiv.innerHTML = `
        <div class="scan-result scan-error animate-scale-in" style="margin-bottom:var(--space-md);">
          <span class="material-icons-outlined" style="font-size:48px;">error</span>
          <h3 style="margin:var(--space-sm) 0;">Scan Failed</h3>
          <p>${result.error}</p>
        </div>
      `;
    }

    const manualInput = document.getElementById('manualInput');
    if (manualInput) manualInput.value = '';

    // Clear result and unlock after 3s, scanner keeps running
    setTimeout(() => {
      const rd = document.getElementById('scanResult');
      if (rd) rd.innerHTML = '';
      scanLock = false;
    }, 3000);
  }

  return () => {
    if (scanner) stopScanner(scanner);
  };
}
