/*!
 * ABUZ8 Comfy Studio — shared studio UI layer for local-generation tool pages.
 * v1.0.0 · 2026-08-11 · requires _comfy-client.js (ComfyClient) loaded first.
 *
 * WHY THIS EXISTS
 *   ai-logo-generator-pro shipped a bespoke ~400-line studio inline. Duplicating that
 *   across 9 more pages would be 9x the surface area for every future fix. This module
 *   renders the entire studio from a small per-page config, so a page needs ~20 lines.
 *
 * CONTRACT (inherited from _comfy-client.js, non-negotiable)
 *   engine reachable -> LIVE STUDIO (real generation on the visitor's own machine)
 *   engine absent    -> EARLY ACCESS (honest waitlist CTA; never a fake spinner)
 *
 * SAFETY (site CLAUDE.md — Ahmad has photosensitivity)
 *   No strobing, no flashing, nothing above 3Hz. Progress is a smooth monotonic bar
 *   with a 2s+ ease. prefers-reduced-motion collapses all transitions to 0s and the
 *   content still renders (fails open — never leaves a surface blank).
 */
(function (global) {
  'use strict';

  var CSS = [
    '.cs-wrap{max-width:1180px;margin:0 auto;padding:0 20px}',
    '.cs-state{display:flex;align-items:center;gap:10px;font:600 13px/1.4 Inter,system-ui,sans-serif;',
      'padding:10px 14px;border:1px solid var(--border,#1a2e50);border-radius:10px;',
      'background:var(--card,#0d1a30);color:var(--dim,#8a9aaa);margin-bottom:18px}',
    '.cs-dot{width:9px;height:9px;border-radius:50%;background:#6b7b8c;flex:0 0 auto;',
      'transition:background 1.2s ease}',
    '.cs-dot.live{background:#2fbf8f}.cs-dot.off{background:var(--gold,#c9a84c)}',
    '.cs-grid{display:grid;grid-template-columns:340px 1fr;gap:22px;align-items:start}',
    '@media(max-width:900px){.cs-grid{grid-template-columns:1fr}}',
    '.cs-panel{background:var(--card,#0d1a30);border:1px solid var(--border,#1a2e50);',
      'border-radius:14px;padding:18px}',
    '.cs-lab{display:block;font:600 11px/1 Inter,system-ui,sans-serif;letter-spacing:.09em;',
      'text-transform:uppercase;color:var(--dim,#8a9aaa);margin:16px 0 7px}',
    '.cs-panel .cs-lab:first-child{margin-top:0}',
    '.cs-in,.cs-sel,.cs-ta{width:100%;box-sizing:border-box;background:var(--deep,#07101d);',
      'color:var(--text,#e8e4d8);border:1px solid var(--border,#1a2e50);border-radius:9px;',
      'padding:10px 12px;font:400 14px/1.45 Inter,system-ui,sans-serif}',
    '.cs-ta{min-height:78px;resize:vertical}',
    '.cs-in:focus,.cs-sel:focus,.cs-ta:focus{outline:2px solid rgba(201,168,76,.55);outline-offset:1px}',
    '.cs-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}',
    '.cs-styles{display:grid;grid-template-columns:1fr 1fr;gap:8px}',
    '.cs-style{background:var(--deep,#07101d);border:1px solid var(--border,#1a2e50);',
      'border-radius:9px;padding:9px 10px;cursor:pointer;color:var(--dim,#8a9aaa);',
      'font:600 12px/1.3 Inter,system-ui,sans-serif;text-align:left;transition:all .45s ease}',
    '.cs-style:hover{border-color:rgba(201,168,76,.45);color:var(--text,#e8e4d8)}',
    '.cs-style.on{border-color:var(--gold,#c9a84c);color:var(--text,#e8e4d8);',
      'background:linear-gradient(180deg,rgba(201,168,76,.14),rgba(201,168,76,.05))}',
    '.cs-go{width:100%;margin-top:18px;padding:14px;border:0;border-radius:11px;cursor:pointer;',
      'font:800 14px/1 Inter,system-ui,sans-serif;letter-spacing:.03em;color:#0a1628;',
      'background:linear-gradient(135deg,#d8b95e,#c9a84c);transition:filter .5s ease}',
    '.cs-go:hover{filter:brightness(1.08)}',
    '.cs-go[disabled]{opacity:.5;cursor:not-allowed;filter:none}',
    '.cs-stop{width:100%;margin-top:9px;padding:11px;border:1px solid var(--border,#1a2e50);',
      'border-radius:10px;background:transparent;color:var(--dim,#8a9aaa);cursor:pointer;',
      'font:600 13px/1 Inter,system-ui,sans-serif;display:none}',
    '.cs-prog{height:5px;border-radius:3px;background:rgba(255,255,255,.07);overflow:hidden;',
      'margin:16px 0 8px;display:none}',
    '.cs-bar{height:100%;width:0%;border-radius:3px;background:linear-gradient(90deg,#1a8a7a,#c9a84c);',
      'transition:width 1.1s cubic-bezier(.22,.61,.36,1)}',
    '.cs-ptext{font:500 12px/1.4 Inter,system-ui,sans-serif;color:var(--dim,#8a9aaa);min-height:17px}',
    '.cs-out{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:14px}',
    '.cs-slot{position:relative;aspect-ratio:1/1;border-radius:12px;overflow:hidden;',
      'background:var(--deep,#07101d);border:1px solid var(--border,#1a2e50)}',
    '.cs-slot img{width:100%;height:100%;object-fit:contain;display:block;opacity:0;',
      'transition:opacity 1.4s ease}',
    '.cs-slot img.in{opacity:1}',
    '.cs-dl{position:absolute;left:9px;bottom:9px;background:rgba(10,22,40,.9);',
      'border:1px solid var(--border,#1a2e50);border-radius:7px;padding:5px 10px;',
      'color:var(--text,#e8e4d8);font:600 11px/1 Inter,system-ui,sans-serif;text-decoration:none}',
    '.cs-seed{position:absolute;right:9px;bottom:9px;background:rgba(10,22,40,.9);',
      'border:1px solid var(--border,#1a2e50);border-radius:7px;padding:5px 9px;',
      'color:var(--dim,#8a9aaa);font:400 10px/1 JetBrains Mono,ui-monospace,monospace}',
    '.cs-err{display:none;margin-top:14px;padding:12px 14px;border-radius:10px;',
      'border:1px solid rgba(180,85,63,.5);background:rgba(180,85,63,.1);',
      'color:#e6b9ac;font:400 13px/1.5 Inter,system-ui,sans-serif}',
    '.cs-meta{margin-top:12px;font:400 11px/1.5 JetBrains Mono,ui-monospace,monospace;',
      'color:var(--dim,#8a9aaa)}',
    '.cs-drop{border:1px dashed var(--border,#1a2e50);border-radius:10px;padding:16px;',
      'text-align:center;color:var(--dim,#8a9aaa);cursor:pointer;',
      'font:500 12px/1.5 Inter,system-ui,sans-serif;transition:border-color .5s ease}',
    '.cs-drop:hover,.cs-drop.on{border-color:var(--gold,#c9a84c);color:var(--text,#e8e4d8)}',
    '.cs-drop img{max-width:100%;max-height:150px;border-radius:7px;margin-top:9px;display:block}',
    '@media(prefers-reduced-motion:reduce){',
      '.cs-bar,.cs-slot img,.cs-style,.cs-dot,.cs-go,.cs-drop{transition:none!important}',
      '.cs-slot img{opacity:1}}'
  ].join('');

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /**
   * ComfyStudio(config)
   *  mount            CSS selector for the container element
   *  slug             short id used for filename_prefix + DOM ids
   *  needsImage       true if the workflow consumes an uploaded image
   *  imageLabel       label for that drop zone (default 'Source image')
   *  needsImage2      true if the workflow consumes a SECOND uploaded image.
   *                   Required by genuinely two-input pipelines — a face swap takes a
   *                   face to copy AND a photo to paste it into, and there is no honest
   *                   way to derive one from the other. ctx.image2 carries the uploaded
   *                   filename. Undefined for every single-image tool, so the nine
   *                   already-shipped studios are byte-identical in behaviour.
   *  image2Label      label for the second drop zone (default 'Second image')
   *  styles           [{id,label,pos}] optional style presets
   *  sizes            [512,768,1024] optional
   *  maxBatch         default 4
   *  defaultSteps     default 20
   *  promptLabel      label above the free-text prompt box (null = no prompt box)
   *  promptPlaceholder
   *  buildWorkflow(ctx) -> ComfyUI graph. ctx = {ckpt,positive,negative,size,batch,seed,
   *                        steps,image,styleId}
   *  requires         {node:'UpscaleModelLoader', field:'model_name'} — gate the studio
   *                   on a model actually being installed; empty list => honest notice.
   */
  function ComfyStudio(cfg) {
    this.cfg = cfg;
    this.client = new global.ComfyClient();
    this.running = false;
    this.activeStyle = (cfg.styles && cfg.styles[0] && cfg.styles[0].id) || null;
    this.uploadFile = null;
    this.uploadFile2 = null;
    this.lastSeeds = [];
  }

  ComfyStudio.prototype._id = function (k) { return 'cs-' + this.cfg.slug + '-' + k; };
  ComfyStudio.prototype.$ = function (k) { return document.getElementById(this._id(k)); };

  ComfyStudio.prototype.mount = function () {
    var self = this, c = this.cfg;
    var host = document.querySelector(c.mount);
    if (!host) return;

    if (!document.getElementById('cs-styles-tag')) {
      var st = el('style'); st.id = 'cs-styles-tag'; st.textContent = CSS;
      document.head.appendChild(st);
    }

    var sizes = c.sizes || [512, 768, 1024];
    var maxBatch = c.maxBatch || 4;
    var I = function (k) { return self._id(k); };

    var left = '';
    if (c.needsImage) {
      left += '<span class="cs-lab">' + esc(c.imageLabel || 'Source image') + '</span>' +
        '<div class="cs-drop" id="' + I('drop') + '">Click or drop an image here' +
        '<input type="file" accept="image/*" id="' + I('file') + '" hidden></div>';
    }
    if (c.needsImage2) {
      left += '<span class="cs-lab">' + esc(c.image2Label || 'Second image') + '</span>' +
        '<div class="cs-drop" id="' + I('drop2') + '">Click or drop an image here' +
        '<input type="file" accept="image/*" id="' + I('file2') + '" hidden></div>';
    }
    if (c.promptLabel !== null) {
      left += '<span class="cs-lab">' + esc(c.promptLabel || 'Describe it') + '</span>' +
        '<textarea class="cs-ta" id="' + I('prompt') + '" placeholder="' +
        esc(c.promptPlaceholder || '') + '"></textarea>';
    }
    if (c.styles && c.styles.length) {
      left += '<span class="cs-lab">Style</span><div class="cs-styles" id="' + I('styles') + '">' +
        c.styles.map(function (s, i) {
          return '<button type="button" class="cs-style' + (i === 0 ? ' on' : '') +
            '" data-sid="' + esc(s.id) + '">' + esc(s.label) + '</button>';
        }).join('') + '</div>';
    }
    // Deterministic pipelines (e.g. ESRGAN upscale) have no sampler: showing size /
    // steps / seed knobs there would be lying about what the controls do. hideSampler
    // drops them and renders hidden inputs so the shared code path still reads values.
    if (c.hideSampler) {
      left += '<input type="hidden" id="' + I('ckpt') + '" value="-">' +
        '<input type="hidden" id="' + I('size') + '" value="' + sizes[0] + '">' +
        '<input type="hidden" id="' + I('batch') + '" value="1">' +
        '<input type="hidden" id="' + I('steps') + '" value="' + (c.defaultSteps || 20) + '">' +
        '<input type="hidden" id="' + I('seed') + '" value="0">' +
        '<p style="margin:16px 0 0;font:400 12px/1.6 Inter,system-ui,sans-serif;color:var(--dim,#8a9aaa)">' +
        esc(c.note || '') + '</p>';
      left += '<button class="cs-go" id="' + I('go') + '">' + esc(c.goLabel || 'Generate') + '</button>' +
        '<button class="cs-stop" id="' + I('stop') + '">Stop</button>';
      host.appendChild(el('div', 'cs-wrap',
        '<div class="cs-state"><span class="cs-dot" id="' + I('dot') + '"></span>' +
        '<span id="' + I('state') + '">Looking for a local engine…</span></div>' +
        '<div class="cs-grid"><div class="cs-panel">' + left + '</div>' +
        '<div><div class="cs-prog" id="' + I('prog') + '"><div class="cs-bar" id="' + I('bar') + '"></div></div>' +
        '<div class="cs-ptext" id="' + I('ptext') + '"></div>' +
        '<div class="cs-err" id="' + I('err') + '"></div>' +
        '<div class="cs-out" id="' + I('out') + '"></div>' +
        '<div class="cs-meta" id="' + I('meta') + '"></div></div></div>'));
      this._bind();
      this._connect();
      return;
    }

    left += '<span class="cs-lab">Model checkpoint</span>' +
      '<select class="cs-sel" id="' + I('ckpt') + '"><option>Detecting…</option></select>';
    left += '<div class="cs-row"><div><span class="cs-lab">Size</span>' +
      '<select class="cs-sel" id="' + I('size') + '">' +
      sizes.map(function (s, i) {
        return '<option value="' + s + '"' + (i === Math.min(1, sizes.length - 1) ? ' selected' : '') +
          '>' + s + ' × ' + s + '</option>';
      }).join('') + '</select></div>' +
      '<div><span class="cs-lab">Images</span><select class="cs-sel" id="' + I('batch') + '">' +
      Array.apply(null, Array(maxBatch)).map(function (_, i) {
        return '<option value="' + (i + 1) + '"' + (i === 0 ? ' selected' : '') + '>' + (i + 1) + '</option>';
      }).join('') + '</select></div></div>';
    left += '<div class="cs-row"><div><span class="cs-lab">Steps</span>' +
      '<input class="cs-in" id="' + I('steps') + '" type="number" min="4" max="60" value="' +
      (c.defaultSteps || 20) + '"></div>' +
      '<div><span class="cs-lab">Seed <span style="text-transform:none;letter-spacing:0">(blank = random)</span></span>' +
      '<input class="cs-in" id="' + I('seed') + '" type="text" inputmode="numeric" placeholder="random"></div></div>';
    left += '<button class="cs-go" id="' + I('go') + '">Generate</button>' +
      '<button class="cs-stop" id="' + I('stop') + '">Stop</button>';

    host.appendChild(el('div', 'cs-wrap',
      '<div class="cs-state"><span class="cs-dot" id="' + I('dot') + '"></span>' +
      '<span id="' + I('state') + '">Looking for a local engine…</span></div>' +
      '<div class="cs-grid"><div class="cs-panel">' + left + '</div>' +
      '<div><div class="cs-prog" id="' + I('prog') + '"><div class="cs-bar" id="' + I('bar') + '"></div></div>' +
      '<div class="cs-ptext" id="' + I('ptext') + '"></div>' +
      '<div class="cs-err" id="' + I('err') + '"></div>' +
      '<div class="cs-out" id="' + I('out') + '"></div>' +
      '<div class="cs-meta" id="' + I('meta') + '"></div></div></div>'));

    this._bind();
    this._connect();
  };

  ComfyStudio.prototype._bind = function () {
    var self = this, c = this.cfg;

    if (c.styles && c.styles.length) {
      this.$('styles').addEventListener('click', function (e) {
        var b = e.target.closest('.cs-style'); if (!b) return;
        Array.prototype.forEach.call(this.children, function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        self.activeStyle = b.getAttribute('data-sid');
      });
    }

    // One binder, used for slot 1 and slot 2. Duplicating this block for the second
    // drop zone is how the two slots silently drift apart later.
    function bindDrop(dropKey, fileKey, slot) {
      var drop = self.$(dropKey), file = self.$(fileKey);
      if (!drop || !file) return;
      // Look the input up by id at click time. _setFile() rewrites drop.innerHTML,
      // which detaches the original input — a captured reference would go dead after
      // the first pick and the drop zone would silently stop opening the file dialog.
      drop.addEventListener('click', function (e) {
        if (e.target && e.target.tagName === 'INPUT') return;
        var cur = self.$(fileKey);
        if (cur) cur.click();
      });
      drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('on'); });
      drop.addEventListener('dragleave', function () { drop.classList.remove('on'); });
      drop.addEventListener('drop', function (e) {
        e.preventDefault(); drop.classList.remove('on');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) self._setFile(e.dataTransfer.files[0], slot);
      });
      file.addEventListener('change', function () {
        if (file.files[0]) self._setFile(file.files[0], slot);
      });
    }
    if (c.needsImage) bindDrop('drop', 'file', 1);
    if (c.needsImage2) bindDrop('drop2', 'file2', 2);

    this.$('go').addEventListener('click', function () { self.generate(); });
    this.$('stop').addEventListener('click', function () {
      self.client.interrupt(); self._done('Stopped.');
    });
  };

  ComfyStudio.prototype._setFile = function (f, slot) {
    slot = slot || 1;
    var dropKey = slot === 2 ? 'drop2' : 'drop';
    var fileKey = slot === 2 ? 'file2' : 'file';
    if (slot === 2) this.uploadFile2 = f; else this.uploadFile = f;
    var drop = this.$(dropKey);
    if (!drop) return;
    // Revoke the previous object URL before replacing it. Re-picking an image ten
    // times used to leak ten decoded bitmaps for the life of the page.
    var old = drop.querySelector('img');
    if (old && old.src.indexOf('blob:') === 0) URL.revokeObjectURL(old.src);
    var url = URL.createObjectURL(f);
    drop.innerHTML = esc(f.name) +
      '<img alt="selected image for slot ' + slot + '" src="' + url + '">' +
      '<input type="file" accept="image/*" id="' + this._id(fileKey) + '" hidden>';
    // innerHTML replaced the original input, so re-bind this slot's picker.
    var self = this, file = this.$(fileKey);
    file.addEventListener('change', function () {
      if (file.files[0]) self._setFile(file.files[0], slot);
    });
  };

  ComfyStudio.prototype._connect = function () {
    var self = this, c = this.cfg;
    this.client.connect().then(function (r) {
      var dot = self.$('dot'), state = self.$('state');
      if (r.status !== 'live') {
        dot.className = 'cs-dot off';
        state.textContent = 'No local engine detected — Early Access mode. ' +
          'Run ComfyUI on 127.0.0.1:8188 to unlock the live studio.';
        self.$('go').disabled = true;
        self.$('ckpt').innerHTML = '<option>Engine offline</option>';
        return;
      }
      dot.className = 'cs-dot live';
      var vram = '';
      try {
        var d = r.stats.devices && r.stats.devices[0];
        if (d) vram = ' · ' + Math.round(d.vram_total / 1073741824) + ' GB VRAM';
      } catch (e) {}
      state.textContent = 'Live studio — generating locally on your machine' + vram +
        ' · nothing leaves your computer.';

      // gate on a required model family actually being installed
      var gate = c.requires
        ? self.client.listOptions(c.requires.node, c.requires.field)
        : Promise.resolve(['-']);

      Promise.all([self.client.listOptions('CheckpointLoaderSimple', 'ckpt_name'), gate])
        .then(function (res) {
          var ck = res[0], req = res[1];
          if (c.requires && (!req || !req.length)) {
            dot.className = 'cs-dot off';
            state.textContent = 'Engine is live, but no ' + c.requires.label +
              ' model is installed — install one into ComfyUI, then reload.';
            self.$('go').disabled = true;
            return;
          }
          if (c.requires) self.requiredModel = req[0];
          if (!ck.length) {
            self.$('ckpt').innerHTML = '<option>No checkpoints found</option>';
            self.$('go').disabled = true;
            return;
          }
          self.$('ckpt').innerHTML = ck.map(function (n) {
            return '<option value="' + esc(n) + '">' + esc(n) + '</option>';
          }).join('');
        });
    });
  };

  ComfyStudio.prototype._progress = function (frac, text) {
    this.$('prog').style.display = 'block';
    this.$('bar').style.width = Math.round(Math.max(0, Math.min(1, frac)) * 100) + '%';
    if (text != null) this.$('ptext').textContent = text;
  };

  ComfyStudio.prototype._err = function (msg) {
    var e = this.$('err');
    e.style.display = 'block';
    e.textContent = msg;
  };

  ComfyStudio.prototype._done = function (text) {
    this.running = false;
    this.$('go').disabled = false;
    this.$('stop').style.display = 'none';
    if (text) this.$('ptext').textContent = text;
  };

  ComfyStudio.prototype.generate = function () {
    var self = this, c = this.cfg;
    if (this.running) return;

    if (this.client.status !== 'live') {
      this._err('No local engine detected. Start ComfyUI on 127.0.0.1:8188 and reload, ' +
        'or join Early Access below for the packaged one-click build.');
      return;
    }
    if (c.needsImage && !this.uploadFile) {
      this._err('Choose ' + (c.imageLabel ? 'a ' + c.imageLabel.toLowerCase() : 'a source image') + ' first.');
      return;
    }
    if (c.needsImage2 && !this.uploadFile2) {
      this._err('Choose ' + (c.image2Label ? 'a ' + c.image2Label.toLowerCase() : 'a second image') + ' first.');
      return;
    }

    this.$('err').style.display = 'none';
    this.running = true;
    this.$('go').disabled = true;
    this.$('stop').style.display = 'block';

    var batch = parseInt(this.$('batch').value, 10) || 1;
    var seedRaw = (this.$('seed').value || '').trim();
    var seed = /^\d+$/.test(seedRaw) ? (parseInt(seedRaw, 10) % 4294967295)
                                     : Math.floor(Math.random() * 4294967295);

    // render empty slots so the layout does not jump when images land
    var out = this.$('out');
    out.innerHTML = '';
    for (var i = 0; i < batch; i++) out.appendChild(el('div', 'cs-slot'));

    this._progress(0.03, 'Queued on your local engine…');
    this.$('meta').textContent = '';

    var ctx = {
      ckpt: this.$('ckpt').value,
      positive: this._positive(),
      negative: c.negative || 'text, watermark, signature, blurry, low quality, jpeg artifacts, deformed',
      size: parseInt(this.$('size').value, 10),
      batch: batch,
      seed: seed,
      steps: parseInt(this.$('steps').value, 10) || (c.defaultSteps || 20),
      styleId: this.activeStyle,
      slug: c.slug,
      requiredModel: this.requiredModel,
      image: null,
      image2: null
    };

    var uploads = [];
    if (c.needsImage) {
      uploads.push(this.client.uploadImage(this.uploadFile, true)
        .then(function (name) { ctx.image = name; }));
    }
    if (c.needsImage2) {
      uploads.push(this.client.uploadImage(this.uploadFile2, true)
        .then(function (name) { ctx.image2 = name; }));
    }
    var prep = uploads.length ? Promise.all(uploads) : Promise.resolve();

    this.client.on('progress', function (p) {
      if (!self.running) return;
      self._progress(0.05 + p.fraction * 0.9, 'Rendering… ' + Math.round(p.fraction * 100) + '%');
    });

    var t0 = Date.now();
    prep.then(function () {
      return self.client.run(c.buildWorkflow(ctx), { maxWaitMs: 10 * 60 * 1000 });
    }).then(function (res) {
      self._progress(1, 'Complete');
      var slots = out.children;
      res.images.forEach(function (img, i) {
        var slot = slots[i] || out.appendChild(el('div', 'cs-slot'));
        slot.innerHTML = '';
        var im = new Image();
        im.alt = c.slug + ' result ' + (i + 1);
        im.onload = function () { im.classList.add('in'); };
        im.src = img.url;
        slot.appendChild(im);
        var a = el('a', 'cs-dl', 'Download');
        a.href = img.url; a.download = img.filename; slot.appendChild(a);
        if (!c.hideSampler) slot.appendChild(el('span', 'cs-seed', 'seed ' + ctx.seed));
      });
      // hideSampler pipelines have no sampler, so seed/size/steps are meaningless
      // there. Printing them would contradict the reason hideSampler exists.
      self.$('meta').textContent = res.images.length + ' image' +
        (res.images.length === 1 ? '' : 's') + ' · ' + (res.elapsedMs / 1000).toFixed(1) +
        's' + (c.hideSampler ? '' : ' · seed ' + ctx.seed + ' · ' + ctx.size +
        'px · ' + ctx.steps + ' steps') + ' · local';
      self._done('');
    }).catch(function (e) {
      self._progress(0, '');
      self.$('prog').style.display = 'none';
      self._err(e && e.message ? e.message : 'Generation failed.');
      self._done('');
    });
  };

  ComfyStudio.prototype._positive = function () {
    var c = this.cfg, parts = [];
    var typed = this.$('prompt') ? (this.$('prompt').value || '').trim() : '';
    if (typed) parts.push(typed);
    if (c.styles && c.styles.length) {
      var s = c.styles.filter(function (x) { return x.id === this.activeStyle; }, this)[0];
      if (s && s.pos) parts.push(s.pos);
    }
    if (c.basePositive) parts.push(c.basePositive);
    return parts.join(', ');
  };

  global.ComfyStudio = ComfyStudio;
  global.ABUZ8_COMFY_STUDIO_VERSION = '1.1.0';
})(window);
