/* ═══════════════════════════════════════════════════════════
   ZINO — Security JavaScript
   RSA Key display, copy/download, regen modal, terminology
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── Auth Guard ───────────────────────────────────────────────
const email = sessionStorage.getItem('zinoEmail');
if (!email) window.location.href = '../auth/login.html';

document.getElementById('sbEmail').textContent  = email || '';
const initial = (email || 'U')[0].toUpperCase();
document.getElementById('sbAvatar').textContent = initial;
document.getElementById('sbName').textContent   = email ? email.split('@')[0] : 'User';

// ── Helpers ──────────────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }
function toast(msg, type = 'info', dur = 3500) {
  const el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.textContent = msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(() => el.remove(), dur);
}

// ── RSA Key Pair (Generate or Load from Session) ─────────────
let currentPublicKeyPEM  = sessionStorage.getItem('zinoPubKey')  || null;
let currentPrivateKeyPEM = sessionStorage.getItem('zinoPrivKey') || null;
let currentCryptoKeyPair = null;

async function exportPEM(key, type) {
  const fmt = type === 'public' ? 'spki' : 'pkcs8';
  const exported = await crypto.subtle.exportKey(fmt, key);
  const b64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
  const label = type === 'public' ? 'PUBLIC KEY' : 'PRIVATE KEY';
  return `-----BEGIN ${label}-----\n${b64.match(/.{1,64}/g).join('\n')}\n-----END ${label}-----`;
}

async function generateRSAKeyPair() {
  return crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,  // extractable
    ['encrypt', 'decrypt']
  );
}

async function loadOrGenerateKeys() {
  const display = document.getElementById('pubKeyDisplay');
  const dateEl  = document.getElementById('keyGenDate');

  if (currentPublicKeyPEM) {
    display.textContent = currentPublicKeyPEM;
    const genDate = sessionStorage.getItem('zinoKeyDate') || 'Unknown';
    dateEl.textContent = 'Generated: ' + genDate;
    return;
  }

  // Generate new key pair on first load
  display.textContent = 'Generating RSA-4096 key pair in browser... please wait...';
  try {
    currentCryptoKeyPair = await generateRSAKeyPair();
    currentPublicKeyPEM  = await exportPEM(currentCryptoKeyPair.publicKey,  'public');
    currentPrivateKeyPEM = await exportPEM(currentCryptoKeyPair.privateKey, 'private');

    const now = new Date().toLocaleString('en-GB');
    sessionStorage.setItem('zinoPubKey',  currentPublicKeyPEM);
    sessionStorage.setItem('zinoPrivKey', currentPrivateKeyPEM);
    sessionStorage.setItem('zinoKeyDate', now);

    display.textContent = currentPublicKeyPEM;
    dateEl.textContent  = 'Generated: ' + now;
    toast('✅ RSA-4096 key pair generated successfully.', 'success');
  } catch (err) {
    display.textContent = '⚠️ Could not generate key pair: ' + err.message;
    toast('Key generation failed: ' + err.message, 'error');
  }
}

// ── Copy Public Key ──────────────────────────────────────────
async function copyPublicKey() {
  if (!currentPublicKeyPEM) return;
  try {
    await navigator.clipboard.writeText(currentPublicKeyPEM);
    toast('📋 Public key copied to clipboard!', 'success');
  } catch {
    toast('Could not copy — please select and copy manually.', 'error');
  }
}

// ── Download Public Key ──────────────────────────────────────
function downloadPublicKey() {
  if (!currentPublicKeyPEM) return;
  const blob = new Blob([currentPublicKeyPEM], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'zino_public_key.pem';
  a.click();
  URL.revokeObjectURL(url);
  toast('⬇️ Public key downloaded as zino_public_key.pem', 'info');
}

// ══════════════════════════════════════════════════════════════
// REGENERATE KEYS MODAL
// ══════════════════════════════════════════════════════════════
const backdrop = document.getElementById('regenBackdrop');

function openRegenModal()  { backdrop.classList.add('open'); resetRegenSteps(); }
function closeRegenModal() { backdrop.classList.remove('open'); }

backdrop.addEventListener('click', e => {
  if (e.target === backdrop) closeRegenModal();
});

function resetRegenSteps() {
  [1,2,3,4].forEach(n => {
    const el = document.getElementById('rStep' + n);
    el.classList.remove('active','done');
  });
}

async function runRegen() {
  const btn  = document.getElementById('confirmRegen');
  const cBtn = document.getElementById('cancelRegen');
  btn.disabled = true;
  cBtn.disabled = true;
  btn.textContent = '⏳ Generating...';

  resetRegenSteps();
  try {
    // Step 1
    document.getElementById('rStep1').classList.add('active');
    const newPair = await generateRSAKeyPair();
    await delay(400);
    document.getElementById('rStep1').classList.remove('active');
    document.getElementById('rStep1').classList.add('done');

    // Step 2
    document.getElementById('rStep2').classList.add('active');
    const newPubPEM  = await exportPEM(newPair.publicKey,  'public');
    const newPrivPEM = await exportPEM(newPair.privateKey, 'private');
    await delay(400);
    document.getElementById('rStep2').classList.remove('active');
    document.getElementById('rStep2').classList.add('done');

    // Step 3 — Download private key
    document.getElementById('rStep3').classList.add('active');
    const blob = new Blob([newPrivPEM], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'zino_private_access.key'; a.click();
    URL.revokeObjectURL(url);
    await delay(600);
    document.getElementById('rStep3').classList.remove('active');
    document.getElementById('rStep3').classList.add('done');

    // Step 4 — Update session
    document.getElementById('rStep4').classList.add('active');
    const now = new Date().toLocaleString('en-GB');
    currentPublicKeyPEM  = newPubPEM;
    currentPrivateKeyPEM = newPrivPEM;
    sessionStorage.setItem('zinoPubKey',  newPubPEM);
    sessionStorage.setItem('zinoPrivKey', newPrivPEM);
    sessionStorage.setItem('zinoKeyDate', now);
    document.getElementById('pubKeyDisplay').textContent = newPubPEM;
    document.getElementById('keyGenDate').textContent    = 'Generated: ' + now;
    await delay(400);
    document.getElementById('rStep4').classList.remove('active');
    document.getElementById('rStep4').classList.add('done');

    await delay(600);
    closeRegenModal();
    toast('✅ New RSA-4096 key pair generated. Private key downloaded.', 'success', 5000);
  } catch (err) {
    toast('Key regeneration failed: ' + err.message, 'error');
  } finally {
    btn.disabled  = false;
    cBtn.disabled = false;
    btn.innerHTML = '🔁 Yes, Regenerate';
  }
}

// ── Init ─────────────────────────────────────────────────────
loadOrGenerateKeys();
