// js/dashboard.js

document.addEventListener('DOMContentLoaded', () => {
  loadStats();
  loadUpcoming();
  loadSubjectProgress();
  loadActivity();
});

function loadStats() {
  const appts = JSON.parse(localStorage.getItem('leHub_appointments') || '[]');
  const now = new Date();

  const total     = appts.length;
  const completed = appts.filter(a => a.status === 'completed').length;
  const upcoming  = appts.filter(a => a.status !== 'completed' && new Date(a.date) >= now).length;

  // Simple "streak" — days in a row with completed sessions (mock for now)
  const streak = completed > 0 ? Math.min(completed, 7) : 0;

  setCount('stat-total-appts', total);
  setCount('stat-completed', completed);
  setCount('stat-upcoming', upcoming);
  setCount('stat-streak', streak);
}

function setCount(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  // Animated counter
  let start = 0;
  const end = parseInt(val);
  if (end === 0) { el.textContent = '0'; return; }
  const step = Math.ceil(end / 20);
  const timer = setInterval(() => {
    start = Math.min(start + step, end);
    el.textContent = start;
    if (start >= end) clearInterval(timer);
  }, 30);
}

function loadUpcoming() {
  const appts = JSON.parse(localStorage.getItem('leHub_appointments') || '[]');
  const now = new Date();
  const upcoming = appts
    .filter(a => a.status !== 'completed' && new Date(a.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4);

  const container = document.getElementById('upcoming-list');
  if (!container) return;

  if (upcoming.length === 0) return; // keep empty state

  container.innerHTML = '';
  upcoming.forEach(appt => {
    const d = new Date(appt.date);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const item = document.createElement('div');
    item.className = 'appt-mini-item';
    item.innerHTML = `
      <span class="appt-dot ${appt.status || 'pending'}"></span>
      <div class="appt-mini-info">
        <div class="appt-mini-subject">${appt.subject}</div>
        <div class="appt-mini-meta">${appt.tutor || 'Tutor TBD'}</div>
      </div>
      <div class="appt-mini-time">${dateStr}<br>${timeStr}</div>
    `;
    container.appendChild(item);
  });
}

function loadSubjectProgress() {
  const appts = JSON.parse(localStorage.getItem('leHub_appointments') || '[]');
  const container = document.getElementById('subject-list');
  if (!container) return;

  // Tally by subject
  const tally = {};
  appts.forEach(a => {
    if (!tally[a.subject]) tally[a.subject] = 0;
    tally[a.subject]++;
  });

  // Default subjects if none
  const defaultSubjects = [
    { name: 'Mathematics',  sessions: 0 },
    { name: 'American Lit',      sessions: 0 },
    { name: 'FUCK MISS MEINTS',      sessions: 0 },
    { name: 'AP Human (LONG LIVE MISS MATTHEWS)',      sessions: 0 },
  ];

  let subjects = Object.entries(tally).map(([name, sessions]) => ({ name, sessions }));
  if (subjects.length === 0) subjects = defaultSubjects;

  const max = Math.max(...subjects.map(s => s.sessions), 1);

  container.innerHTML = subjects.map(s => `
    <div class="subject-row">
      <div class="subject-row-top">
        <span class="subject-name">${s.name}</span>
        <span class="subject-sessions">${s.sessions} session${s.sessions !== 1 ? 's' : ''}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width: ${Math.max((s.sessions / max) * 100, s.sessions === 0 ? 5 : 0)}%"></div>
      </div>
    </div>
  `).join('');
}

function loadActivity() {
  const appts = JSON.parse(localStorage.getItem('leHub_appointments') || '[]');
  const container = document.getElementById('activity-list');
  if (!container) return;

  if (appts.length === 0) return;

  const recent = [...appts]
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
    .slice(0, 6);

  container.innerHTML = recent.map(appt => {
    const d = new Date(appt.createdAt || appt.date);
    const timeAgo = getTimeAgo(d);
    return `
      <div class="activity-item">
        <div class="activity-icon-wrap">
          <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 2v4M14 2v4M2 9h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <div class="activity-info">
          <div class="activity-text">Booked a <strong>${appt.subject}</strong> session</div>
          <div class="activity-time">${timeAgo}</div>
        </div>
        <span class="badge badge-${appt.status === 'completed' ? 'green' : 'blue'}">${appt.status || 'Pending'}</span>
      </div>
    `;
  }).join('');
}

function getTimeAgo(date) {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60)   return 'Just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}