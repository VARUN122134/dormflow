import { getCurrentUser } from '../../auth.js';
import { getAnnouncements, getPolls, getPollOptions, hasVoted, vote } from '../../store.js';
import { renderPageHeader, studentNav, showToast, escapeHtml, formatDate } from '../../helpers.js';

export default async function announcementsPage(app) {
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
            <span class="stitch-sub">Updates</span>
          </div>
          <div class="stitch-right">${user.name ? `<span style="font-size:13px;color:var(--on-surface-variant)">${escapeHtml(user.name.split(' ')[0])}</span>` : ''}</div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:600;">Announcements</h2>

          <div id="filterTabs" style="display:flex;gap:6px;margin-bottom:16px;overflow-x:auto;">
            <button class="btn btn-sm btn-primary" data-filter="all">All</button>
            <button class="btn btn-sm btn-ghost" data-filter="announcement">Announcements</button>
            <button class="btn btn-sm btn-ghost" data-filter="event">Events</button>
            <button class="btn btn-sm btn-ghost" data-filter="news">News</button>
          </div>

          <div id="announcementsList">
            ${renderAnnouncementCards(announcements, 'all')}
          </div>

          ${polls.filter(p => p.isActive).length > 0 ? `
            <h2 style="margin:24px 0 16px 0;font-size:20px;font-weight:600;">Active Polls</h2>
            <div id="pollsList">
              ${await renderPollCards(polls.filter(p => p.isActive), user)}
            </div>
          ` : ''}

          ${polls.filter(p => !p.isActive).length > 0 ? `
            <h2 style="margin:24px 0 16px 0;font-size:20px;font-weight:600;">Past Polls</h2>
            <div id="pastPollsList">
              ${await renderPollCards(polls.filter(p => !p.isActive), user, true)}
            </div>
          ` : ''}
        </div>

        ${studentNav('updates')}
      </div>
    `;

    // Filter tabs
    const filterTabs = app.querySelectorAll('[data-filter]');
    filterTabs.forEach(tab => {
      tab.onclick = () => {
        filterTabs.forEach(t => { t.className = 'btn btn-sm btn-ghost'; });
        tab.className = 'btn btn-sm btn-primary';
        const el = document.getElementById('announcementsList');
        el.innerHTML = renderAnnouncementCards(announcements, tab.dataset.filter);
      };
    });

    // Attach poll vote handlers
    attachPollHandlers();
  }

  function renderAnnouncementCards(items, filter) {
    const filtered = filter === 'all' ? items : items.filter(a => a.type === filter);
    const typeLabels = { announcement: 'Announcement', event: 'Event', news: 'News' };
    const typeColors = { announcement: 'chip-info', event: 'chip-pending', news: 'chip-success' };

    if (!filtered.length) {
      return '<div class="card" style="padding:32px;text-align:center;color:var(--outline);">No items to show.</div>';
    }

    return filtered.map(a => `
      <div class="card announcement-card" style="margin-bottom:12px;cursor:pointer;" data-id="${a.id}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <span class="chip ${typeColors[a.type] || 'chip-neutral'}">${typeLabels[a.type] || a.type}</span>
          <span style="font-size:11px;color:var(--outline);">${formatDate(a.createdAt)}</span>
        </div>
        <h3 style="margin:0 0 6px 0;font-size:16px;">${escapeHtml(a.title)}</h3>
        <div class="announcement-preview" style="font-size:13px;color:var(--on-surface-variant);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
          ${escapeHtml(a.content)}
        </div>
        ${a.type === 'event' && a.eventDate ? `<div style="font-size:12px;color:var(--primary);margin-top:6px;"><span class="material-icons-outlined" style="font-size:14px;vertical-align:text-bottom;">event</span> ${formatDate(a.eventDate)}</div>` : ''}
      </div>
    `).join('');
  }

  async function renderPollCards(polls, user, readOnly) {
    if (!polls.length) return '<div class="card" style="padding:32px;text-align:center;color:var(--outline);">No polls available.</div>';

    const results = [];
    for (const poll of polls) {
      const options = await getPollOptions(poll.id);
      const voteStatus = await hasVoted(poll.id, user.id);
      results.push({ poll, options, voteStatus });
    }

    return results.map(({ poll, options, voteStatus }) => {
      const totalVotes = options.reduce((sum, o) => sum + (o.votes || 0), 0);
      return `
      <div class="card card-elevated" style="margin-bottom:12px;" data-poll-id="${poll.id}">
        <h3 style="margin:0 0 4px 0;font-size:16px;">${escapeHtml(poll.title)}</h3>
        ${poll.description ? `<p style="margin:0 0 12px 0;font-size:13px;color:var(--on-surface-variant);">${escapeHtml(poll.description)}</p>` : ''}

        <div class="poll-options">
          ${options.map(opt => {
            const pct = totalVotes > 0 ? Math.round((opt.votes || 0) / totalVotes * 100) : 0;
            if (voteStatus.voted || readOnly) {
              const isSelected = voteStatus.optionId === opt.id;
              return `
                <div class="poll-option-result ${isSelected ? 'poll-option-voted' : ''}" style="margin-bottom:8px;padding:8px 12px;border-radius:8px;background:var(--surface-variant);position:relative;overflow:hidden;">
                  <div class="poll-option-bar" style="position:absolute;top:0;left:0;height:100%;width:${pct}%;background:${isSelected ? 'rgba(26,86,219,0.2)' : 'rgba(148,163,184,0.15)'};border-radius:8px;transition:width 0.3s;"></div>
                  <div style="position:relative;display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:14px;font-weight:${isSelected ? '600' : '400'};">${escapeHtml(opt.option_text)}</span>
                    <span style="font-size:13px;font-weight:600;color:var(--primary);">${pct}%</span>
                  </div>
                </div>
              `;
            } else {
              return `
                <label class="poll-option" style="display:flex;align-items:center;gap:8px;padding:10px 12px;margin-bottom:6px;border:1px solid var(--surface-variant);border-radius:8px;cursor:pointer;">
                  <input type="radio" name="poll_${poll.id}" value="${opt.id}" style="accent-color:var(--primary);">
                  <span style="font-size:14px;">${escapeHtml(opt.option_text)}</span>
                </label>
              `;
            }
          }).join('')}
        </div>

        ${!voteStatus.voted && !readOnly ? `
          <button class="btn btn-primary btn-sm btn-block poll-vote-btn" data-poll-id="${poll.id}" style="margin-top:8px;">Vote</button>
        ` : `
          <div style="font-size:11px;color:var(--outline);margin-top:8px;">${voteStatus.voted ? 'You voted' : 'Closed'}</div>
        `}
      </div>
    `;
    }).join('');
  }

  function attachPollHandlers() {
    app.querySelectorAll('.poll-vote-btn').forEach(btn => {
      btn.onclick = async () => {
        const pollId = btn.dataset.pollId;
        const selected = app.querySelector(`input[name="poll_${pollId}"]:checked`);
        if (!selected) {
          showToast('Please select an option', 'warning');
          return;
        }
        try {
          await vote(pollId, selected.value, user.id);
          showToast('Vote submitted!', 'success');
          render();
        } catch (e) {
          showToast(e.message || 'Failed to vote', 'error');
        }
      };
    });

    // Expand announcement cards
    app.querySelectorAll('.announcement-card').forEach(card => {
      card.onclick = () => {
        const preview = card.querySelector('.announcement-preview');
        if (preview) {
          const isExpanded = preview.style.display === 'block';
          preview.style.display = isExpanded ? '-webkit-box' : 'block';
          preview.style.webkitLineClamp = isExpanded ? '2' : 'unset';
        }
      };
    });
  }

  render();
}
