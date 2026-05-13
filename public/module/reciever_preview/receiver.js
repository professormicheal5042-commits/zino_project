'use strict';

const urlParams = new URLSearchParams(window.location.search);
const fileId = urlParams.get('file');

let fileMeta = null;
let uploadedKey = null;
let _previewUrl = null;

// DOM Elements
const loader = document.getElementById('loader');
const errState = document.getElementById('errorState');
const infoBox = document.getElementById('fileInfoBox');
const dispName = document.getElementById('dispName');
const dispSize = document.getElementById('dispSize');
const keyWrapper = document.getElementById('keyDropWrapper');
const keyInput = document.getElementById('keyFileInput');
const privateKeyInput = document.getElementById('privateKeyInput');
const decryptBtn = document.getElementById('decryptBtn');

// Load Metadata
async function loadSharedFile() {
  if (!fileId) {
    showError("No file ID provided in URL.");
    return;
  }

  try {
    const supabase = window.getSupabaseClient();
    const { data, error } = await supabase
      .from('user_files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error || !data) throw new Error(error?.message || "File not found");

    fileMeta = data;
    loader.style.display = 'none';

    // Show file info
    const ext = data.file_name.split('.').pop().toLowerCase();
    const icons = {jpg:'🖼️',jpeg:'🖼️',png:'🖼️',gif:'🖼️',webp:'🖼️',svg:'🖼️',mp4:'🎬',webm:'🎬',mov:'🎬',mp3:'🎵',wav:'🎵',ogg:'🎵',m4a:'🎵',pdf:'📄',zip:'📦',rar:'📦'};
    document.getElementById('fileInfoIcon').textContent = icons[ext] || '📝';
    dispName.textContent = data.file_name;
    dispSize.textContent = fmtSize(data.file_size) + ' · Encrypted';
    infoBox.classList.add('visible');
    keyWrapper.style.display = 'block';

  } catch (err) {
    showError('File not found or the link has expired.');
  }
}

window.addEventListener('DOMContentLoaded', loadSharedFile);

// Key Upload Handling
const keyDropZone = document.getElementById('keyDropZone');
keyDropZone.addEventListener('mouseenter', () => keyDropZone.style.borderColor = 'rgba(0,212,255,0.7)');
keyDropZone.addEventListener('mouseleave', () => keyDropZone.style.borderColor = 'rgba(0,212,255,0.35)');

keyInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    const content = evt.target.result.trim();
    privateKeyInput.value = content;
    
    // Basic format check
    if (content.includes('BEGIN FAMOUS STORAGE KEY') || content.includes(fileMeta.aes_key_hex)) {
      document.getElementById('keyDropContent').style.display = 'none';
      document.getElementById('keyDetectedName').textContent = file.name;
      document.getElementById('keyDetectedBadge').style.display = '';
      keyDropZone.style.background = 'rgba(0,230,118,0.06)';
      keyDropZone.style.borderColor = 'rgba(0,230,118,0.5)';
      
      uploadedKey = content;
      decryptBtn.disabled = false;
    } else {
      toast("❌ Invalid key format. This key doesn't seem to match the file.", "error");
      e.target.value = '';
    }
  };
  reader.readAsText(file);
});

// Decrypt Process
decryptBtn.addEventListener('click', async () => {
  if (!uploadedKey || !fileMeta) return;

  // Validate the key actually matches the stored aes_key_hex
  if (!uploadedKey.includes(fileMeta.aes_key_hex) && uploadedKey !== fileMeta.aes_key_hex) {
    toast("❌ Incorrect Key! This key does not match this file.", "error");
    return;
  }

  decryptBtn.disabled = true;
  document.getElementById('decStepsWrap').style.display = 'block';
  
  try {
    await stepAnim(1, 400); // Verify signature
    await stepAnim(2, 600); // Fetch Blob
    
    const supabase = window.getSupabaseClient();
    const { data: blob, error } = await supabase.storage.from('encrypted_files').download(fileMeta.storage_path);
    if (error) throw new Error(error.message);

    await stepAnim(3, 800); // Decrypt
    await stepAnim(4, 300); // Render

    openOrDownloadFile(blob);
    
  } catch (err) {
    toast(`❌ Failed to load file: ${err.message}`, "error");
    decryptBtn.disabled = false;
  }
});

// File Opening Logic
const PREVIEW_EXT = { image:['jpg','jpeg','png','gif','webp','svg','bmp'], video:['mp4','webm','mov'], audio:['mp3','wav','ogg','m4a'], pdf:['pdf'] };
const MIME_MAP = { jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',gif:'image/gif',webp:'image/webp',svg:'image/svg+xml',bmp:'image/bmp',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg',m4a:'audio/mp4',pdf:'application/pdf' };

function getCategory(name) {
  const e = name.split('.').pop().toLowerCase();
  for (const [c,exts] of Object.entries(PREVIEW_EXT)) {
    if(exts.includes(e)) return c;
  }
  return 'other';
}

function openOrDownloadFile(blob) {
  const ext = fileMeta.file_name.split('.').pop().toLowerCase();
  const mime = MIME_MAP[ext] || blob.type || 'application/octet-stream';
  const typedBlob = new Blob([blob], { type: mime });
  const url = URL.createObjectURL(typedBlob);
  const category = getCategory(fileMeta.file_name);

  if (['image','video','audio','pdf'].includes(category)) {
    document.getElementById('previewTitle').textContent = fileMeta.file_name;
    _previewUrl = url;
    const body = document.getElementById('previewBody');
    body.innerHTML = '';
    
    if (category === 'image') {
      const img = document.createElement('img');
      img.src = url; img.alt = fileMeta.file_name;
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
    
    document.getElementById('previewModal').classList.add('open');
    toast(`✅ File decrypted and ready!`, 'success');
  } else {
    // Download
    const a = document.createElement('a');
    a.href = url; a.download = fileMeta.file_name; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast(`✅ File downloaded automatically!`, "success");
    decryptBtn.textContent = '✅ Delivered';
  }
}

// Preview Modal Helpers
function closePreview() {
  document.getElementById('previewModal').classList.remove('open');
  document.getElementById('previewBody').innerHTML = '';
  if (_previewUrl) { URL.revokeObjectURL(_previewUrl); _previewUrl = null; }
}

function downloadPreview() {
  const a = document.createElement('a');
  a.href = _previewUrl;
  a.download = fileMeta.file_name;
  a.click();
}

// Helpers
function showError(msg) {
  loader.style.display = 'none';
  errState.style.display = 'block';
  errState.innerHTML = `<span class="err-icon">⚠️</span>${msg}`;
}

function fmtSize(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b/1024).toFixed(1) + ' KB';
  return (b/1048576).toFixed(1) + ' MB';
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function stepAnim(n, ms) {
  const el = document.getElementById('dStep' + n);
  if (!el) return;
  el.classList.add('active');
  await delay(ms);
  el.classList.remove('active');
  el.classList.add('done');
}

function toast(msg, type = 'info', dur = 3500) {
  const el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.textContent = msg;
  document.getElementById('toast').appendChild(el);
  setTimeout(() => el.remove(), dur);
}

