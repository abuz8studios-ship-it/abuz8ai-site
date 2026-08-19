// ABUZ8 GPU Tools Connector — v2 (2026-05-09 morning shift fix)
// =============================================================
// Connects ComfyUI tool pages to the local QADIR backend via the universal
// tool registry endpoint at :8900/api/tools/run. The previous version called
// dead endpoints (:9820/comfyui/generate, :8188/prompt with wrong body shape)
// and silently failed on every Generate click — fixed.
//
// CHANGES vs v1:
//   • Primary endpoint flipped to :8900 (Mach 3 backend, alive).
//   • submitToComfyUI(workflow, params) now POSTs to /api/tools/run with the
//     correct body shape {name, args, async:false} and normalizes the
//     response to {images:[urls]} / {video:url} regardless of which tool ran.
//   • Health check uses :8900/health (real route, returns 200 + version).
//   • Optional ComfyUI direct probe (:8188/system_stats) kept as a secondary
//     "GPU is up" signal but no longer used as the actual generation path.
//   • Workflow→tool name map handles legacy aliases (e.g. "headshot" →
//     "comfyui_studio") so old pages don't need editing.
//
// Page-side contract (unchanged): pages call
//     await submitToComfyUI('make_cartoon', { image, prompt, style })
//   and expect either {images:[url, ...]} or {output:url} back.

const GPU_CONFIG = {
  // Mach 3 FastAPI backend — the universal tool registry lives here.
  api: 'http://localhost:8900',
  // ComfyUI direct (only used as a "GPU alive" probe — never for generation).
  comfyui: 'http://localhost:8188',
  // Status check interval
  checkInterval: 30000,
  // Max file size (10MB)
  maxFileSize: 10 * 1024 * 1024,
  // Per-call timeout (long enough for video gen on RTX 5090)
  callTimeoutMs: 180000,
};

// ─── Workflow alias → tool_registry tool name ───
// The tool registry uses canonical names (make_cartoon, comfyui_lipsync, ...).
// Some legacy pages pass shortcut workflow names — we map them here so the
// existing HTML doesn't need to change.
const WORKFLOW_ALIASES = {
  // Direct passthroughs (pages already use the canonical name)
  make_cartoon:               'make_cartoon',
  comfyui_lipsync:            'comfyui_lipsync',
  comfyui_studio:             'comfyui_studio',
  comfyui_generate:           'comfyui_generate',
  comfyui_image_to_video:     'comfyui_image_to_video',
  comfyui_video:              'comfyui_video',
  comfyui_anime:              'comfyui_anime',
  comfyui_consistent_character:'comfyui_consistent_character',
  comfyui_fun_inpaint:        'comfyui_fun_inpaint',
  comfyui_fun_control:        'comfyui_fun_control',
  comfyui_upscale:            'comfyui_upscale',
  comfyui_img2img:            'comfyui_img2img',
  comfyui_music:              'comfyui_music',
  comfyui_sfx:                'comfyui_sfx',
  comfyui_vace:               'comfyui_vace',
  comfyui_stitch_long:        'comfyui_stitch_long',
  avatar_speak:               'avatar_speak',
  render_long:                'render_long',
  make_character_reference:   'make_character_reference',
  // Legacy / shortcut aliases used by older pages
  headshot:                   'comfyui_studio',          // ai-headshot
  thumbnail:                  'comfyui_generate',        // ai-thumbnail
  product_photo:              'comfyui_img2img',         // ai-product-photo
  upscaler:                   'comfyui_upscale',         // ai-image-upscaler
  logo:                       'comfyui_generate',        // ai-logo-generator
  qr_art:                     'comfyui_fun_control',     // ai-qr-art
  room_redesign:              'comfyui_img2img',         // ai-room-redesign
  video:                      'comfyui_video',           // ai-video-generator
  background_remove:          'comfyui_fun_inpaint',     // ai-background-remover
  cartoon:                    'make_cartoon',            // any "cartoon" alias
};

function _resolveWorkflow(name) {
  return WORKFLOW_ALIASES[name] || name; // fall through if caller already passed a real tool name
}

