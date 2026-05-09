// ── Auth Guard ──────────────────────────────────────────────
const email = sessionStorage.getItem('zinoEmail');
if (!email) window.location.href = '/module/auth/login.html';

// ── Populate Sidebar User Info ───────────────────────────────
document.getElementById('sbEmail').textContent = email || '';
const initial = (email || 'U')[0].toUpperCase();
document.getElementById('sbAvatar').textContent = initial;
document.getElementById('sbName').textContent = email ? email.split('@')[0] : 'User';
document.getElementById('greetName').textContent = email ? email.split('@')[0] : 'User';

// ── Active Nav Link & Tab Switching ────────────────────────────
const navLinks = {
  'navDash': 'viewDash',
  'navUpload': 'viewUpload',
  'navFiles': 'viewFiles',
  'navSecurity': 'viewSecurity',
  'navSettings': 'viewSettings'
};

document.querySelectorAll('.sb-nav a').forEach(a => {
  if (a.id === 'logoutBtn') return;
  a.addEventListener('click', (e) => {
    e.preventDefault();
    // Update active nav class
    document.querySelectorAll('.sb-nav a').forEach(n => n.classList.remove('active'));
    a.classList.add('active');

    // Show correct view
    document.querySelectorAll('.tab-content').forEach(tc => tc.style.display = 'none');
    const targetId = navLinks[a.id];
    if (targetId) {
      document.getElementById(targetId).style.display = 'block';
    }
  });
});

// Set Settings Form default values
document.getElementById('settingEmail').value = email || '';
document.getElementById('settingName').value = email ? email.split('@')[0] : '';

// ── In-memory file store (replace with Supabase later) ───────
let files = JSON.parse(sessionStorage.getItem('zinoFiles') || '[]');
let decryptTarget = null;

function saveFiles() { sessionStorage.setItem('zinoFiles', JSON.stringify(files)); }

// ── File type icons ──────────────────────────────────────────
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
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + ' KB';
  return (bytes/1048576).toFixed(1) + ' MB';
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
}

// ── Render stats ─────────────────────────────────────────────
function renderStats() {
  const total = files.reduce((a,f) => a + f.size, 0);
  document.getElementById('statFiles').textContent = files.length;
  document.getElementById('statStorage').textContent = fmtSize(total);
  document.getElementById('statLast').textContent = files.length ? fmtDate(files[files.length-1].date) : '—';
}

// ── Render file table ─────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('fileBody');
  const empty = document.getElementById('emptyState');
  tbody.innerHTML = '';
  if (!files.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  files.forEach((f, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="file-icon">${fileIcon(f.name)}</span><span class="file-name">${f.name}</span></td>
      <td class="file-size">${fmtSize(f.size)}</td>
      <td class="file-date">${fmtDate(f.date)}</td>
      <td><span class="tag tag-enc">🔐 Encrypted</span></td>
      <td>
        <div class="btn-actions">
          <button class="btn btn-ghost" onclick="openDecrypt(${i})">🔓 Decrypt</button>
          <button class="btn btn-primary" onclick="verifyIntegrity(${i})">✅ Verify</button>
          <button class="btn btn-danger" onclick="deleteFile(${i})">🗑</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  renderStats();
}

// ── Upload handling ───────────────────────────────────────────
const zone = document.getElementById('uploadZone');
const fileInput = document.getElementById('fileInput');
const bar = document.getElementById('progressBar');
const fill = document.getElementById('progressFill');

zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); handleUpload(e.dataTransfer.files); });
fileInput.addEventListener('change', e => handleUpload(e.target.files));

