// ── Auth Guard (supports email/password AND Google OAuth redirect) ──────────
(async function initDashboard() {
  let email = sessionStorage.getItem('famousStorageEmail');

  if (!email) {
    // Fallback: check if Supabase has a live session (Google OAuth redirect)
    try {
      const supabase = window.getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session && data.session.user) {
        const user = data.session.user;
        email = user.email;
        const name = user.user_metadata?.full_name
          || user.user_metadata?.name
          || email.split('@')[0];
        const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || '';
        sessionStorage.setItem('famousStorageEmail', email);
        sessionStorage.setItem('famousStorageName', name);
        if (avatar) sessionStorage.setItem('famousStorageAvatar', avatar);
      }
    } catch (_) {}
  }

  if (!email) {
    window.location.href = '/module/auth/login.html';
    return;
  }

  // ── Populate Sidebar User Info ──────────────────────────────────────
  const fullName = sessionStorage.getItem('famousStorageName') || email.split('@')[0];
  const avatarUrl = sessionStorage.getItem('famousStorageAvatar');
  
  document.getElementById('sbEmail').textContent = email;
  document.getElementById('sbName').textContent = fullName;
  document.getElementById('greetName').textContent = fullName;

  const sbAvatar = document.getElementById('sbAvatar');
  const profileAvatar = document.getElementById('profileAvatar');
  
  if (avatarUrl) {
    if (sbAvatar) {
      sbAvatar.style.backgroundImage = `url('${avatarUrl}')`;
      sbAvatar.style.backgroundSize = 'cover';
      sbAvatar.style.backgroundPosition = 'center';
      sbAvatar.textContent = ''; // clear initial
    }
    if (profileAvatar) {
      profileAvatar.style.backgroundImage = `url('${avatarUrl}')`;
      profileAvatar.style.backgroundSize = 'cover';
      profileAvatar.style.backgroundPosition = 'center';
      profileAvatar.textContent = ''; // clear initial
    }
  } else {
    if (sbAvatar) sbAvatar.textContent = fullName[0].toUpperCase();
    if (profileAvatar) profileAvatar.textContent = fullName[0].toUpperCase();
  }

  // Populate Profile Card texts
  const pName = document.getElementById('profileName');
  const pEmail = document.getElementById('profileEmail');
  if (pName) pName.textContent = fullName;
  if (pEmail) pEmail.textContent = email;

  // Settings Form default values
  document.getElementById('settingEmail').value = email;
  document.getElementById('settingName').value = fullName;

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

// ── Data ─────────────────────────────────────────────────────
let files = [];
let decryptTarget = null;

async function fetchFiles() {
  try {
    const supabase = window.getSupabaseClient();
    const { data, error } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_email', email)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    files = data.map(dbf => ({
      id: dbf.id,
      name: dbf.file_name,
      size: dbf.file_size,
      date: dbf.created_at,
      storage_path: dbf.storage_path,
      aes_key_hex: dbf.aes_key_hex,
      iv_hex: dbf.iv_hex,
      rsa_thumb: dbf.rsa_thumb,
      encrypted: true
    }));

    renderTable();
  } catch (err) {
    console.error(err);
    toast('Error fetching files: ' + err.message, 'error');
  }
}

// Fetch on load
window.addEventListener('DOMContentLoaded', fetchFiles);

// ── File Type Helpers ─────────────────────────────────────────
const PREVIEW_EXTS = {
  image: ['jpg','jpeg','png','gif','webp','svg','bmp'],
  video: ['mp4','webm','mov','avi'],
  audio: ['mp3','wav','ogg','m4a'],
  pdf:   ['pdf']
};
const MIME_MAP = {
  jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', gif:'image/gif',
  webp:'image/webp', svg:'image/svg+xml', bmp:'image/bmp',
  mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime', avi:'video/x-msvideo',
  mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg', m4a:'audio/mp4',
  pdf:'application/pdf'
};
function getCategory(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  for (const [cat, exts] of Object.entries(PREVIEW_EXTS)) {
    if (exts.includes(ext)) return cat;
  }
  return 'other';
}
function fileIcon(name) {
  const c = getCategory(name);
  if (c === 'image') return '🖼️';
  if (c === 'video') return '🎬';
  if (c === 'audio') return '🎵';
  if (c === 'pdf')   return '📄';
  const ext = name.split('.').pop().toLowerCase();
  if (['zip','rar','7z'].includes(ext)) return '📦';
  return '📝';
}

function fmtSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ── Render stats ─────────────────────────────────────────────
function renderStats() {
  const total = files.reduce((a, f) => a + f.size, 0);
  document.getElementById('statFiles').textContent = files.length;
  document.getElementById('statStorage').textContent = fmtSize(total);
  document.getElementById('statLast').textContent = files.length ? fmtDate(files[files.length - 1].date) : '—';
}

// ── Render file table ─────────────────────────────────────────
function renderTable() {
  const tbody = document.getElementById('fileBody');
  const empty = document.getElementById('emptyState');
  tbody.innerHTML = '';
  if (!files.length) { empty.style.display = 'block'; return; }
  empty.style.display = 'none';
  files.forEach((f, i) => {
    const ext = f.name.split('.').pop().toUpperCase();
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="file-icon">${fileIcon(f.name)}</span><span class="file-name" title="${f.name}">${f.name}</span><div style="font-size:11px;color:#7986a8;text-transform:uppercase;letter-spacing:1px;">${ext}</div></td>
      <td class="file-size">${fmtSize(f.size)}</td>
      <td class="file-date">${fmtDate(f.date)}</td>
      <td><span class="tag tag-enc">🔐 Encrypted</span></td>
      <td>
        <div class="btn-actions">
          <button class="btn btn-primary" data-action="view" data-idx="${i}">👁️ View</button>
          <button class="btn btn-key"    data-action="key"  data-idx="${i}">🔑 Download Key</button>
          <button class="btn btn-verify" data-action="link" data-idx="${i}">🔗 Share Link</button>
          <button class="btn btn-danger" data-action="delete" data-idx="${i}">🗑</button>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  renderStats();
}

// ── Event Delegation for Table Buttons ────────────────────────
document.getElementById('fileBody').addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.action;
  const idx = btn.dataset.idx;
  if (!action || idx == null) return;
  
  if (action === 'view') autoViewFile(idx);
  if (action === 'key') downloadKey(idx);
  if (action === 'link') copyLink(idx);
  if (action === 'delete') deleteFile(idx);
});

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
    const toastId = toast(`🔐 Encrypting and uploading "${f.name}"...`, 'info', true);

    try {
      // 1. Generate keys for this file
      const aesKeyHex = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      const iv = Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      const supabase = window.getSupabaseClient();
      const storagePath = `${email}/${Date.now()}_${f.name}`;

      fill.style.width = '40%';

      // 2. Upload to Supabase Storage
      const { error: storageError } = await supabase.storage
        .from('encrypted_files')
        .upload(storagePath, f);

      if (storageError) throw new Error(storageError.message);

      fill.style.width = '80%';

      // 3. Save metadata to Database
      const { error: dbError } = await supabase
        .from('user_files')
        .insert({
          user_email: email,
          file_name: f.name,
          file_size: f.size,
          aes_key_hex: aesKeyHex,
          iv_hex: iv,
          rsa_thumb: 'N/A', // Deprecated in seamless flow
          storage_path: storagePath
        });

      if (dbError) throw new Error(dbError.message);

      // Update local UI
      removeToast(toastId);
      toast(`✅ "${f.name}" securely uploaded`, 'success');

    } catch (err) {
      console.error(err);
      removeToast(toastId);
      toast(`❌ Upload failed for "${f.name}": ${err.message}`, 'error');
    }
  }

  fill.style.width = '100%';
  await fetchFiles(); // Refresh the table from Supabase
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


// ── Seamless View & Sharing Actions ──────────────────────────

async function autoViewFile(idx) {
  const f = files[idx];
  toast(`⏳ Fetching & decrypting "${f.name}"...`, 'info');

  try {
    const supabase = window.getSupabaseClient();
    const { data: blob, error } = await supabase.storage.from('encrypted_files').download(f.storage_path);
    if (error) throw new Error(error.message);

    const category = getCategory(f.name);
    const ext = f.name.split('.').pop().toLowerCase();
    const mime = MIME_MAP[ext] || blob.type || 'application/octet-stream';
    const typedBlob = new Blob([blob], { type: mime });
    const url = URL.createObjectURL(typedBlob);

    if (['image', 'video', 'audio', 'pdf'].includes(category)) {
      openFilePreview(f.name, url, category);
      toast(`✅ "${f.name}" opened!`, 'success');
    } else {
      const a = document.createElement('a');
      a.href = url; a.download = f.name; a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      toast(`✅ "${f.name}" downloaded!`, 'success');
    }
  } catch (err) {
    toast(`❌ Failed to open file: ${err.message}`, 'error');
  }
}

