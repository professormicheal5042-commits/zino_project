/* ═══════════════════════════════════════════════════════════
   ZINO — Settings JavaScript
   Profile management, sign out, account summary
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── Auth Guard ───────────────────────────────────────────────
const email = sessionStorage.getItem('zinoEmail');
if (!email) window.location.href = '../auth/login.html';

// ── Toast ────────────────────────────────────────────────────
function toast(msg, type = 'info', dur = 3500) {
  const el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.textContent = msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(() => el.remove(), dur);
}

// ── Populate from session ─────────────────────────────────────
const storedName     = sessionStorage.getItem('zinoName')     || (email ? email.split('@')[0] : 'User');
const storedUsername = sessionStorage.getItem('zinoUsername') || '';

// Sidebar
document.getElementById('sbEmail').textContent  = email || '';
const initial = (email || 'U')[0].toUpperCase();
document.getElementById('sbAvatar').textContent = initial;
document.getElementById('sbName').textContent   = storedName;

// Avatar card
document.getElementById('avatarLarge').textContent = storedName[0].toUpperCase();
document.getElementById('avatarName').textContent   = storedName;
document.getElementById('avatarEmail').textContent  = email || '—';

// Form fields
document.getElementById('inputName').value     = storedName;
document.getElementById('inputEmail').value    = email || '';
document.getElementById('inputUsername').value = storedUsername;

// Account Summary
const files = JSON.parse(sessionStorage.getItem('zinoFiles') || '[]');
const totalBytes = files.reduce((a, f) => a + (f.size || 0), 0);
document.getElementById('summaryFiles').textContent   = files.length;
document.getElementById('summaryStorage').textContent = fmtSize(totalBytes);

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

// ── Save Profile ─────────────────────────────────────────────
function saveProfile() {
  const newName     = document.getElementById('inputName').value.trim();
  const newUsername = document.getElementById('inputUsername').value.trim();

  if (!newName) {
    toast('⚠️ Display name cannot be empty.', 'error');
    return;
  }

  const btn = document.getElementById('saveProfileBtn');
  const lbl = document.getElementById('saveBtnLabel');
  btn.disabled  = true;
  lbl.textContent = '⏳ Saving...';

  setTimeout(() => {
    // Persist to sessionStorage
    sessionStorage.setItem('zinoName',     newName);
    sessionStorage.setItem('zinoUsername', newUsername);

    // Update live UI
    document.getElementById('sbName').textContent           = newName;
    document.getElementById('avatarName').textContent       = newName;
    document.getElementById('avatarLarge').textContent      = newName[0].toUpperCase();

    btn.disabled    = false;
    lbl.textContent = '💾 Save Changes';
    toast('✅ Profile updated successfully!', 'success');
  }, 800);
}

// ── Reset Form ───────────────────────────────────────────────
function resetForm() {
  document.getElementById('inputName').value     = sessionStorage.getItem('zinoName')     || storedName;
  document.getElementById('inputUsername').value = sessionStorage.getItem('zinoUsername') || '';
  toast('↩️ Form reset to saved values.', 'info');
}

// ── Send Password Reset ──────────────────────────────────────
function sendPasswordReset() {
  toast('📧 Password reset email sent to ' + email + '. Check your inbox.', 'info', 5000);
}

// ══════════════════════════════════════════════════════════════
// SIGN OUT
// ══════════════════════════════════════════════════════════════
function confirmSignOut() {
  document.getElementById('signOutBackdrop').classList.add('open');
}

function signOut() {
  // Clear all session data
  sessionStorage.removeItem('zinoEmail');
  sessionStorage.removeItem('zinoName');
  sessionStorage.removeItem('zinoUsername');
  sessionStorage.removeItem('zinoFlow');
  sessionStorage.removeItem('zinoPubKey');
  sessionStorage.removeItem('zinoPrivKey');
  sessionStorage.removeItem('zinoKeyDate');
  sessionStorage.removeItem('zinoFiles');

  toast('👋 Signing out...', 'info', 1500);
  setTimeout(() => {
    window.location.href = '../auth/login.html';
  }, 1200);
}

// ══════════════════════════════════════════════════════════════
// DELETE ACCOUNT
// ══════════════════════════════════════════════════════════════
function openDeleteAccount() {
  document.getElementById('deleteAccountBackdrop').classList.add('open');
  document.getElementById('deleteConfirmEmail').value = '';
}

function deleteAccount() {
  const typed = document.getElementById('deleteConfirmEmail').value.trim();
  if (typed !== email) {
    toast('✗ Email does not match. Account not deleted.', 'error');
    return;
  }
  // In production: call Supabase to delete user
  toast('⚠️ Account deletion would be processed here. (Demo Mode)', 'error', 5000);
  closeModal('deleteAccountBackdrop');
}

// ── Close Modals ─────────────────────────────────────────────
function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

// Close on backdrop click
['signOutBackdrop', 'deleteAccountBackdrop'].forEach(id => {
  document.getElementById(id).addEventListener('click', e => {
    if (e.target.id === id) closeModal(id);
  });
});
