/* ========================================
   Gate Staff Dashboard (Supabase)
   Scanner keeps running continuously.
   ======================================== */

import { getCurrentUser } from '../../auth.js';
import { scanOutpass, getGateStats, getRecentGateActivity, getOutpasses } from '../../store.js';
import { startScanner, stopScanner } from '../../qr.js';
import { gateNav, statusChip, formatTime, getInitials, showToast, renderAvatar, escapeHtml } from '../../helpers.js';

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
        <div class="flex items-center gap-md mb-xs">
          <img src="logo.png" alt="Anna University Logo" style="width: 36px; height: 36px; object-fit: contain;" />
          <h1 class="m-0 fw-700" style="font-size:24px;">UCE IT</h1>
        </div>
        <p>UC Engineering Ariyalur • Gate Security</p>
      </div>

      <div class="gate-stats">
        <div class="stat-card">
          <div class="stat-label">Currently Out</div>
          <div class="stat-value c-warning">${stats.currentlyOut}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Exits</div>
          <div class="stat-value" style="color:var(--primary-container);">${stats.totalExits}</div>
        </div>
      </div>

      <div class="page" style="padding-top:var(--space-sm);">
        <div class="section-title">
          <span class="material-icons-outlined fs-20" style="vertical-align:middle;">qr_code_scanner</span>
          Scan Pass
        </div>
        <div class="card mb-md">
          <div id="scannerContainer" class="w-full mx-auto" style="max-width:300px;">
            ${!scannerActive ? `
              <div class="text-center p-lg">
                <div class="scanner-frame bg-surface flex items-center justify-center" style="height:200px;max-width:250px;margin:0 auto;">
                  <div class="text-center">
                    <span class="material-icons-outlined fs-36" style="color:var(--outline-variant);">qr_code_scanner</span>
                    <p class="label-sm text-muted mt-sm">Tap to activate camera</p>
                  </div>
                </div>
                <button class="btn btn-primary mt-md" id="startScanBtn">
                  <span class="material-icons-outlined fs-20">camera_alt</span>
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
        <div class="manual-entry-section mb-md">
          <div class="manual-entry-row">
            <input class="form-input" type="text" id="manualInput" placeholder="Enter outpass QR data or pass ID..." />
            <button class="btn btn-primary text-nowrap" id="manualScanBtn">
              <span class="material-icons-outlined fs-20">search</span>
            </button>
          </div>
        </div>

        <div class="section-title">Live Activity Log</div>
        <p class="label-sm text-muted mb-sm">Real-time gate traffic updates</p>
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
            <div class="activity-title">${escapeHtml(a.studentName)}</div>
            <div class="activity-desc">${escapeHtml(a.hostelType)} • ${escapeHtml(a.department)}</div>
          </div>
          <div style="text-align:right;">
            <div class="activity-time">${formatTime(a.timestamp)}</div>
            ${statusChip(a.action)}
          </div>
        </div>
      `).join('');
    }
    return `
      <div class="body-md text-muted p-lg text-center">
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
        <div class="text-center p-lg">
          <div class="scanner-frame bg-surface flex items-center justify-center" style="height:200px;max-width:250px;margin:0 auto;">
            <div class="text-center">
              <span class="material-icons-outlined fs-36" style="color:var(--outline-variant);">qr_code_scanner</span>
              <p class="label-sm text-muted mt-sm">Tap to activate camera</p>
            </div>
          </div>
          <button class="btn btn-primary mt-md" id="startScanBtn">
            <span class="material-icons-outlined fs-20">camera_alt</span>
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
      <div class="text-center p-md">
        <p class="body-md">Processing scan, please wait...</p>
      </div>
    `;

    let result;
    try {
      result = await scanOutpass(data, user.id);
    } catch (e) {
      showToast('Scan error: ' + (e.message || e), 'error');
      resultDiv.innerHTML = `
        <div class="scan-result scan-error animate-scale-in mb-md">
          <span class="material-icons-outlined" style="font-size:48px;">error</span>
          <h3 class="mt-sm mb-sm">Scan Failed</h3>
          <p>${escapeHtml(e.message || 'An unexpected error occurred')}</p>
        </div>
      `;
      setTimeout(() => { if (document.getElementById('scanResult')) document.getElementById('scanResult').innerHTML = ''; scanLock = false; }, 3000);
      return;
    }

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
        <div class="scan-result scan-success animate-scale-in mb-md p-md">
          <div class="flex items-center justify-center gap-md">
            ${renderAvatar(result.student, 'profile-avatar-large')}
            <div>
              <h3 class="flex items-center" style="margin:0 0 4px 0;gap:6px;font-size:var(--headline-sm-size);">
                ${escapeHtml(result.student.name)}
                <span class="material-icons-outlined fs-20 c-success">
                  ${result.action === 'DEPARTURE' ? 'logout' : 'login'}
                </span>
              </h3>
              <p class="c-on-surface-variant" style="margin:2px 0;font-size:var(--body-md-size);">${escapeHtml(result.student.department)} • ${escapeHtml(result.student.year)} Year</p>
              <p class="c-on-surface-variant" style="margin:2px 0;font-size:var(--body-md-size);">${escapeHtml(result.student.hostelType)} Hostel • Room ${escapeHtml(result.student.roomNumber)}</p>
              <p class="fw-600 c-success" style="margin:6px 0 0 0;font-size:var(--body-md-size);">
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
        const rb = window.__router?.goBack;
        if (rb) rb('#/gate/dashboard'); else window.location.hash = '#/gate/dashboard';
      }, 300);
    } else {
      showToast(result.error, 'error');
      resultDiv.innerHTML = `
        <div class="scan-result scan-error animate-scale-in mb-md">
          <span class="material-icons-outlined" style="font-size:48px;">error</span>
          <h3 class="mt-sm mb-sm">Scan Failed</h3>
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