async function handleUpload(list) {
  if (!list.length) return;
  bar.style.display = 'block';
  fill.style.width = '10%';
  
  for (const f of list) {
    // 1. UI Animation: Show encryption process
    const toastId = toast(`🔐 Encrypting "${f.name}" using Hybrid AES-RSA...`, 'info', true);
    
    // 2. Perform actual Hybrid Encryption
    try {
      const { encryptedBlob, encryptedAesKey, iv } = await hybridEncryptFile(f);
      
      // 3. Upload to Supabase Storage (Simulated here)
      fill.style.width = '60%';
      await new Promise(r => setTimeout(r, 800)); // Simulate network upload time
      
      // 4. Save metadata
      files.unshift({ 
        name: f.name, 
        size: f.size, 
        encryptedSize: encryptedBlob.size,
        date: new Date().toISOString(),
        aesKeyEncrypted: Array.from(new Uint8Array(encryptedAesKey)),
        iv: Array.from(new Uint8Array(iv))
      });
      
      removeToast(toastId);
      toast(`✅ "${f.name}" securely uploaded`, 'success');
      
    } catch (err) {
      console.error(err);
      removeToast(toastId);
      toast(`❌ Encryption failed for "${f.name}"`, 'error');
    }
  }
  
  fill.style.width = '100%';
  saveFiles(); 
  renderTable();
  setTimeout(() => { bar.style.display = 'none'; fill.style.width = '0'; fileInput.value = ''; }, 1000);
}

// ── Web Crypto API: Hybrid AES-RSA Logic ──────────────────────
let cachedPublicKey = null;

async function getDemoPublicKey() {
  if (cachedPublicKey) return cachedPublicKey;
  // In a real app, you fetch this from Supabase. For the demo, we generate a pair if missing.
  const pair = await window.crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 4096, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true, ["encrypt", "decrypt"]
  );
  cachedPublicKey = pair.publicKey;
  return cachedPublicKey;
}

async function hybridEncryptFile(file) {
  // 1. Generate random AES-GCM 256-bit key
  const aesKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 }, true, ["encrypt"]
  );
  
  // 2. Read file as ArrayBuffer
  const fileBuffer = await file.arrayBuffer();
  
  // 3. Encrypt file data with AES
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encryptedFileData = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv }, aesKey, fileBuffer
  );
  
  // 4. Encrypt the AES key with RSA Public Key
  const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
  const rsaPubKey = await getDemoPublicKey();
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    { name: "RSA-OAEP" }, rsaPubKey, rawAesKey
  );
  
  // Return the blob to be uploaded, plus metadata
  const encryptedBlob = new Blob([encryptedFileData], { type: 'application/octet-stream' });
  return { encryptedBlob, encryptedAesKey, iv };
}


// ── Decrypt modal ─────────────────────────────────────────────
const modalOverlay = document.getElementById('decryptModal');

function openDecrypt(i) {
  decryptTarget = i;
  document.getElementById('decryptFileName').textContent = files[i].name;
  document.getElementById('privateKeyInput').value = '';
  modalOverlay.classList.add('active');
}

document.getElementById('closeDecryptModal').onclick = () => modalOverlay.classList.remove('active');
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); });

document.getElementById('decryptBtn').onclick = () => {
  const key = document.getElementById('privateKeyInput').value.trim();
  if (!key) { toast('⚠️ Please paste your private key', 'warn'); return; }
  toast(`🔓 Decrypting ${files[decryptTarget].name}… (Supabase integration pending)`);
  modalOverlay.classList.remove('active');
};

// ── Verify integrity ──────────────────────────────────────────
function verifyIntegrity(i) {
  toast(`✅ SHA-256 integrity check passed for "${files[i].name}" (stub)`);
}

// ── Delete file ───────────────────────────────────────────────
function deleteFile(i) {
  const name = files[i].name;
  files.splice(i, 1);
  saveFiles(); renderTable();
  toast(`🗑 "${name}" removed`);
}

// ── Toast helper ──────────────────────────────────────────────
function toast(msg, type = 'info', persistent = false) {
  const container = document.getElementById('toast');
  const el = document.createElement('div');
  const id = 'toast_' + Math.random().toString(36).substr(2, 9);
  el.id = id;
  el.className = 'toast-msg';
  if (type === 'warn') el.style.borderLeftColor = '#f59e0b';
  if (type === 'error') el.style.borderLeftColor = '#ff4444';
  if (type === 'success') el.style.borderLeftColor = '#00D4FF';
  el.textContent = msg;
  container.appendChild(el);
  if (!persistent) setTimeout(() => { if(el.parentNode) el.remove(); }, 3500);
  return id;
}

function removeToast(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ── Sidebar mobile toggle ────────────────────────────────────
document.getElementById('menuToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── Init ──────────────────────────────────────────────────────
renderTable();
renderStats();
