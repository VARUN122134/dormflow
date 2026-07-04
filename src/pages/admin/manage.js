import { getCurrentUser } from '../../auth.js';
import { getAnnouncements, createAnnouncement, deleteAnnouncement, getPolls, createPoll, deletePoll, getPollOptions, getPollResults, getMessMembers } from '../../store.js';
import { adminNav, showToast, escapeHtml, formatDate, showModal, renderNotifBell, renderAvatar } from '../../helpers.js';

export default async function adminManage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const announcements = await getAnnouncements();
    const polls = await getPolls();

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Management</span>
          </div>
          <div class="flex items-center gap-sm">
            ${renderNotifBell()}
            <a href="#/admin/profile" style="text-decoration:none;color:inherit;display:flex;align-items:center;gap:6px;">${renderAvatar(user, 'stitch-avatar-sm')}</a>
          </div>
        </header>

        <div class="page-content">
          <div class="flex gap-sm mb-md">
            <button class="btn btn-sm btn-primary" id="tabAnnouncements" style="flex:1;">Announcements</button>
            <button class="btn btn-sm btn-ghost" id="tabPolls" style="flex:1;">Polls</button>
          </div>

          <div id="tabContent">
            ${renderAnnouncementsTab(announcements)}
          </div>
        </div>

        ${adminNav('manage')}
      </div>
    `;

    document.getElementById('tabAnnouncements').onclick = () => {
      document.getElementById('tabAnnouncements').className = 'btn btn-sm btn-primary';
      document.getElementById('tabPolls').className = 'btn btn-sm btn-ghost';
      document.getElementById('tabContent').innerHTML = renderAnnouncementsTab(announcements);
      attachAnnouncementHandlers();
    };
    document.getElementById('tabPolls').onclick = () => {
      document.getElementById('tabPolls').className = 'btn btn-sm btn-primary';
      document.getElementById('tabAnnouncements').className = 'btn btn-sm btn-ghost';
      document.getElementById('tabContent').innerHTML = renderPollsTab(polls);
      attachPollHandlers();
    };

    attachAnnouncementHandlers();
  }

  function renderAnnouncementsTab(announcements) {
    const typeLabels = { announcement: 'Announcement', event: 'Event', news: 'News' };
    const typeColors = { announcement: 'chip-info', event: 'chip-pending', news: 'chip-success' };

    return `
      <div class="flex gap-sm mb-md">
        <button class="btn btn-primary btn-sm" id="newAnnouncementBtn" style="flex:1;">
          <span class="material-icons-outlined fs-16" style="vertical-align:text-bottom;">add</span> New
        </button>
      </div>
      ${announcements.length === 0 ? '<div class="card p-lg text-center c-outline">No announcements.</div>' : ''}
      ${announcements.map(a => `
        <div class="card mb-sm">
          <div class="flex justify-between" style="align-items:flex-start;">
            <div style="flex:1;">
              <div class="flex gap-sm items-center mb-xs">
                <span class="chip ${typeColors[a.type] || 'chip-neutral'}">${typeLabels[a.type] || a.type}</span>
                <span style="font-size:11px;color:var(--outline);">${formatDate(a.createdAt)}</span>
              </div>
              <h4 class="m-0 mb-xs" style="font-size:15px;">${escapeHtml(a.title)}</h4>
              <p class="m-0 fs-13 c-on-surface-variant">${escapeHtml(a.content)}</p>
            </div>
            <button class="btn btn-ghost btn-sm deleteAnnouncement" data-id="${a.id}" style="flex-shrink:0;color:var(--error);">
              <span class="material-icons-outlined" style="font-size:18px;">delete</span>
            </button>
          </div>
        </div>
      `).join('')}
    `;
  }

  function renderPollsTab(polls) {
    return `
      <div class="flex gap-sm mb-md">
        <button class="btn btn-primary btn-sm" id="newPollBtn" style="flex:1;">
          <span class="material-icons-outlined fs-16" style="vertical-align:text-bottom;">how_to_vote</span> New Poll
        </button>
      </div>
      ${polls.length === 0 ? '<div class="card p-lg text-center c-outline">No polls created.</div>' : ''}
      ${polls.map(p => `
        <div class="card mb-sm">
          <div class="flex justify-between" style="align-items:flex-start;">
            <div style="flex:1;">
              <div class="flex gap-sm items-center mb-xs">
                <span class="chip ${p.isActive ? 'chip-pending' : 'chip-neutral'}">${p.isActive ? 'Active' : 'Closed'}</span>
                <span style="font-size:11px;color:var(--outline);">${formatDate(p.createdAt)}</span>
              </div>
              <h4 class="m-0 mb-xs" style="font-size:15px;">${escapeHtml(p.title)}</h4>
              ${p.description ? `<p class="m-0 fs-13 c-on-surface-variant">${escapeHtml(p.description)}</p>` : ''}
            </div>
            <div class="flex flex-shrink-0" style="gap:4px;">
              <button class="btn btn-ghost btn-sm togglePollStatus" data-id="${p.id}" data-active="${p.isActive}" style="color:var(--primary);">
                <span class="material-icons-outlined" style="font-size:18px;">${p.isActive ? 'toggle_on' : 'toggle_off'}</span>
              </button>
              <button class="btn btn-ghost btn-sm deletePoll" data-id="${p.id}" style="color:var(--error);">
                <span class="material-icons-outlined" style="font-size:18px;">delete</span>
              </button>
            </div>
          </div>
        </div>
      `).join('')}
    `;
  }

  function attachAnnouncementHandlers() {
    document.getElementById('newAnnouncementBtn')?.addEventListener('click', () => showAnnouncementModal());
    app.querySelectorAll('.deleteAnnouncement').forEach(btn => {
      btn.onclick = () => {
        showModal('Delete', 'Delete this announcement?', async () => {
          await deleteAnnouncement(btn.dataset.id);
          showToast('Deleted', 'success');
          render();
        }, 'Delete', 'btn-danger');
      };
    });
  }

  function attachPollHandlers() {
    document.getElementById('newPollBtn')?.addEventListener('click', () => showPollModal());
    app.querySelectorAll('.deletePoll').forEach(btn => {
      btn.onclick = () => {
        showModal('Delete Poll', 'Delete this poll and all votes?', async () => {
          await deletePoll(btn.dataset.id);
          showToast('Poll deleted', 'success');
          render();
        }, 'Delete', 'btn-danger');
      };
    });
  }

  function showAnnouncementModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">New Announcement</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Type</label>
            <select class="form-input" id="annType">
              <option value="announcement">Announcement</option>
              <option value="event">Event</option>
              <option value="news">News</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Title</label>
            <input class="form-input" id="annTitle" placeholder="Title">
          </div>
          <div class="form-group">
            <label class="form-label">Content</label>
            <textarea class="form-input" id="annContent" rows="3" placeholder="Write your announcement..."></textarea>
          </div>
          <div class="form-group" id="eventDateGroup" style="display:none;">
            <label class="form-label">Event Date</label>
            <input type="date" class="form-input" id="annEventDate">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="modalConfirm">Publish</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    backdrop.querySelector('#annType').onchange = (e) => {
      document.getElementById('eventDateGroup').style.display = e.target.value === 'event' ? 'block' : 'none';
    };
    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const title = document.getElementById('annTitle').value.trim();
      const content = document.getElementById('annContent').value.trim();
      if (!title || !content) { showToast('Title and content required', 'warning'); return; }
      try {
        await createAnnouncement({
          title, content, authorId: user.id,
          type: document.getElementById('annType').value,
          eventDate: document.getElementById('annType').value === 'event' ? document.getElementById('annEventDate').value : null,
        });
        showToast('Announcement published!', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message || 'Failed', 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  function showPollModal() {
    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.innerHTML = `
      <div class="modal">
        <div class="modal-title">New Poll</div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Title</label>
            <input class="form-input" id="pollTitle" placeholder="Poll question">
          </div>
          <div class="form-group">
            <label class="form-label">Description (optional)</label>
            <textarea class="form-input" id="pollDesc" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">Options</label>
            <div id="pollOptions">
              <input class="form-input" style="margin-bottom:6px;" placeholder="Option 1">
              <input class="form-input" style="margin-bottom:6px;" placeholder="Option 2">
            </div>
            <button class="btn btn-ghost btn-sm" id="addOptionBtn"><span class="material-icons-outlined" style="font-size:16px;">add</span> Add option</button>
          </div>
          <div class="form-group">
            <label class="form-label">Expires at (optional)</label>
            <input type="datetime-local" class="form-input" id="pollExpires">
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary btn-sm" id="modalCancel">Cancel</button>
          <button class="btn btn-primary btn-sm" id="modalConfirm">Create Poll</button>
        </div>
      </div>
    `;
    document.body.appendChild(backdrop);
    let optCount = 2;
    document.getElementById('addOptionBtn').onclick = () => {
      optCount++;
      const inp = document.createElement('input');
      inp.className = 'form-input';
      inp.style.marginBottom = '6px';
      inp.placeholder = `Option ${optCount}`;
      document.getElementById('pollOptions').appendChild(inp);
    };
    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const title = document.getElementById('pollTitle').value.trim();
      if (!title) { showToast('Title required', 'warning'); return; }
      const inputs = document.getElementById('pollOptions').querySelectorAll('input');
      const options = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
      if (options.length < 2) { showToast('At least 2 options', 'warning'); return; }
      try {
        await createPoll({
          title,
          description: document.getElementById('pollDesc').value.trim(),
          authorId: user.id,
          options,
          expiresAt: document.getElementById('pollExpires').value || null,
        });
        showToast('Poll created!', 'success');
        backdrop.remove();
        render();
      } catch (e) { showToast(e.message || 'Failed', 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  render();
}
