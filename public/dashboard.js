let dashboardData = null;
let rosterState = { search: '', team: '', pos: '', sort: 'ovr' };
let leaderCat = 'passing';

const LEADER_CATS = {
  passing: { label: 'PASSING', primary: 'passYds', sub: (p) => `${p.passTDs} TD · ${p.passInts} INT` },
  rushing: { label: 'RUSHING', primary: 'rushYds', sub: (p) => `${p.rushTDs} TD · ${p.rushAtt} ATT` },
  receiving: { label: 'RECEIVING', primary: 'recYds', sub: (p) => `${p.recTDs} TD · ${p.recCatches} REC` },
  tackles: { label: 'TACKLES', primary: 'defTotalTackles', sub: (p) => `${p.defSacks} SK · ${p.defForcedFum} FF` },
  sacks: { label: 'SACKS', primary: 'defSacks', sub: (p) => `${p.defTotalTackles} TKL` },
};

function myTeamName() {
  try { return localStorage.getItem('snapcount-my-team') || ''; } catch (e) { return ''; }
}
function setMyTeamName(name) {
  try { localStorage.setItem('snapcount-my-team', name); } catch (e) {}
}

function teamColor(teamName) {
  const c = dashboardData.teamColors[teamName];
  return c ? c.primary : '#555';
}

async function loadDashboard() {
  const statusEl = document.getElementById('syncStatus');
  statusEl.textContent = 'Loading…';
  try {
    const res = await fetch('/api/dashboard-data');
    if (!res.ok) throw new Error('bad response');
    dashboardData = await res.json();
    render();
  } catch (err) {
    statusEl.textContent = 'Failed to load data.';
    console.error(err);
  }
}

function render() {
  const d = dashboardData;
  const statusEl = document.getElementById('syncStatus');
  statusEl.textContent = d.meta.lastSynced
    ? 'LAST SYNCED ' + new Date(d.meta.lastSynced).toLocaleString()
    : 'No exports received yet';

  renderMyTeam(d);
  renderStandings(d);
  renderLeaderTabs(d);
  renderLeaders(d);
  populateRosterFilters(d);
  renderRoster(d);
  populateTeamPicker(d);
  loadHistory();
}

function renderMyTeam(d) {
  const el = document.getElementById('myTeamStrip');
  const my = myTeamName();
  const t = d.standings.find((s) => s.team === my);
  if (!t) {
    el.innerHTML = d.standings.length
      ? '<div class="empty">Pick your team on the Trend tab to see it here.</div>'
      : '<div class="empty">No standings received yet — waiting on the Madden Companion App.</div>';
    return;
  }
  const color = teamColor(t.team);
  el.innerHTML = `
    <div class="myteam-badge" style="background:${color}">${t.abbr || t.team.slice(0, 3).toUpperCase()}</div>
    <div>
      <div class="myteam-name">${t.city} ${t.team}</div>
      <div class="myteam-record">${t.wins}-${t.losses}${t.ties ? '-' + t.ties : ''} · ${t.div} ${t.seed ? '· Seed ' + t.seed : ''}</div>
    </div>
    <div class="myteam-stats">
      <div class="mini-stat"><div class="v">${t.ovr}</div><div class="l">Team OVR</div></div>
      <div class="mini-stat"><div class="v">${t.ptsFor}</div><div class="l">Pts For</div></div>
      <div class="mini-stat"><div class="v">${t.ptsAgainst}</div><div class="l">Pts Against</div></div>
      <div class="mini-stat"><div class="v ${(t.streak || '')[0] === 'W' ? 'streak-w' : 'streak-l'}">${t.streak || '—'}</div><div class="l">Streak</div></div>
    </div>
  `;
}

