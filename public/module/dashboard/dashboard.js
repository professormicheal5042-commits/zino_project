// ── Auth Guard ──────────────────────────────────────────────
const email = sessionStorage.getItem('zinoEmail');
if (!email) window.location.href = '/module/auth/login.html';

// ── Populate Sidebar User Info ───────────────────────────────
document.getElementById('sbEmail').textContent = email || '';
const initial = (email || 'U')[0].toUpperCase();
document.getElementById('sbAvatar').textContent = initial;
document.getElementById('sbName').textContent = email ? email.split('@')[0] : 'User';
document.getElementById('greetName').textContent = email ? email.split('@')[0] : 'User';

// ── Active Nav Link ──────────────────────────────────────────
document.querySelectorAll('.sb-nav a').forEach(a => {
  if (a.href === location.href) a.classList.add('active');
});

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

function handleUpload(list) {
  if (!list.length) return;
  bar.style.display = 'block';
  fill.style.width = '0';
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 25;
    fill.style.width = Math.min(progress, 90) + '%';
  }, 200);
  setTimeout(() => {
    clearInterval(interval);
    fill.style.width = '100%';
    for (const f of list) {
      files.unshift({ name: f.name, size: f.size, date: new Date().toISOString() });
    }
    saveFiles(); renderTable();
    setTimeout(() => { bar.style.display = 'none'; fill.style.width = '0'; }, 600);
    toast(`✅ ${list.length} file(s) uploaded`);
    fileInput.value = '';
  }, 1400);
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
function toast(msg, type = 'info') {
  const container = document.getElementById('toast');
  const el = document.createElement('div');
  el.className = 'toast-msg';
  if (type === 'warn') el.style.borderLeftColor = '#f59e0b';
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// ── Sidebar mobile toggle ────────────────────────────────────
document.getElementById('menuToggle')?.addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('open');
});

// ── Init ──────────────────────────────────────────────────────
renderTable();
renderStats();
