// js/login.js

function switchTab(tab) {
  const loginForm = document.getElementById('form-login');
  const registerForm = document.getElementById('form-register');
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');
  const slider = document.getElementById('tab-slider');

  if (tab === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    slider.classList.remove('right');
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    slider.classList.add('right');
  }
}

function togglePassword(id) {
  const input = document.getElementById(id);
  input.type = input.type === 'password' ? 'text' : 'password';
}

function showToast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
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

function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    showToast('Please fill in all fields.', 'error');
    return;
  }
  if (!email.includes('@')) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }

  // TODO: Replace with Firebase auth
  // For now, store mock session and redirect
  const mockUser = { email, name: email.split('@')[0], grade: '11', id: 'mock-001' };
  localStorage.setItem('leHub_user', JSON.stringify(mockUser));
  showToast('Signing you in…', 'success');
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 1000);
}

function handleRegister() {
  const first = document.getElementById('reg-first').value.trim();
  const last = document.getElementById('reg-last').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const grade = document.getElementById('reg-grade').value;
  const password = document.getElementById('reg-password').value;

  if (!first || !last || !email || !grade || !password) {
    showToast('Please fill in all fields.', 'error');
    return;
  }
  if (password.length < 8) {
    showToast('Password must be at least 8 characters.', 'error');
    return;
  }

  // TODO: Replace with Firebase createUserWithEmailAndPassword
  const mockUser = { email, name: `${first} ${last}`, grade, id: 'mock-' + Date.now() };
  localStorage.setItem('leHub_user', JSON.stringify(mockUser));
  showToast('Account created! Redirecting…', 'success');
  setTimeout(() => { window.location.href = 'dashboard.html'; }, 1200);
}

// Auto-redirect if already "logged in"
window.addEventListener('DOMContentLoaded', () => {
  const user = localStorage.getItem('leHub_user');
  if (user && window.location.pathname.includes('index')) {
    // Don't auto-redirect — let user choose
  }
});