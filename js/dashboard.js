// js/dashboard.js
import { authReady } from "./auth-guard.js";
import { db } from "./firebase-config.js";
import {
  collection, query, where, getDocs, orderBy,
  doc, setDoc, deleteDoc, serverTimestamp, Timestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Available courses catalogue ───────────────────────────────────────────────
const COURSE_CATALOGUE = [
  { id: "math-alg2",   name: "Algebra II",         dept: "Mathematics",  credits: 1.0, icon: "📐" },
  { id: "math-precalc",name: "Pre-Calculus",        dept: "Mathematics",  credits: 1.0, icon: "📊" },
  { id: "math-calc",   name: "AP Calculus AB",      dept: "Mathematics",  credits: 1.0, icon: "∫" },
  { id: "eng-comp",    name: "English Composition", dept: "English",      credits: 1.0, icon: "✏️" },
  { id: "eng-lit",     name: "AP Literature",       dept: "English",      credits: 1.0, icon: "📖" },
  { id: "sci-bio",     name: "Biology",             dept: "Science",      credits: 1.0, icon: "🧬" },
  { id: "sci-chem",    name: "Chemistry",           dept: "Science",      credits: 1.0, icon: "⚗️" },
  { id: "sci-phys",    name: "AP Physics",          dept: "Science",      credits: 1.0, icon: "⚡" },
  { id: "his-us",      name: "US History",          dept: "History",      credits: 1.0, icon: "🇺🇸" },
  { id: "his-world",   name: "World History",       dept: "History",      credits: 1.0, icon: "🌍" },
  { id: "cs-intro",    name: "Intro to CS",         dept: "Computer Sci", credits: 0.5, icon: "💻" },
  { id: "cs-ap",       name: "AP Computer Science", dept: "Computer Sci", credits: 1.0, icon: "🖥️" },
  { id: "lang-span",   name: "Spanish III",         dept: "Language",     credits: 1.0, icon: "🇪🇸" },
  { id: "lang-french", name: "French II",           dept: "Language",     credits: 1.0, icon: "🇫🇷" },
  { id: "art-studio",  name: "Studio Art",          dept: "Fine Arts",    credits: 0.5, icon: "🎨" },
];

let _uid = null;
let _enrolledCourses = [];
let _appointments = [];

// ── Boot ──────────────────────────────────────────────────────────────────────
authReady.then(async ({ user }) => {
  if (!user) return;
  _uid = user.uid;
  setGreeting(user);
  await Promise.all([
    loadEnrolledCourses(),
    loadAppointments(),
  ]);
  renderStats();
  renderUpcoming();
  renderSubjectFocus();
  renderActivity();
});

// ── Greeting ──────────────────────────────────────────────────────────────────
function setGreeting(user) {
  const el = document.getElementById("page-subheading");
  if (!el) return;
  const h    = new Date().getHours();
  const time = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const name = (user.displayName || user.email || "Student").split(" ")[0];
  el.textContent = `${time}, ${name}! Here's your overview.`;
}

// ── Load enrolled courses from Firestore ──────────────────────────────────────
async function loadEnrolledCourses() {
  try {
    const q    = query(collection(db, "enrollments"), where("uid", "==", _uid));
    const snap = await getDocs(q);
    _enrolledCourses = snap.docs.map(d => ({ firestoreId: d.id, ...d.data() }));
  } catch (_) {
    _enrolledCourses = JSON.parse(localStorage.getItem("leHub_courses") || "[]");
  }
}

// ── Load appointments from Firestore ─────────────────────────────────────────
async function loadAppointments() {
  try {
    const q    = query(collection(db, "appointments"), where("uid", "==", _uid));
    const snap = await getDocs(q);
    _appointments = snap.docs.map(d => ({
      id: d.id, ...d.data(),
      date: d.data().date?.toDate ? d.data().date.toDate() : new Date(d.data().date),
      createdAt: d.data().createdAt?.toDate ? d.data().createdAt.toDate() : new Date(d.data().createdAt || Date.now()),
    }));
  } catch (_) {
    _appointments = JSON.parse(localStorage.getItem("leHub_appointments") || "[]")
      .map(a => ({ ...a, date: new Date(a.date), createdAt: new Date(a.createdAt || a.date) }));
  }
}

// ── Stat cards ────────────────────────────────────────────────────────────────
function renderStats() {
  const now       = new Date();
  const total     = _appointments.length;
  const completed = _appointments.filter(a => a.status === "completed").length;
  const upcoming  = _appointments.filter(a => a.status !== "completed" && a.date >= now).length;
  const enrolled  = _enrolledCourses.length;

  animateCount("stat-total-appts", total);
  animateCount("stat-completed",   completed);
  animateCount("stat-upcoming",    upcoming);
  animateCount("stat-enrolled",    enrolled);
}

function animateCount(id, end) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = "0";
  if (end === 0) return;
  let cur = 0;
  const step = Math.ceil(end / 20);
  const t = setInterval(() => {
    cur = Math.min(cur + step, end);
    el.textContent = cur;
    if (cur >= end) clearInterval(t);
  }, 30);
}

