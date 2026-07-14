import { getCurrentUser } from '../../auth.js';
import { getUsers, deleteUser, approveUser } from '../../store.js';
import { adminNav, statusChip, getInitials, showToast, showModal, renderPageHeader, renderAvatar, escapeHtml } from '../../helpers.js';
import { supabase } from '../../supabase.js';

export default async function userManagement(app) {
  const user = getCurrentUser();
  if (!user) return;

  let search = '';
  let roleFilter = 'All';
  let activeTab = 'all';

  await render();

  async function render() {
    let users = await getUsers();

    if (roleFilter !== 'All') {
      users = users.filter(u => u.role === roleFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      users = users.filter(u =>
        u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }

    const pendingUsers = users.filter(u => !u.isApproved);
    const displayUsers = activeTab === 'pending' ? pendingUsers : users;

    const roleLabel = (role) => ({
      student: 'Student',
      boys_caretaker: 'Boys Caretaker',
      girls_caretaker: 'Girls Caretaker',
      security: 'Gate Security',
      admin: 'Admin',
    }[role] || role);

    app.innerHTML = `
      ${renderPageHeader('User Management', 'Manage student and staff profiles')}
      <div class="page">
        <div class="filter-tabs" id="userTabs" style="margin-bottom:var(--space-md);">
          <button class="filter-tab ${activeTab === 'all' ? 'active' : ''}" data-tab="all">
            All Users (${users.length})
          </button>
          <button class="filter-tab ${activeTab === 'pending' ? 'active' : ''}" data-tab="pending">
            Pending Approval ${pendingUsers.length > 0 ? `(${pendingUsers.length})` : ''}
          </button>
        </div>

        ${activeTab === 'pending' && pendingUsers.length > 0 ? `
          <div style="background:var(--status-warning-bg);padding:12px 16px;border-radius:var(--radius-md);margin-bottom:var(--space-md);display:flex;align-items:center;gap:8px;">
            <span class="material-icons-outlined" style="color:var(--status-warning);">pending_actions</span>
            <span style="font-size:13px;color:var(--status-warning-text);">
              ${pendingUsers.length} user(s) awaiting approval. Review their details and approve to grant access.
            </span>
          </div>
        ` : activeTab === 'pending' ? `
          <div class="empty-state" style="padding:32px;">
            <span class="material-icons-outlined" style="font-size:48px;color:var(--status-success);">check_circle</span>
            <div class="empty-state-title">No pending approvals</div>
            <div class="empty-state-desc">All users have been approved.</div>
          </div>
        ` : ''}

        <div style="position:relative;margin-bottom:var(--space-md);">
          <span class="material-icons-outlined" style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-size:20px;color:var(--outline);">search</span>
          <input class="form-input" type="text" id="userSearch" placeholder="Search users..." style="padding-left:40px;" value="${search}" />
        </div>

        <div class="filter-tabs" id="roleFilters" style="margin-bottom:var(--space-md);">
          ${['All', 'student', 'boys_caretaker', 'girls_caretaker', 'security', 'admin'].map(r => `
            <button class="filter-tab ${roleFilter === r ? 'active' : ''}" data-role="${r}">
              ${r === 'All' ? 'All' : roleLabel(r)}
            </button>
          `).join('')}
        </div>

        <div class="label-md text-muted" style="margin-bottom:var(--space-sm);">${displayUsers.length} users found</div>

        <div style="display:flex;flex-direction:column;gap:var(--space-sm);" class="stagger">
          ${displayUsers.map(u => `
            <div class="user-card animate-fade-in-up">
              ${renderAvatar(u, 'user-card-avatar')}
              <div class="user-card-info">
                <div class="user-card-name">${escapeHtml(u.name)} ${!u.isApproved ? '<span class="chip chip-pending" style="font-size:10px;padding:2px 8px;">Pending</span>' : ''}</div>
                <div class="user-card-id">${u.registrationNo ? `Reg No: ${escapeHtml(u.registrationNo)}` : `ID: ${escapeHtml(u.id)}`}</div>
                <div style="margin-top:4px;">
                  <span class="chip chip-info" style="font-size:10px;padding:2px 8px;">${roleLabel(u.role)}</span>
                  ${u.hostelType ? `<span class="chip chip-neutral" style="font-size:10px;padding:2px 8px;">${u.hostelType}</span>` : ''}
                </div>
              </div>
              <div class="user-card-actions" style="display:flex;gap:4px;flex-direction:column;">
                ${!u.isApproved ? `
                  <button class="btn btn-success btn-sm" style="font-size:11px;padding:4px 8px;min-height:28px;" data-approve="${u.id}" title="Approve user">
                    <span class="material-icons-outlined" style="font-size:14px;">check</span> Approve
                  </button>
                ` : ''}
                ${u.id !== user.id ? `
                  <button class="btn btn-icon btn-ghost" style="width:36px;height:36px;" data-reset-pw="${u.id}" title="Reset password">
                    <span class="material-icons-outlined" style="font-size:18px;color:var(--primary);">lock_reset</span>
                  </button>
                  <button class="btn btn-icon btn-ghost" style="width:36px;height:36px;" data-delete="${u.id}" title="Delete user">
                    <span class="material-icons-outlined" style="font-size:18px;color:var(--error);">delete</span>
                  </button>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      ${adminNav('users')}
    `;

    document.getElementById('userSearch')?.addEventListener('input', async (e) => {
      search = e.target.value; await render();
      const input = document.getElementById('userSearch');
      if (input) {
        input.focus();
        input.setSelectionRange(input.value.length, input.value.length);
      }
    });

    document.querySelectorAll('[data-role]').forEach(tab => {
      tab.addEventListener('click', async () => { roleFilter = tab.dataset.role; await render(); });
    });

    document.querySelectorAll('[data-tab]').forEach(tab => {
      tab.addEventListener('click', async () => { activeTab = tab.dataset.tab; await render(); });
    });

    document.querySelectorAll('[data-approve]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const targetUser = displayUsers.find(u => u.id === btn.dataset.approve);
        if (!targetUser) return;
        showModal(
          'Approve User',
          `Approve <strong>${targetUser.name}</strong>? They will be able to log in immediately after approval.`,
          async () => {
            try {
              await approveUser(btn.dataset.approve);
              showToast(`${targetUser.name} approved successfully`, 'success');
              await render();
            } catch (err) {
              showToast('Failed to approve user: ' + err.message, 'error');
            }
          },
          'Approve',
          'btn-success'
        );
      });
    });

    document.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetUser = displayUsers.find(u => u.id === btn.dataset.delete);
        showModal(
          'Confirm Deletion',
          `Are you sure you want to delete <strong>${targetUser?.name}</strong>? This action is permanent and will remove all associated records from the hostel database.`,
          async () => {
            await deleteUser(btn.dataset.delete);
            showToast('User deleted', 'info');
            await render();
          },
          'Delete',
          'btn-danger'
        );
      });
    });

    document.querySelectorAll('[data-reset-pw]').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetUser = displayUsers.find(u => u.id === btn.dataset.resetPw);
        if (!targetUser) return;
        const existing = document.querySelector('#resetPwModal');
        if (existing) existing.remove();
        const modal = document.createElement('div');
        modal.id = 'resetPwModal';
        modal.className = 'modal-backdrop';
        modal.innerHTML = `
          <div class="modal">
            <div class="modal-header">
              <h3>Reset Password</h3>
              <button class="btn btn-icon btn-ghost modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="modal-body">
              <p>Set a new password for <strong>${escapeHtml(targetUser.name)}</strong> (${escapeHtml(targetUser.email)})</p>
              <input class="form-input" type="text" id="newPasswordInput" placeholder="Enter new password" autocomplete="new-password" style="margin-top:var(--space-sm);" />
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost modal-close">Cancel</button>
              <button class="btn btn-primary" id="confirmResetPw">Reset Password</button>
            </div>
          </div>
        `;
        document.body.appendChild(modal);
        setTimeout(() => modal.classList.add('visible'), 10);
        const close = () => { modal.classList.remove('visible'); setTimeout(() => modal.remove(), 200); };
        modal.querySelectorAll('.modal-close').forEach(el => el.addEventListener('click', close));
        modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
        document.getElementById('confirmResetPw').addEventListener('click', async () => {
          const pw = document.getElementById('newPasswordInput').value.trim();
          if (!pw || pw.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
          document.getElementById('confirmResetPw').disabled = true;
          try {
            await supabase.rpc('admin_reset_password', { user_id: targetUser.id, new_password: pw });
            showToast(`Password reset for ${targetUser.name}`, 'success');
            close();
          } catch (err) {
            showToast('Failed to reset password: ' + err.message, 'error');
            document.getElementById('confirmResetPw').disabled = false;
          }
        });
      });
    });
  }
}
