// js/dashboard.js — wired to Firebase

import { authReady } from "./auth-guard.js";
import { db } from "./firebase-config.js";
import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Wait for auth to confirm user, then boot the dashboard
authReady.then(({ user }) => {
  if (!user) return;
  loadStats(user.uid);
  loadUpcoming(user.uid);
  loadSubjectProgress(user.uid);
  loadActivity(user.uid);
  setGreeting(user);
});

// ── Greeting headline ─────────────────────────────────────────────────────────
function setGreeting(user) {
  const el = document.getElementById("page-subheading");
  if (!el) return;
  const hour = new Date().getHours();
  const time = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const name = (user.displayName || "").split(" ")[0] || "Student";
  el.textContent = `${time}, ${name}! Here's your overview.`;
}

// ── Get appointments (Firestore first, localStorage fallback) ─────────────────
async function getAppointments(uid) {
  try {
    const q    = query(collection(db, "appointments"), where("uid", "==", uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date?.toDate?.() || d.data().date }));
    }
  } catch (_) { /* Firestore unavailable — use localStorage */ }
  return JSON.parse(localStorage.getItem("leHub_appointments") || "[]");
}

// ── Stat cards ────────────────────────────────────────────────────────────────
async function loadStats(uid) {
  const appts    = await getAppointments(uid);
  const now      = new Date();
  const total     = appts.length;
  const completed = appts.filter(a => a.status === "completed").length;
  const upcoming  = appts.filter(a => a.status !== "completed" && new Date(a.date) >= now).length;
  const streak    = completed > 0 ? Math.min(completed, 7) : 0;

  animateCount("stat-total-appts", total);
  animateCount("stat-completed",   completed);
  animateCount("stat-upcoming",    upcoming);
  animateCount("stat-streak",      streak);
}

function animateCount(id, end) {
  const el = document.getElementById(id);
  if (!el) return;
  if (end === 0) { el.textContent = "0"; return; }
  let current = 0;
  const step  = Math.ceil(end / 20);
  const timer = setInterval(() => {
    current = Math.min(current + step, end);
    el.textContent = current;
    if (current >= end) clearInterval(timer);
  }, 30);
}

// ── Upcoming sessions ─────────────────────────────────────────────────────────
async function loadUpcoming(uid) {
  const appts    = await getAppointments(uid);
  const now      = new Date();
  const upcoming = appts
    .filter(a => a.status !== "completed" && new Date(a.date) >= now)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .slice(0, 4);

  const container = document.getElementById("upcoming-list");
  if (!container || upcoming.length === 0) return;

  container.innerHTML = upcoming.map(appt => {
    const d       = new Date(appt.date);
    const dateStr = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const timeStr = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `
      <div class="appt-mini-item">
        <span class="appt-dot ${appt.status || "pending"}"></span>
        <div class="appt-mini-info">
          <div class="appt-mini-subject">${appt.subject}</div>
          <div class="appt-mini-meta">${appt.tutor || "Tutor TBD"}</div>
        </div>
        <div class="appt-mini-time">${dateStr}<br>${timeStr}</div>
      </div>`;
  }).join("");
}

// ── Subject progress bars ─────────────────────────────────────────────────────
async function loadSubjectProgress(uid) {
  const appts     = await getAppointments(uid);
  const container = document.getElementById("subject-list");
  if (!container) return;

  const tally = {};
  appts.forEach(a => { tally[a.subject] = (tally[a.subject] || 0) + 1; });

  const defaultSubjects = ["Mathematics", "English", "Science", "History"];
  let subjects = Object.entries(tally).map(([name, sessions]) => ({ name, sessions }));
  if (subjects.length === 0) subjects = defaultSubjects.map(name => ({ name, sessions: 0 }));

  const max = Math.max(...subjects.map(s => s.sessions), 1);

  container.innerHTML = subjects.map(s => `
    <div class="subject-row">
      <div class="subject-row-top">
        <span class="subject-name">${s.name}</span>
        <span class="subject-sessions">${s.sessions} session${s.sessions !== 1 ? "s" : ""}</span>
      </div>
      <div class="progress-bar-bg">
        <div class="progress-bar-fill" style="width:${s.sessions === 0 ? 4 : (s.sessions / max) * 100}%"></div>
      </div>
    </div>`).join("");
}

// ── Recent activity feed ──────────────────────────────────────────────────────
async function loadActivity(uid) {
  const appts     = await getAppointments(uid);
  const container = document.getElementById("activity-list");
  if (!container || appts.length === 0) return;

  const recent = [...appts]
    .sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date))
    .slice(0, 6);

  container.innerHTML = recent.map(appt => `
    <div class="activity-item">
      <div class="activity-icon-wrap">
        <svg viewBox="0 0 20 20" fill="none">
          <rect x="2" y="4" width="16" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
          <path d="M6 2v4M14 2v4M2 9h16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
      </div>
      <div class="activity-info">
        <div class="activity-text">Booked a <strong>${appt.subject}</strong> session</div>
        <div class="activity-time">${timeAgo(new Date(appt.createdAt || appt.date))}</div>
      </div>
      <span class="badge badge-${appt.status === "completed" ? "green" : "blue"}">${appt.status || "Pending"}</span>
    </div>`).join("");
}

function timeAgo(date) {
  const diff = Math.floor((Date.now() - date) / 1000);
  if (diff < 60)    return "Just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}