function renderStandings(d) {
  const el = document.getElementById('view-standings');
  if (!d.standings.length) {
    el.innerHTML = '<p class="empty">No standings export received yet. Point the Madden Companion App at this server\'s export URL.</p>';
    return;
  }
  const divs = {};
  d.standings.forEach((t) => {
    const key = t.conf + ' ' + t.div;
    (divs[key] = divs[key] || []).push(t);
  });
  let html = '';
  Object.keys(divs).sort().forEach((divName) => {
    const teams = divs[divName].sort((a, b) => b.winPct - a.winPct || (b.ptsFor - b.ptsAgainst) - (a.ptsFor - a.ptsAgainst));
    html += `<div class="div-group"><div class="div-label">${divName || 'Division'}</div>
    <div class="standings-table"><table>
      <tr><th>Team</th><th>W</th><th>L</th><th>T</th><th>PF</th><th>PA</th><th>OVR</th><th>STRK</th></tr>`;
    teams.forEach((t) => {
      html += `<tr class="team-row ${t.team === myTeamName() ? 'mine' : ''}">
        <td><div class="team-cell"><span class="dot" style="background:${teamColor(t.team)}"></span><span class="team-name">${t.city} ${t.team}</span></div></td>
        <td>${t.wins}</td><td>${t.losses}</td><td>${t.ties}</td>
        <td>${t.ptsFor}</td><td>${t.ptsAgainst}</td><td>${t.ovr}</td>
        <td class="${(t.streak || '')[0] === 'W' ? 'streak-w' : 'streak-l'}">${t.streak || '—'}</td>
      </tr>`;
    });
    html += `</table></div></div>`;
  });
  el.innerHTML = html;
}

function renderLeaderTabs() {
  const el = document.getElementById('leaderTabs');
  el.innerHTML = Object.keys(LEADER_CATS)
    .map((k) => `<div class="leader-tab ${k === leaderCat ? 'active' : ''}" data-cat="${k}">${LEADER_CATS[k].label}</div>`)
    .join('');
  el.querySelectorAll('.leader-tab').forEach((t) => {
    t.onclick = () => { leaderCat = t.dataset.cat; renderLeaderTabs(); renderLeaders(dashboardData); };
  });
}

function renderLeaders(d) {
  const cat = LEADER_CATS[leaderCat];
  const list = d.leaders[leaderCat] || [];
  const el = document.getElementById('leaderList');
  if (!list.length) {
    el.innerHTML = '<div class="empty">No weekly stat export received yet for this category.</div>';
    return;
  }
  el.innerHTML = list
    .map(
      (p, i) => `
    <div class="leader-row">
      <div class="leader-rank">${i + 1}</div>
      <div class="leader-name">${p.name}<span class="leader-team">${p.pos} · ${p.team}</span></div>
      <div class="leader-sub">${cat.sub(p)}</div>
      <div class="leader-val">${p[cat.primary]}</div>
    </div>`
    )
    .join('');
}

function populateRosterFilters(d) {
  const teamSel = document.getElementById('rosterTeamFilter');
  const posSel = document.getElementById('rosterPosFilter');
  if (teamSel.dataset.filled === String(d.roster.length)) return;
  teamSel.innerHTML = '<option value="">All teams</option>';
  posSel.innerHTML = '<option value="">All positions</option>';
  const teams = [...new Set(d.roster.map((p) => p.team))].sort();
  const positions = [...new Set(d.roster.map((p) => p.pos))].sort();
  teamSel.innerHTML += teams.map((t) => `<option value="${t}">${t}</option>`).join('');
  posSel.innerHTML += positions.map((p) => `<option value="${p}">${p}</option>`).join('');
  teamSel.dataset.filled = String(d.roster.length);
  ['rosterSearch', 'rosterTeamFilter', 'rosterPosFilter', 'rosterSort'].forEach((id) => {
    document.getElementById(id).addEventListener('input', () => {
      rosterState.search = document.getElementById('rosterSearch').value.toLowerCase();
      rosterState.team = document.getElementById('rosterTeamFilter').value;
      rosterState.pos = document.getElementById('rosterPosFilter').value;
      rosterState.sort = document.getElementById('rosterSort').value;
      renderRoster(dashboardData);
    });
  });
}

