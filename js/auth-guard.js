// js/auth-guard.js — Firebase Auth guard for protected pages

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Auth state listener ───────────────────────────────────────────────────────
// Exported so dashboard.js can react once the user is confirmed loaded
export const authReady = new Promise((resolve) => {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.replace("index.html");
      resolve(null);
      return;
    }

    // Fetch Firestore profile for grade / extra info
    let profile = {};
    try {
      const snap = await getDoc(doc(db, "users", user.uid));
      if (snap.exists()) profile = snap.data();
    } catch (_) { /* Firestore read failed — fall back to Auth data */ }

    const displayName = profile.displayName || user.displayName || user.email.split("@")[0];
    const grade       = profile.grade || "";
    const photoURL    = profile.photoURL || user.photoURL || "";

    // ── Populate sidebar UI ──
    const nameEl   = document.getElementById("sidebar-name");
    const gradeEl  = document.getElementById("sidebar-grade");
    const avatarEl = document.getElementById("sidebar-avatar");

    if (nameEl)   nameEl.textContent  = displayName;
    if (gradeEl)  gradeEl.textContent = grade ? `Grade ${grade}` : "—";
    if (avatarEl) {
      if (photoURL) {
        avatarEl.style.background = "none";
        avatarEl.innerHTML = `<img src="${photoURL}" alt="avatar"
          style="width:100%;height:100%;border-radius:50%;object-fit:cover;" />`;
      } else {
        avatarEl.textContent = displayName.charAt(0).toUpperCase();
      }
    }

    // ── Topbar date ──
    const dateEl = document.getElementById("topbar-date");
    if (dateEl) {
      dateEl.textContent = new Date().toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric",
      });
    }

    // ── Appointment badge (still localStorage until appointments get Firestore) ──
    const appts    = JSON.parse(localStorage.getItem("leHub_appointments") || "[]");
    const upcoming = appts.filter(a => a.status !== "completed" && new Date(a.date) >= new Date());
    const badge    = document.getElementById("appt-count");
    if (badge) {
      badge.textContent    = upcoming.length > 0 ? upcoming.length : "";
      badge.style.display  = upcoming.length > 0 ? "flex" : "none";
    }

    resolve({ user, profile: { ...profile, displayName, grade, photoURL } });
  });
});

// ── Logout ────────────────────────────────────────────────────────────────────
window.handleLogout = async function () {
  await signOut(auth);
  window.location.href = "index.html";
};

// ── Mobile sidebar toggle ─────────────────────────────────────────────────────
window.toggleSidebar = function () {
  document.getElementById("sidebar")?.classList.toggle("open");
};