// ─── Server Status ───
class GPUStatus {
  constructor() {
    this.online = false;
    this.statusEl = null;
    this.init();
  }

  init() {
    this.statusEl = document.createElement('div');
    this.statusEl.id = 'gpu-status';
    this.statusEl.style.cssText = `
      position:fixed;bottom:20px;right:20px;z-index:999;
      padding:10px 18px;border-radius:10px;font-size:12px;font-weight:600;
      font-family:'Inter',sans-serif;display:flex;align-items:center;gap:8px;
      backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);
      transition:all .3s;cursor:pointer;
    `;
    this.statusEl.onclick = () => this.check();
    document.body.appendChild(this.statusEl);
    this.check();
    setInterval(() => this.check(), GPU_CONFIG.checkInterval);
  }

  async check() {
    // Primary signal: Mach 3 backend at :8900 (this is the actual generation path).
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(GPU_CONFIG.api + '/health', { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        this.setOnline(true, 'mach3');
        return;
      }
    } catch (e) {}

    // Secondary signal: ComfyUI direct (means the GPU is up but the API bridge isn't).
    // We mark "online with caveat" — the generate call will still fail without :8900,
    // but at least the user knows the GPU itself is fine.
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 3000);
      const res = await fetch(GPU_CONFIG.comfyui + '/system_stats', { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) {
        this.setOnline(false, 'comfy-only'); // GPU alive but bridge down — Generate will warn
        return;
      }
    } catch (e) {}

    this.setOnline(false, 'down');
  }

  setOnline(online, mode) {
    this.online = online;
    if (online) {
      this.statusEl.style.background = 'rgba(34,197,94,.15)';
      this.statusEl.style.color = '#22c55e';
      this.statusEl.style.borderColor = 'rgba(34,197,94,.3)';
      this.statusEl.innerHTML = '<span style="width:8px;height:8px;border-radius:50%;background:#22c55e;display:inline-block;"></span> GPU Server Online';
    } else {
      this.statusEl.style.background = 'rgba(239,68,68,.1)';
      this.statusEl.style.color = '#f87171';
      this.statusEl.style.borderColor = 'rgba(239,68,68,.2)';
      const label = mode === 'comfy-only' ? 'GPU Up — Bridge Offline' : 'GPU Server Offline';
      this.statusEl.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:#ef4444;display:inline-block;"></span> ${label}`;
    }
    document.querySelectorAll('[data-gpu-required]').forEach(btn => {
      if (!online) {
        btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
        btn.textContent = 'Server Offline — Join Waitlist';
        btn.onclick = () => showOfflineModal();
      } else {
        if (btn.dataset.originalText) btn.textContent = btn.dataset.originalText;
      }
    });
  }
}

// ─── File Upload Handler ───
function setupFileUpload(dropzoneId, options = {}) {
  const zone = document.getElementById(dropzoneId);
  if (!zone) return;

  const input = document.createElement('input');
  input.type = 'file';
  input.accept = options.accept || 'image/*';
  input.style.display = 'none';
  input.multiple = options.multiple || false;
  zone.appendChild(input);

  zone.addEventListener('click', () => {
    if (!gpuStatus.online) { showOfflineModal(); return; }
    input.click();
  });

  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = '#c9a84c'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = '';
    if (!gpuStatus.online) { showOfflineModal(); return; }
    handleFiles(e.dataTransfer.files, zone, options);
  });

  input.addEventListener('change', () => {
    handleFiles(input.files, zone, options);
  });
}

function handleFiles(files, zone, options) {
  if (!files.length) return;
  const file = files[0];

  if (file.size > GPU_CONFIG.maxFileSize) {
    alert('File too large. Maximum 10MB.');
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    zone.innerHTML = `
      <img src="${e.target.result}" style="max-width:100%;max-height:200px;border-radius:8px;margin-bottom:10px;">
      <p style="font-size:12px;color:#8a9aaa;">Click to change image</p>
    `;
    zone.dataset.file = e.target.result;
    if (options.onFile) options.onFile(file, e.target.result);
  };
  reader.readAsDataURL(file);
}

