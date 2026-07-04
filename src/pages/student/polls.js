import { getCurrentUser } from '../../auth.js';
import { getPolls, getPollOptions, getPollResults, hasVoted, vote } from '../../store.js';
import { renderPageHeader, studentNav, showToast, escapeHtml, renderNotifBell, renderBackButton } from '../../helpers.js';

export default async function pollsPage(app) {
  const user = getCurrentUser();
  if (!user) return;

  async function render() {
    const allPolls = await getPolls();
    const activePolls = allPolls.filter(p => p.isActive);
    const pastPolls = allPolls.filter(p => !p.isActive);

    app.innerHTML = `
      <div class="page-container">
        <header class="stitch-header">
          <div class="stitch-left">
            ${renderBackButton()}
            <span class="stitch-brand">UCE IT</span>
            <span class="stitch-sub">Polls</span>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${renderNotifBell()}
            ${user.name ? `<span style="font-size:13px;color:var(--on-surface-variant)">${escapeHtml(user.name.split(' ')[0])}</span>` : ''}
          </div>
        </header>

        <div style="padding:16px;padding-bottom:80px;">
          <h2 style="margin:0 0 16px 0;font-size:20px;font-weight:600;">Polls & Voting</h2>

          ${activePolls.length > 0 ? `
            <h3 style="font-size:16px;margin:0 0 12px 0;color:var(--primary);">Active Polls</h3>
            <div id="activePolls">${await renderPolls(activePolls)}</div>
          ` : '<div class="card" style="padding:32px;text-align:center;color:var(--outline);"><span class="material-icons-outlined" style="font-size:40px;">poll</span><p>No active polls right now.</p></div>'}

          ${pastPolls.length > 0 ? `
            <h3 style="font-size:16px;margin:24px 0 12px 0;color:var(--outline);">Past Polls</h3>
            <div id="pastPolls">${await renderPolls(pastPolls, true)}</div>
          ` : ''}
        </div>

        ${studentNav('updates')}
      </div>
    `;

    attachHandlers();
  }

  async function renderPolls(polls, readOnly) {
    if (!polls.length) return '';

    const results = [];
    for (const poll of polls) {
      const options = await getPollOptions(poll.id);
      const voteStatus = await hasVoted(poll.id, user.id);
      let pollResults = null;
      if (readOnly || voteStatus.voted) {
        pollResults = await getPollResults(poll.id);
      }
      results.push({ poll, options, voteStatus, pollResults });
    }

    return results.map(({ poll, options, voteStatus, pollResults }) => {
      const totalVotes = pollResults ? pollResults.reduce((s, r) => s + r.votes, 0) : 0;

      return `
        <div class="card card-elevated" style="margin-bottom:12px;" data-poll-id="${poll.id}">
          <h3 style="margin:0 0 4px 0;font-size:16px;">${escapeHtml(poll.title)}</h3>
          ${poll.description ? `<p style="margin:0 0 12px 0;font-size:13px;color:var(--on-surface-variant);">${escapeHtml(poll.description)}</p>` : ''}

          <div class="poll-options">
            ${options.map(opt => {
              if (voteStatus.voted || readOnly) {
                const r = pollResults ? pollResults.find(r => r.id === opt.id) : null;
                const pct = r ? r.percentage : 0;
                const votesCount = r ? r.votes : 0;
                const isSelected = voteStatus.optionId === opt.id;
                return `
                  <div class="poll-option-result ${isSelected ? 'poll-option-voted' : ''}" style="margin-bottom:8px;padding:8px 12px;border-radius:8px;background:var(--surface-variant);position:relative;overflow:hidden;">
                    <div class="poll-option-bar" style="position:absolute;top:0;left:0;height:100%;width:${pct}%;background:${isSelected ? 'rgba(26,86,219,0.2)' : 'rgba(148,163,184,0.15)'};border-radius:8px;transition:width 0.3s;"></div>
                    <div style="position:relative;display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:14px;font-weight:${isSelected ? '600' : '400'};">${escapeHtml(opt.option_text)}</span>
                      <span style="font-size:13px;font-weight:600;color:var(--primary);">${pct}% (${votesCount})</span>
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

          ${totalVotes > 0 ? `<div style="font-size:11px;color:var(--outline);margin-top:6px;">${totalVotes} vote${totalVotes !== 1 ? 's' : ''}</div>` : ''}

          ${!voteStatus.voted && !readOnly ? `
            <button class="btn btn-primary btn-sm btn-block poll-vote-btn" data-poll-id="${poll.id}" style="margin-top:8px;">Vote</button>
          ` : `
            <div style="font-size:11px;color:var(--outline);margin-top:8px;">
              ${voteStatus.voted ? `<span style="color:var(--primary);"><span class="material-icons-outlined" style="font-size:14px;vertical-align:text-bottom;">check_circle</span> You voted</span>` : 'Closed'}
            </div>
          `}
        </div>
      `;
    }).join('');
  }

  function attachHandlers() {
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
  }

  render();
}
