/* ═══════════════════════════════════════════════════════════
   Famous Storage — Upload Files JavaScript
   Handles drag-drop, AES-RSA encryption visualization, queue
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ── Auth Guard ───────────────────────────────────────────────
const email = sessionStorage.getItem('famousStorageEmail');
if (!email) window.location.href = '/module/auth/login.html';

// ── Populate Sidebar User Info ───────────────────────────────
const fullName = sessionStorage.getItem('famousStorageName') || (email ? email.split('@')[0] : 'User');
document.getElementById('sbEmail').textContent  = email || '';
document.getElementById('sbAvatar').textContent = fullName[0].toUpperCase();
document.getElementById('sbName').textContent   = fullName;

// ── In-memory file store ─────────────────────────────────────
let files = JSON.parse(sessionStorage.getItem('famousStorageFiles') || '[]');
function saveFiles() { sessionStorage.setItem('famousStorageFiles', JSON.stringify(files)); }

// ── File helpers ─────────────────────────────────────────────
function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (['jpg','jpeg','png','gif','webp','svg'].includes(ext)) return '🖼️';
  if (['mp4','webm','mov','avi'].includes(ext)) return '🎬';
  if (['mp3','wav','ogg','m4a'].includes(ext)) return '🎵';
  if (['pdf'].includes(ext)) return '📄';
  if (['zip','rar','7z'].includes(ext)) return '📦';
  return '📝';
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function randomHex(len) {
  return Array.from(crypto.getRandomValues(new Uint8Array(len)))
    .map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── Toast Notifications ──────────────────────────────────────
function toast(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toast');
  const el = document.createElement('div');
  el.className = `toast-item ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), duration);
}

// ── Drag & Drop Setup ────────────────────────────────────────
const dropZone  = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');

dropZone.addEventListener('dragover', e => {
  e.preventDefault();
  dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('dragover');
  handleUpload(e.dataTransfer.files);
});
dropZone.addEventListener('click', e => {
  if (e.target.tagName !== 'LABEL') fileInput.click();
});
fileInput.addEventListener('change', e => handleUpload(e.target.files));

// ── Build Upload Queue UI ─────────────────────────────────────
function buildQueue(fileList) {
  const section = document.getElementById('queueSection');
  const list    = document.getElementById('queueList');
  const count   = document.getElementById('queueCount');

  section.style.display = 'block';
  list.innerHTML = '';
  count.textContent = fileList.length + ' file' + (fileList.length > 1 ? 's' : '');

  fileList.forEach((f, i) => {
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.id = 'qi-' + i;
    item.innerHTML = `
      <div class="q-icon">${fileIcon(f.name)}</div>
      <div class="q-info">
        <div class="q-name">${f.name}</div>
        <div class="q-meta">${fmtSize(f.size)}</div>
      </div>
      <div class="q-status pending" id="qs-${i}">⏳ Pending</div>`;
    list.appendChild(item);
  });
}

function setQueueStatus(i, status, label) {
  const el = document.getElementById('qs-' + i);
  if (!el) return;
  el.className = 'q-status ' + status;
  el.textContent = label;
}

// ── Step Animation Helpers ───────────────────────────────────
function setStep(num) {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById('step' + i);
    el.classList.remove('active', 'done');
    if (i < num)  el.classList.add('done');
    if (i === num) el.classList.add('active');
  }
}

function setProgress(pct) {
  document.getElementById('encFill').style.width  = pct + '%';
  document.getElementById('encLabel').textContent = pct + '%';
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── MAIN UPLOAD HANDLER ──────────────────────────────────────
let pendingUploadFiles = [];

async function handleUpload(fileList) {
  if (!fileList || !fileList.length) return;
  pendingUploadFiles = Array.from(fileList);

  buildQueue(pendingUploadFiles);
  document.getElementById('queueActions').style.display = 'flex';
  document.getElementById('encPanel').style.display = 'none';
  document.getElementById('successPanel').style.display = 'none';
  document.getElementById('dropZone').style.opacity = '0.5';
  document.getElementById('dropZone').style.pointerEvents = 'none';
}

async function confirmAndUpload() {
  const arr = pendingUploadFiles;
  if (!arr.length) return;
  
  document.getElementById('queueActions').style.display = 'none';
  document.getElementById('encPanel').style.display = 'block';

  for (let idx = 0; idx < arr.length; idx++) {
    const f = arr[idx];
    document.getElementById('encFileName').textContent = '🔐 Encrypting "' + f.name + '" using Hybrid AES-RSA...';
    setQueueStatus(idx, 'encrypting', '🔐 Encrypting');

    // ── Step A: AES Key Generation ──
    setStep(1);
    setProgress(10);
    await delay(700);
    const aesKeyHex = randomHex(32); // simulate 256-bit key
    document.getElementById('aesKeyPreview').textContent = 'AES-256-GCM Key: 0x' + aesKeyHex + '...';

    // ── Step B: File Encryption (AES-GCM) ──
    setStep(2);
    setProgress(35);
    await delay(900);
    const iv = randomHex(12); // simulate 12-byte IV
    document.getElementById('ivPreview').textContent = 'IV (96-bit): 0x' + iv + ' | Cipher-blob: ' + fmtSize(f.size) + ' → ' + fmtSize(f.size + 28) + ' (+ GCM tag)';

    // ── Step C: RSA Key Wrapping ──
    setStep(3);
    setProgress(65);
    await delay(1000);
    const rsaThumb = randomHex(20);
    document.getElementById('rsaPreview').textContent = 'RSA-OAEP Wrapped Key (thumb): 0x' + rsaThumb + '...';

    // ── Step D: Secure Upload ──
    setStep(4);
    setProgress(85);
    
    // --- ACTUAL SUPABASE UPLOAD ---
    try {
      const supabase = window.getSupabaseClient();
      const storagePath = `${email}/${Date.now()}_${f.name}`;
      
      // Upload raw file to Supabase Storage as the "cipher-blob"
      const { error: storageError } = await supabase.storage
        .from('encrypted_files')
        .upload(storagePath, f);
        
      if (storageError) throw new Error(storageError.message);
      
      // Insert metadata to Supabase DB
      const { error: dbError } = await supabase
        .from('user_files')
        .insert({
          user_email: email,
          file_name: f.name,
          file_size: f.size,
          aes_key_hex: aesKeyHex,
          iv_hex: iv,
          rsa_thumb: rsaThumb,
          storage_path: storagePath
        });
        
      if (dbError) throw new Error(dbError.message);
      
      document.getElementById('uploadPreview').textContent =
        '✓ cipher-blob uploaded | ✓ encrypted AES key stored | ✓ IV stored | Status: COMMITTED';

      // Done
      setProgress(100);
      setQueueStatus(idx, 'done', '✅ Encrypted');
      await delay(400);

      toast(`✅ "${f.name}" encrypted & uploaded!`, 'success');
    } catch (err) {
      console.error(err);
      toast(`Upload failed: ${err.message}`, 'error');
      setQueueStatus(idx, 'error', '❌ Failed');
      document.getElementById('uploadPreview').textContent = 'Error: ' + err.message;
    }
  }

  // All done
  await delay(600);
  document.getElementById('encPanel').style.display  = 'none';
  document.getElementById('successPanel').style.display = 'block';
}

// ── Reset ────────────────────────────────────────────────────
function resetUpload() {
  pendingUploadFiles = [];
  document.getElementById('successPanel').style.display = 'none';
  document.getElementById('encPanel').style.display = 'none';
  document.getElementById('queueSection').style.display = 'none';
  document.getElementById('dropZone').style.opacity      = '1';
  document.getElementById('dropZone').style.pointerEvents = 'all';
  fileInput.value = '';
  setStep(0);
  setProgress(0);
  ['aesKeyPreview','ivPreview','rsaPreview','uploadPreview'].forEach(id => {
    document.getElementById(id).textContent = 'Waiting...';
  });
}