// ─── Tool Registry API (the actual fix) ───
//
// POST http://localhost:8900/api/tools/run
// Body: { name: "<tool>", args: {...}, async: false }
// Returns whatever the tool returned (shape varies per tool). We normalize.

async function _callToolRegistry(toolName, args) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), GPU_CONFIG.callTimeoutMs);
  try {
    const res = await fetch(GPU_CONFIG.api + '/api/tools/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: toolName, args: args || {}, async: false }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    let data;
    try {
      data = await res.json();
    } catch (jsonErr) {
      throw new Error('Backend returned non-JSON response (HTTP ' + res.status + ')');
    }
    if (!res.ok) {
      const detail = (data && (data.detail || data.error || data.message)) || ('HTTP ' + res.status);
      throw new Error(detail);
    }
    return data;
  } finally {
    clearTimeout(t);
  }
}

// Normalize the wide variety of tool result shapes into a single contract:
//   { images: [url, ...], video: url|null, raw: <original> }
function _normalizeResult(raw) {
  const out = { images: [], video: null, raw };

  if (!raw || typeof raw !== 'object') return out;

  // Tool registry sometimes wraps under {result: ..., status: "..."}. Unwrap once.
  const r = raw.result && typeof raw.result === 'object' ? raw.result : raw;

  // Pull image URLs from any of the common keys.
  if (Array.isArray(r.images)) out.images.push(...r.images.filter(Boolean));
  if (typeof r.image === 'string') out.images.push(r.image);
  if (typeof r.image_url === 'string') out.images.push(r.image_url);
  if (typeof r.image_path === 'string') out.images.push(r.image_path);
  if (typeof r.output === 'string' && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(r.output)) {
    out.images.push(r.output);
  }
  if (Array.isArray(r.outputs)) {
    for (const o of r.outputs) {
      if (typeof o === 'string' && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(o)) out.images.push(o);
      else if (o && typeof o === 'object' && typeof o.url === 'string') out.images.push(o.url);
    }
  }

  // Video URL.
  if (typeof r.video === 'string') out.video = r.video;
  else if (typeof r.video_path === 'string') out.video = r.video_path;
  else if (typeof r.video_url === 'string') out.video = r.video_url;
  else if (typeof r.output === 'string' && /\.(mp4|webm|mov)(\?|$)/i.test(r.output)) out.video = r.output;

  // Convert local file paths into something a browser can fetch via the static mount.
  // Mach 3 serves /outputs/* at the same origin; raw absolute Windows paths won't work,
  // so we prefix-rewrite anything that looks like an E:\ABU\... or .../outputs/... path.
  out.images = out.images.map(_pathToUrl);
  if (out.video) out.video = _pathToUrl(out.video);

  return out;
}

