/* ═══════════════════════════════════════════════════════════
   Famous Storage — My Files v2
   ═══════════════════════════════════════════════════════════ */

// ── State ─────────────────────────────────────────────────────
let files = [];
let deleteTargetIdx = null;
let _previewUrl = null;

// ── File Type Helpers ─────────────────────────────────────────
const PREVIEW_EXTS = {
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
  video: ['mp4', 'webm', 'mov', 'avi'],
  audio: ['mp3', 'wav', 'ogg', 'm4a'],
  pdf: ['pdf']
};
const MIME_TYPES = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp',
  mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', avi: 'video/x-msvideo',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', m4a: 'audio/mp4',
  pdf: 'application/pdf'
};
function getCategory(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  for (const [cat, exts] of Object.entries(PREVIEW_EXTS)) {
    if (exts.includes(ext)) return cat;
  }
  return 'other';
}

// ── Utility ───────────────────────────────────────────────────
function fileIcon(name) {
  const c = getCategory(name);
  if (c === 'image') return '🖼️';
  if (c === 'video') return '🎬';
  if (c === 'audio') return '🎵';
  if (c === 'pdf') return '📄';
  const ext = name.split('.').pop().toLowerCase();
  if (['zip', 'rar', '7z'].includes(ext)) return '📦';
  return '📝';
}
function fmtSize(b) {
  if (!b || b < 1024) return (b || 0) + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}
function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}
function toast(msg, type, dur) {
  type = type || 'info';
  dur = dur || 3500;
  const el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.textContent = msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(function() { el.remove(); }, dur);
}

// ── Render Table ──────────────────────────────────────────────
function renderTable(data) {
  const tbody = document.getElementById('fileBody');
  const empty = document.getElementById('emptyState');
  const card  = document.getElementById('tableCard');
  const badge = document.getElementById('fileCountBadge');

  badge.textContent = data.length + ' file' + (data.length !== 1 ? 's' : '');
  tbody.innerHTML = '';

  if (!data.length) {
    empty.style.display = 'block';
    card.style.display  = 'none';
    return;
  }
  empty.style.display = 'none';
  card.style.display  = 'block';

  data.forEach(function(f, i) {
    const ext = f.name.split('.').pop().toUpperCase();
    const tr  = document.createElement('tr');
    tr.innerHTML =
      '<td class="td-check"><input type="checkbox" class="row-check" data-idx="' + i + '"/></td>' +
      '<td>' +
        '<div class="file-cell">' +
          '<div class="file-type-icon">' + fileIcon(f.name) + '</div>' +
          '<div>' +
            '<div class="file-name" title="' + f.name + '">' + f.name + '</div>' +
            '<div class="file-ext">' + ext + '</div>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td class="td-size">' + fmtSize(f.size) + '</td>' +
      '<td class="td-date">' + fmtDate(f.date) + '</td>' +
      '<td><span class="status-tag status-enc">🔐 Encrypted</span></td>' +
      '<td>' +
        '<div class="btn-actions">' +
          '<button class="btn btn-primary" data-action="view"   data-idx="' + i + '">👁️ View</button>' +
          '<button class="btn btn-key"     data-action="key"    data-idx="' + i + '">🔑 Download Key</button>' +
          '<button class="btn btn-verify"  data-action="share"  data-idx="' + i + '">🔗 Share Link</button>' +
          '<button class="btn btn-danger"  data-action="delete" data-idx="' + i + '">🗑</button>' +
        '</div>' +
      '</td>';
    tbody.appendChild(tr);
  });
}

