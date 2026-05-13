/* ═══════════════════════════════════════════════════════════
   Famous Storage — Security JavaScript
   Auth guard and sidebar population
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── Auth Guard ───────────────────────────────────────────────
const email = sessionStorage.getItem('famousStorageEmail');
if (!email) window.location.href = '../auth/login.html';

const fullName = sessionStorage.getItem('famousStorageName') || (email ? email.split('@')[0] : 'User');
const avatarUrl = sessionStorage.getItem('famousStorageAvatar');

document.getElementById('sbEmail').textContent  = email || '';
document.getElementById('sbName').textContent   = fullName;

// Populate Main Page Profile Card
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
if (profileName) profileName.textContent = fullName;
if (profileEmail) profileEmail.textContent = email || '';

const sbAvatar = document.getElementById('sbAvatar');
const profileAvatar = document.getElementById('profileAvatar');

if (avatarUrl) {
  if (sbAvatar) {
    sbAvatar.style.backgroundImage = `url('${avatarUrl}')`;
    sbAvatar.style.backgroundSize = 'cover';
    sbAvatar.style.backgroundPosition = 'center';
    sbAvatar.textContent = '';
  }
  if (profileAvatar) {
    profileAvatar.style.backgroundImage = `url('${avatarUrl}')`;
    profileAvatar.style.backgroundSize = 'cover';
    profileAvatar.style.backgroundPosition = 'center';
    profileAvatar.textContent = '';
  }
} else {
  if (sbAvatar) sbAvatar.textContent = fullName[0].toUpperCase();
  if (profileAvatar) profileAvatar.textContent = fullName[0].toUpperCase();
}

