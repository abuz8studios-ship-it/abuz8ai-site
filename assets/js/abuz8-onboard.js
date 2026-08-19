/* ============================================================
   ABUZ8 ONBOARD AGENT — "ABUZ8 Guide"
   v1.0 · 2026-07-17 · Self-contained floating site guide.
   - Instant keyword-scored answers over /assets/data/onboard-kb.json
     (fetched once, lazily, on first open; honest built-in fallback
     if the fetch fails).
   - Runs 100% in the browser. The KB fetch is the ONLY network call.
     Nothing the visitor types leaves the page.
   - All DOM ids/classes prefixed "a8ob-" so it never clashes with
     the zait-chat widget or page markup.
   - Styles injected here use ONLY theme palette values (CSS vars
     from /assets/css/abuz8-theme.css, with the same theme hex
     values as fallbacks). Seizure-safe: no flashing, no pulsing,
     no animation loops; transitions .3s only. The theme's
     prefers-reduced-motion rule applies to this widget too.
   - localStorage: single key "a8ob_state" ("open" | "closed").
   ============================================================ */
(function () {
  'use strict';

  if (window.__A8OB_LOADED__) { return; }
  window.__A8OB_LOADED__ = true;

  var KB_URL = '/assets/data/onboard-kb.json';
  var LS_KEY = 'a8ob_state';

  /* ---------- Honest built-in fallback KB (used ONLY if the
     onboard-kb.json fetch fails; clearly labeled to the visitor).
     8 entries — every fact from the verified truth pack. ---------- */
  var FALLBACK_KB = [
    {
      id: 'free-tools',
      q: ['free tools', 'tools', 'free', 'browser tools', 'utilities'],
      a: 'There are <strong>169 free tool pages</strong> in /tools/ — pure-JS dev tools (JSON formatter, regex tester, color tools, encoders, SEO generators and more) run 100% in your browser. Some AI generation tools need the ABUZ8 local GPU backend and honestly switch to a waitlist form when it is offline.',
      links: [{ t: 'Browse tools', href: '/tools.html' }]
    },
    {
      id: 'store',
      q: ['store', 'buy', 'shop', 'purchase', 'products', 'price', 'pricing'],
      a: 'The store has <strong>28 digital products</strong> — instant download after Stripe-hosted checkout, every product tested before it\'s sold. Honest price ranges today: guides $19–$27, toolkits $37–$47, flagship systems $97 — all one-time. Card details are entered on stripe.com under Stripe’s PCI-DSS compliance; ABUZ8 never sees card numbers.',
      links: [{ t: 'Store', href: '/store.html' }, { t: 'Products', href: '/products.html' }, { t: 'Refunds', href: '/refund.html' }]
    },
    {
      id: 'deploy-agent',
      q: ['deploy an agent', 'deploy', 'agent', 'ollama', 'local model', 'run locally', 'gguf'],
      a: 'Fastest local start: install Ollama (or llama.cpp), pull a GGUF model with <code>ollama pull</code>, then <code>ollama run</code> it. The agent board tracks 20 credited open-source agent frameworks to build on. ABUZ8 OS itself is EARLY ACCESS via the request page.',
      links: [{ t: 'Agent board', href: '/agents.html' }, { t: 'Models guide', href: '/models.html' }, { t: 'Request access', href: '/request.html' }]
    },
    {
      id: 'abuz8-os',
      q: ['abuz8 os', 'os', 'abujarvis', 'jarvis', 'operating system', 'download os'],
      a: '<strong>ABUZ8 OS</strong> (AbuJarvis) is a local-first Electron agentic OS — real and in active development (internal builds at v2.55.x, 800+ internal API routes, self-hosted update channel). Truth-Status: <strong>EARLY ACCESS</strong> — no public download yet; request access to get on the list.',
      links: [{ t: 'Request early access', href: '/request.html' }, { t: 'Roadmap', href: '/roadmap.html' }]
    },
    {
      id: 'security',
      q: ['security', 'privacy', 'data', 'cookies', 'https', 'cloudflare', 'gdpr', 'soc2', 'hipaa'],
      a: 'Hosting: Cloudflare Pages with TLS/HTTPS enforced; every page carries nosniff / SAMEORIGIN / strict-origin-when-cross-origin headers. The only data collected is what you submit to the waitlist form (email, product interest, source page) — stored in Cloudflare D1; deleted on request. No accounts, no passwords, no payment data on our servers. Honest: not SOC2/ISO27001 certified, not HIPAA-covered.',
      links: [{ t: 'Security & Compliance', href: '/security.html' }, { t: 'Privacy', href: '/privacy.html' }]
    },
    {
      id: 'roadmap',
      q: ['roadmap', 'truth status', 'planned', 'coming soon', 'future'],
      a: 'Truth-Status badges everywhere: <strong>LIVE</strong> (working today), <strong>EARLY ACCESS</strong> (exists, gated), <strong>ROADMAP</strong> (planned, not built — never sold). ROADMAP today: publishing sovereign models/datasets, open-sourcing components, the agent marketplace.',
      links: [{ t: 'Roadmap', href: '/roadmap.html' }, { t: 'Audit & Transparency', href: '/audit.html' }]
    },
    {
      id: 'contact',
      q: ['contact', 'email', 'support', 'help', 'human'],
      a: 'Email <a href="mailto:ahmad@abuz8ai.com">ahmad@abuz8ai.com</a> — the official contact for support, partnerships, refunds, privacy requests, and security reports.',
      links: [{ t: 'Contact page', href: '/contact.html' }]
    },
    {
      id: 'refunds',
      q: ['refund', 'money back', 'guarantee', 'return', '14 day'],
      a: 'Honest policy: <strong>no blanket money-back guarantee</strong> — every product is tested before it\'s sold, and the only promise we make is honesty. Results depend on you. If a product is broken or not as described, email <a href="mailto:ahmad@abuz8ai.com">ahmad@abuz8ai.com</a> and we\'ll make it right.',
      links: [{ t: 'Refund policy', href: '/refund.html' }]
    }
  ];

  /* ---------- Quick-topic chips (label → KB entry id) ---------- */
  var CHIPS = [
    { label: '🧰 Free Tools', id: 'free-tools' },
    { label: '🛒 Products & Store', id: 'store' },
    { label: '🤖 Deploy an Agent', id: 'deploy-agent' },
    { label: '🖥️ ABUZ8 OS', id: 'abuz8-os' },
    { label: '🔐 Security & Privacy', id: 'security' },
    { label: '🗺️ Roadmap', id: 'roadmap' },
    { label: '✉️ Contact', id: 'contact' }
  ];

  /* ---------- Site map shown on unknown questions ---------- */
  var SITE_MAP = [
    { t: 'Free Tools', href: '/tools.html' },
    { t: 'Store', href: '/store.html' },
    { t: 'Products', href: '/products.html' },
    { t: 'AI Agents', href: '/agents.html' },
    { t: 'Models', href: '/models.html' },
    { t: 'News', href: '/news.html' },
    { t: 'Roadmap', href: '/roadmap.html' },
    { t: 'Security', href: '/security.html' },
    { t: 'Contact', href: '/contact.html' }
  ];

  var kb = null;            // loaded entries (array)
  var kbSource = null;      // 'live' | 'fallback'
  var kbPromise = null;     // in-flight fetch promise
  var greeted = false;      // greeting rendered once per page view
  var els = {};             // element refs

  /* ============================================================
     STYLES — theme palette values only (vars + identical fallbacks)
     ============================================================ */
  function injectStyles() {
    if (document.getElementById('a8ob-style')) { return; }
    var css = '' +
      '#a8ob-btn{position:fixed;right:22px;bottom:22px;z-index:9990;width:58px;height:58px;' +
        'border-radius:50%;border:1px solid var(--border-gold,rgba(201,168,76,.25));cursor:pointer;' +
        'background:var(--gold,#c9a84c);color:var(--lapis,#0a1628);font-size:24px;line-height:1;' +
        'display:flex;align-items:center;justify-content:center;' +
        'box-shadow:0 10px 30px rgba(0,0,0,.3);transition:background .3s,transform .3s}' +
      '#a8ob-btn:hover{background:var(--gold-light,#e8d48b);transform:translateY(-2px)}' +
      '#a8ob-btn:focus-visible{outline:2px solid var(--green-bright,#2fbf8f);outline-offset:3px}' +
      /* status dot — STATIC, no pulse, no animation (seizure-safe) */
      '#a8ob-dot{position:absolute;top:2px;right:2px;width:12px;height:12px;border-radius:50%;' +
        'background:var(--green-bright,#2fbf8f);border:2px solid var(--lapis,#0a1628)}' +
      '#a8ob-panel{position:fixed;right:22px;bottom:92px;z-index:9991;' +
        'width:min(380px,calc(100vw - 32px));height:min(540px,calc(100vh - 130px));' +
        'display:flex;flex-direction:column;overflow:hidden;' +
        'background:var(--lapis-2,#0d1a30);border:1px solid var(--border-gold,rgba(201,168,76,.25));' +
        'border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.3);' +
        'font-family:var(--font-body,\'Inter\',system-ui,sans-serif);color:var(--text,#e8e4d8);' +
        'opacity:1;transition:opacity .3s}' +
      '#a8ob-panel[hidden]{display:none}' +
      '#a8ob-head{padding:16px 18px 13px;background:var(--lapis-3,#111f38);' +
        'border-bottom:1px solid var(--border,#1a2e50);display:flex;align-items:flex-start;gap:10px}' +
      '#a8ob-head-txt{flex:1;min-width:0}' +
      '#a8ob-title{font-weight:800;font-size:15px;color:var(--gold,#c9a84c);letter-spacing:.5px}' +
      '#a8ob-sub{font-size:10.5px;color:var(--dim,#8a9aaa);margin-top:3px;line-height:1.5}' +
      '#a8ob-close{background:transparent;border:1px solid var(--border,#1a2e50);color:var(--dim,#8a9aaa);' +
        'border-radius:8px;width:28px;height:28px;font-size:14px;line-height:1;cursor:pointer;' +
        'transition:color .3s,border-color .3s;flex-shrink:0}' +
      '#a8ob-close:hover{color:var(--gold,#c9a84c);border-color:var(--gold,#c9a84c)}' +
      '#a8ob-msgs{flex:1;overflow-y:auto;padding:16px 14px;display:flex;flex-direction:column;gap:10px}' +
      '.a8ob-m{max-width:92%;background:var(--lapis-3,#111f38);border:1px solid var(--border,#1a2e50);' +
        'border-radius:12px 12px 12px 4px;padding:11px 14px;font-size:12.5px;line-height:1.65;' +
        'color:var(--text,#e8e4d8);align-self:flex-start;overflow-wrap:break-word}' +
      '.a8ob-m a{color:var(--gold,#c9a84c);text-decoration:none}' +
      '.a8ob-m a:hover{color:var(--gold-light,#e8d48b);text-decoration:underline}' +
      '.a8ob-m strong{color:var(--white,#f5f8fc)}' +
      '.a8ob-m code{font-family:var(--font-mono,Consolas,monospace);font-size:11px;' +
        'background:var(--lapis,#0a1628);border:1px solid var(--border,#1a2e50);border-radius:5px;' +
        'padding:1px 6px;color:var(--green-bright,#2fbf8f)}' +
      '.a8ob-u{max-width:88%;background:var(--green-deep,#046a38);color:var(--white,#f5f8fc);' +
        'border-radius:12px 12px 4px 12px;padding:10px 14px;font-size:12.5px;line-height:1.6;' +
        'align-self:flex-end;overflow-wrap:break-word}' +
      '.a8ob-note{align-self:stretch;font-size:11px;line-height:1.6;color:var(--dim,#8a9aaa);' +
        'background:rgba(201,168,76,.07);border:1px solid var(--gold-dim,#8a7030);' +
        'border-radius:10px;padding:9px 12px}' +
      '.a8ob-links{display:flex;flex-wrap:wrap;gap:6px;margin-top:9px}' +
      '.a8ob-links a{display:inline-block;font-size:10.5px;font-weight:600;letter-spacing:.5px;' +
        'color:var(--green-bright,#2fbf8f);border:1px solid var(--border,#1a2e50);border-radius:20px;' +
        'padding:4px 11px;text-decoration:none;transition:color .3s,border-color .3s}' +
      '.a8ob-links a:hover{color:var(--gold,#c9a84c);border-color:var(--gold,#c9a84c);text-decoration:none}' +
      '#a8ob-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 14px 10px}' +
      '.a8ob-chip{background:transparent;border:1px solid var(--border,#1a2e50);color:var(--dim,#8a9aaa);' +
        'border-radius:20px;padding:5px 12px;font-size:11px;font-weight:600;cursor:pointer;' +
        'font-family:inherit;transition:color .3s,border-color .3s,background .3s}' +
      '.a8ob-chip:hover{color:var(--gold-light,#e8d48b);border-color:var(--gold,#c9a84c);' +
        'background:rgba(201,168,76,.06)}' +
      '#a8ob-form{display:flex;gap:8px;padding:12px 14px;border-top:1px solid var(--border,#1a2e50);' +
        'background:var(--lapis-3,#111f38)}' +
      '#a8ob-input{flex:1;min-width:0;background:var(--lapis,#0a1628);border:1px solid var(--border,#1a2e50);' +
        'border-radius:10px;padding:10px 13px;font-size:12.5px;color:var(--text,#e8e4d8);' +
        'font-family:inherit;transition:border-color .3s}' +
      '#a8ob-input:focus{outline:none;border-color:var(--gold,#c9a84c)}' +
      '#a8ob-input::placeholder{color:var(--muted,#556070)}' +
      '#a8ob-send{background:var(--gold,#c9a84c);color:var(--lapis,#0a1628);border:none;border-radius:10px;' +
        'padding:0 16px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit;' +
        'transition:background .3s}' +
      '#a8ob-send:hover{background:var(--gold-light,#e8d48b)}' +
      '@media(max-width:480px){#a8ob-panel{right:12px;bottom:86px;width:calc(100vw - 24px)}' +
        '#a8ob-btn{right:14px;bottom:14px}}';
    var style = document.createElement('style');
    style.id = 'a8ob-style';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /* ============================================================
     DOM
     ============================================================ */
  function build() {
    // Launcher button — gold circle, static green status dot
    var btn = document.createElement('button');
    btn.id = 'a8ob-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Open the ABUZ8 Guide — instant site answers');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', 'a8ob-panel');
    btn.innerHTML = '<span aria-hidden="true">🧭</span><span id="a8ob-dot" aria-hidden="true"></span>';

    // Panel
    var panel = document.createElement('div');
    panel.id = 'a8ob-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'ABUZ8 Guide');
    panel.hidden = true;
    panel.innerHTML =
      '<div id="a8ob-head">' +
        '<div id="a8ob-head-txt">' +
          '<div id="a8ob-title">🧭 ABUZ8 Guide</div>' +
          '<div id="a8ob-sub">Instant answers · runs in your browser · nothing leaves this page.</div>' +
        '</div>' +
        '<button id="a8ob-close" type="button" aria-label="Close the guide">✕</button>' +
      '</div>' +
      '<div id="a8ob-msgs" aria-live="polite"></div>' +
      '<div id="a8ob-chips"></div>' +
      '<form id="a8ob-form" autocomplete="off">' +
        '<input id="a8ob-input" type="text" maxlength="200" ' +
          'placeholder="Ask about tools, products, the OS…" aria-label="Ask the ABUZ8 Guide a question">' +
        '<button id="a8ob-send" type="submit" aria-label="Send question">→</button>' +
      '</form>';

    document.body.appendChild(btn);
    document.body.appendChild(panel);

    els.btn = btn;
    els.panel = panel;
    els.msgs = panel.querySelector('#a8ob-msgs');
    els.chips = panel.querySelector('#a8ob-chips');
    els.form = panel.querySelector('#a8ob-form');
    els.input = panel.querySelector('#a8ob-input');
    els.close = panel.querySelector('#a8ob-close');

    // Chips
    CHIPS.forEach(function (c) {
      var chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'a8ob-chip';
      chip.textContent = c.label;
      chip.addEventListener('click', function () { onChip(c); });
      els.chips.appendChild(chip);
    });

    // Events
    btn.addEventListener('click', toggle);
    els.close.addEventListener('click', function () { closePanel(true); });
    els.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = (els.input.value || '').trim();
      if (!text) { return; }
      els.input.value = '';
      handleQuery(text);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !els.panel.hidden) { closePanel(true); }
    });
  }

  /* ============================================================
     Open / close (+ localStorage: single key, open/closed only)
     ============================================================ */
  function saveState(v) {
    try { localStorage.setItem(LS_KEY, v); } catch (e) { /* storage unavailable — fine */ }
  }
  function readState() {
    try { return localStorage.getItem(LS_KEY); } catch (e) { return null; }
  }

  function openPanel(persist) {
    els.panel.hidden = false;
    els.btn.setAttribute('aria-expanded', 'true');
    if (persist) { saveState('open'); }
    if (!greeted) { greet(); greeted = true; }
    ensureKB(); // lazy: first open triggers the one-time KB fetch
    els.input.focus();
  }
  function closePanel(persist) {
    els.panel.hidden = true;
    els.btn.setAttribute('aria-expanded', 'false');
    if (persist) { saveState('closed'); }
    els.btn.focus();
  }
  function toggle() {
    if (els.panel.hidden) { openPanel(true); } else { closePanel(true); }
  }

  /* ============================================================
     Messages
     ============================================================ */
  function scrollMsgs() { els.msgs.scrollTop = els.msgs.scrollHeight; }

  // Bot answer: html comes ONLY from our own KB / static strings,
  // never from user input.
  function botMsg(html, links) {
    var div = document.createElement('div');
    div.className = 'a8ob-m';
    div.innerHTML = html;
    if (links && links.length) {
      var row = document.createElement('div');
      row.className = 'a8ob-links';
      links.forEach(function (l) {
        if (!l || !l.href) { return; }
        var a = document.createElement('a');
        a.href = l.href;
        a.textContent = l.t || l.href;
        row.appendChild(a);
      });
      div.appendChild(row);
    }
    els.msgs.appendChild(div);
    scrollMsgs();
  }

  // User echo: textContent only — user input is never parsed as HTML.
  function userMsg(text) {
    var div = document.createElement('div');
    div.className = 'a8ob-u';
    div.textContent = text;
    els.msgs.appendChild(div);
    scrollMsgs();
  }

  function noteMsg(text) {
    var div = document.createElement('div');
    div.className = 'a8ob-note';
    div.textContent = text;
    els.msgs.appendChild(div);
    scrollMsgs();
  }

  function greet() {
    botMsg(
      'Hi — I’m the <strong>ABUZ8 Guide</strong>. I answer questions about this site: the ' +
      '169 free tools, the store, deploying agents, ABUZ8 OS, security, and the roadmap. ' +
      'I run entirely in your browser — nothing you type leaves this page. ' +
      'Pick a topic below or just ask.'
    );
  }

  /* ============================================================
     KB loading — one lazy fetch, honest labeled fallback
     ============================================================ */
  function normalizeKB(data) {
    var entries = Array.isArray(data) ? data : (data && Array.isArray(data.entries) ? data.entries : null);
    if (!entries || !entries.length) { return null; }
    return entries.filter(function (e) {
      return e && typeof e.id === 'string' && Array.isArray(e.q) && typeof e.a === 'string';
    });
  }

  function ensureKB() {
    if (kb) { return Promise.resolve(kb); }
    if (kbPromise) { return kbPromise; }
    var useFallback = function () {
      kb = FALLBACK_KB;
      kbSource = 'fallback';
      noteMsg('Note: the full guide data could not load, so I’m running on a smaller built-in ' +
        'answer set. Everything I say is still accurate — for anything I miss, email ahmad@abuz8ai.com.');
      return kb;
    };
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 7000) : null;
    kbPromise = fetch(KB_URL, controller ? { signal: controller.signal } : undefined)
      .then(function (res) {
        if (!res.ok) { throw new Error('HTTP ' + res.status); }
        return res.json();
      })
      .then(function (data) {
        if (timer) { clearTimeout(timer); }
        var entries = normalizeKB(data);
        if (!entries) { return useFallback(); }
        kb = entries;
        kbSource = 'live';
        return kb;
      })
      .catch(function () {
        if (timer) { clearTimeout(timer); }
        return useFallback();
      });
    return kbPromise;
  }

  /* ============================================================
     Retrieval — keyword scoring over entry.q
     ============================================================ */
  function tokenize(text) {
    return String(text).toLowerCase()
      .replace(/[^a-z0-9\s.\-]/g, ' ')
      .split(/\s+/)
      .filter(function (t) { return t.length >= 2; });
  }

  function scoreEntry(entry, qNorm, tokens) {
    var score = 0;
    for (var i = 0; i < entry.q.length; i++) {
      var kw = String(entry.q[i]).toLowerCase();
      if (kw.indexOf(' ') !== -1) {
        // multi-word phrase: strong signal if the whole phrase appears
        if (qNorm.indexOf(kw) !== -1) { score += 4 + kw.split(' ').length; }
      } else if (tokens.indexOf(kw) !== -1) {
        score += 3; // exact token
      } else if (kw.length >= 5 && qNorm.indexOf(kw) !== -1) {
        score += 2; // substring (e.g. "refunds" contains "refund")
      } else if (kw.length >= 4) {
        for (var j = 0; j < tokens.length; j++) {
          var t = tokens[j];
          if (t.length >= 4 && (kw.indexOf(t) === 0 || t.indexOf(kw) === 0)) { score += 1; break; }
        }
      }
    }
    return score;
  }

  function searchKB(text) {
    var qNorm = ' ' + String(text).toLowerCase().replace(/[^a-z0-9\s.\-]/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
    var tokens = tokenize(text);
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < kb.length; i++) {
      var s = scoreEntry(kb[i], qNorm, tokens);
      if (s > bestScore) { bestScore = s; best = kb[i]; }
    }
    return bestScore >= 3 ? best : null;
  }

  function findEntry(id) {
    if (!kb) { return null; }
    for (var i = 0; i < kb.length; i++) {
      if (kb[i].id === id) { return kb[i]; }
    }
    return null;
  }

  /* ============================================================
     Answering
     ============================================================ */
  function answerEntry(entry) {
    botMsg(entry.a, entry.links || []);
  }

  function unknownAnswer() {
    botMsg(
      'Sorry — I don’t have a confident answer for that one; I only know this site. ' +
      'Here’s the map, or email <a href="mailto:ahmad@abuz8ai.com">ahmad@abuz8ai.com</a> ' +
      'and a human will answer.',
      SITE_MAP
    );
  }

  function handleQuery(text) {
    userMsg(text);
    ensureKB().then(function () {
      var entry = searchKB(text);
      if (entry) { answerEntry(entry); } else { unknownAnswer(); }
    });
  }

  function onChip(chip) {
    userMsg(chip.label.replace(/^\S+\s/, '')); // echo label without the emoji
    ensureKB().then(function () {
      var entry = findEntry(chip.id) || searchKB(chip.label);
      if (entry) { answerEntry(entry); } else { unknownAnswer(); }
    });
  }

  /* ============================================================
     Init
     ============================================================ */
  function init() {
    if (!document.body) { return; }
    injectStyles();
    build();
    if (readState() === 'open') { openPanel(false); }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
