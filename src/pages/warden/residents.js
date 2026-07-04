/* ========================================
   Warden - Residents Directory (Supabase)
   ======================================== */

import { getCurrentUser } from '../../auth.js';
import { getUsers } from '../../store.js';
import { wardenNav, statusChip, getInitials, renderPageHeader, renderAvatar, renderBackButton } from '../../helpers.js';

export default async function wardenResidents(app) {
  const user = getCurrentUser();
  if (!user) return;

  const hostelType = user.hostelType || (user.role === 'boys_warden' ? 'Boys' : 'Girls');
  let search = '';
  let yearFilter = 'All';

  await render();

  async function render() {
    const allUsers = await getUsers();
    let students = allUsers.filter(u => u.role === 'student' && u.hostelType === hostelType);

    if (search) {
      const q = search.toLowerCase();
      students = students.filter(s =>
        s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q) || s.department.toLowerCase().includes(q)
      );
    }
    if (yearFilter !== 'All') {
      students = students.filter(s => s.year === yearFilter);
    }

    students.sort((a, b) => a.name.localeCompare(b.name));

    app.innerHTML = `
      ${renderPageHeader('Residents', `${hostelType} Hostel • ${students.length} students`, renderBackButton())}
      <div class="page">
        <!-- Search -->
        <div style="display:flex;gap:var(--space-sm);margin-bottom:var(--space-md);">
          <div style="flex:1;position:relative;">
            <span class="material-icons-outlined" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:20px;color:var(--outline);">search</span>
            <input class="form-input" type="text" id="searchInput" placeholder="Search by name, ID, or department..." 
              style="padding-left:40px;" value="${search}" />
          </div>
        </div>

        <!-- Year Filter -->
        <div class="filter-tabs" id="yearFilters">
          ${['All', '1st', '2nd', '3rd', '4th'].map(y => `
            <button class="filter-tab ${yearFilter === y ? 'active' : ''}" data-year="${y}">${y === 'All' ? 'All Years' : y + ' Year'}</button>
          `).join('')}
        </div>

        <!-- Student List -->
        <div style="margin-top:var(--space-md);display:flex;flex-direction:column;gap:var(--space-sm);" class="stagger">
          ${students.length > 0 ? students.map(s => `
            <div class="user-card animate-fade-in-up">
              ${renderAvatar(s, 'user-card-avatar')}
              <div class="user-card-info">
                <div class="user-card-name">${s.name}</div>
                <div class="user-card-id">${s.department} • ${s.year} Year • Room ${s.roomNumber}</div>
              </div>
              ${statusChip(s.activeStatus)}
            </div>
          `).join('') : `
            <div class="empty-state">
              <span class="material-icons-outlined">people</span>
              <div class="empty-state-title">No students found</div>
              <div class="empty-state-desc">No matching residents in ${hostelType} Hostel.</div>
            </div>
          `}
        </div>
      </div>
      ${wardenNav('residents')}
    `;

    document.getElementById('searchInput')?.addEventListener('input', async (e) => {
      search = e.target.value; await render();
      // Restore cursor position for search input
      const input = document.getElementById('searchInput');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });
    document.querySelectorAll('[data-year]').forEach(tab => {
      tab.addEventListener('click', async () => { yearFilter = tab.dataset.year; await render(); });
    });
  }
}
