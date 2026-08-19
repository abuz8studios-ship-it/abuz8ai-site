/*!
 * ABUZ8 ComfyUI Client — production runtime for local generation tools.
 * Verified against ComfyUI 0.21.1 (2026-08-11 smoketest: queue->history->view, 4.0s).
 *
 * Design contract:
 *  - Detects a reachable ComfyUI host before promising anything (no vaporware).
 *  - If reachable  -> LIVE STUDIO MODE (real generation on the visitor's own machine).
 *  - If not        -> EARLY ACCESS MODE (waiting list CTA; never a fake spinner).
 *  - Seizure-safe: no strobing, no flashing; progress is a smooth monotonic bar.
 *
 * No dependencies. No build step. Works from file:// and from https://abuz8ai.com.
 */
(function (global) {
  'use strict';

  var DEFAULT_HOSTS = [
    'http://127.0.0.1:8188',
    'http://localhost:8188'
  ];

  function uuid() {
    if (global.crypto && global.crypto.randomUUID) return global.crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var t = setTimeout(function () {
        if (!done) { done = true; reject(new Error((label || 'request') + ' timed out after ' + ms + 'ms')); }
      }, ms);
      promise.then(function (v) {
        if (!done) { done = true; clearTimeout(t); resolve(v); }
      }, function (e) {
        if (!done) { done = true; clearTimeout(t); reject(e); }
      });
    });
  }

  function ComfyClient(opts) {
    opts = opts || {};
    this.hosts = opts.hosts || DEFAULT_HOSTS.slice();
    this.host = null;                 // resolved after connect()
    this.clientId = uuid();
    this.ws = null;
    this.status = 'unknown';          // unknown | live | offline
    this.stats = null;
    this._listeners = {};
    this._activePrompt = null;
  }

  ComfyClient.prototype.on = function (evt, fn) {
    (this._listeners[evt] = this._listeners[evt] || []).push(fn);
    return this;
  };

  ComfyClient.prototype._emit = function (evt, payload) {
    var ls = this._listeners[evt] || [];
    for (var i = 0; i < ls.length; i++) {
      try { ls[i](payload); } catch (e) { /* a bad listener must not kill a render */ }
    }
  };

  /* ---------- transport ---------- */

  ComfyClient.prototype._url = function (path) {
    if (!this.host) throw new Error('ComfyUI host not resolved — call connect() first');
    return this.host + path;
  };

  ComfyClient.prototype.getJSON = function (path, timeoutMs) {
    var self = this;
    return withTimeout(
      fetch(self._url(path), { method: 'GET', cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('GET ' + path + ' -> HTTP ' + r.status);
        return r.json();
      }),
      timeoutMs || 30000, 'GET ' + path
    );
  };

  ComfyClient.prototype.postJSON = function (path, body, timeoutMs) {
    var self = this;
    return withTimeout(
      fetch(self._url(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }).then(function (r) {
        return r.text().then(function (txt) {
          var data = null;
          try { data = txt ? JSON.parse(txt) : null; } catch (e) { data = { raw: txt }; }
          if (!r.ok) {
            var err = new Error('POST ' + path + ' -> HTTP ' + r.status);
            err.detail = data;
            throw err;
          }
          return data;
        });
      }),
      timeoutMs || 60000, 'POST ' + path
    );
  };

  /* ---------- discovery ---------- */

  /**
   * Probe candidate hosts. Resolves to {status:'live'|'offline', host, stats}.
   * Never throws — a dead ComfyUI is a supported, honest state, not an error.
   */
  ComfyClient.prototype.connect = function () {
    var self = this;
    var hosts = this.hosts.slice();

    function tryNext() {
      if (!hosts.length) {
        self.status = 'offline';
        self._emit('status', { status: 'offline' });
        return { status: 'offline', host: null, stats: null };
      }
      var h = hosts.shift();
      return withTimeout(
        fetch(h + '/system_stats', { method: 'GET', cache: 'no-store' }).then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          return r.json();
        }), 2500, 'probe ' + h
      ).then(function (stats) {
        self.host = h;
        self.stats = stats;
        self.status = 'live';
        self._emit('status', { status: 'live', host: h, stats: stats });
        return { status: 'live', host: h, stats: stats };
      }).catch(function () { return tryNext(); });
    }
    return tryNext();
  };

  /**
   * List installed options for a node input, e.g. listOptions('CheckpointLoaderSimple','ckpt_name')
   *
   * ComfyUI 0.21.1 serves TWO schemas for the same concept — measured 2026-08-11:
   *   legacy : [ ["a.safetensors","b.safetensors"], {tooltip:...} ]
   *   COMBO  : [ "COMBO", {multiselect:false, options:["RealESRGAN_x4plus.pth"]} ]
   * Reading only [0] silently returns [] for every COMBO node, which is what made
   * UpscaleModelLoader look like "zero models installed" when the model was on disk.
   * Handle both, and treat [] as "genuinely none installed".
   */
  ComfyClient.prototype.listOptions = function (nodeClass, field) {
    return this.getJSON('/object_info/' + encodeURIComponent(nodeClass)).then(function (info) {
      try {
        var raw = info[nodeClass].input.required[field];
        if (!raw) return [];
        if (Array.isArray(raw[0])) return raw[0];                 // legacy shape
        var meta = raw[1];
        if (meta && Array.isArray(meta.options)) return meta.options;   // COMBO shape
        if (meta && Array.isArray(meta.values)) return meta.values;
        return [];
      } catch (e) { return []; }
    }).catch(function () { return []; });
  };

  /* ---------- live progress over websocket ---------- */

  ComfyClient.prototype._openSocket = function () {
    var self = this;
    if (self.ws && self.ws.readyState <= 1) return;
    try {
      var wsUrl = self.host.replace(/^http/, 'ws') + '/ws?clientId=' + encodeURIComponent(self.clientId);
      var ws = new WebSocket(wsUrl);
      self.ws = ws;
      ws.onmessage = function (ev) {
        if (typeof ev.data !== 'string') return;   // binary preview frames ignored
        var msg;
        try { msg = JSON.parse(ev.data); } catch (e) { return; }
        var d = msg.data || {};
        if (msg.type === 'progress' && d.max) {
          self._emit('progress', {
            value: d.value, max: d.max,
            fraction: Math.max(0, Math.min(1, d.value / d.max))
          });
        } else if (msg.type === 'executing') {
          self._emit('executing', { node: d.node, promptId: d.prompt_id });
        } else if (msg.type === 'execution_error') {
          self._emit('error', new Error(d.exception_message || 'ComfyUI execution error'));
        }
      };
      ws.onerror = function () { /* polling remains the source of truth */ };
    } catch (e) { /* websocket optional; history polling still completes the job */ }
  };

  /* ---------- generation ---------- */

  ComfyClient.prototype.viewUrl = function (img) {
    return this._url('/view?filename=' + encodeURIComponent(img.filename) +
      '&subfolder=' + encodeURIComponent(img.subfolder || '') +
      '&type=' + encodeURIComponent(img.type || 'output') +
      '&rand=' + Date.now());
  };

  /** Upload a File/Blob to ComfyUI's input dir. Resolves to the stored filename. */
  ComfyClient.prototype.uploadImage = function (file, overwrite) {
    var self = this;
    var fd = new FormData();
    fd.append('image', file, file.name || 'upload.png');
    fd.append('overwrite', overwrite ? 'true' : 'false');
    return withTimeout(
      fetch(self._url('/upload/image'), { method: 'POST', body: fd }).then(function (r) {
        if (!r.ok) throw new Error('upload failed -> HTTP ' + r.status);
        return r.json();
      }), 120000, 'upload'
    ).then(function (j) {
      return j.subfolder ? (j.subfolder + '/' + j.name) : j.name;
    });
  };

  ComfyClient.prototype.interrupt = function () {
    if (!this.host) return Promise.resolve();
    return fetch(this._url('/interrupt'), { method: 'POST' }).catch(function () {});
  };

  /**
   * Queue a workflow graph and resolve with {images:[{filename,url,...}], promptId, elapsedMs}.
   * Emits: 'queued', 'progress', 'executing', 'error'.
   */
  ComfyClient.prototype.run = function (workflow, options) {
    var self = this;
    options = options || {};
    var pollMs = options.pollMs || 1000;
    var maxWaitMs = options.maxWaitMs || 15 * 60 * 1000;
    var t0 = Date.now();

    self._openSocket();

    return self.postJSON('/prompt', { prompt: workflow, client_id: self.clientId })
      .then(function (res) {
        if (res && res.node_errors && Object.keys(res.node_errors).length) {
          var e = new Error('Workflow rejected by ComfyUI');
          e.detail = res.node_errors;
          throw e;
        }
        var promptId = res && res.prompt_id;
        if (!promptId) throw new Error('ComfyUI returned no prompt_id');
        self._activePrompt = promptId;
        self._emit('queued', { promptId: promptId });
        return self._await(promptId, pollMs, maxWaitMs, t0);
      });
  };

  ComfyClient.prototype._await = function (promptId, pollMs, maxWaitMs, t0) {
    var self = this;
    return new Promise(function (resolve, reject) {
      (function poll() {
        if (Date.now() - t0 > maxWaitMs) {
          return reject(new Error('Generation exceeded ' + Math.round(maxWaitMs / 1000) + 's'));
        }
        self.getJSON('/history/' + promptId).then(function (h) {
          var entry = h && h[promptId];
          if (!entry) return setTimeout(poll, pollMs);
          var st = entry.status || {};
          if (st.status_str === 'error') {
            var e = new Error('ComfyUI reported an execution error');
            e.detail = st.messages;
            return reject(e);
          }
          if (!st.completed) return setTimeout(poll, pollMs);

          var images = [];
          var outs = entry.outputs || {};
          Object.keys(outs).forEach(function (nid) {
            (outs[nid].images || []).forEach(function (im) {
              if (im.type === 'temp' && !self._keepTemp) return;
              images.push({
                filename: im.filename, subfolder: im.subfolder, type: im.type,
                url: self.viewUrl(im)
              });
            });
          });
          self._activePrompt = null;
          resolve({ promptId: promptId, images: images, elapsedMs: Date.now() - t0 });
        }).catch(function () { setTimeout(poll, pollMs); });
      })();
    });
  };

  global.ComfyClient = ComfyClient;
  global.ABUZ8_COMFY_VERSION = '1.0.0';
})(window);