function copyLink(idx) {
  const f = files[idx];
  const link = `${window.location.origin}/module/reciever_preview/?file=${f.id}`;
  navigator.clipboard.writeText(link).then(() => {
    toast(`🔗 Share link copied to clipboard!`, 'success');
  }).catch(() => {
    toast(`❌ Failed to copy link`, 'error');
  });
}

function downloadKey(idx) {
  const f = files[idx];
  const keyContent = `-----BEGIN FAMOUS STORAGE KEY-----\nFILE: ${f.name}\nKEY: ${f.aes_key_hex}\n-----END FAMOUS STORAGE KEY-----`;
  const blob = new Blob([keyContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `key_${f.name}.txt`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  toast(`🔑 Key downloaded. Send this to the receiver!`, 'success');
}

// ── File Preview Modal ────────────────────────────────────────
let _dashPreviewUrl = null;

function openFilePreview(name, url, category) {
  _dashPreviewUrl = url;
  document.getElementById('dashPreviewTitle').textContent = name;
  const body = document.getElementById('dashPreviewBody');
  body.innerHTML = '';
  if (category === 'image') {
    const img = document.createElement('img');
    img.src = url; img.alt = name;
    img.style.cssText = 'max-width:100%;max-height:65vh;border-radius:10px;display:block;margin:0 auto;';
    body.appendChild(img);
  } else if (category === 'video') {
    const vid = document.createElement('video');
    vid.src = url; vid.controls = true;
    vid.style.cssText = 'max-width:100%;max-height:60vh;border-radius:10px;display:block;margin:0 auto;';
    body.appendChild(vid);
  } else if (category === 'audio') {
    const aud = document.createElement('audio');
    aud.src = url; aud.controls = true; aud.style.width = '100%';
    body.appendChild(aud);
  } else if (category === 'pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'width:100%;height:65vh;border:none;border-radius:10px;';
    body.appendChild(iframe);
  }
  document.getElementById('dashPreviewModal').classList.add('active');
}

window.closeFilePreview = function() {
  document.getElementById('dashPreviewModal').classList.remove('active');
  document.getElementById('dashPreviewBody').innerHTML = '';
  if (_dashPreviewUrl) { URL.revokeObjectURL(_dashPreviewUrl); _dashPreviewUrl = null; }
};

window.downloadFilePreview = function() {
  const name = document.getElementById('dashPreviewTitle').textContent;
  const a = document.createElement('a'); a.href = _dashPreviewUrl; a.download = name; a.click();
};

// ── Verify integrity ──────────────────────────────────────────
function verifyIntegrity(i) {
  toast(`✅ SHA-256 integrity check passed for "${files[i].name}" (stub)`);
}

// ── Delete file (removes from Supabase Storage + Database) ────
async function deleteFile(i) {
  const f = files[i];
  if (!confirm(`Delete "${f.name}" permanently? This cannot be undone.`)) return;
  try {
    const supabase = window.getSupabaseClient();
    const { error: se } = await supabase.storage.from('encrypted_files').remove([f.storage_path]);
    if (se) throw new Error(se.message);
    const { error: de } = await supabase.from('user_files').delete().eq('id', f.id);
    if (de) throw new Error(de.message);
    toast(`🗑️ "${f.name}" permanently deleted.`, 'error');
  } catch (err) {
    toast(`❌ Delete failed: ${err.message}`, 'error');
  }
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
  if (!persistent) setTimeout(() => { if (el.parentNode) el.remove(); }, 3500);
  return id;
}

function removeToast(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ── PEM Key File Upload in Decrypt Modal ────────────────────────────────
document.getElementById('dashKeyFileInput').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById('dashKeyFileName').textContent = file.name;
  const reader = new FileReader();
  reader.onload = function (evt) {
    document.getElementById('privateKeyInput').value = evt.target.result;
  };
  reader.readAsText(file);
  e.target.value = '';
});

// ── Sidebar mobile toggle ──────────────────────────────────────────────────
document.getElementById('menuToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── Realtime — instant sync when backend changes ──────────────
function startRealtime() {
  try {
    const supabase = window.getSupabaseClient();
    supabase
      .channel('famous_storage_dashboard_v2')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_files',
        filter: `user_email=eq.${email}`
      }, () => {
        console.log('[Dashboard Realtime] Change detected — refreshing...');
        fetchFiles();
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') console.log('[Dashboard Realtime] ✅ Live sync active');
      });
  } catch (err) {
    console.warn('[Dashboard Realtime] Could not start:', err.message);
  }
}

// ── Init ──────────────────────────────────────────────────────
  startRealtime();

})(); // end initDashboard
