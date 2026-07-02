import { getCurrentUser } from '../../auth.js';
import { getRooms, getRoomAllocations, allocateRoom, vacateRoom } from '../../store.js';
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
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderNotifBell()}
            <a href="#/warden/profile" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:6px;">${renderAvatar(user, 'stitch-avatar-sm')}</a>
          </div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <h2 style="margin:0 0 4px 0;font-size:20px;font-weight:600;">${hostelType} Hostel Rooms</h2>
          <p style="margin:0 0 16px 0;font-size:13px;color:var(--outline);">${totalRooms} rooms • ${occupied} occupied • ${available} available</p>

          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--primary-container);">${totalRooms}</div><div class="stat-label" style="font-size:10px;">Total</div></div>
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--status-success);">${available}</div><div class="stat-label" style="font-size:10px;">Available</div></div>
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--primary-container);">${occupied}</div><div class="stat-label" style="font-size:10px;">Occupied</div></div>
            <div class="stat-card" style="padding:10px;"><div class="stat-value" style="font-size:18px;color:var(--status-warning);">${maintenance}</div><div class="stat-label" style="font-size:10px;">Maint</div></div>
          </div>

          <div class="filter-tabs" id="blockTabs" style="margin-bottom:12px;">
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
      <div class="card" style="margin-bottom:8px;border-left:4px solid ${statusColors[room.status] || 'var(--outline)'};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div>
            <div style="font-size:16px;font-weight:700;">Room ${escapeHtml(room.roomNumber)}</div>
            <div style="font-size:12px;color:var(--on-surface-variant);">${escapeHtml(room.blockName)} • Floor ${room.floor} • ${room.roomType} • Cap: ${room.capacity}</div>
            <div style="margin-top:4px;">
              <span class="chip ${room.status === 'available' ? 'chip-approved' : room.status === 'occupied' ? 'chip-info' : room.status === 'maintenance' ? 'chip-pending' : 'chip-neutral'}">${room.status}</span>
            </div>
            ${residents.length > 0 ? `
              <div style="margin-top:6px;font-size:12px;color:var(--on-surface-variant);">
                <strong>Residents:</strong>
                ${residents.map(a => `<div>• ${escapeHtml(a.student?.name || 'Unknown')}</div>`).join('')}
              </div>
            ` : ''}
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            ${room.status === 'available' ? `<button class="btn btn-sm btn-primary allocateRoom" data-room-id="${room.id}">Allocate</button>` : ''}
            ${room.status === 'occupied' ? `<button class="btn btn-sm btn-ghost vacateRoom" data-room-id="${room.id}" style="color:var(--status-warning);">Vacate</button>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  function bindRoomActions() {
    app.querySelectorAll('.allocateRoom').forEach(btn => {
      btn.onclick = () => showAllocateModal(btn.dataset.roomId);
    });
    app.querySelectorAll('.vacateRoom').forEach(btn => {
      btn.onclick = () => showVacateModal(btn.dataset.roomId);
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
            <label class="form-label">Student ID (UUID)</label>
            <input class="form-input" id="wardenAllocStudentId" placeholder="Paste student UUID">
          </div>
          <div id="wardenAllocPreview" style="font-size:12px;color:var(--on-surface-variant);margin-top:4px;"></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="modalConfirm">Allocate</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    backdrop.querySelector('#wardenAllocStudentId').addEventListener('input', async (e) => {
      const sid = e.target.value.trim();
      if (sid.length < 10) return;
      try {
        const { getUserById } = await import('../../store.js');
        const s = await getUserById(sid);
        document.getElementById('wardenAllocPreview').textContent = s ? `Student: ${s.name} (${s.department || 'N/A'})` : 'Student not found';
      } catch { /* silent */ }
    });

    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const sid = document.getElementById('wardenAllocStudentId').value.trim();
      if (!sid) { showToast('Enter student ID', 'warning'); return; }
      try {
        await allocateRoom(roomId, sid, user.id);
        showToast('Room allocated!', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message, 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  function showVacateModal(roomId) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">Vacate Room</div>
        <div class="modal-body">Remove all residents from this room?</div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-danger btn-sm" id="modalConfirm">Vacate</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const allocs = await getRoomAllocations({ roomId });
      for (const a of allocs.filter(x => x.isCurrent)) {
        await vacateRoom(a.id, roomId, a.studentId);
      }
      showToast('Room vacated', 'success');
      backdrop.remove();
      render();
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  render();
}
