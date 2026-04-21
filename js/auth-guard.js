// js/auth-guard.js
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Global promise that resolves with { user, profile } once auth is ready ───
let _resolveAuth;
export const authReady = new Promise(res => { _resolveAuth = res; });

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  // Pull Firestore profile
  let profile = {};
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) profile = snap.data();
    // Keep lastLogin fresh
    await setDoc(doc(db, "users", user.uid), { lastLogin: serverTimestamp() }, { merge: true });
  } catch (_) {}

  const displayName = profile.displayName || user.displayName || user.email.split("@")[0];
  const grade       = profile.grade  || "";
  const photoURL    = profile.photoURL || user.photoURL || "";

  // ── Sidebar name / grade ──────────────────────────────────────────────────
  const nameEl  = document.getElementById("sidebar-name");
  const gradeEl = document.getElementById("sidebar-grade");
  if (nameEl)  nameEl.textContent  = displayName;
  if (gradeEl) gradeEl.textContent = grade ? `Grade ${grade}` : "Student";

  // ── Avatar — initials fallback if photo fails ─────────────────────────────
  const avatarEl = document.getElementById("sidebar-avatar");
  if (avatarEl) {
    const initials = displayName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    if (photoURL) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        avatarEl.innerHTML = "";
        avatarEl.style.padding = "0";
        avatarEl.style.background = "none";
        const el = document.createElement("img");
        el.src = photoURL;
        el.alt = "avatar";
        el.style.cssText = "width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;";
        avatarEl.appendChild(el);
      };
      img.onerror = () => { avatarEl.textContent = initials; };
      img.src = photoURL;
    } else {
      avatarEl.textContent = initials;
    }
  }

  // ── Topbar date ───────────────────────────────────────────────────────────
  const dateEl = document.getElementById("topbar-date");
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long", month: "short", day: "numeric",
    });
  }

  // ── Appointment badge from Firestore ──────────────────────────────────────
  try {
    const { collection, query, where, getDocs } =
      await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
    const q    = query(collection(db, "appointments"), where("uid", "==", user.uid));
    const snap = await getDocs(q);
    const now  = new Date();
    const count = snap.docs.filter(d => {
      const data = d.data();
      return data.status !== "completed" && data.date?.toDate?.() >= now;
    }).length;
    const badge = document.getElementById("appt-count");
    if (badge) {
      badge.textContent   = count > 0 ? count : "";
      badge.style.display = count > 0 ? "flex" : "none";
    }
  } catch (_) {}

  _resolveAuth({ user, profile: { ...profile, displayName, grade, photoURL } });
});

// ── These MUST be on window so onclick="" HTML attributes can reach them ─────
window.handleLogout = async () => {
  try { await signOut(auth); } catch (_) {}
  window.location.href = "index.html";
};

window.toggleSidebar = () => {
  document.getElementById("sidebar")?.classList.toggle("open");
};