// ── Event delegation — handles ALL button clicks in the table ─
document.getElementById('fileBody').addEventListener('click', function(e) {
  const btn = e.target.closest('button[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  const idx    = parseInt(btn.dataset.idx, 10);
  if (action === 'view')   viewFile(idx);
  if (action === 'key')    downloadKey(idx);
  if (action === 'share')  copyLink(idx);
  if (action === 'delete') openDeleteModal(idx);
});

// ── Search ────────────────────────────────────────────────────
document.getElementById('searchInput').addEventListener('input', function(e) {
  const q = e.target.value.trim().toLowerCase();
  renderTable(q ? files.filter(function(f) { return f.name.toLowerCase().includes(q); }) : files);
});

// ── Select All ────────────────────────────────────────────────
document.getElementById('selectAll').addEventListener('change', function(e) {
  document.querySelectorAll('.row-check').forEach(function(cb) {
    cb.checked = e.target.checked;
    cb.closest('tr').classList.toggle('selected', e.target.checked);
  });
});

// ── Fetch Files ───────────────────────────────────────────────
async function fetchFiles() {
  try {
    const supabase = window.getSupabaseClient();
    const { data, error } = await supabase
      .from('user_files')
      .select('*')
      .eq('user_email', window._myFilesEmail)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);

    files = data.map(function(d) {
      return {
        id: d.id,
        name: d.file_name,
        size: d.file_size,
        date: d.created_at,
        storage_path: d.storage_path,
        aes_key_hex: d.aes_key_hex,
        iv_hex: d.iv_hex
      };
    });

    renderTable(files);
  } catch (err) {
    console.error('fetchFiles:', err);
    toast('Error fetching files: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
// ACTION 1 — VIEW FILE
// ══════════════════════════════════════════════════════════════
async function viewFile(idx) {
  const f = files[idx];
  if (!f) return;
  toast('⏳ Loading "' + f.name + '"...', 'info');
  try {
    const supabase = window.getSupabaseClient();
    const { data: blob, error } = await supabase.storage
      .from('encrypted_files')
      .download(f.storage_path);
    if (error) throw new Error(error.message);

    const category = getCategory(f.name);
    const ext  = f.name.split('.').pop().toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    const typed = new Blob([blob], { type: mime });
    const url   = URL.createObjectURL(typed);

    if (['image', 'video', 'audio', 'pdf'].includes(category)) {
      openPreviewModal(f.name, url, category);
    } else {
      const a = document.createElement('a');
      a.href = url; a.download = f.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(function() { URL.revokeObjectURL(url); }, 3000);
      toast('✅ "' + f.name + '" downloaded!', 'success');
    }
  } catch (err) {
    console.error('viewFile:', err);
    toast('❌ Failed to open file: ' + err.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════
// ACTION 2 — DOWNLOAD KEY
// ══════════════════════════════════════════════════════════════
function downloadKey(idx) {
  const f = files[idx];
  if (!f) return;
  if (!f.aes_key_hex) {
    toast('❌ No encryption key stored for this file.', 'error');
    return;
  }
  const content = [
    '-----BEGIN FAMOUS STORAGE KEY-----',
    'FILE: ' + f.name,
    'FILE_ID: ' + f.id,
    'KEY: ' + f.aes_key_hex,
    'IV: ' + (f.iv_hex || ''),
    '-----END FAMOUS STORAGE KEY-----'
  ].join('\n');

  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = 'famous_storage_key_' + f.name.replace(/\s+/g, '_') + '.txt';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(function() { URL.revokeObjectURL(url); }, 3000);
  toast('🔑 Key downloaded! Send it securely to your receiver.', 'success');
}

// ══════════════════════════════════════════════════════════════
// ACTION 3 — SHARE LINK
// ══════════════════════════════════════════════════════════════
function copyLink(idx) {
  const f = files[idx];
  if (!f) return;
  const link = window.location.origin + '/module/reciever_preview/?file=' + f.id;

  function fallback() {
    const ta = document.createElement('textarea');
    ta.value = link;
    ta.style.cssText = 'position:fixed;opacity:0;';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('🔗 Share link copied!', 'success');
  }

  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(link)
      .then(function() { toast('🔗 Share link copied to clipboard!', 'success'); })
      .catch(fallback);
  } else {
    fallback();
  }
}

// ══════════════════════════════════════════════════════════════
// PREVIEW MODAL
// ══════════════════════════════════════════════════════════════
function openPreviewModal(name, url, category) {
  _previewUrl = url;
  document.getElementById('previewTitle').textContent = name;
  const body = document.getElementById('previewBody');
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
    aud.src = url; aud.controls = true;
    aud.style.cssText = 'width:100%;margin-top:20px;';
    body.appendChild(aud);
  } else if (category === 'pdf') {
    const iframe = document.createElement('iframe');
    iframe.src = url;
    iframe.style.cssText = 'width:100%;height:65vh;border:none;border-radius:10px;';
    body.appendChild(iframe);
  }

  document.getElementById('previewBackdrop').classList.add('open');
  toast('✅ "' + name + '" opened!', 'success');
}

window.closePreview = function() {
  document.getElementById('previewBackdrop').classList.remove('open');
  document.getElementById('previewBody').innerHTML = '';
  if (_previewUrl) { URL.revokeObjectURL(_previewUrl); _previewUrl = null; }
};

window.downloadPreview = function() {
  const name = document.getElementById('previewTitle').textContent;
  const a = document.createElement('a');
  a.href = _previewUrl; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
};

// ══════════════════════════════════════════════════════════════
// DELETE MODAL
// ══════════════════════════════════════════════════════════════
const deleteBackdrop = document.getElementById('deleteBackdrop');

function openDeleteModal(idx) {
  deleteTargetIdx = idx;
  document.getElementById('deleteFileName').textContent = files[idx].name;
  deleteBackdrop.classList.add('open');
}
function closeDeleteModal() { deleteBackdrop.classList.remove('open'); }
window.closeDelete = closeDeleteModal;

document.getElementById('cancelDelete').addEventListener('click', closeDeleteModal);
deleteBackdrop.addEventListener('click', function(e) {
  if (e.target === deleteBackdrop) closeDeleteModal();
});

document.getElementById('confirmDelete').addEventListener('click', async function() {
  const f = files[deleteTargetIdx];
  if (!f) return;
  try {
    const supabase = window.getSupabaseClient();
    const { error: se } = await supabase.storage.from('encrypted_files').remove([f.storage_path]);
    if (se) throw new Error(se.message);
    const { error: de } = await supabase.from('user_files').delete().eq('id', f.id);
    if (de) throw new Error(de.message);
    files.splice(deleteTargetIdx, 1);
    renderTable(files);
    closeDeleteModal();
    toast('🗑️ "' + f.name + '" permanently deleted.', 'error');
  } catch (err) {
    toast('Delete failed: ' + err.message, 'error');
    closeDeleteModal();
  }
});

// ══════════════════════════════════════════════════════════════
// REALTIME — auto-refresh on backend changes
// ══════════════════════════════════════════════════════════════
function startRealtime(userEmail) {
  try {
    const supabase = window.getSupabaseClient();
    supabase
      .channel('famous_storage_myfiles_v2')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_files',
        filter: 'user_email=eq.' + userEmail
      }, function() {
        console.log('[Realtime] Change detected — refreshing...');
        fetchFiles();
      })
      .subscribe(function(status) {
        if (status === 'SUBSCRIBED') console.log('[Realtime] ✅ Live sync active');
      });
  } catch (err) {
    console.warn('[Realtime] Could not start:', err.message);
  }
}

// ══════════════════════════════════════════════════════════════
// INIT — Auth Guard + Boot
// ══════════════════════════════════════════════════════════════
(async function init() {
  let email = sessionStorage.getItem('famousStorageEmail');

  // Fallback: check live Supabase session (Google OAuth users)
  if (!email) {
    try {
      const supabase = window.getSupabaseClient();
      const { data, error } = await supabase.auth.getSession();
      if (!error && data.session && data.session.user) {
        const user = data.session.user;
        email = user.email;
        const name = (user.user_metadata && (user.user_metadata.full_name || user.user_metadata.name))
                     || email.split('@')[0];
        sessionStorage.setItem('famousStorageEmail', email);
        sessionStorage.setItem('famousStorageName', name);
      }
    } catch (_) {}
  }

  if (!email) {
    window.location.href = '/module/auth/login.html';
    return;
  }

  window._myFilesEmail = email;

  const fullName = sessionStorage.getItem('famousStorageName') || email.split('@')[0];
  document.getElementById('sbEmail').textContent  = email;
  document.getElementById('sbAvatar').textContent = fullName[0].toUpperCase();
  document.getElementById('sbName').textContent   = fullName;

  await fetchFiles();
  startRealtime(email);
})();
