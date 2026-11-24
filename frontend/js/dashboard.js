function barColor(score) {
  if (score >= 60) return 'var(--coral)';
  if (score >= 35) return 'var(--amber)';
  return 'var(--mint)';
}

function trendBadge(trend) {
  const labelMap = { improving: '↑ improving', declining: '↓ declining', stable: '→ stable' };
  return `<span class="trend-badge trend-${trend}">${labelMap[trend]}</span>`;
}

function renderStatStrip(data) {
  const el = document.getElementById('statStrip');
  const weakCount = data.subtopics.filter(s => s.weaknessScore >= 60).length;
  el.innerHTML = `
    <div class="stat-card">
      <div class="label">Overall Accuracy</div>
      <div class="value">${data.overallAccuracy}%</div>
    </div>
    <div class="stat-card">
      <div class="label">Total Attempts Logged</div>
      <div class="value">${data.totalAttempts}</div>
    </div>
    <div class="stat-card">
      <div class="label">Topics Needing Focus</div>
      <div class="value" style="color:${weakCount > 0 ? 'var(--coral)' : 'var(--mint)'}">${weakCount}</div>
    </div>
  `;
}

function renderFocusAreas(data) {
  const el = document.getElementById('focusSection');
  if (data.focusAreas.length === 0) {
    el.innerHTML = '';
    return;
  }
  const cards = data.focusAreas.map(f => `
    <div class="focus-card">
      <div class="topic-line">
        <span class="name">${f.subtopic} <span style="color:var(--text-muted); font-weight:400;">(${f.topic})</span></span>
        <span class="score">${f.weaknessScore}/100</span>
      </div>
      <div class="rec">${f.recommendation}</div>
    </div>
  `).join('');
  el.innerHTML = `<div class="section-title">Focus Areas</div><div class="focus-list">${cards}</div>`;
}

function renderRadar(data) {
  const el = document.getElementById('radarSection');
  if (data.subtopics.length === 0) { el.innerHTML = ''; return; }

  const rows = data.subtopics.map(s => `
    <div class="radar-row">
      <div class="label">${s.subtopic}<span class="sub">${s.topic}</span></div>
      <div class="bar-track"><div class="bar-fill" style="width:${s.weaknessScore}%; background:${barColor(s.weaknessScore)}"></div></div>
      <div class="pct">${s.weaknessScore}</div>
      ${trendBadge(s.trend)}
    </div>
  `).join('');

  el.innerHTML = `<div class="section-title">All Subtopics — Weakness Score</div><div class="radar-list">${rows}</div>`;
}

async function loadDashboard() {
  const data = await apiGet('/analytics');
  if (!data.totalAttempts) {
    document.getElementById('statStrip').style.display = 'none';
    document.getElementById('emptyState').style.display = 'block';
    return;
  }
  renderStatStrip(data);
  renderFocusAreas(data);
  renderRadar(data);
}

loadDashboard().catch(err => {
  console.error(err);
  document.getElementById('emptyState').style.display = 'block';
  document.getElementById('emptyState').textContent = 'Could not reach the backend. Is the server running on localhost:5000?';
});
