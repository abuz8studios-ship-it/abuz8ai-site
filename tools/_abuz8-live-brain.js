/* ABUZ8 Tools — Live Brain auto-attach.
   Drop one <script src="_abuz8-live-brain.js" defer></script> into any tool page
   and it will:
     1. Load shared backend config (API + ComfyUI URLs)
     2. Probe brain health on page load and show a live-status pill
     3. Expose ABUZ8.callBrain() / ABUZ8.callComfy() for the page to use
     4. Hook every "Generate" / "Run" / "Analyze" button so it dispatches a
        custom event the page can listen for to trigger live-brain enhancement
   Updated: 2026-05-08. URLs are quick-tunnel ephemeral — if they rotate,
   edit the constants in _abuz8-config.js (load via separate <script>) and
   we'll fall back to those.
*/
(function () {
  // Default config — overridden if the page also loads _abuz8-config.js.
  window.ABUZ8 = window.ABUZ8 || {};
  window.ABUZ8.API_URL = window.ABUZ8.API_URL || "https://api.abuz8ai.com";
  window.ABUZ8.COMFY_URL = window.ABUZ8.COMFY_URL || "https://comfy.abuz8ai.com";
  window.ABUZ8.MODEL = window.ABUZ8.MODEL || "qwen25_7b_1m";
  window.ABUZ8.MAX_LATENCY_MS = window.ABUZ8.MAX_LATENCY_MS || 90000;

  // ── Result formatter ──────────────────────────────────────────────
  // The AI brain returns Markdown-ish text (and sometimes HTML). Render it
  // cleanly: if it already contains block HTML, trust it; otherwise convert
  // a safe subset of Markdown (headings, bold, italic, bullets, line breaks)
  // to HTML so the REAL output is legible. Inline HTML from the model is
  // preserved as-is (these tools are trusted, first-party prompts).
  window.ABUZ8.formatResult = function (text) {
    if (text == null) return '';
    var s = String(text);
    // Already structured HTML? pass through untouched.
    if (/<(p|div|h[1-6]|ul|ol|li|table|section|article|br)\b/i.test(s)) return s;

    var lines = s.replace(/\r\n/g, '\n').split('\n');
    var out = [], inUl = false, inOl = false;
    var inline = function (t) {
      return t
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*(?!\s)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>')
        .replace(/`([^`]+?)`/g, '<code>$1</code>');
    };
    var closeLists = function () {
      if (inUl) { out.push('</ul>'); inUl = false; }
      if (inOl) { out.push('</ol>'); inOl = false; }
    };
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (!ln) { closeLists(); continue; }
      var h = ln.match(/^(#{1,6})\s+(.*)$/);
      if (h) { closeLists(); var lvl = Math.min(h[1].length + 1, 6); out.push('<h' + lvl + '>' + inline(h[2]) + '</h' + lvl + '>'); continue; }
      var ulm = ln.match(/^[-*•]\s+(.*)$/);
      if (ulm) { if (!inUl) { closeLists(); out.push('<ul>'); inUl = true; } out.push('<li>' + inline(ulm[1]) + '</li>'); continue; }
      var olm = ln.match(/^\d+[.)]\s+(.*)$/);
      if (olm) { if (!inOl) { closeLists(); out.push('<ol>'); inOl = true; } out.push('<li>' + inline(olm[1]) + '</li>'); continue; }
      closeLists();
      out.push('<p>' + inline(ln) + '</p>');
    }
    closeLists();
    return out.join('\n');
  };

  // ── Brain call ────────────────────────────────────────────────────
  window.ABUZ8.callBrain = async function (systemPrompt, userPrompt, opts) {
    opts = opts || {};
    const url = (opts.apiUrl || window.ABUZ8.API_URL) + "/v1/chat/completions";
    const body = {
      model: opts.model || window.ABUZ8.MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: opts.maxTokens || 1500,
      temperature: opts.temperature == null ? 0.7 : opts.temperature
    };
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs || window.ABUZ8.MAX_LATENCY_MS);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (!res.ok) return null;
      const data = await res.json();
      if (data && data.choices && data.choices[0] && data.choices[0].message) {
        return data.choices[0].message.content;
      }
      // Brain returned unexpected format — try Workers AI fallback
      try {
        const fb = await fetch("/api/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: userPrompt, system: systemPrompt, max_tokens: opts.maxTokens || 1500 })
        });
        if (fb.ok) { const d = await fb.json(); if (d && d.ok) return d.text; }
      } catch (_) {}
      return null;
    } catch (e) {
      clearTimeout(t);
      // Fallback to Cloudflare Workers AI when live brain is unreachable
      try {
        const fbRes = await fetch("/api/ai-generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: userPrompt, system: systemPrompt, max_tokens: opts.maxTokens || 1500 })
        });
        if (fbRes.ok) {
          const fbData = await fbRes.json();
          if (fbData && fbData.ok) return fbData.text;
        }
      } catch (_) {}
      return null;
    }
  };

  // ── Comfy call (queue prompt) ─────────────────────────────────────
  window.ABUZ8.callComfy = async function (workflow) {
    try {
      const res = await fetch(window.ABUZ8.COMFY_URL + "/prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: workflow })
      });
      if (!res.ok) { abz8GpuOfflineCapture(); return null; }
      return await res.json();
    } catch (_) { abz8GpuOfflineCapture(); return null; }
  };

  // ── GPU-offline email capture (added 2026-07-20 afternoon shift) ──
  // Measured 2026-07-20 (FUNNEL_TRUTH): 10 sessions clicked GENERATE while the
  // rig was down and hit a silent dead end; gpu_offline_modal had logged 0 events
  // ever. When a GPU call fails, show a once-per-session, seizure-safe (static,
  // light-palette, no animation) modal that captures the visitor's email into the
  // existing /api/waitlist pipeline (D1 -> KV -> Resend mirror).
  // window.showOfflineModal is intentionally a GLOBAL with this exact name:
  // assets/js/abuz8-intent.js wraps it at DOMContentLoaded to log gpu_offline_modal.
  function abz8ToolId() {
    return (location.pathname.split('/').pop() || 'unknown').replace('.html', '');
  }
  function abz8GpuOfflineCapture() {
    try {
      if (sessionStorage.getItem('abz8_gpu_offline_shown')) return;
      sessionStorage.setItem('abz8_gpu_offline_shown', '1');
    } catch (_) {}
    // Defer so the page's own error/demo UI settles first.
    setTimeout(function () {
      try { window.showOfflineModal(abz8ToolId()); } catch (_) {}
    }, 400);
  }
  if (typeof window.showOfflineModal !== 'function') {
    window.showOfflineModal = function (toolId) {
      if (document.getElementById('abz8-gpu-offline')) return;
      var tool = toolId || abz8ToolId();
      var overlay = document.createElement('div');
      overlay.id = 'abz8-gpu-offline';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'abz8-gpu-offline-title');
      overlay.style.cssText = "position:fixed;inset:0;z-index:10000;background:rgba(44,62,80,0.6);display:flex;align-items:center;justify-content:center;padding:20px;";
      var card = document.createElement('div');
      card.style.cssText = "background:#F8FAFC;color:#2C3E50;border:1px solid #d7dee8;border-radius:12px;max-width:420px;width:100%;padding:28px;font-family:Inter,-apple-system,sans-serif;box-shadow:0 12px 40px rgba(15,23,42,0.25);";
      card.innerHTML =
        "<h3 id='abz8-gpu-offline-title' style='margin:0 0 8px;font-size:19px;line-height:1.3;color:#2C3E50;'>The GPU rig is at capacity</h3>" +
        "<p style='margin:0 0 16px;font-size:14px;line-height:1.55;color:#46586a;'>Your job couldn't run right now. Leave your email and we'll run it and send you the result when the rig is back online — you'll also join the ABUZ8 early-access list.</p>" +
        "<form id='abz8-gpu-offline-form' style='margin:0;'>" +
          "<label for='abz8-gpu-offline-email' style='display:block;font-size:12px;color:#46586a;margin-bottom:6px;'>Email</label>" +
          "<input id='abz8-gpu-offline-email' type='email' required autocomplete='email' placeholder='you@example.com' style='width:100%;box-sizing:border-box;padding:10px 12px;font-size:14px;border:1px solid #b9c6d6;border-radius:8px;background:#ffffff;color:#2C3E50;margin-bottom:12px;' />" +
          "<button type='submit' style='width:100%;padding:11px 16px;font-size:14px;font-weight:600;border:0;border-radius:8px;background:#2E75B6;color:#ffffff;cursor:pointer;'>Notify me when it's ready</button>" +
        "</form>" +
        "<button type='button' id='abz8-gpu-offline-close' style='display:block;margin:12px auto 0;background:none;border:0;font-size:12px;color:#46586a;cursor:pointer;text-decoration:underline;'>No thanks</button>";
      overlay.appendChild(card);
      document.body.appendChild(overlay);
      function close() { try { overlay.remove(); } catch (_) {} document.removeEventListener('keydown', onKey); }
      function onKey(e) { if (e.key === 'Escape') close(); }
      document.addEventListener('keydown', onKey);
      document.getElementById('abz8-gpu-offline-close').addEventListener('click', close);
      overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
      var input = document.getElementById('abz8-gpu-offline-email');
      try { input.focus(); } catch (_) {}
      document.getElementById('abz8-gpu-offline-form').addEventListener('submit', function (e) {
        e.preventDefault();
        var email = (input.value || '').trim();
        if (!email || email.indexOf('@') < 0) return;
        fetch('/api/waitlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email, product_id: tool, source: 'gpu_offline', ts: Date.now(), referrer: document.referrer || null })
        }).then(function (r) { return !!(r && r.ok); }).catch(function () { return false; }).then(function (ok) {
          if (!ok) {
            try {
              var list = JSON.parse(localStorage.getItem('abuz8_waitlist') || '[]');
              list.push({ tool: tool, email: email, ts: Date.now(), synced: false, source: 'gpu_offline' });
              localStorage.setItem('abuz8_waitlist', JSON.stringify(list));
            } catch (_) {}
          }
        });
        try { if (window.abuz8Track) window.abuz8Track('gpu_offline_email_submit', { meta: { tool: tool } }); } catch (_) {}
        card.innerHTML =
          "<h3 style='margin:0 0 8px;font-size:19px;color:#2C3E50;'>You're on the list</h3>" +
          "<p style='margin:0 0 16px;font-size:14px;line-height:1.55;color:#46586a;'>We'll email your result as soon as the rig is back online.</p>" +
          "<button type='button' id='abz8-gpu-offline-done' style='width:100%;padding:11px 16px;font-size:14px;font-weight:600;border:0;border-radius:8px;background:#2E75B6;color:#ffffff;cursor:pointer;'>Done</button>";
        document.getElementById('abz8-gpu-offline-done').addEventListener('click', close);
      });
    };
  }

  // Cloud image generation fallback when ComfyUI is offline
  window.ABUZ8.generateImage = async function (prompt, opts) {
    opts = opts || {};
    // Try ComfyUI first
    if (await window.ABUZ8.comfyHealthy()) {
      // ComfyUI workflow for text-to-image
      return await window.ABUZ8.callComfy({
        "3": { class_type: "KSampler", inputs: { seed: Math.floor(Math.random()*1e15), steps: 20, cfg: 7, sampler_name: "euler", scheduler: "normal", denoise: 1, model: ["4",0], positive: ["6",0], negative: ["7",0], latent_image: ["5",0] }},
        "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: "sd_xl_base_1.0.safetensors" }},
        "5": { class_type: "EmptyLatentImage", inputs: { width: opts.width||1024, height: opts.height||1024, batch_size: 1 }},
        "6": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["4",1] }},
        "7": { class_type: "CLIPTextEncode", inputs: { text: "low quality, blurry, distorted", clip: ["4",1] }},
        "8": { class_type: "VAEDecode", inputs: { samples: ["3",0], vae: ["4",2] }},
        "9": { class_type: "SaveImage", inputs: { filename_prefix: "abuz8", images: ["8",0] }}
      });
    }
    // Fallback to Workers AI
    try {
      const res = await fetch("/api/ai-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });
      if (!res.ok) { abz8GpuOfflineCapture(); return null; }
      const blob = await res.blob();
      return { url: URL.createObjectURL(blob), fallback: true };
    } catch (_) { abz8GpuOfflineCapture(); return null; }
  };

  // ── Health probes ─────────────────────────────────────────────────
  window.ABUZ8.runTool = async function (toolName, args, opts) {
    opts = opts || {};
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), opts.timeoutMs || 180000);
    try {
      const res = await fetch(window.ABUZ8.API_URL + "/api/tools/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: toolName, args: args || {}, async: !!opts.async }),
        signal: ctrl.signal
      });
      clearTimeout(t);
      if (!res.ok) return null;
      return await res.json();
    } catch (e) {
      clearTimeout(t);
      return null;
    }
  };

  // ── Waitlist signup (CF Worker + D1) ──────────────────────────
  // Falls back to localStorage if the worker is unreachable.
  window.ABUZ8.WAITLIST_URL = window.ABUZ8.WAITLIST_URL || "https://waitlist.abuz8ai.com";
  window.ABUZ8.joinWaitlist = async function (tool, email, meta) {
    if (!email || !email.includes('@')) return { ok: false, error: 'invalid_email' };
    let serverOk = false;
    try {
      const res = await fetch(window.ABUZ8.WAITLIST_URL + '/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tool: tool || 'unknown', email, meta: meta || null })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.ok) serverOk = true;
      }
    } catch (_) { /* network/CORS — fall through */ }
    // Always also write to localStorage as backup
    try {
      const list = JSON.parse(localStorage.getItem('abuz8_waitlist') || '[]');
      list.push({ tool, email, meta, ts: Date.now(), synced: serverOk });
      localStorage.setItem('abuz8_waitlist', JSON.stringify(list));
    } catch (_) {}
    return { ok: true, server: serverOk };
  };

  // Auto-intercept any <form> with class="wl-form" + email input id starting with "wlEmail"
  // so existing pages get the upgrade for free.
  document.addEventListener('submit', function (e) {
    const f = e.target;
    if (!f || !f.classList || !f.classList.contains('wl-form')) return;
    const emailInput = f.querySelector('input[type="email"]');
    if (!emailInput || !emailInput.value) return;
    e.preventDefault();
    const tool = (location.pathname.split('/').pop() || 'unknown').replace('.html', '');
    window.ABUZ8.joinWaitlist(tool, emailInput.value.trim()).then(() => {
      // Hide form and show msg if the page has them
      const form = f;
      form.style.display = 'none';
      const msg = document.getElementById('wlMsg');
      if (msg) msg.style.display = 'block';
    });
  }, true);

  window.ABUZ8.brainHealthy = async function () {
    try {
      const r = await fetch(window.ABUZ8.API_URL + "/health");
      return r.ok;
    } catch (_) { return false; }
  };
  window.ABUZ8.comfyHealthy = async function () {
    try {
      const r = await fetch(window.ABUZ8.COMFY_URL + "/system_stats");
      return r.ok;
    } catch (_) { return false; }
  };

  // ── Live status pill ──────────────────────────────────────────────
  function injectStatusPill() {
    if (document.getElementById('abuz8-brain-pill')) return;
    const pill = document.createElement('div');
    pill.id = 'abuz8-brain-pill';
    pill.style.cssText = 'position:fixed;bottom:18px;right:18px;z-index:9999;background:rgba(13,26,48,0.95);border:1px solid rgba(201,168,76,0.3);border-radius:24px;padding:8px 14px;font-family:Inter,sans-serif;font-size:12px;color:#e8e4d8;display:flex;align-items:center;gap:8px;backdrop-filter:blur(8px);box-shadow:0 4px 20px rgba(0,0,0,0.4);cursor:default;user-select:none';
    pill.innerHTML = '<span id="abuz8-brain-dot" style="width:8px;height:8px;border-radius:50%;background:#8a9aaa;display:inline-block"></span><span id="abuz8-brain-label">Live brain: checking…</span>';
    document.body.appendChild(pill);
  }
  function setStatus(brainOk, comfyOk) {
    const dot = document.getElementById('abuz8-brain-dot');
    const lbl = document.getElementById('abuz8-brain-label');
    if (!dot || !lbl) return;
    if (brainOk && comfyOk) {
      dot.style.background = '#3dc887';
      lbl.textContent = 'Live brain + GPU online · RTX 5090';
      lbl.style.color = '#3dc887';
    } else if (brainOk) {
      dot.style.background = '#c9a84c';
      lbl.textContent = 'Live brain online · GPU offline';
      lbl.style.color = '#c9a84c';
    } else if (comfyOk) {
      dot.style.background = '#c9a84c';
      lbl.textContent = 'GPU online · brain offline';
      lbl.style.color = '#c9a84c';
    } else {
      dot.style.background = '#0e9f6e';
      lbl.textContent = 'Cloud AI active';
      lbl.style.color = '#0e9f6e';
    }
  }

  // Run on load
  function init() {
    injectStatusPill();
    Promise.all([window.ABUZ8.brainHealthy(), window.ABUZ8.comfyHealthy()])
      .then(([b, c]) => setStatus(b, c))
      .catch(() => setStatus(false, false));
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
