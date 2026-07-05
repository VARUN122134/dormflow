let toastContainer = null;

function ensureToastContainer() {
  if (!toastContainer || !document.body.contains(toastContainer)) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function showToast(message, type = 'info', duration = 3000) {
  const container = ensureToastContainer();
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const iconMap = { success: 'check_circle', error: 'error', warning: 'warning', info: 'info' };
  toast.innerHTML = `
    <span class="material-icons-outlined" style="font-size:20px">${iconMap[type] || 'info'}</span>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

export function formatDate(dateStr) {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateShort(dateStr) {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export function formatTime(dateStr) {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr);
}

export function formatDateRange(outDate, inDate) {
  return `${formatDateShort(outDate)} - ${formatDateShort(inDate)}`;
}

export function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function renderAvatar(user, customClass = 'profile-avatar-large') {
  if (user && user.avatarUrl) {
    return `<img src="${escapeHtml(user.avatarUrl)}" class="${escapeHtml(customClass)}" alt="${escapeHtml(user.name || 'Avatar')}" style="object-fit: cover; border-radius: 50%;" />`;
  }
  const initials = getInitials(user ? user.name : '');
  return `<div class="${escapeHtml(customClass)}">${initials}</div>`;
}

export function statusChip(status) {
  const map = {
    'Approved': 'chip-approved',
    'Pending': 'chip-pending',
    'Rejected': 'chip-rejected',
    'Active': 'chip-info',
    'Used': 'chip-pending',
    'Completed': 'chip-neutral',
    'IN': 'chip-in',
    'OUT': 'chip-out',
  };
  return `<span class="chip ${map[status] || 'chip-neutral'}">${escapeHtml(status)}</span>`;
}

export function renderBottomNav(activeItem, items) {
  return `
    <nav class="bottom-nav" id="bottomNav">
      ${items.map(item => `
        <a href="${escapeHtml(item.route)}" class="nav-item ${activeItem === item.id ? 'active' : ''}" id="nav-${item.id}">
          <span class="material-icons-outlined">${item.icon}</span>
          <span>${escapeHtml(item.label)}</span>
        </a>
      `).join('')}
    </nav>
  `;
}

export function studentNav(active) {
  return renderBottomNav(active, [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', route: '#/student/dashboard' },
    { id: 'mess', icon: 'restaurant_menu', label: 'Mess', route: '#/student/mess' },
    { id: 'updates', icon: 'campaign', label: 'Updates', route: '#/student/announcements' },
    { id: 'profile', icon: 'person', label: 'Profile', route: '#/student/profile' },
  ]);
}

export function messMemberNav(active) {
  return renderBottomNav(active, [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', route: '#/mess/dashboard' },
    { id: 'menu', icon: 'edit_note', label: 'Menu', route: '#/mess/manage-menu' },
    { id: 'ratings', icon: 'star_half', label: 'Ratings', route: '#/mess/ratings' },
  ]);
}

export function wardenNav(active) {
  return renderBottomNav(active, [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', route: '#/warden/dashboard' },
    { id: 'attendance', icon: 'fact_check', label: 'Attendance', route: '#/warden/attendance' },
    { id: 'leaves', icon: 'event_available', label: 'Leaves', route: '#/warden/requests' },
    { id: 'announce', icon: 'campaign', label: 'Announce', route: '#/warden/announcements' },
    { id: 'profile', icon: 'person', label: 'Profile', route: '#/warden/profile' },
  ]);
}

export function gateNav(active) {
  return renderBottomNav(active, [
    { id: 'scan', icon: 'qr_code_scanner', label: 'Scan', route: '#/gate/dashboard' },
    { id: 'history', icon: 'history', label: 'History', route: '#/gate/history' },
    { id: 'inhouse', icon: 'group', label: 'In-House', route: '#/gate/inhouse' },
    { id: 'system', icon: 'settings', label: 'System', route: '#/gate/system' },
  ]);
}

export function adminNav(active) {
  return renderBottomNav(active, [
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', route: '#/admin/dashboard' },
    { id: 'users', icon: 'group', label: 'Users', route: '#/admin/users' },
    { id: 'mess', icon: 'restaurant_menu', label: 'Mess', route: '#/admin/mess' },
    { id: 'manage', icon: 'manage_accounts', label: 'Manage', route: '#/admin/manage' },
  ]);
}

export function renderStars(rating) {
  let html = '<span class="star-rating">';
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      html += '<span class="star star-filled">&#9733;</span>';
    } else {
      html += '<span class="star star-empty">&#9734;</span>';
    }
  }
  html += '</span>';
  return html;
}

export function renderPageHeader(title, subtitle = '', rightAction = '') {
  return `
    <header class="page-header">
      <div>
        <div class="page-header-title">${escapeHtml(title)}</div>
        ${subtitle ? `<div class="page-header-subtitle">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      ${rightAction}
    </header>
  `;
}

export function showModal(title, body, onConfirm, confirmText = 'Confirm', confirmClass = 'btn-danger') {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <div class="modal-title">${escapeHtml(title)}</div>
      <div class="modal-body">${escapeHtml(body)}</div>
      <div class="modal-actions">
        <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
        <button class="btn ${confirmClass} btn-sm" id="modalConfirm">${escapeHtml(confirmText)}</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);

  backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
  backdrop.querySelector('#modalConfirm').onclick = () => {
    onConfirm();
    backdrop.remove();
  };
  backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
}
