/* ═══════════════════════════════════════════════════════════
   ZINO — My Files JavaScript
   File list, Decrypt modal, Verify modal, Delete confirm
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── Auth Guard ───────────────────────────────────────────────
const email = sessionStorage.getItem('zinoEmail');
if (!email) window.location.href = '/module/auth/login.html';

document.getElementById('sbEmail').textContent = email || '';
const initial = (email || 'U')[0].toUpperCase();
document.getElementById('sbAvatar').textContent = initial;
document.getElementById('sbName').textContent = email ? email.split('@')[0] : 'User';

// ── Data ─────────────────────────────────────────────────────
let files = JSON.parse(sessionStorage.getItem('zinoFiles') || '[]');
let deleteTargetIdx = null;
let decryptTargetIdx = null;

function saveFiles() { sessionStorage.setItem('zinoFiles', JSON.stringify(files)); }

// ── Helpers ──────────────────────────────────────────────────
function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return '🖼️';
  if (['mp4', 'webm', 'mov', 'avi'].includes(ext)) return '🎬';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return '🎵';
  if (['pdf'].includes(ext)) return '📄';
  if (['zip', 'rar', '7z'].includes(ext)) return '📦';
  return '📝';
}

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function randomHex(len) {
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function toast(msg, type = 'info', dur = 3500) {
  const el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.textContent = msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(() => el.remove(), dur);
}

// ── Render Table ──────────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById('fileBody');
  const empty = document.getElementById('emptyState');
  const card = document.getElementById('tableCard');
  const badge = document.getElementById('fileCountBadge');

  badge.textContent = data.length + ' file' + (data.length !== 1 ? 's' : '');
  tbody.innerHTML = '';

  if (!data.length) {
    empty.style.display = 'block';
    card.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  card.style.display = 'block';

  data.forEach((f, i) => {
    const ext = f.name.split('.').pop().toUpperCase();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="td-check"><input type="checkbox" class="row-check" data-idx="${i}"/></td>
      <td>
        <div class="file-cell">
          <div class="file-type-icon">${fileIcon(f.name)}</div>
          <div>
            <div class="file-name" title="${f.name}">${f.name}</div>
            <div class="file-ext">${ext}</div>
          </div>
        </div>
      </td>
      <td class="td-size">${fmtSize(f.size)}</td>
      <td class="td-date">${fmtDate(f.date)}</td>
      <td><span class="status-tag status-enc">🔐 Encrypted</span></td>
      <td>
        <div class="btn-actions">
          <button class="btn btn-primary" onclick="openDecrypt(${i})">🔓 Decrypt</button>
          <button class="btn btn-verify"  onclick="openVerify(${i})">✅ Verify</button>
          <button class="btn btn-danger"  onclick="openDelete(${i})">🗑</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
}

// ── Search ────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', e => {
  const q = e.target.value.trim().toLowerCase();
  renderTable(q ? files.filter(f => f.name.toLowerCase().includes(q)) : files);
});

// ── Select All ────────────────────────────────────────────────
document.getElementById('selectAll').addEventListener('change', e => {
  document.querySelectorAll('.row-check').forEach(cb => {
    cb.checked = e.target.checked;
    cb.closest('tr').classList.toggle('selected', e.target.checked);
  });
});

// ══════════════════════════════════════════════════════════════
// DECRYPT MODAL
// ══════════════════════════════════════════════════════════════
const decryptBackdrop = document.getElementById('decryptBackdrop');
const privateKeyInput = document.getElementById('privateKeyInput');
const keyValidation = document.getElementById('keyValidation');

function openDecrypt(idx) {
  decryptTargetIdx = idx;
  document.getElementById('sheetFilename').textContent = files[idx].name;
  privateKeyInput.value = '';
  keyValidation.className = 'key-validation';
  keyValidation.textContent = '';
  privateKeyInput.className = 'key-textarea';
  resetDecryptSteps();
  decryptBackdrop.classList.add('open');
  setTimeout(() => privateKeyInput.focus(), 400);
}

function closeDecrypt() { decryptBackdrop.classList.remove('open'); }

document.getElementById('closeSheet').addEventListener('click', closeDecrypt);
document.getElementById('cancelDecrypt').addEventListener('click', closeDecrypt);
decryptBackdrop.addEventListener('click', e => { if (e.target === decryptBackdrop) closeDecrypt(); });

// Live key validation
privateKeyInput.addEventListener('input', () => {
  const val = privateKeyInput.value.trim();
  if (!val) {
    privateKeyInput.className = 'key-textarea';
    keyValidation.className = 'key-validation';
    keyValidation.textContent = '';
    return;
  }
  if (val.includes('BEGIN') && val.includes('END') && val.includes('KEY')) {
    privateKeyInput.className = 'key-textarea valid';
    keyValidation.className = 'key-validation ok';
    keyValidation.textContent = '✓ PEM key format detected — ready to decrypt';
  } else {
    privateKeyInput.className = 'key-textarea invalid';
    keyValidation.className = 'key-validation err';
    keyValidation.textContent = '✗ Invalid format. Expected PEM key starting with -----BEGIN';
  }
});

function resetDecryptSteps() {
  [1, 2, 3, 4].forEach(n => {
    const el = document.getElementById('dStep' + n);
    el.classList.remove('active', 'done');
  });
}

async function runDecryptSteps() {
  const steps = [1, 2, 3, 4];
  for (let i = 0; i < steps.length; i++) {
    const el = document.getElementById('dStep' + steps[i]);
    el.classList.add('active');
    await delay(700);
    el.classList.remove('active');
    el.classList.add('done');
  }
}

document.getElementById('confirmDecrypt').addEventListener('click', async () => {
  const key = privateKeyInput.value.trim();
  if (!key.includes('BEGIN')) {
    keyValidation.className = 'key-validation err';
    keyValidation.textContent = '✗ Please paste a valid RSA Private Key';
    return;
  }

  const btn = document.getElementById('confirmDecrypt');
  const label = document.getElementById('decryptBtnLabel');
  btn.disabled = true;
  label.textContent = '⏳ Decrypting...';

  resetDecryptSteps();
  await runDecryptSteps();

  // Simulate file download (replace with real crypto when Supabase is wired)
  const f = files[decryptTargetIdx];
  const blob = new Blob([`[ZINO] Decrypted content of: ${f.name}\nSize: ${fmtSize(f.size)}\nDecrypted at: ${new Date().toISOString()}`], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = f.name;
  a.click();
  URL.revokeObjectURL(url);

  btn.disabled = false;
  label.innerHTML = '🔓 Decrypt &amp; Download';

  closeDecrypt();
  toast(`✅ "${f.name}" decrypted and downloaded!`, 'success');
});

// ══════════════════════════════════════════════════════════════
// VERIFY INTEGRITY MODAL
// ══════════════════════════════════════════════════════════════
const verifyBackdrop = document.getElementById('verifyBackdrop');

function openVerify(idx) {
  const f = files[idx];
  document.getElementById('verifyFileName').textContent = f.name;
  // Simulate SHA-256 hashes (static for demo — in production compute from stored hash)
  const storedHash = randomHex(32);
  const currentHash = storedHash; // They match = no tampering
  document.getElementById('hashStored').textContent = storedHash;
  document.getElementById('hashCurrent').textContent = currentHash;
  document.getElementById('verifyResult').textContent = '✅ No tampering detected. File integrity confirmed.';
  verifyBackdrop.classList.add('open');
}

function closeVerify() { verifyBackdrop.classList.remove('open'); }

document.getElementById('closeVerify').addEventListener('click', closeVerify);
document.getElementById('closeVerifyBtn').addEventListener('click', closeVerify);
verifyBackdrop.addEventListener('click', e => { if (e.target === verifyBackdrop) closeVerify(); });

// ══════════════════════════════════════════════════════════════
// DELETE MODAL
// ══════════════════════════════════════════════════════════════
const deleteBackdrop = document.getElementById('deleteBackdrop');

function openDelete(idx) {
  deleteTargetIdx = idx;
  document.getElementById('deleteFileName').textContent = files[idx].name;
  deleteBackdrop.classList.add('open');
}

function closeDelete() { deleteBackdrop.classList.remove('open'); }

document.getElementById('cancelDelete').addEventListener('click', closeDelete);
deleteBackdrop.addEventListener('click', e => { if (e.target === deleteBackdrop) closeDelete(); });

document.getElementById('confirmDelete').addEventListener('click', () => {
  const name = files[deleteTargetIdx].name;
  files.splice(deleteTargetIdx, 1);
  saveFiles();
  renderTable(files);
  closeDelete();
  toast(`🗑️ "${name}" permanently deleted.`, 'error');
});

// ── Init ─────────────────────────────────────────────────────
renderTable(files);