function _pathToUrl(p) {
  if (!p) return p;
  if (/^https?:\/\//i.test(p) || p.startsWith('data:') || p.startsWith('blob:')) return p;
  // Strip a Windows drive prefix and rewrite the rest as a path served by the API.
  // Mach 3 backend should serve /outputs/* — confirm with Ahmad if shape differs.
  const normalized = p.replace(/\\/g, '/');
  const m = normalized.match(/\/outputs\/(.+)$/i);
  if (m) return GPU_CONFIG.api + '/outputs/' + m[1];
  // Last-resort: assume the API can resolve a relative file via /file?path=
  return GPU_CONFIG.api + '/file?path=' + encodeURIComponent(p);
}

// Public entry point — name kept for backward compatibility with all 10 tool pages.
async function submitToComfyUI(workflow, params = {}) {
  if (!gpuStatus.online) {
    showOfflineModal();
    return null;
  }
  const toolName = _resolveWorkflow(workflow);
  let raw;
  try {
    raw = await _callToolRegistry(toolName, params);
  } catch (err) {
    // Surface a useful error to the page-level handler — pages already alert() on throw.
    console.error('[gpu-tools] tool call failed:', toolName, err);
    throw new Error('GPU call failed: ' + err.message);
  }
  const normalized = _normalizeResult(raw);

  // Page-side handlers expect either {images:[...]} or {output:"url"}.
  // Provide both shapes so legacy code paths in the HTML keep working without edits.
  return {
    ok: true,
    tool: toolName,
    images: normalized.images,
    video: normalized.video,
    output: normalized.images[0] || normalized.video || null,
    raw: raw,
  };
}

// ─── Offline Modal ───
function showOfflineModal() {
  let modal = document.getElementById('offline-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'offline-modal';
    modal.style.cssText = 'display:flex;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:2000;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
      <div style="background:#0d1a30;border:1px solid #1a2e50;border-radius:16px;padding:36px;max-width:440px;width:100%;text-align:center;">
        <div style="font-size:2rem;margin-bottom:12px;">🖥️</div>
        <h3 style="font-family:'Playfair Display',serif;color:#fff;font-size:1.3rem;margin-bottom:8px;">GPU Server Offline</h3>
        <p style="color:#8a9aaa;font-size:.9rem;margin-bottom:8px;line-height:1.6;">This tool requires our GPU server to be running. The server processes images and video using local AI models — no data leaves your network.</p>
        <p style="color:#c9a84c;font-size:.85rem;margin-bottom:20px;">Join the waiting list to get notified when the cloud version launches.</p>
        <input type="email" id="offline-email" placeholder="you@email.com" style="width:100%;padding:14px;background:rgba(26,46,80,.4);border:1px solid #1a2e50;border-radius:8px;color:#e8e4d8;font-size:1rem;margin-bottom:12px;">
        <button onclick="submitOfflineEmail()" style="width:100%;padding:14px;background:#0e9f6e;color:#fff;font-weight:700;border:none;border-radius:8px;cursor:pointer;font-size:1rem;">Notify Me When Live</button>
        <button onclick="document.getElementById('offline-modal').style.display='none'" style="background:none;border:none;color:#8a9aaa;cursor:pointer;margin-top:12px;font-size:.85rem;">Close</button>
        <p id="offline-status" style="margin-top:8px;font-size:.8rem;"></p>
      </div>
    `;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
}

async function submitOfflineEmail() {
  const email = document.getElementById('offline-email').value;
  if (!email || !email.includes('@')) return alert('Please enter a valid email.');
  const status = document.getElementById('offline-status');
  const toolName = document.title.split('—')[0].trim().toLowerCase().replace(/\s+/g, '-');
  try {
    await fetch('https://waiting-list.wireconn1.workers.dev', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, product_id: toolName, source: 'gpu-tool-offline' })
    });
    status.textContent = "You're on the list!";
    status.style.color = '#22c55e';
  } catch (e) {
    status.textContent = 'Error. Try again.';
    status.style.color = '#ef4444';
  }
}

// ─── Result Display ───
function showResult(imgUrl, containerId) {
  const container = document.getElementById(containerId || 'result-display');
  if (!container) return;
  container.style.display = 'block';
  // Auto-detect whether this is video or image and render accordingly.
  const isVideo = typeof imgUrl === 'string' && /\.(mp4|webm|mov)(\?|$)/i.test(imgUrl);
  const media = isVideo
    ? `<video src="${imgUrl}" controls autoplay style="max-width:100%;border-radius:12px;margin-bottom:16px;"></video>`
    : `<img src="${imgUrl}" style="max-width:100%;border-radius:12px;margin-bottom:16px;">`;
  container.innerHTML = `
    ${media}
    <div style="display:flex;gap:10px;">
      <a href="${imgUrl}" download style="flex:1;padding:12px;background:#0e9f6e;color:#fff;font-weight:700;border:none;border-radius:8px;text-align:center;text-decoration:none;">Download</a>
      <button onclick="this.closest('[id]').style.display='none'" style="flex:1;padding:12px;background:rgba(26,46,80,.4);color:#e8e4d8;font-weight:600;border:1px solid #1a2e50;border-radius:8px;cursor:pointer;">Close</button>
    </div>
  `;
  container.scrollIntoView({ behavior: 'smooth' });
}

// ─── Init ───
const gpuStatus = new GPUStatus();
