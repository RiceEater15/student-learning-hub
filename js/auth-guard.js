// js/auth-guard.js
// Redirect to login if no session. Replace with Firebase auth check later.

(function () {
  const user = JSON.parse(localStorage.getItem('leHub_user') || 'null');
  if (!user) {
    window.location.replace('index.html');
    return;
  }

  // Populate sidebar user info
  const nameEl   = document.getElementById('sidebar-name');
  const gradeEl  = document.getElementById('sidebar-grade');
  const avatarEl = document.getElementById('sidebar-avatar');

  if (nameEl)   nameEl.textContent  = user.name || 'Student';
  if (gradeEl)  gradeEl.textContent = user.grade ? `Grade ${user.grade}` : '—';
  if (avatarEl) avatarEl.textContent = (user.name || 'S').charAt(0).toUpperCase();

  // Set topbar date
  const dateEl = document.getElementById('topbar-date');
  if (dateEl) {
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  // Update appointment badge
  const appts = JSON.parse(localStorage.getItem('leHub_appointments') || '[]');
  const upcoming = appts.filter(a => a.status !== 'completed' && new Date(a.date) >= new Date());
  const badge = document.getElementById('appt-count');
  if (badge) {
    badge.textContent = upcoming.length > 0 ? upcoming.length : '';
    badge.style.display = upcoming.length > 0 ? 'flex' : 'none';
  }
})();

function handleLogout() {
  localStorage.removeItem('leHub_user');
  window.location.href = 'index.html';
}

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('open');
}