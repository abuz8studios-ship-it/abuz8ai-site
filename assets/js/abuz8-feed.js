/* Homepage 5-board feed: repos, models, free APIs. Patterns + harness are static HTML. */
(function () {
  'use strict';
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) {
    if (typeof n === 'number' && isFinite(n)) {
      try { return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n); }
      catch (e) { return String(n); }
    }
    return '';
  }
  function status(id, text, warn) {
    var el = document.getElementById(id);
    if (!el) return;
    el.className = warn ? 'warn' : 'feed-status';
    el.textContent = text;
  }
  function card(href, title, body, meta) {
    var a = document.createElement('a');
    a.className = 'card';
    a.href = href;
    if (href.indexOf('http') === 0) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    a.innerHTML = '<h3>' + esc(title) + '</h3><p>' + esc(body) + '</p>' +
      (meta ? '<div class="gh-meta">' + meta + '</div>' : '') +
      '<span class="card-link">Open source →</span>';
    return a;
  }

  function loadRepos() {
    var g = document.getElementById('feed-repos');
    if (!g) return;
    fetch('/api/github-trending?limit=12', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('http'); return r.json(); })
      .then(function (d) {
        var repos = (d && d.repos) || [];
        if (!repos.length) throw new Error('empty');
        g.innerHTML = '';
        repos.slice(0, 12).forEach(function (repo) {
          var meta = '';
          if (repo.language) meta += '<span class="pill">' + esc(repo.language) + '</span>';
          if (repo.stars) meta += '<span class="pill">★ ' + esc(fmt(repo.stars)) + '</span>';
          if (repo.gained) meta += '<span class="pill">+' + esc(fmt(repo.gained)) + ' this ' + (repo.period === 'month' ? 'month' : 'week') + '</span>';
          g.appendChild(card(repo.url || ('https://github.com/' + repo.full_name), repo.full_name, repo.description || 'No description.', meta));
        });
        status('feed-repos-status', (d.source === 'snapshot' ? 'Cached snapshot. ' : 'Live from GitHub trending. ') + g.children.length + ' repos.');
      })
      .catch(function () {
        g.innerHTML = '';
        status('feed-repos-status', 'GitHub feed offline. We will not invent a board. Open github.com/trending.', true);
      });
  }

  function loadModels() {
    var g = document.getElementById('feed-models');
    if (!g) return;
    fetch('/api/hf-live?kind=models', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var items = (d && d.items) || [];
        if (!items.length) throw new Error('empty');
        g.innerHTML = '';
        items.slice(0, 12).forEach(function (m) {
          var meta = '';
          if (m.pipeline_tag) meta += '<span class="pill">' + esc(m.pipeline_tag) + '</span>';
          if (m.downloads) meta += '<span class="pill">⬇ ' + esc(fmt(m.downloads)) + '</span>';
          if (m.likes) meta += '<span class="pill">♥ ' + esc(fmt(m.likes)) + '</span>';
          g.appendChild(card(m.url || ('https://huggingface.co/' + m.id), m.id, m.pipeline_tag || 'model', meta));
        });
        status('feed-models-status', 'Live from Hugging Face. ' + g.children.length + ' models. Frontier prices: /models.');
      })
      .catch(function () {
        return fetch('https://huggingface.co/api/models?sort=trendingScore&limit=12')
          .then(function (r) { return r.json(); })
          .then(function (items) {
            if (!Array.isArray(items) || !items.length) throw new Error('empty');
            g.innerHTML = '';
            items.forEach(function (m) {
              var id = m.id || m.modelId;
              g.appendChild(card('https://huggingface.co/' + id, id, m.pipeline_tag || 'model', ''));
            });
            status('feed-models-status', 'Live from huggingface.co in your browser.');
          });
      })
      .catch(function () {
        g.innerHTML = '';
        status('feed-models-status', 'Models feed offline. Open huggingface.co/models.', true);
      });
  }

  function loadApis() {
    var g = document.getElementById('feed-apis');
    var live = document.getElementById('feed-apis-live');
    if (!g) return;
    fetch('/api/free-apis', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var providers = (d && d.providers) || [];
        g.innerHTML = '';
        providers.forEach(function (p) {
          g.appendChild(card(p.url, p.name, p.note, '<span class="pill">check current limits</span>'));
        });
        status('feed-apis-status', 'Curated free-tier doors. Limits change. Read the source before you build.');
        if (live && d.openrouter_free && d.openrouter_free.length) {
          live.innerHTML = '';
          d.openrouter_free.slice(0, 12).forEach(function (m) {
            live.appendChild(card(m.url, m.name, m.id + (m.ctx ? ' · ' + fmt(m.ctx) + ' ctx' : ''), '<span class="pill">OpenRouter :free</span>'));
          });
        }
      })
      .catch(function () {
        g.innerHTML = '';
        status('feed-apis-status', 'Free-API feed offline. Open openrouter.ai/models?max_price=0.', true);
      });
  }

  function boot() {
    loadRepos();
    loadModels();
    loadApis();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
