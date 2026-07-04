import { getCurrentUser } from '../../auth.js';
import { getRooms, getRoomAllocations, allocateRoom, vacateRoom, updateRoom } from '../../store.js';
import { wardenNav, showToast, escapeHtml, renderNotifBell, renderAvatar } from '../../helpers.js';

export default async function wardenRoomsPage(app) {
  const user = getCurrentUser();
  if (!user) return;
  const hostelType = user.role === 'boys_warden' ? 'Boys' : 'Girls';

  async function render() {
    const rooms = await getRooms({ genderType: hostelType });
    const allocations = await getRoomAllocations();

    const totalRooms = rooms.length;
    const occupied = rooms.filter(r => r.status === 'occupied').length;
    const available = rooms.filter(r => r.status === 'available').length;
    const maintenance = rooms.filter(r => r.status === 'maintenance').length;

    const blocks = [...new Set(rooms.map(r => r.blockName))];

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Room Management</span>
          </div>
          <div class="flex items-center gap-sm">
            ${renderNotifBell()}
            <a href="#/warden/profile" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:6px;">${renderAvatar(user, 'stitch-avatar-sm')}</a>
          </div>
        </header>

        <div class="page-content">
          <h2 class="m-0 mb-xs fs-20 fw-600">${hostelType} Hostel Rooms</h2>
          <p class="m-0 mb-md fs-13 c-outline">${totalRooms} rooms • ${occupied} occupied • ${available} available</p>

          <div class="flex gap-sm mb-md">
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--primary-container);">${totalRooms}</div><div class="stat-label" style="font-size:10px;">Total</div></div>
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--status-success);">${available}</div><div class="stat-label" style="font-size:10px;">Available</div></div>
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--primary-container);">${occupied}</div><div class="stat-label" style="font-size:10px;">Occupied</div></div>
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--status-warning);">${maintenance}</div><div class="stat-label" style="font-size:10px;">Maint</div></div>
          </div>

          <div class="filter-tabs mb-md" id="blockTabs">
            <button class="filter-tab active" data-block="all">All Blocks</button>
            ${blocks.map(b => `<button class="filter-tab" data-block="${b}">${escapeHtml(b)}</button>`).join('')}
          </div>

          <div id="roomsList">
            ${rooms.map(room => renderRoomCard(room, allocations.filter(a => a.roomId === room.id))).join('')}
          </div>
        </div>

        ${wardenNav('profile')}
      </div>
    `;

    document.querySelectorAll('#blockTabs .filter-tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('#blockTabs .filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const block = tab.dataset.block;
        const filtered = block === 'all' ? rooms : rooms.filter(r => r.blockName === block);
        document.getElementById('roomsList').innerHTML = filtered.map(room => renderRoomCard(room, allocations.filter(a => a.roomId === room.id))).join('');
        bindRoomActions();
      };
    });

    bindRoomActions();
  }

  function renderRoomCard(room, roomAllocations) {
    const statusColors = { available: 'var(--status-success)', occupied: 'var(--primary-container)', maintenance: 'var(--status-warning)', unavailable: 'var(--outline)' };
    const residents = roomAllocations.filter(a => a.isCurrent);
    return `
      <div class="card mb-sm" style="border-left:4px solid ${statusColors[room.status] || 'var(--outline)'};">
        <div class="flex justify-between" style="align-items:flex-start;">
          <div>
            <div class="fs-16 fw-700">Room ${escapeHtml(room.roomNumber)}</div>
            <div class="fs-12 c-on-surface-variant">${escapeHtml(room.blockName)} • Floor ${room.floor} • ${room.roomType} • Cap: ${room.capacity} <button class="btn btn-sm btn-ghost editCapacity" data-room-id="${room.id}" data-capacity="${room.capacity}" style="font-size:10px;padding:0 4px;min-width:auto;vertical-align:middle;">edit</button></div>
            <div class="mt-sm">
              <span class="chip ${room.status === 'available' ? 'chip-approved' : room.status === 'occupied' ? 'chip-info' : room.status === 'maintenance' ? 'chip-pending' : 'chip-neutral'}">${room.status}</span>
            </div>
            ${residents.length > 0 ? `
              <div class="fs-12 c-on-surface-variant" style="margin-top:6px;">
                <strong>Residents (${residents.length}/${room.capacity}):</strong>
                ${residents.map(a => `<div class="flex items-center justify-between" style="gap:4px;">
                  <span>• ${escapeHtml(a.student?.name || 'Unknown')}</span>
                  <button class="btn btn-sm btn-ghost removeResident" data-alloc-id="${a.id}" data-room-id="${room.id}" data-student-id="${a.studentId}" style="color:var(--status-danger);font-size:11px;padding:2px 6px;min-width:auto;">Remove</button>
                </div>`).join('')}
              </div>
            ` : `<div class="fs-12" style="margin-top:6px;color:var(--outline-variant);">No residents</div>`}
          </div>
          <div class="flex flex-shrink-0" style="gap:4px;">
            ${(room.status === 'available' || room.status === 'occupied') && residents.length < room.capacity ? `<button class="btn btn-sm btn-primary allocateRoom" data-room-id="${room.id}">Allocate</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function bindRoomActions() {
    app.querySelectorAll('.allocateRoom').forEach(btn => {
      btn.onclick = () => showAllocateModal(btn.dataset.roomId);
    });
    app.querySelectorAll('.removeResident').forEach(btn => {
      btn.onclick = () => showRemoveResidentModal(btn.dataset.allocId, btn.dataset.roomId, btn.dataset.studentId);
    });
    app.querySelectorAll('.editCapacity').forEach(btn => {
      btn.onclick = () => showCapacityModal(btn.dataset.roomId, parseInt(btn.dataset.capacity));
    });
  }

  function showAllocateModal(roomId) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">Allocate Room</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Student Register Number</label>
            <input class="form-input" id="wardenAllocRegNo" placeholder="e.g. 412322244001" maxlength="12">
          </div>
          <div id="wardenAllocPreview" style="font-size:12px;color:var(--on-surface-variant);margin-top:4px;"></div>
          <input type="hidden" id="wardenAllocStudentId" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="modalConfirm">Allocate</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const regInput = backdrop.querySelector('#wardenAllocRegNo');
    let lookupTimeout;
    regInput.addEventListener('input', () => {
      clearTimeout(lookupTimeout);
      const regNo = regInput.value.trim();
      document.getElementById('wardenAllocPreview').textContent = '';
      document.getElementById('wardenAllocStudentId').value = '';
      if (regNo.length < 10) return;
      lookupTimeout = setTimeout(async () => {
        try {
          const { getUserByRegNo } = await import('../../store.js');
          const s = await getUserByRegNo(regNo);
          const preview = document.getElementById('wardenAllocPreview');
          if (s) {
            preview.textContent = `Student: ${s.name} (${s.department || 'N/A'})`;
            preview.style.color = 'var(--status-success)';
            document.getElementById('wardenAllocStudentId').value = s.id;
          } else {
            preview.textContent = 'Student not found with this register number';
            preview.style.color = 'var(--error)';
          }
        } catch { /* silent */ }
      }, 300);
    });

    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const studentId = document.getElementById('wardenAllocStudentId').value;
      if (!studentId) { showToast('Enter a valid register number first', 'warning'); return; }
      try {
        await allocateRoom(roomId, studentId, user.id);
        showToast('Room allocated!', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message, 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  function showCapacityModal(roomId, currentCap) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">Edit Room Capacity</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Capacity (1-8)</label>
            <select class="form-input" id="wardenCapacitySelect">
              ${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}"${n===currentCap?' selected':''}>${n} Member${n>1?'s':''}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="modalConfirm">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const cap = parseInt(document.getElementById('wardenCapacitySelect').value);
      try {
        await updateRoom(roomId, { capacity: cap });
        showToast('Capacity updated', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message, 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  function showRemoveResidentModal(allocId, roomId, studentId) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">Remove Resident</div>
        <div class="modal-body">Remove this resident from the room?</div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-danger btn-sm" id="modalConfirm">Remove</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      try {
        await vacateRoom(allocId, roomId, studentId);
        showToast('Resident removed', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message, 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  render();
}
