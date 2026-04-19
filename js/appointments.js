// js/appointments.js

let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', () => {
  // Set minimum date to today
  const dateInput = document.getElementById('appt-date');
  if (dateInput) {
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
  }
  renderAppointments();
});

function getAppointments() {
  return JSON.parse(localStorage.getItem('leHub_appointments') || '[]');
}

function saveAppointments(appts) {
  localStorage.setItem('leHub_appointments', JSON.stringify(appts));
}

function renderAppointments() {
  const appts = getAppointments();
  const now = new Date();
  const container = document.getElementById('appts-container');
  if (!container) return;

  let filtered = appts;
  if (currentFilter === 'upcoming') {
    filtered = appts.filter(a => a.status !== 'completed' && new Date(a.date) >= now);
  } else if (currentFilter === 'completed') {
    filtered = appts.filter(a => a.status === 'completed');
  }

  // Sort by date
  filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;">
        <div class="empty-state" style="padding:60px 20px;">
          <svg viewBox="0 0 40 40" fill="none" class="empty-icon"><rect x="4" y="8" width="32" height="28" rx="4" stroke="var(--text-muted)" stroke-width="1.5"/><path d="M12 4v8M28 4v8M4 18h32" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/></svg>
          <p style="font-size:0.95rem;font-weight:600;color:var(--text-secondary);">No appointments found</p>
          <p style="font-size:0.82rem;color:var(--text-muted);">
            ${currentFilter === 'all' ? 'Book your first tutoring session using the button above.' : `No ${currentFilter} sessions.`}
          </p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((appt, i) => {
    const d = new Date(appt.date);
    const dateStr = d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const statusClass = appt.status || 'pending';

    const statusBadge = {
      pending:   '<span class="badge badge-yellow">Pending</span>',
      confirmed: '<span class="badge badge-green">Confirmed</span>',
      completed: '<span class="badge" style="background:rgba(138,151,176,0.12);color:var(--text-muted);">Completed</span>',
    }[statusClass] || '<span class="badge badge-blue">Pending</span>';

    const isCompleted = appt.status === 'completed';

    return `
      <div class="appt-card ${statusClass}" style="animation-delay:${i * 0.05}s">
        <div class="appt-card-top">
          <div>
            <div class="appt-card-subject">${appt.subject}</div>
            <div class="appt-card-tutor">${appt.tutor || 'Tutor TBD'}</div>
          </div>
          ${statusBadge}
        </div>
        <div class="appt-card-meta">
          <div class="appt-meta-item">
            <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 2v4M14 2v4M2 9h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            ${dateStr}
          </div>
          <div class="appt-meta-item">
            <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M10 7v4l2.5 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            ${timeStr}
          </div>
        </div>
        ${appt.notes ? `<div class="appt-notes">${appt.notes}</div>` : ''}
        ${!isCompleted ? `
        <div class="appt-card-actions">
          <button class="appt-btn complete-btn" onclick="markCompleted('${appt.id}')">Mark Complete</button>
          <button class="appt-btn danger" onclick="cancelAppointment('${appt.id}')">Cancel</button>
        </div>` : ''}
      </div>
    `;
  }).join('');
}

function filterAppts(type, btn) {
  currentFilter = type;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderAppointments();
}

function openModal() {
  document.getElementById('modal-overlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  // Reset form
  ['appt-subject', 'appt-tutor', 'appt-date', 'appt-time', 'appt-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = id === 'appt-tutor' ? '' : '';
  });
}

function closeModalOutside(e) {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
}

function bookAppointment() {
  const subject = document.getElementById('appt-subject').value;
  const tutor   = document.getElementById('appt-tutor').value;
  const date    = document.getElementById('appt-date').value;
  const time    = document.getElementById('appt-time').value;
  const notes   = document.getElementById('appt-notes').value.trim();

  if (!subject || !date || !time) {
    showToast('Please fill in Subject, Date, and Time.', 'error');
    return;
  }

  // Combine date + time into one ISO string
  const dateTime = new Date(`${date}T${time}:00`);

  const newAppt = {
    id:        'appt-' + Date.now(),
    subject,
    tutor:     tutor || 'Tutor TBD',
    date:      dateTime.toISOString(),
    notes,
    status:    'pending',
    createdAt: new Date().toISOString(),
  };

  const appts = getAppointments();
  appts.push(newAppt);
  saveAppointments(appts);

  closeModal();
  showToast('Session booked successfully!', 'success');
  renderAppointments();
}

function markCompleted(id) {
  const appts = getAppointments();
  const appt = appts.find(a => a.id === id);
  if (appt) {
    appt.status = 'completed';
    saveAppointments(appts);
    showToast('Session marked as complete.', 'success');
    renderAppointments();
  }
}

function cancelAppointment(id) {
  if (!confirm('Cancel this appointment?')) return;
  const appts = getAppointments().filter(a => a.id !== id);
  saveAppointments(appts);
  showToast('Appointment cancelled.', 'info');
  renderAppointments();
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${message}</span>`;
  toast.style.cssText = `
    position: fixed; bottom: 28px; right: 28px; z-index: 9999;
    background: ${type === 'error' ? 'var(--danger)' : type === 'success' ? 'var(--success)' : 'var(--accent)'};
    color: #fff; padding: 12px 20px; border-radius: 10px;
    font-family: 'Outfit', sans-serif; font-size: 0.88rem; font-weight: 500;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
    animation: slideIn 0.3s ease both;
  `;
  const style = document.createElement('style');
  style.textContent = `@keyframes slideIn { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }`;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}