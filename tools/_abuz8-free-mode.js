/* ABUZ8 Tools — Free-Mode + Universal Footer.
   Drop one <script src="_abuz8-free-mode.js" defer></script> into any tool page
   and it will:
     1. Replace "WAITING LIST MODE" / "Early Access" / "Premium Tier" badges
        with a clean "FREE — fully working" badge.
     2. Scrub the DOM of common pricing-theater phrases ("first 500",
        "premium tier", "early access only", "$X/mo", etc.).
     3. Inject a single shared footer with GitHub + HuggingFace + free links
        and one discreet "Support the work" link at the very bottom.
   Source of truth for URLs is _abuz8-config.js (window.ABUZ8.LINKS).
   Updated: 2026-05-08 afternoon shift.
*/
(function () {
  'use strict';

  // Wait for DOM ready + config
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  // Default link set in case _abuz8-config.js wasn't loaded.
  const FALLBACK_LINKS = {
    home:        "https://abuz8ai.com",
    tools:       "https://abuz8ai.com/tools.html",
    free:        "https://abuz8ai.com/free.html",
    store:       "https://abuz8ai.com/store.html",
    github:      "https://github.com/abuz8studios-ship-it",
    huggingface: "https://huggingface.co/abuz8studios",
    news:        "https://ai-news-feed-284.pages.dev",
    scanner:     "https://abuz8ai.com/scanner.html",
    email:       "hello@abuz8ai.com",
    support:     "https://abuz8ai.com/support.html"
  };

  function L() {
    return (window.ABUZ8 && window.ABUZ8.LINKS) || FALLBACK_LINKS;
  }

  // ── 1. Replace "Early Access / Waiting List" badges with FREE ───────
  function rebadgeBadges() {
    // Common selectors used across the corpus
    const selectors = [
      '.badge-stage', '.status-badge', '.badge', '.early-access',
      '[class*="early-access"]', '[class*="waitlist-badge"]'
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        const txt = (el.textContent || '').trim().toLowerCase();
        if (
          txt.includes('early access') ||
          txt.includes('waiting list') ||
          txt.includes('private beta') ||
          txt.includes('coming soon') ||
          txt.includes('premium tier')
        ) {
          el.textContent = 'FREE — fully working';
          el.style.color = '#2fbf8f';
          el.style.borderColor = 'rgba(42,184,154,0.4)';
          el.style.background = 'rgba(26,138,122,0.12)';
        }
      });
    });
  }

  // ── 2. Scrub pricing-theater phrases from rendered text ─────────────
  // Conservative — only touches text inside <p>, <span>, <li>, <h3>, <h4>
  // so we don't break form labels, scripts, or headers.
  const PRICING_REGEXES = [
    [/\bfirst\s+500\b[^.]*\./gi, ''],
    [/\bunlock\s+(unlimited|premium|all)[^.]*\./gi, ''],
    [/\bpremium\s+tier\b[^.]*\./gi, ''],
    [/\bearly[\s-]access\s+members\s+get[^.]*\./gi, ''],
    [/\bgated\s+to\s+(early[\s-]access|premium)[^.]*\./gi, ''],
    [/\b\d+\s+free\s+credits\b/gi, 'unlimited free use'],
    [/\$\d+\s*\/\s*mo\b/gi, 'free']
  ];
  function scrubText() {
    const tags = ['p', 'span', 'li', 'h3', 'h4', 'small'];
    tags.forEach(tag => {
      document.querySelectorAll(tag).forEach(el => {
        // Skip script/style children and our own footer
        if (el.closest('#abuz8-shared-footer')) return;
        if (el.children.length > 0) return; // only leaf text nodes
        let t = el.textContent;
        if (!t) return;
        let changed = false;
        PRICING_REGEXES.forEach(([re, repl]) => {
          if (re.test(t)) {
            t = t.replace(re, repl).replace(/\s{2,}/g, ' ').trim();
            changed = true;
          }
        });
        if (changed) el.textContent = t;
      });
    });
  }

  // ── 3. Soften "Join Early Access" headings ──────────────────────────
  function softenWaitlistHeadings() {
    const candidates = document.querySelectorAll('.waitlist-wrap h3, .modal-content h2, .wl-title');
    candidates.forEach(el => {
      const t = (el.textContent || '').trim();
      if (/early\s*access/i.test(t) || /waiting\s*list/i.test(t)) {
        el.textContent = "It's free. Use it as much as you want.";
      }
    });
    // Soften the descriptive paragraph commonly under that heading
    document.querySelectorAll('.waitlist-wrap p.sub').forEach(el => {
      const t = (el.textContent || '').toLowerCase();
      if (
        t.includes('early access') ||
        t.includes('first 500') ||
        t.includes('premium') ||
        t.includes('gated')
      ) {
        el.textContent =
          "If this tool helped you, drop your email and we'll let you know when major upgrades ship. " +
          "You can also support the work below — but the tool itself is free, fully working, no gate.";
      }
    });
  }

  // ── 4. Inject shared footer ─────────────────────────────────────────
  function injectFooter() {
    if (document.getElementById('abuz8-shared-footer')) return;
    const links = L();
    const f = document.createElement('footer');
    f.id = 'abuz8-shared-footer';
    f.style.cssText =
      'margin-top:48px;padding:36px 24px;border-top:1px solid #1a2e50;' +
      'background:linear-gradient(180deg,rgba(13,26,48,0),rgba(13,26,48,0.6));' +
      'font-family:Inter,system-ui,sans-serif;color:#8a9aaa;font-size:12px;' +
      'text-align:center;line-height:1.7;';
    f.innerHTML =
      '<div style="max-width:1100px;margin:0 auto;">' +
        '<div style="font-family:\'Playfair Display\',serif;font-size:18px;color:#c9a84c;letter-spacing:2px;margin-bottom:6px;">ABUZ8</div>' +
        '<p style="color:#2fbf8f;font-size:13px;font-weight:600;margin-bottom:20px;">Every tool here is free. Forever. No credit card. No email gate. No premium tier.</p>' +
        '<nav style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px 18px;margin-bottom:18px;">' +
          '<a href="' + links.home + '" style="color:#c9a84c;text-decoration:none;">Home</a>' +
          '<span style="color:#3a4a5a;">·</span>' +
          '<a href="' + links.tools + '" style="color:#c9a84c;text-decoration:none;">All Tools</a>' +
          '<span style="color:#3a4a5a;">·</span>' +
          '<a href="' + links.free + '" style="color:#c9a84c;text-decoration:none;">Free Resources</a>' +
          '<span style="color:#3a4a5a;">·</span>' +
          '<a href="' + links.news + '" target="_blank" rel="noopener" style="color:#c9a84c;text-decoration:none;">AI Daily News</a>' +
          '<span style="color:#3a4a5a;">·</span>' +
          '<a href="' + links.scanner + '" style="color:#c9a84c;text-decoration:none;">Polymarket Scanner</a>' +
        '</nav>' +
        '<nav style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px 18px;margin-bottom:24px;">' +
          '<a href="' + links.github + '" target="_blank" rel="noopener" style="color:#2fbf8f;text-decoration:none;font-weight:600;">↗ GitHub</a>' +
          '<span style="color:#3a4a5a;">·</span>' +
          '<a href="' + links.huggingface + '" target="_blank" rel="noopener" style="color:#2fbf8f;text-decoration:none;font-weight:600;">↗ Hugging Face</a>' +
          '<span style="color:#3a4a5a;">·</span>' +
          '<a href="mailto:' + links.email + '" style="color:#2fbf8f;text-decoration:none;">' + links.email + '</a>' +
        '</nav>' +
        '<p style="color:#556070;font-size:11px;margin-top:18px;">' +
          '© 2026 ABUZ8 · Sovereign AI infrastructure' +
        '</p>' +
        '<p style="margin-top:14px;">' +
          '<a href="' + links.support + '" style="color:#8a9aaa;text-decoration:none;font-size:11px;border-bottom:1px dashed #556070;padding-bottom:1px;">Support the work →</a>' +
        '</p>' +
      '</div>';
    document.body.appendChild(f);
  }

  // ── 5. Hide pricing-only blocks if author opted-in by class ─────────
  // Pages can mark elements with class="abuz8-pricing-only" and they disappear.
  function hidePricingOnly() {
    document.querySelectorAll('.abuz8-pricing-only').forEach(el => {
      el.style.display = 'none';
    });
  }

  ready(function () {
    try {
      rebadgeBadges();
      scrubText();
      softenWaitlistHeadings();
      hidePricingOnly();
      injectFooter();
    } catch (e) {
      // Never let this script break a page
      try { console.warn('[abuz8-free-mode]', e); } catch (_) {}
    }
  });
})();
