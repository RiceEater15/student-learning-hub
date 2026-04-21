// js/login.js — Firebase Auth backend

import { auth, db } from "./firebase-config.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Auto-redirect if already signed in ──────────────────────────────────────
onAuthStateChanged(auth, (user) => {
  if (user) window.location.replace("dashboard.html");
});

// ── Tab switching ────────────────────────────────────────────────────────────
window.switchTab = function (tab) {
  const loginForm    = document.getElementById("form-login");
  const registerForm = document.getElementById("form-register");
  const tabLogin     = document.getElementById("tab-login");
  const tabRegister  = document.getElementById("tab-register");
  const slider       = document.getElementById("tab-slider");

  if (tab === "login") {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");
    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");
    slider.classList.remove("right");
  } else {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");
    tabLogin.classList.remove("active");
    tabRegister.classList.add("active");
    slider.classList.add("right");
  }
};

// ── Password visibility toggle ───────────────────────────────────────────────
window.togglePassword = function (id) {
  const input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
};

// ── Toast notifications ──────────────────────────────────────────────────────
function showToast(message, type = "info") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();
  const colors = { error: "var(--danger)", success: "var(--success)", info: "var(--accent)" };
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerHTML = `<span>${message}</span>`;
  toast.style.cssText = `
    position:fixed;bottom:28px;right:28px;z-index:9999;
    background:${colors[type]||colors.info};
    color:#fff;padding:12px 20px;border-radius:10px;
    font-family:'Outfit',sans-serif;font-size:0.88rem;font-weight:500;
    box-shadow:0 8px 24px rgba(0,0,0,.4);animation:slideIn .3s ease both;
    max-width:340px;line-height:1.4;
  `;
  if (!document.getElementById("toast-style")) {
    const s = document.createElement("style");
    s.id = "toast-style";
    s.textContent = `@keyframes slideIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
    .spinner{display:inline-block;width:14px;height:14px;border:2px solid rgba(255,255,255,.3);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:6px;}
    @keyframes spin{to{transform:rotate(360deg)}}`;
    document.head.appendChild(s);
  }
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4500);
}

// ── Loading state helper ─────────────────────────────────────────────────────
function setLoading(btnId, loading, originalHTML) {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading ? `<span class="spinner"></span>Working…` : originalHTML;
}

// ── Firebase error → friendly message ────────────────────────────────────────
function friendlyError(code) {
  const map = {
    "auth/user-not-found":         "No account found with that email.",
    "auth/wrong-password":         "Incorrect password. Try again.",
    "auth/invalid-email":          "Please enter a valid email address.",
    "auth/email-already-in-use":   "An account with this email already exists.",
    "auth/weak-password":          "Password must be at least 8 characters.",
    "auth/too-many-requests":      "Too many attempts — wait a moment and try again.",
    "auth/popup-closed-by-user":   "Google sign-in was cancelled.",
    "auth/network-request-failed": "Network error. Check your connection.",
    "auth/invalid-credential":     "Invalid email or password.",
  };
  return map[code] || "Something went wrong. Please try again.";
}

// ── Save user profile to Firestore ───────────────────────────────────────────
async function saveUserToFirestore(user, extra = {}) {
  const ref      = doc(db, "users", user.uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) {
    await setDoc(ref, {
      uid:         user.uid,
      email:       user.email,
      displayName: user.displayName || extra.displayName || "",
      grade:       extra.grade || "",
      photoURL:    user.photoURL || "",
      provider:    extra.provider || "email",
      createdAt:   serverTimestamp(),
      lastLogin:   serverTimestamp(),
    });
  } else {
    await setDoc(ref, { lastLogin: serverTimestamp() }, { merge: true });
  }
}

