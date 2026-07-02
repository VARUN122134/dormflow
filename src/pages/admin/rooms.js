import { getCurrentUser, getRole } from '../../auth.js';
import { getRooms, getRoomAllocations, createRoom, updateRoom, deleteRoom, allocateRoom, vacateRoom, getMaintenanceRequests, updateMaintenanceStatus, getUsers, getRoomById } from '../../store.js';
import { adminNav, showToast, escapeHtml, formatDate, showModal, renderNotifBell, renderAvatar } from '../../helpers.js';

export default async function adminRoomsPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const [rooms, allocations, maintenanceReqs] = await Promise.all([
      getRooms(),
      getRoomAllocations(),
      getMaintenanceRequests(),
    ]);
    const stats = {
      total: rooms.length,
      available: rooms.filter(r => r.status === 'available').length,
      occupied: rooms.filter(r => r.status === 'occupied').length,
      maintenance: rooms.filter(r => r.status === 'maintenance').length,
    };

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Room Management</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderNotifBell()}
            <a href="#/admin/profile" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:6px;">${renderAvatar(user, 'stitch-avatar-sm')}</a>
          </div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <div style="display:flex;gap:8px;margin-bottom:16px;">
            <button class="btn btn-sm btn-primary" id="tabRooms" style="flex:1;">Rooms</button>
            <button class="btn btn-sm btn-ghost" id="tabMaintenance" style="flex:1;">Maintenance</button>
          </div>

          <div id="tabContent">
            ${renderRoomsTab(rooms, allocations, stats)}
          </div>
        </div>

        ${adminNav('manage')}
      </div>
    `;

    document.getElementById('tabRooms').onclick = () => {
      document.getElementById('tabRooms').className = 'btn btn-sm btn-primary';
      document.getElementById('tabMaintenance').className = 'btn btn-sm btn-ghost';
      document.getElementById('tabContent').innerHTML = renderRoomsTab(rooms, allocations, stats);
      bindRoomHandlers();
    };
    document.getElementById('tabMaintenance').onclick = () => {
      document.getElementById('tabMaintenance').className = 'btn btn-sm btn-primary';
      document.getElementById('tabRooms').className = 'btn btn-sm btn-ghost';
      document.getElementById('tabContent').innerHTML = renderMaintenanceTab(maintenanceReqs);
      bindMaintenanceHandlers();
    };

    bindRoomHandlers();
  }

  function renderRoomsTab(rooms, allocations, stats) {
    const blocks = [...new Set(rooms.map(r => r.blockName))];
    return `
      <div style="display:flex;gap:8px;margin-bottom:12px;">
        <button class="btn btn-primary btn-sm" id="addRoomBtn" style="flex:1;">
          <span class="material-icons-outlined" style="font-size:16px;">add</span> Add Room
        </button>
      </div>

      <div style="display:flex;gap:6px;margin-bottom:12px;">
        <div class="stat-card" style="padding:8px;"><div class="stat-value" style="font-size:16px;">${stats.total}</div><div class="stat-label" style="font-size:9px;">Total</div></div>
        <div class="stat-card" style="padding:8px;"><div class="stat-value" style="font-size:16px;color:var(--status-success);">${stats.available}</div><div class="stat-label" style="font-size:9px;">Free</div></div>
        <div class="stat-card" style="padding:8px;"><div class="stat-value" style="font-size:16px;color:var(--primary-container);">${stats.occupied}</div><div class="stat-label" style="font-size:9px;">Full</div></div>
        <div class="stat-card" style="padding:8px;"><div class="stat-value" style="font-size:16px;color:var(--status-warning);">${stats.maintenance}</div><div class="stat-label" style="font-size:9px;">Maint</div></div>
      </div>

      <div class="filter-tabs" id="adminBlockTabs" style="margin-bottom:12px;">
        <button class="filter-tab active" data-block="all">All</button>
        ${blocks.map(b => `<button class="filter-tab" data-block="${b}">${escapeHtml(b)}</button>`).join('')}
      </div>

      <div id="adminRoomsList">
        ${rooms.map(room => renderAdminRoomCard(room, allocations.filter(a => a.roomId === room.id && a.isCurrent))).join('')}
      </div>
    `;
  }

  function renderAdminRoomCard(room, roomAllocs) {
    const statusColors = { available: 'var(--status-success)', occupied: 'var(--primary-container)', maintenance: 'var(--status-warning)', unavailable: 'var(--outline)' };
    return `
      <div class="card" style="margin-bottom:8px;border-left:4px solid ${statusColors[room.status] || 'var(--outline)'};">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:700;">Room ${escapeHtml(room.roomNumber)}</div>
            <div style="font-size:11px;color:var(--on-surface-variant);">${escapeHtml(room.blockName)} • F${room.floor} • ${room.roomType} • ${room.genderType} • Cap: ${room.capacity}</div>
            <span class="chip ${room.status === 'available' ? 'chip-approved' : room.status === 'occupied' ? 'chip-info' : room.status === 'maintenance' ? 'chip-pending' : 'chip-neutral'}" style="margin-top:4px;">${room.status}</span>
            ${roomAllocs.length > 0 ? `<div style="margin-top:4px;font-size:11px;color:var(--on-surface-variant);">${roomAllocs.map(a => escapeHtml(a.student?.name || 'Unknown')).join(', ')}</div>` : ''}
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            <button class="btn btn-ghost btn-sm editRoom" data-id="${room.id}"><span class="material-icons-outlined" style="font-size:16px;">edit</span></button>
            ${room.status === 'available' ? `<button class="btn btn-sm btn-primary allocateRoom" data-id="${room.id}">Allocate</button>` : ''}
            ${room.status === 'occupied' ? `<button class="btn btn-sm btn-ghost vacateRoom" data-id="${room.id}" style="color:var(--status-warning);">Vacate</button>` : ''}
            <button class="btn btn-ghost btn-sm deleteRoom" data-id="${room.id}" style="color:var(--error);"><span class="material-icons-outlined" style="font-size:16px;">delete</span></button>
          </div>
        </div>
      </div>
    `;
  }

  function renderMaintenanceTab(requests) {
    const pending = requests.filter(r => r.status === 'pending' || r.status === 'acknowledged');
    const resolved = requests.filter(r => r.status === 'resolved' || r.status === 'closed');

    return `
      <div class="filter-tabs" id="maintFilter" style="margin-bottom:12px;">
        <button class="filter-tab active" data-mfilter="all">All (${requests.length})</button>
        <button class="filter-tab" data-mfilter="pending">Pending (${pending.length})</button>
        <button class="filter-tab" data-mfilter="resolved">Resolved (${resolved.length})</button>
      </div>
      <div id="maintenanceList">
        ${requests.length === 0
          ? '<div class="card" style="padding:24px;text-align:center;color:var(--outline);">No maintenance requests</div>'
          : requests.map(m => renderMaintenanceCard(m)).join('')}
      </div>
    `;
  }

  function renderMaintenanceCard(m) {
    const statusColors = { pending: 'chip-pending', acknowledged: 'chip-info', in_progress: 'chip-pending', resolved: 'chip-approved', closed: 'chip-neutral' };
    const priorityColors = { low: 'chip-neutral', medium: 'chip-pending', high: 'chip-pending', urgent: 'chip-rejected' };
    return `
      <div class="card" style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="flex:1;">
            <div style="display:flex;gap:4px;margin-bottom:4px;">
              <span class="chip ${statusColors[m.status] || 'chip-neutral'}">${m.status}</span>
              <span class="chip ${priorityColors[m.priority] || 'chip-neutral'}">${m.priority}</span>
            </div>
            <div style="font-size:13px;font-weight:600;text-transform:capitalize;">${escapeHtml(m.issueType.replace(/_/g,' '))}</div>
            <div style="font-size:12px;color:var(--on-surface-variant);">Room ${escapeHtml(m.room?.roomNumber || '')} • ${escapeHtml(m.student?.name || 'Unknown')}</div>
            <div style="font-size:12px;margin-top:4px;">${escapeHtml(m.description)}</div>
            ${m.resolutionNote ? `<div style="font-size:11px;color:var(--primary-container);margin-top:4px;">✓ ${escapeHtml(m.resolutionNote)}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0;">
            ${m.status !== 'resolved' && m.status !== 'closed' ? `<button class="btn btn-sm btn-success resolveMaint" data-id="${m.id}">Resolve</button>` : ''}
            <span style="font-size:10px;color:var(--outline);">${formatDate(m.createdAt)}</span>
          </div>
        </div>
      </div>
    `;
  }

  function bindRoomHandlers() {
    document.getElementById('addRoomBtn')?.addEventListener('click', showAddRoomModal);
    app.querySelectorAll('.editRoom').forEach(btn => btn.onclick = () => showEditRoomModal(btn.dataset.id));
    app.querySelectorAll('.deleteRoom').forEach(btn => {
      btn.onclick = () => showModal('Delete Room', 'Permanently delete this room?', async () => {
        await deleteRoom(btn.dataset.id);
        showToast('Room deleted', 'success');
        render();
      }, 'Delete', 'btn-danger');
    });
    app.querySelectorAll('.allocateRoom').forEach(btn => btn.onclick = () => showAllocateModal(btn.dataset.id));
    app.querySelectorAll('.vacateRoom').forEach(btn => btn.onclick = () => showVacateModal(btn.dataset.id));

    document.querySelectorAll('#adminBlockTabs .filter-tab').forEach(tab => {
      tab.onclick = async () => {
        document.querySelectorAll('#adminBlockTabs .filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const allRooms = await getRooms();
        const allAllocs = await getRoomAllocations();
        const filtered = tab.dataset.block === 'all' ? allRooms : allRooms.filter(r => r.blockName === tab.dataset.block);
        document.getElementById('adminRoomsList').innerHTML = filtered.map(room => renderAdminRoomCard(room, allAllocs.filter(a => a.roomId === room.id && a.isCurrent))).join('');
        bindRoomHandlers();
      };
    });

    document.querySelectorAll('#maintFilter .filter-tab').forEach(tab => {
      tab.onclick = async () => {
        document.querySelectorAll('#maintFilter .filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const allMaint = await getMaintenanceRequests();
        let filtered = allMaint;
        if (tab.dataset.mfilter === 'pending') filtered = allMaint.filter(m => m.status === 'pending' || m.status === 'acknowledged');
        if (tab.dataset.mfilter === 'resolved') filtered = allMaint.filter(m => m.status === 'resolved' || m.status === 'closed');
        document.getElementById('maintenanceList').innerHTML = filtered.map(m => renderMaintenanceCard(m)).join('');
        bindMaintenanceHandlers();
      };
    });
  }

  function bindMaintenanceHandlers() {
    app.querySelectorAll('.resolveMaint').forEach(btn => {
      btn.onclick = () => showResolveModal(btn.dataset.id);
    });
  }

  function showAddRoomModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">Add Room</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Block Name</label>
            <select class="form-input" id="rBlock">
              <option value="A">Block A</option>
              <option value="B">Block B</option>
              <option value="C">Block C</option>
              <option value="D">Block D</option>
              <option value="E">Block E</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Floor</label>
            <select class="form-input" id="rFloor">
              ${[1,2,3,4,5,6].map(f => `<option value="${f}">Floor ${f}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Room Number</label>
            <input class="form-input" id="rNumber" placeholder="e.g. 101">
          </div>
          <div class="form-group">
            <label class="form-label">Capacity (1-8)</label>
            <select class="form-input" id="rCapacity">
              ${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}"${n===2?' selected':''}>${n} Member${n>1?'s':''}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Gender</label>
            <select class="form-input" id="rGender">
              <option value="Boys">Boys</option>
              <option value="Girls">Girls</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="modalConfirm">Add Room</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const block = document.getElementById('rBlock').value;
      const number = document.getElementById('rNumber').value.trim();
      if (!number) { showToast('Room number required', 'warning'); return; }
      try {
        await createRoom({
          blockName: block,
          floor: parseInt(document.getElementById('rFloor').value),
          roomNumber: number,
          capacity: parseInt(document.getElementById('rCapacity').value),
          roomType: parseInt(document.getElementById('rCapacity').value) === 1 ? 'single' : 'shared',
          genderType: document.getElementById('rGender').value,
        });
        showToast('Room created!', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message, 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
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
            <input class="form-input" id="allocRegNo" placeholder="e.g. 412322244001" maxlength="12">
          </div>
          <div id="allocStudentPreview" style="font-size:12px;color:var(--on-surface-variant);margin-top:4px;"></div>
          <input type="hidden" id="allocStudentId" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="modalConfirm">Allocate</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);

    const regInput = backdrop.querySelector('#allocRegNo');
    let lookupTimeout;
    regInput.addEventListener('input', () => {
      clearTimeout(lookupTimeout);
      const regNo = regInput.value.trim();
      document.getElementById('allocStudentPreview').textContent = '';
      document.getElementById('allocStudentId').value = '';
      if (regNo.length < 10) return;
      lookupTimeout = setTimeout(async () => {
        try {
          const { getUserByRegNo } = await import('../../store.js');
          const s = await getUserByRegNo(regNo);
          const preview = document.getElementById('allocStudentPreview');
          if (s) {
            preview.textContent = `Student: ${s.name} (${s.department || 'N/A'})`;
            preview.style.color = 'var(--status-success)';
            document.getElementById('allocStudentId').value = s.id;
          } else {
            preview.textContent = 'Student not found with this register number';
            preview.style.color = 'var(--error)';
          }
        } catch { /* silent */ }
      }, 300);
    });

    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const studentId = document.getElementById('allocStudentId').value;
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

  function showVacateModal(roomId) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">Vacate Room</div>
        <div class="modal-body">Remove all residents and mark room available?</div>
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

  async function showEditRoomModal(roomId) {
    const room = await getRoomById(roomId);
    if (!room) { showToast('Room not found', 'error'); return; }

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">Edit Room</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Status</label>
            <select class="form-input" id="editRoomStatus">
              <option value="available"${room.status==='available'?' selected':''}>Available</option>
              <option value="occupied"${room.status==='occupied'?' selected':''}>Occupied</option>
              <option value="maintenance"${room.status==='maintenance'?' selected':''}>Maintenance</option>
              <option value="unavailable"${room.status==='unavailable'?' selected':''}>Unavailable</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Capacity (1-8)</label>
            <select class="form-input" id="editRoomCapacity">
              ${[1,2,3,4,5,6,7,8].map(n => `<option value="${n}"${n===room.capacity?' selected':''}>${n} Member${n>1?'s':''}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="modalConfirm">Update</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const status = document.getElementById('editRoomStatus').value;
      const capacity = parseInt(document.getElementById('editRoomCapacity').value);
      try {
        await updateRoom(roomId, { status, capacity });
        showToast('Room updated', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message, 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  function showResolveModal(maintId) {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">Resolve Issue</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Resolution Note</label>
            <textarea class="form-input" id="resolveNote" rows="2" placeholder="Describe the resolution..."></textarea>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-success btn-sm" id="modalConfirm">Resolve</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const note = document.getElementById('resolveNote').value.trim();
      try {
        await updateMaintenanceStatus(maintId, 'resolved', { resolutionNote: note || 'Resolved' });
        showToast('Maintenance resolved', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message, 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  render();
}