function renderRoster(d) {
  let list = d.roster.filter((p) => {
    if (rosterState.search && !p.name.toLowerCase().includes(rosterState.search)) return false;
    if (rosterState.team && p.team !== rosterState.team) return false;
    if (rosterState.pos && p.pos !== rosterState.pos) return false;
    return true;
  });
  if (rosterState.sort === 'ovr') list.sort((a, b) => b.ovr - a.ovr);
  else if (rosterState.sort === 'name') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (rosterState.sort === 'age') list.sort((a, b) => a.age - b.age);
  list = list.slice(0, 150);

  const devClass = { 'X-Factor': 'dev-xf', Superstar: 'dev-ss', Star: 'dev-star' };
  const el = document.getElementById('rosterList');
  if (!d.roster.length) {
    el.innerHTML = '<div class="empty">No roster export received yet.</div>';
    return;
  }
  if (!list.length) {
    el.innerHTML = '<div class="empty">No players match.</div>';
    return;
  }
  el.innerHTML = list
    .map(
      (p) => `
    <div class="roster-row">
      <div>${p.name} <span class="pos-tag">${p.team}</span></div>
      <div class="pos-tag">${p.pos}</div>
      <div>${p.age}</div>
      <div class="ovr-val">${p.ovr}</div>
      <div class="dev-tag ${devClass[p.dev] || ''}">${p.dev !== 'Normal' ? p.dev : ''}</div>
      <div class="injury-flag">${p.injured ? 'OUT ' + (p.injWeeks ? p.injWeeks + 'W' : '') : ''}</div>
    </div>`
    )
    .join('');
}

function populateTeamPicker(d) {
  const sel = document.getElementById('myTeamSelect');
  if (sel.dataset.filled === String(d.standings.length) && d.standings.length) return;
  const current = myTeamName();
  sel.innerHTML =
    '<option value="">Choose your team…</option>' +
    d.standings.map((t) => `<option value="${t.team}" ${t.team === current ? 'selected' : ''}>${t.city} ${t.team}</option>`).join('');
  sel.dataset.filled = String(d.standings.length);
  sel.onchange = () => {
    setMyTeamName(sel.value);
    renderMyTeam(dashboardData);
    renderStandings(dashboardData);
    loadHistory();
  };
}

async function loadHistory() {
  const el = document.getElementById('historyList');
  const my = myTeamName();
  if (!my) {
    el.className = 'empty';
    el.textContent = 'Pick your team above to see its record over time.';
    return;
  }
  try {
    const res = await fetch('/api/dashboard-history');
    const snapshots = await res.json();
    const rows = snapshots
      .map((snap) => {
        const t = (snap.standings || []).find((s) => s.team === my);
        if (!t) return null;
        return { at: snap.received_at, wins: t.wins, losses: t.losses, ovr: t.ovr };
      })
      .filter(Boolean);
    if (!rows.length) {
      el.className = 'empty';
      el.textContent = 'No history yet for this team — check back after the next export.';
      return;
    }
    el.className = '';
    el.innerHTML = rows
      .map(
        (r) => `<div class="leader-row"><div class="leader-name">${new Date(r.at).toLocaleString()}</div>
      <div class="leader-sub">${r.wins}-${r.losses} · OVR ${r.ovr}</div></div>`
      )
      .join('');
  } catch (err) {
    el.className = 'empty';
    el.textContent = 'Failed to load history.';
  }
}

document.querySelectorAll('.tab').forEach((tab) => {
  tab.onclick = () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.view').forEach((v) => v.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('view-' + tab.dataset.view).classList.add('active');
  };
});

document.getElementById('refreshBtn').addEventListener('click', loadDashboard);

renderLeaderTabs();
loadDashboard();