// ── Email/Password Sign In ────────────────────────────────────────────────────
const LOGIN_BTN_HTML = `<span>Sign In</span>
  <svg viewBox="0 0 20 20" fill="none">
    <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

window.handleLogin = async function () {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  if (!email || !password) { showToast("Please fill in all fields.", "error"); return; }

  setLoading("btn-login", true, LOGIN_BTN_HTML);
  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);
    await saveUserToFirestore(user);
    showToast("Welcome back! Redirecting…", "success");
    setTimeout(() => { window.location.href = "dashboard.html"; }, 900);
  } catch (err) {
    showToast(friendlyError(err.code), "error");
    setLoading("btn-login", false, LOGIN_BTN_HTML);
  }
};

// ── Google Sign In ────────────────────────────────────────────────────────────
const GOOGLE_BTN_HTML = `
  <svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" width="18" height="18" style="flex-shrink:0">
    <path d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.4a4.6 4.6 0 01-2 3.02v2.5h3.24c1.9-1.75 3-4.32 3-7.31z" fill="#4285F4"/>
    <path d="M10 20c2.7 0 4.97-.9 6.63-2.46l-3.24-2.5c-.9.6-2.04.96-3.39.96-2.6 0-4.8-1.76-5.59-4.12H1.08v2.58A9.99 9.99 0 0010 20z" fill="#34A853"/>
    <path d="M4.41 11.88A6.01 6.01 0 014.1 10c0-.65.11-1.28.31-1.88V5.54H1.08A9.99 9.99 0 000 10c0 1.61.38 3.13 1.08 4.46l3.33-2.58z" fill="#FBBC05"/>
    <path d="M10 3.96c1.47 0 2.79.51 3.83 1.5l2.87-2.87C14.96.99 12.69 0 10 0A9.99 9.99 0 001.08 5.54l3.33 2.58C5.2 5.72 7.4 3.96 10 3.96z" fill="#EA4335"/>
  </svg>
  <span>Continue with Google</span>`;

window.handleGoogleLogin = async function () {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  setLoading("btn-google", true, GOOGLE_BTN_HTML);
  try {
    const { user } = await signInWithPopup(auth, provider);
    await saveUserToFirestore(user, { provider: "google" });
    showToast("Signed in with Google! Redirecting…", "success");
    setTimeout(() => { window.location.href = "dashboard.html"; }, 900);
  } catch (err) {
    if (err.code !== "auth/popup-closed-by-user") {
      showToast(friendlyError(err.code), "error");
    }
    setLoading("btn-google", false, GOOGLE_BTN_HTML);
  }
};

// ── Register ─────────────────────────────────────────────────────────────────
const REG_BTN_HTML = `<span>Create Account</span>
  <svg viewBox="0 0 20 20" fill="none">
    <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

window.handleRegister = async function () {
  const first    = document.getElementById("reg-first").value.trim();
  const last     = document.getElementById("reg-last").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const grade    = document.getElementById("reg-grade").value;
  const password = document.getElementById("reg-password").value;

  if (!first || !last || !email || !grade || !password) {
    showToast("Please fill in all fields.", "error"); return;
  }
  if (password.length < 8) {
    showToast("Password must be at least 8 characters.", "error"); return;
  }

  setLoading("btn-register", true, REG_BTN_HTML);
  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(user, { displayName: `${first} ${last}` });
    await saveUserToFirestore(user, {
      displayName: `${first} ${last}`,
      grade,
      provider: "email",
    });
    showToast("Account created! Redirecting…", "success");
    setTimeout(() => { window.location.href = "dashboard.html"; }, 1000);
  } catch (err) {
    showToast(friendlyError(err.code), "error");
    setLoading("btn-register", false, REG_BTN_HTML);
  }
};

// ── Forgot Password ───────────────────────────────────────────────────────────
window.handleForgotPassword = async function () {
  const email = document.getElementById("login-email").value.trim();
  if (!email) {
    showToast("Type your email above first, then click Forgot Password.", "info");
    document.getElementById("login-email").focus();
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showToast(`✓ Reset email sent to ${email} — check your inbox!`, "success");
  } catch (err) {
    showToast(friendlyError(err.code), "error");
  }
};