// js/appointments.js
import { authReady } from "./auth-guard.js";
import { db } from "./firebase-config.js";
import {
  collection, query, where, getDocs, addDoc,
  doc, updateDoc, deleteDoc, serverTimestamp, Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

let _uid = null;
let _appointments = [];
let _currentFilter = "all";

// ── Boot ──────────────────────────────────────────────────────────────────────
authReady.then(async ({ user }) => {
  _uid = user.uid;
  const dateInput = document.getElementById("appt-date");
  if (dateInput) dateInput.min = new Date().toISOString().split("T")[0];
  await fetchAppointments();
  renderAppointments();
});

// ── Fetch from Firestore ──────────────────────────────────────────────────────
async function fetchAppointments() {
  try {
    const q    = query(collection(db, "appointments"), where("uid", "==", _uid));
    const snap = await getDocs(q);
    _appointments = snap.docs.map(d => ({
      id: d.id,
      ...d.data(),
      date:      d.data().date?.toDate      ? d.data().date.toDate()      : new Date(d.data().date),
      createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(d.data().createdAt || Date.now()),
    }));
  } catch (_) {
    _appointments = JSON.parse(localStorage.getItem("leHub_appointments") || "[]")
      .map(a => ({ ...a, date: new Date(a.date), createdAt: new Date(a.createdAt || a.date) }));
  }
}

// ── Render appointment cards ──────────────────────────────────────────────────
function renderAppointments() {
  const container = document.getElementById("appts-container");
  if (!container) return;

  const now = new Date();
  let list  = [..._appointments];

  if (_currentFilter === "upcoming")  list = list.filter(a => a.status !== "completed" && a.date >= now);
  if (_currentFilter === "completed") list = list.filter(a => a.status === "completed");
  list.sort((a, b) => a.date - b.date);

  if (list.length === 0) {
    container.innerHTML = `
      <div style="grid-column:1/-1;">
        <div class="empty-state" style="padding:60px 20px;">
          <svg viewBox="0 0 40 40" fill="none" class="empty-icon">
            <rect x="4" y="8" width="32" height="28" rx="4" stroke="var(--text-muted)" stroke-width="1.5"/>
            <path d="M12 4v8M28 4v8M4 18h32" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <p style="font-size:0.95rem;font-weight:600;color:var(--text-secondary);">No appointments found</p>
          <p style="font-size:0.82rem;color:var(--text-muted);margin-top:4px;">
            ${_currentFilter === "all" ? "Book your first tutoring session using the button above." : `No ${_currentFilter} sessions.`}
          </p>
        </div>
      </div>`;
    return;
  }

  const statusBadge = {
    pending:   `<span class="badge badge-yellow">Pending</span>`,
    confirmed: `<span class="badge badge-green">Confirmed</span>`,
    completed: `<span class="badge" style="background:rgba(138,151,176,0.12);color:var(--text-muted);">Completed</span>`,
  };

  container.innerHTML = list.map((a, i) => {
    const ds          = a.date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" });
    const ts          = a.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const status      = a.status || "pending";
    const isCompleted = status === "completed";
    return `
      <div class="appt-card ${status}" style="animation-delay:${i * 0.05}s">
        <div class="appt-card-top">
          <div>
            <div class="appt-card-subject">${a.subject}</div>
            <div class="appt-card-tutor">${a.tutor || "Tutor TBD"}</div>
          </div>
          ${statusBadge[status] || statusBadge.pending}
        </div>
        <div class="appt-card-meta">
          <div class="appt-meta-item">
            <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 2v4M14 2v4M2 9h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            ${ds}
          </div>
          <div class="appt-meta-item">
            <svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="7" stroke="currentColor" stroke-width="1.5"/><path d="M10 7v4l2.5 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            ${ts}
          </div>
        </div>
        ${a.notes ? `<div class="appt-notes">${a.notes}</div>` : ""}
        ${!isCompleted ? `
        <div class="appt-card-actions">
          <button class="appt-btn complete-btn" onclick="markCompleted('${a.id}')">✓ Mark Complete</button>
          <button class="appt-btn danger" onclick="cancelAppointment('${a.id}')">✕ Cancel</button>
        </div>` : ""}
      </div>`;
  }).join("");
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
window.filterAppts = function (type, btn) {
  _currentFilter = type;
  document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
  btn.classList.add("active");
  renderAppointments();
};

// ── Modal open/close ──────────────────────────────────────────────────────────
window.openModal = function () {
  document.getElementById("modal-overlay").classList.add("open");
};

window.closeModal = function () {
  document.getElementById("modal-overlay").classList.remove("open");
  ["appt-subject", "appt-tutor", "appt-date", "appt-time", "appt-notes"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
};

window.closeModalOutside = function (e) {
  if (e.target === document.getElementById("modal-overlay")) window.closeModal();
};

// ── Book appointment ──────────────────────────────────────────────────────────
window.bookAppointment = async function () {
  const subject = document.getElementById("appt-subject").value;
  const tutor   = document.getElementById("appt-tutor").value;
  const date    = document.getElementById("appt-date").value;
  const time    = document.getElementById("appt-time").value;
  const notes   = document.getElementById("appt-notes").value.trim();

  if (!subject || !date || !time) {
    showToast("Please fill in Subject, Date, and Time.", "error");
    return;
  }

  const confirmBtn = document.getElementById("btn-confirm-booking");
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = "Booking…"; }

  const dateTime = new Date(`${date}T${time}:00`);

  try {
    const data = {
      uid:       _uid,
      subject,
      tutor:     tutor || "Tutor TBD",
      date:      Timestamp.fromDate(dateTime),
      notes:     notes || "",
      status:    "pending",
      createdAt: serverTimestamp(),
    };
    const ref = await addDoc(collection(db, "appointments"), data);
    _appointments.push({ id: ref.id, ...data, date: dateTime, createdAt: new Date() });
    showToast("Session booked successfully!", "success");
  } catch (_) {
    // localStorage fallback
    const newAppt = {
      id:        "appt-" + Date.now(),
      uid:       _uid,
      subject,
      tutor:     tutor || "Tutor TBD",
      date:      dateTime,
      notes:     notes || "",
      status:    "pending",
      createdAt: new Date(),
    };
    _appointments.push(newAppt);
    localStorage.setItem("leHub_appointments", JSON.stringify(
      _appointments.map(a => ({ ...a, date: a.date.toISOString(), createdAt: a.createdAt.toISOString() }))
    ));
    showToast("Session booked (offline)!", "success");
  }

  window.closeModal();
  renderAppointments();
  if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = "Confirm Booking"; }
};

// ── Mark complete ─────────────────────────────────────────────────────────────
window.markCompleted = async function (id) {
  const appt = _appointments.find(a => a.id === id);
  if (!appt) return;
  try {
    await updateDoc(doc(db, "appointments", id), { status: "completed" });
  } catch (_) {}
  appt.status = "completed";
  localStorage.setItem("leHub_appointments", JSON.stringify(
    _appointments.map(a => ({ ...a, date: a.date.toISOString?.() || a.date, createdAt: a.createdAt.toISOString?.() || a.createdAt }))
  ));
  showToast("Session marked as complete!", "success");
  renderAppointments();
};

// ── Cancel appointment ────────────────────────────────────────────────────────
window.cancelAppointment = async function (id) {
  if (!confirm("Are you sure you want to cancel this appointment?")) return;
  try {
    await deleteDoc(doc(db, "appointments", id));
  } catch (_) {}
  _appointments = _appointments.filter(a => a.id !== id);
  localStorage.setItem("leHub_appointments", JSON.stringify(
    _appointments.map(a => ({ ...a, date: a.date.toISOString?.() || a.date, createdAt: a.createdAt.toISOString?.() || a.createdAt }))
  ));
  showToast("Appointment cancelled.", "info");
  renderAppointments();
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = "info") {
  document.querySelector(".toast")?.remove();
  const colors = { error: "var(--danger)", success: "var(--success)", info: "var(--accent)" };
  const t = document.createElement("div");
  t.className = "toast";
  t.style.cssText = `position:fixed;bottom:28px;right:28px;z-index:9999;
    background:${colors[type]||colors.info};color:#fff;padding:12px 20px;border-radius:10px;
    font-family:'Outfit',sans-serif;font-size:0.88rem;font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.4);animation:slideIn .3s ease both;max-width:320px;`;
  t.textContent = msg;
  if (!document.getElementById("toast-kf")) {
    const s = document.createElement("style");
    s.id = "toast-kf";
    s.textContent = `@keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`;
    document.head.appendChild(s);
  }
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 4000);
}