// ── Upcoming appointments ─────────────────────────────────────────────────────
function renderUpcoming() {
  const now     = new Date();
  const list    = _appointments
    .filter(a => a.status !== "completed" && a.date >= now)
    .sort((a, b) => a.date - b.date)
    .slice(0, 4);

  const el = document.getElementById("upcoming-list");
  if (!el) return;

  if (list.length === 0) {
    el.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 40 40" fill="none" class="empty-icon">
          <rect x="4" y="8" width="32" height="28" rx="4" stroke="var(--text-muted)" stroke-width="1.5"/>
          <path d="M12 4v8M28 4v8M4 18h32" stroke="var(--text-muted)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <p>No upcoming sessions</p>
        <a href="appointments.html" class="btn-secondary" style="width:auto;margin-top:8px;font-size:0.82rem;padding:8px 16px;">Book a session</a>
      </div>`;
    return;
  }

  el.innerHTML = list.map(a => {
    const ds = a.date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const ts = a.date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `<div class="appt-mini-item">
      <span class="appt-dot ${a.status || "pending"}"></span>
      <div class="appt-mini-info">
        <div class="appt-mini-subject">${a.subject}</div>
        <div class="appt-mini-meta">${a.tutor || "Tutor TBD"}</div>
      </div>
      <div class="appt-mini-time">${ds}<br>${ts}</div>
    </div>`;
  }).join("");
}

// ── Subject focus — merged from enrollments + appointments ────────────────────
function renderSubjectFocus() {
  const el = document.getElementById("subject-list");
  if (!el) return;

  // Count sessions per subject
  const sessionMap = {};
  _appointments.forEach(a => {
    sessionMap[a.subject] = (sessionMap[a.subject] || 0) + 1;
  });

  // Build from enrolled courses; fall back to appointment subjects if none enrolled
  let rows = _enrolledCourses.map(c => ({
    name: c.courseName,
    dept: c.dept,
    sessions: sessionMap[c.courseName] || 0,
    icon: c.icon || "📚",
  }));

  if (rows.length === 0) {
    // No enrolled courses yet — show appointment-derived subjects
    rows = Object.entries(sessionMap).map(([name, sessions]) => ({ name, sessions, icon: "📚", dept: "" }));
  }

  if (rows.length === 0) {
    el.innerHTML = `<div class="empty-state" style="padding:20px 0;">
      <p style="color:var(--text-muted);font-size:0.85rem;">No courses enrolled yet.</p>
      <button class="btn-secondary" style="width:auto;margin-top:10px;font-size:0.8rem;padding:7px 14px;" onclick="openEnrollModal()">Enroll in a Course</button>
    </div>`;
    return;
  }

  const max = Math.max(...rows.map(r => r.sessions), 1);
  el.innerHTML = rows.map(r => `
    <div class="subject-row">
      <div class="subject-row-top">
        <span class="subject-name"><span class="subject-icon">${r.icon}</span>${r.name}</span>
        <span class="subject-sessions">${r.sessions} session${r.sessions !== 1 ? "s" : ""}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width:${r.sessions === 0 ? 4 : Math.round((r.sessions / max) * 100)}%"></div>
      </div>
    </div>`).join("");
}

// ── Recent activity ───────────────────────────────────────────────────────────
function renderActivity() {
  const el = document.getElementById("activity-list");
  if (!el) return;

  const events = [
    ..._appointments.map(a => ({ type: "appt", date: a.createdAt, subject: a.subject, status: a.status })),
    ..._enrolledCourses.map(c => ({ type: "enroll", date: new Date(c.enrolledAt?.seconds ? c.enrolledAt.seconds * 1000 : c.enrolledAt || Date.now()), subject: c.courseName })),
  ].sort((a, b) => b.date - a.date).slice(0, 8);

  if (events.length === 0) {
    el.innerHTML = `<div class="empty-state"><p style="color:var(--text-muted);font-size:0.88rem;">No recent activity yet. Book your first session!</p></div>`;
    return;
  }

  el.innerHTML = events.map(ev => {
    if (ev.type === "appt") {
      return `<div class="activity-item">
        <div class="activity-icon-wrap">
          <svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 2v4M14 2v4M2 9h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </div>
        <div class="activity-info">
          <div class="activity-text">Booked a <strong>${ev.subject}</strong> session</div>
          <div class="activity-time">${timeAgo(ev.date)}</div>
        </div>
        <span class="badge badge-${ev.status === "completed" ? "green" : "blue"}">${capitalize(ev.status || "pending")}</span>
      </div>`;
    } else {
      return `<div class="activity-item">
        <div class="activity-icon-wrap" style="color:var(--success)">
          <svg viewBox="0 0 20 20" fill="none"><path d="M3 10l4 4 10-8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </div>
        <div class="activity-info">
          <div class="activity-text">Enrolled in <strong>${ev.subject}</strong></div>
          <div class="activity-time">${timeAgo(ev.date)}</div>
        </div>
        <span class="badge badge-green">Enrolled</span>
      </div>`;
    }
  }).join("");
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ═══════════════════════════════════════════════════════════════════════════════
// ENROLL IN COURSE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

window.openEnrollModal = function () {
  buildEnrollModal();
  document.getElementById("enroll-overlay").classList.add("open");
};

window.closeEnrollModal = function () {
  document.getElementById("enroll-overlay").classList.remove("open");
};

function buildEnrollModal() {
  let overlay = document.getElementById("enroll-overlay");
  if (overlay) { renderCatalogueGrid(); return; }

  overlay = document.createElement("div");
  overlay.id = "enroll-overlay";
  overlay.className = "modal-overlay";
  overlay.onclick = e => { if (e.target === overlay) window.closeEnrollModal(); };

  overlay.innerHTML = `
    <div class="modal" style="max-width:600px;">
      <div class="modal-header">
        <h3>Enroll in a Course</h3>
        <button class="modal-close" onclick="closeEnrollModal()">
          <svg viewBox="0 0 20 20" fill="none"><path d="M5 5l10 10M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        </button>
      </div>
      <div class="modal-body" style="gap:12px;">
        <div class="enroll-search-wrap">
          <svg class="input-icon" viewBox="0 0 20 20" fill="none" style="left:12px;top:50%;transform:translateY(-50%);position:absolute;width:16px;height:16px;color:var(--text-muted);pointer-events:none;">
            <circle cx="9" cy="9" r="5.5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M13.5 13.5l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
          <input type="text" id="enroll-search" placeholder="Search courses…"
            oninput="filterCatalogue(this.value)"
            style="width:100%;padding:10px 14px 10px 36px;background:var(--bg-elevated);border:1.5px solid var(--border);border-radius:var(--radius-md);color:var(--text-primary);font-family:'Outfit',sans-serif;font-size:0.9rem;outline:none;box-sizing:border-box;"
          />
        </div>
        <div class="dept-filter-row" id="dept-filters"></div>
        <div class="catalogue-grid" id="catalogue-grid"></div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="closeEnrollModal()">Done</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  renderDeptFilters();
  renderCatalogueGrid();
}

let _activeDept = "All";
window.filterCatalogue = function (val) {
  renderCatalogueGrid(val);
};
window.setDept = function (dept, btn) {
  _activeDept = dept;
  document.querySelectorAll(".dept-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderCatalogueGrid(document.getElementById("enroll-search")?.value || "");
};

function renderDeptFilters() {
  const depts = ["All", ...new Set(COURSE_CATALOGUE.map(c => c.dept))];
  const el = document.getElementById("dept-filters");
  if (!el) return;
  el.innerHTML = depts.map(d => `
    <button class="dept-btn${d === _activeDept ? " active" : ""}" onclick="setDept('${d}', this)">${d}</button>
  `).join("");
}

function renderCatalogueGrid(search = "") {
  const el = document.getElementById("catalogue-grid");
  if (!el) return;
  const enrolledIds = new Set(_enrolledCourses.map(c => c.courseId));

  const filtered = COURSE_CATALOGUE.filter(c => {
    const matchDept   = _activeDept === "All" || c.dept === _activeDept;
    const matchSearch = !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.dept.toLowerCase().includes(search.toLowerCase());
    return matchDept && matchSearch;
  });

  if (filtered.length === 0) {
    el.innerHTML = `<p style="color:var(--text-muted);font-size:0.85rem;padding:16px 0;">No courses match your search.</p>`;
    return;
  }

  el.innerHTML = filtered.map(c => {
    const enrolled = enrolledIds.has(c.id);
    return `
      <div class="catalogue-card${enrolled ? " enrolled" : ""}">
        <span class="catalogue-icon">${c.icon}</span>
        <div class="catalogue-info">
          <div class="catalogue-name">${c.name}</div>
          <div class="catalogue-dept">${c.dept} · ${c.credits} credit${c.credits !== 1 ? "s" : ""}</div>
        </div>
        <button class="catalogue-btn${enrolled ? " unenroll" : ""}" onclick="toggleEnroll('${c.id}', this)">
          ${enrolled ? "Unenroll" : "+ Enroll"}
        </button>
      </div>`;
  }).join("");
}

window.toggleEnroll = async function (courseId, btn) {
  const course     = COURSE_CATALOGUE.find(c => c.id === courseId);
  if (!course) return;
  const enrolledIds = new Set(_enrolledCourses.map(c => c.courseId));
  const isEnrolled  = enrolledIds.has(courseId);

  btn.disabled = true;
  btn.textContent = "…";

  try {
    const docId = `${_uid}_${courseId}`;
    const ref   = doc(db, "enrollments", docId);

    if (isEnrolled) {
      await deleteDoc(ref);
      _enrolledCourses = _enrolledCourses.filter(c => c.courseId !== courseId);
      showToast(`Unenrolled from ${course.name}`, "info");
    } else {
      const data = {
        uid:        _uid,
        courseId,
        courseName: course.name,
        dept:       course.dept,
        credits:    course.credits,
        icon:       course.icon,
        enrolledAt: serverTimestamp(),
      };
      await setDoc(ref, data);
      _enrolledCourses.push({ firestoreId: docId, ...data, enrolledAt: new Date() });
      showToast(`Enrolled in ${course.name}!`, "success");
    }
  } catch (err) {
    // Fallback to localStorage
    if (enrolledIds.has(courseId)) {
      _enrolledCourses = _enrolledCourses.filter(c => c.courseId !== courseId);
    } else {
      _enrolledCourses.push({ courseId, courseName: course.name, dept: course.dept, credits: course.credits, icon: course.icon, enrolledAt: new Date() });
    }
    localStorage.setItem("leHub_courses", JSON.stringify(_enrolledCourses));
    showToast(isEnrolled ? `Unenrolled from ${course.name}` : `Enrolled in ${course.name}!`, isEnrolled ? "info" : "success");
  }

  renderCatalogueGrid(document.getElementById("enroll-search")?.value || "");
  renderSubjectFocus();
  renderStats();
  renderActivity();
  btn.disabled = false;
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