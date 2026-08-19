/* ============================================================
   ABUZ8 UI — shared behavior for the unified theme
   v1.0 · 2026-07-17
   Accessible tabs · accordion · copy buttons · active nav ·
   slow stat counters (reduced-motion aware) · footer year.
   Usage: <script src="/assets/js/abuz8-ui.js" defer></script>
   ============================================================ */
(function () {
  'use strict';

  var reducedMotion = false;
  try {
    reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* older browsers: leave false */ }

  /* ---------- Tabs ----------
     Markup:
     <div class="tabs" data-tabs>
       <div class="tab-list" role="tablist">
         <button class="tab-btn" role="tab" id="tab-x" aria-controls="panel-x" aria-selected="true">X</button>
         ...
       </div>
       <div class="tab-panel" role="tabpanel" id="panel-x" aria-labelledby="tab-x">...</div>
       ...
     </div>
     Deep link: page.html#tab=panel-x selects that tab on load. */
  function initTabs(root) {
    var tabs = Array.prototype.slice.call(root.querySelectorAll('[role="tab"]'));
    if (!tabs.length) return;

    function panelOf(tab) {
      var id = tab.getAttribute('aria-controls');
      return id ? document.getElementById(id) : null;
    }

    function select(tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var p = panelOf(t);
        if (p) { if (on) { p.hidden = false; } else { p.hidden = true; } }
      });
      if (focus) tab.focus();
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (ev) {
        var n = null;
        if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') n = tabs[(i + 1) % tabs.length];
        else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (ev.key === 'Home') n = tabs[0];
        else if (ev.key === 'End') n = tabs[tabs.length - 1];
        if (n) { ev.preventDefault(); select(n, true); }
      });
    });

    // Honor #tab=<panel-id> — at load AND on every hash change (so in-page
    // "#tab=panel-x" links switch tabs live, not only as deep links).
    function selectFromHash() {
      var m = (location.hash || '').match(/tab=([\w-]+)/);
      if (!m) return false;
      var hit = tabs.filter(function (t) { return t.getAttribute('aria-controls') === m[1]; })[0];
      if (hit) { select(hit, false); return true; }
      return false;
    }
    window.addEventListener('hashchange', selectFromHash);

    var initial = null;
    var m = (location.hash || '').match(/tab=([\w-]+)/);
    if (m) {
      initial = tabs.filter(function (t) { return t.getAttribute('aria-controls') === m[1]; })[0] || null;
    }
    if (!initial) initial = tabs.filter(function (t) { return t.getAttribute('aria-selected') === 'true'; })[0] || tabs[0];
    select(initial, false);
  }

  /* ---------- Copy buttons ---------- */
  function initCopy() {
    Array.prototype.slice.call(document.querySelectorAll('.code-copy')).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var pre = btn.closest('pre');
        var text = pre ? pre.textContent.replace(btn.textContent, '').trim() : '';
        if (!text) return;
        function done() {
          var old = btn.textContent;
          btn.textContent = 'Copied';
          setTimeout(function () { btn.textContent = old; }, 1600);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {});
        }
      });
    });
  }

  /* ---------- Active nav highlight ---------- */
  function initNav() {
    var path = location.pathname.replace(/\/index\.html$/, '/');
    Array.prototype.slice.call(document.querySelectorAll('.nav-links a')).forEach(function (a) {
      try {
        var href = a.getAttribute('href');
        if (!href || href.charAt(0) === '#') return;
        var ap = new URL(href, location.origin).pathname;
        if (ap !== '/' && (path === ap || path.indexOf(ap.replace(/\.html$/, '')) === 0)) {
          a.classList.add('active');
        }
      } catch (e) { /* ignore malformed hrefs */ }
    });
  }

  /* ---------- Slow stat counters (2s ease, no flashing) ---------- */
  function initCounters() {
    var els = Array.prototype.slice.call(document.querySelectorAll('.stat-num[data-count]'));
    if (!els.length) return;
    function run(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      if (!isFinite(target)) return;
      var suffix = el.getAttribute('data-suffix') || '';
      if (reducedMotion) { el.textContent = String(target) + suffix; return; }
      var start = null, dur = 2000;
      function frame(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    if ('IntersectionObserver' in window) {
      var seen = new WeakSet();
      function once(el) { if (!seen.has(el)) { seen.add(el); run(el); } }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) once(en.target);
        });
      }, { threshold: 0.4 });
      els.forEach(function (el) { io.observe(el); });
      /* FAIL-OPEN, same contract as initReveal: a published number must never
         render as 0. If the observer never fires — degenerate viewport, print,
         in-app browser, screenshot/preview renderer — snap every counter to its
         real value after 1.5s. A transparency page showing "0 Store Products"
         is worse than no animation at all. */
      setTimeout(function () {
        els.forEach(function (el) {
          if (seen.has(el)) return;
          seen.add(el);
          var target = parseFloat(el.getAttribute('data-count'));
          if (isFinite(target)) {
            el.textContent = String(target) + (el.getAttribute('data-suffix') || '');
          }
        });
        io.disconnect();
      }, 1500);
    } else {
      els.forEach(run);
    }
  }

  /* ---------- Footer year ---------- */
  function initYear() {
    Array.prototype.slice.call(document.querySelectorAll('[data-year]')).forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  }

  /* ---------- Cinematic ambient layer (glow orbs, purpose-page style) ---------- */
  function initAmbient() {
    if (!document.querySelector('.geo-bg') || document.querySelector('.glow-orb')) return;
    ['glow-orb glow-orb-1', 'glow-orb glow-orb-2', 'glow-orb glow-orb-3'].forEach(function (cls) {
      var d = document.createElement('div');
      d.className = cls;
      d.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(d, document.body.firstChild);
    });
  }

  /* ---------- Gentle scroll reveal (.8s, once, reduced-motion aware) ----------
     FAIL-OPEN by design: content must never stay hidden. Elements already in
     the viewport reveal synchronously; a hard 1.5s timeout reveals everything
     else even if IntersectionObserver never fires. */
  function initReveal() {
    if (reducedMotion || !('IntersectionObserver' in window)) return;
    var els = Array.prototype.slice.call(
      document.querySelectorAll('.panel, .card, .section-head, .stat, .parable, .steps li')
    );
    if (!els.length) return;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var pending = [];
    els.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < vh && r.bottom > 0) {
        // already visible: animate in on the next frame, no observer involved
        el.classList.add('reveal');
        requestAnimationFrame(function () { el.classList.add('in'); });
      } else {
        el.classList.add('reveal');
        pending.push(el);
      }
    });
    if (!pending.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.05 });
    pending.forEach(function (el) { io.observe(el); });
    // Safety net: nothing may remain hidden no matter what.
    setTimeout(function () {
      pending.forEach(function (el) { el.classList.add('in'); });
      io.disconnect();
    }, 1500);
  }

  function boot() {
    Array.prototype.slice.call(document.querySelectorAll('[data-tabs]')).forEach(initTabs);
    initCopy();
    initNav();
    initCounters();
    initYear();
    initAmbient();
    initReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
