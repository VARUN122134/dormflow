import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';

export async function generateQR(containerId, data, size = 200) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  try {
    const canvas = document.createElement('canvas');
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    container.appendChild(canvas);
    await QRCode.toCanvas(canvas, data, {
      width: size,
      margin: 2,
      color: { dark: '#191c1d', light: '#ffffff' },
    });
  } catch (err) {
    container.innerHTML = `<div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border:2px dashed #ccc;border-radius:8px;color:#666;font-size:12px;text-align:center;padding:16px;">QR generation failed</div>`;
  }
}

export function startScanner(containerId, onScanSuccess) {
  let scanner;
  try {
    scanner = new Html5Qrcode(containerId);
  } catch (err) {
    console.warn('html5-qrcode library not available:', err);
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div style="padding:40px;text-align:center;color:#666;">
          <span class="material-icons-outlined" style="font-size:48px;color:#d97706;">videocam_off</span>
          <p style="margin-top:12px;">Camera not available</p>
          <p style="font-size:12px;margin-top:4px;">Use manual ID entry instead</p>
        </div>
      `;
    }
    return null;
  }

  scanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      onScanSuccess(decodedText);
    },
    () => {}
  ).catch((err) => {
    console.warn('Camera access denied or not available:', err);
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div style="padding:40px;text-align:center;color:#666;">
          <span class="material-icons-outlined" style="font-size:48px;color:#d97706;">videocam_off</span>
          <p style="margin-top:12px;">Camera not available</p>
          <p style="font-size:12px;margin-top:4px;">Use manual ID entry instead</p>
        </div>
      `;
    }
  });

  return scanner;
}

export function stopScanner(scanner) {
  if (scanner) {
    scanner.stop().catch(() => {});
  }
}

export function parseQRData(rawString) {
  const parts = rawString.split('|');
  if (parts.length < 6 || (parts[0] !== 'UCEIT' && parts[0] !== 'DORMFLOW')) return null;
  return {
    prefix: parts[0],
    passId: parts[1],
    studentId: parts[2],
    leaveId: parts[3],
    outDate: parts[4],
    inDate: parts[5],
  };
}
