import { getCurrentUser } from '../../auth.js';
import { getAnnouncements, createAnnouncement, deleteAnnouncement, getPolls, createPoll, deletePoll, getPollOptions, getPollResults, hasVoted } from '../../store.js';
import { wardenNav, showToast, escapeHtml, formatDate, showModal, renderNotifBell, renderBackButton, renderLogoutIcon } from '../../helpers.js';

export default async function wardenAnnouncements(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const announcements = await getAnnouncements();
    const polls = await getPolls();

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            ${renderBackButton()}
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Manage Announcements</span>
          </div>
          <div class="flex items-center gap-sm">
            ${renderLogoutIcon()}
            ${renderNotifBell()}
            <span class="fs-13 c-on-surface-variant">${escapeHtml(user.name?.split(' ')[0] || '')}</span>
          </div>
        </header>

        <div class="page-content">
          <div class="flex gap-sm mb-md">
            <button class="btn btn-primary btn-sm" id="newAnnouncementBtn" style="flex:1;">
              <span class="material-icons-outlined" style="font-size:16px;vertical-align:text-bottom;">add</span> New Announcement
            </button>
            <button class="btn btn-secondary btn-sm" id="newPollBtn" style="flex:1;">
              <span class="material-icons-outlined" style="font-size:16px;vertical-align:text-bottom;">how_to_vote</span> New Poll
            </button>
          </div>

          <h3 class="fs-16 m-0 mb-md">Announcements</h3>
          <div id="announcementsList">
            ${announcements.length === 0 ? '<div class="card p-lg text-center c-outline">No announcements yet.</div>' : ''}
            ${announcements.map(a => {
              const typeLabels = { announcement: 'Announcement', event: 'Event', news: 'News' };
              const typeColors = { announcement: 'chip-info', event: 'chip-pending', news: 'chip-success' };
              return `
                <div class="card mb-sm">
                  <div class="flex justify-between items-start">
                    <div style="flex:1;">
                      <div class="flex gap-xs items-center mb-xs">
                        <span class="chip ${typeColors[a.type] || 'chip-neutral'}">${typeLabels[a.type] || a.type}</span>
                        <span class="fs-12 c-outline">${formatDate(a.createdAt)}</span>
                      </div>
                      <h4 class="m-0 mb-xs fs-16">${escapeHtml(a.title)}</h4>
                      <p class="m-0 fs-13 c-on-surface-variant">${escapeHtml(a.content)}</p>
                    </div>
                    <button class="btn btn-ghost btn-sm deleteAnnouncement" data-id="${a.id}" style="flex-shrink:0;color:var(--error);">
                      <span class="material-icons-outlined" style="font-size:18px;">delete</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <h3 class="fs-16 mt-lg mb-md">Polls</h3>
          <div id="pollsList">
            ${polls.length === 0 ? '<div class="card p-lg text-center c-outline">No polls created yet.</div>' : ''}
            ${polls.map(p => `
              <div class="card mb-sm">
                <div class="flex justify-between items-start">
                  <div style="flex:1;">
                    <div class="flex gap-xs items-center mb-xs">
                      <span class="chip ${p.isActive ? 'chip-pending' : 'chip-neutral'}">${p.isActive ? 'Active' : 'Closed'}</span>
                      <span class="fs-12 c-outline">${formatDate(p.createdAt)}</span>
                    </div>
                    <h4 class="m-0 mb-xs fs-16">${escapeHtml(p.title)}</h4>
                    ${p.description ? `<p class="m-0 fs-13 c-on-surface-variant">${escapeHtml(p.description)}</p>` : ''}
                  </div>
                  <button class="btn btn-ghost btn-sm deletePoll" data-id="${p.id}" style="flex-shrink:0;color:var(--error);">
                    <span class="material-icons-outlined" style="font-size:18px;">delete</span>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        ${wardenNav('announce')}
      </div>
    `;

    // New announcement modal
    document.getElementById('newAnnouncementBtn').onclick = () => showAnnouncementModal();
    document.getElementById('newPollBtn').onclick = () => showPollModal();

    // Delete handlers
    app.querySelectorAll('.deleteAnnouncement').forEach(btn => {
      btn.onclick = () => {
        showModal('Delete Announcement', 'Are you sure?', async () => {
          await deleteAnnouncement(btn.dataset.id);
          showToast('Announcement deleted', 'success');
          render();
        }, 'Delete', 'btn-danger');
      };
    });

    app.querySelectorAll('.deletePoll').forEach(btn => {
      btn.onclick = () => {
        showModal('Delete Poll', 'Are you sure? All votes will be removed.', async () => {
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
      } catch (e) { showToast(e.message || 'Failed to publish', 'error'); }
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
            <textarea class="form-input" id="pollDesc" rows="2" placeholder="Additional details..."></textarea>
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

    // Add option button
    let optCount = 2;
    document.getElementById('addOptionBtn').onclick = () => {
      optCount++;
      const div = document.createElement('input');
      div.className = 'form-input';
      div.style.marginBottom = '6px';
      div.placeholder = `Option ${optCount}`;
      document.getElementById('pollOptions').appendChild(div);
    };

    backdrop.querySelector('#modalCancel').onclick = () => backdrop.remove();
    backdrop.querySelector('#modalConfirm').onclick = async () => {
      const title = document.getElementById('pollTitle').value.trim();
      if (!title) { showToast('Poll title required', 'warning'); return; }
      const inputs = document.getElementById('pollOptions').querySelectorAll('input');
      const options = Array.from(inputs).map(i => i.value.trim()).filter(Boolean);
      if (options.length < 2) { showToast('At least 2 options required', 'warning'); return; }
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
      } catch (e) { showToast(e.message || 'Failed to create poll', 'error'); }
    };
    backdrop.onclick = (e) => { if (e.target === backdrop) backdrop.remove(); };
  }

  render();
}
