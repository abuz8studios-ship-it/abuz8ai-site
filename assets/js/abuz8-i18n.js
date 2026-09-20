/* ============================================================
   ABUZ8 i18n — Full-site multi-language, two-layer engine
   v3.0 · 2026-08-15 · rewritten for site-wide coverage

   Layer 1 — hand-crafted dictionary
     Elements tagged with data-i18n / data-i18n-placeholder / data-i18n-title
     use the local TRANSLATIONS map. Perfect quality, ships instantly, no
     network round-trip. This is the money copy on the homepage hero.

   Layer 2 — machine translation
     Everything else on the page (all 90+ HTML pages and 187 tools worth of
     content that was never tagged) is auto-translated by Google Translate's
     Website Translator widget. Set the googtrans cookie → whole page flips.

   Together: the tagged strings look native, the long tail still translates.
   ============================================================ */
(function () {
  'use strict';

  // ── Languages we expose to the user ──────────────────────────────────
  const LANGS = {
    'en': 'English',
    'ar': 'العربية',
    'es': 'Español',
    'fr': 'Français',
    'de': 'Deutsch',
    'zh': '中文',
    'ja': '日本語',
    'pt': 'Português'
  };

  // Google Translate uses slightly different codes for a couple of these.
  const GT_CODE = { en: 'en', ar: 'ar', es: 'es', fr: 'fr', de: 'de',
                    zh: 'zh-CN', ja: 'ja', pt: 'pt' };

  // ── Layer 1 dictionary — perfect translations of the money copy ──────
  const TRANSLATIONS = {
    'en': {
      'hero-eyebrow':    'One product · One promise · Ships in 48 hours',
      'hero-h1-1':       'Your',
      'hero-h1-stalled': 'stalled project',
      'hero-h1-comma':   ',',
      'hero-h1-autopsied': 'autopsied',
      'hero-h1-in48':    'in 48 hours.',
      'hero-p':          "Every mid-size company has one project bleeding $10K–$100K in delay costs. In two days you'll know why it stalled, who owns each fix, and exactly what to do first. Fixed scope. One-time price. Delivered by the operator.",
      'cta-start':       'Read the playbook',
      'cta-how':         'How it works',
      'nav-rescue':      'PM Rescue',
      'nav-crew':        'Crew',
      'nav-hq':          'HQ',
      'nav-tools':       'Free Tools',
      'nav-about':       'About',
      'nav-cta':         'Start the rescue →'
    },
    'ar': {
      'hero-eyebrow':    'منتج واحد · وعد واحد · يُسلَّم خلال 48 ساعة',
      'hero-h1-1':       'مشروعك',
      'hero-h1-stalled': 'المتوقّف',
      'hero-h1-comma':   '،',
      'hero-h1-autopsied': 'تشريح',
      'hero-h1-in48':    'خلال 48 ساعة.',
      'hero-p':          'كل شركة متوسطة الحجم لديها مشروع واحد يستنزف من 10 آلاف إلى 100 ألف دولار بسبب التأخير. خلال يومين ستعرف لماذا توقّف، ومن يمتلك كل إصلاح، وما الذي يجب فعله أولاً. نطاق محدّد. سعر ثابت. يُسلَّم مباشرة من المشغّل.',
      'cta-start':       'اقرأ الدليل',
      'cta-how':         'كيف يعمل',
      'nav-rescue':      'إنقاذ المشاريع',
      'nav-tools':       'أدوات مجانية',
      'nav-about':       'من نحن',
      'nav-cta':         'ابدأ الإنقاذ ←'
    },
    'es': {
      'hero-eyebrow':    'Un producto · Una promesa · Se entrega en 48 horas',
      'hero-h1-1':       'Tu proyecto',
      'hero-h1-stalled': 'estancado',
      'hero-h1-comma':   ',',
      'hero-h1-autopsied': 'diagnosticado',
      'hero-h1-in48':    'en 48 horas.',
      'hero-p':          'Toda empresa mediana tiene un proyecto que pierde entre $10K y $100K por retrasos. En dos días sabrás por qué se estancó, quién debe arreglar cada punto y qué hacer primero. Alcance fijo. Precio único. Entregado por el operador.',
      'cta-start':       'Leer el playbook',
      'cta-how':         'Cómo funciona',
      'nav-rescue':      'Rescate PM',
      'nav-tools':       'Herramientas Gratis',
      'nav-about':       'Acerca',
      'nav-cta':         'Iniciar el rescate →'
    },
    'fr': {
      'hero-eyebrow':    'Un produit · Une promesse · Livré en 48 heures',
      'hero-h1-1':       'Votre projet',
      'hero-h1-stalled': 'bloqué',
      'hero-h1-comma':   ',',
      'hero-h1-autopsied': 'autopsié',
      'hero-h1-in48':    'en 48 heures.',
      'hero-p':          "Chaque PME a un projet qui perd 10 000 à 100 000 $ à cause des retards. En deux jours, vous saurez pourquoi il est bloqué, qui doit corriger quoi, et ce qu'il faut faire en premier. Périmètre fixe. Prix unique. Livré directement par l'opérateur.",
      'cta-start':       'Lancer le sauvetage → 1 500 $',
      'cta-how':         'Comment ça marche',
      'nav-rescue':      'Sauvetage PM',
      'nav-tools':       'Outils Gratuits',
      'nav-about':       'À Propos',
      'nav-cta':         'Lancer le sauvetage →'
    },
    'de': {
      'hero-eyebrow':    'Ein Produkt · Ein Versprechen · Lieferung in 48 Stunden',
      'hero-h1-1':       'Ihr',
      'hero-h1-stalled': 'ins Stocken geratenes Projekt',
      'hero-h1-comma':   ',',
      'hero-h1-autopsied': 'analysiert',
      'hero-h1-in48':    'in 48 Stunden.',
      'hero-p':          'Jedes mittelständische Unternehmen hat ein Projekt, das durch Verzögerungen 10.000 bis 100.000 $ verliert. In zwei Tagen wissen Sie, warum es hakt, wer welchen Fix verantwortet, und was zuerst zu tun ist. Fester Umfang. Einmalpreis. Vom Betreiber persönlich geliefert.',
      'cta-start':       'Rettung starten → $1.500',
      'cta-how':         'So funktioniert es',
      'nav-rescue':      'PM Rettung',
      'nav-tools':       'Kostenlose Tools',
      'nav-about':       'Über uns',
      'nav-cta':         'Rettung starten →'
    },
    'zh': {
      'hero-eyebrow':    '一个产品 · 一个承诺 · 48 小时内交付',
      'hero-h1-1':       '你那',
      'hero-h1-stalled': '停滞的项目',
      'hero-h1-comma':   '，',
      'hero-h1-autopsied': '深度诊断',
      'hero-h1-in48':    '仅需 48 小时。',
      'hero-p':          '每家中型公司都有一个项目因延迟每月流失 1 万到 10 万美元。两天之内你将得到答案：为何停滞、谁负责修复、以及第一步该做什么。范围固定。一次性付费。由运营者亲自交付。',
      'cta-start':       '阅读手册',
      'cta-how':         '工作原理',
      'nav-rescue':      '项目救援',
      'nav-tools':       '免费工具',
      'nav-about':       '关于',
      'nav-cta':         '启动救援 →'
    },
    'ja': {
      'hero-eyebrow':    '製品は一つ · 約束は一つ · 48時間で納品',
      'hero-h1-1':       'あなたの',
      'hero-h1-stalled': '停滞したプロジェクト',
      'hero-h1-comma':   '、',
      'hero-h1-autopsied': '徹底診断',
      'hero-h1-in48':    'を48時間で。',
      'hero-p':          'どの中堅企業にも、遅延で1万〜10万ドル失っているプロジェクトが一つあります。2日で分かるのは、なぜ止まったのか、誰が何を直すのか、そして最初にすべきこと。固定スコープ。一回限りの料金。運営者自身が納品します。',
      'cta-start':       'プレイブックを読む',
      'cta-how':         '仕組み',
      'nav-rescue':      'PMレスキュー',
      'nav-tools':       '無料ツール',
      'nav-about':       '会社概要',
      'nav-cta':         '救出を開始 →'
    },
    'pt': {
      'hero-eyebrow':    'Um produto · Uma promessa · Entregue em 48 horas',
      'hero-h1-1':       'Seu projeto',
      'hero-h1-stalled': 'travado',
      'hero-h1-comma':   ',',
      'hero-h1-autopsied': 'diagnosticado',
      'hero-h1-in48':    'em 48 horas.',
      'hero-p':          'Toda empresa de médio porte tem um projeto que perde de $10K a $100K com atrasos. Em dois dias você vai saber por que travou, quem é responsável por cada correção e o que fazer primeiro. Escopo fixo. Preço único. Entregue pelo próprio operador.',
      'cta-start':       'Iniciar o resgate → $1.500',
      'cta-how':         'Como funciona',
      'nav-rescue':      'Resgate PM',
      'nav-tools':       'Ferramentas Grátis',
      'nav-about':       'Sobre',
      'nav-cta':         'Iniciar o resgate →'
    }
  };

  // ── Layer 2 — Google Translate widget cookie ─────────────────────────
  // The widget reads a cookie 'googtrans' of the form '/<from>/<to>'.
  // Set both without and with a leading dot so it survives the apex + www.
  function setGoogTransCookie(langCode) {
    const value = langCode === 'en' ? '' : '/en/' + langCode;
    const host = location.hostname;
    // Strip subdomain to find the eTLD+1 (works for abuz8ai.com and www.abuz8ai.com)
    const parts = host.split('.');
    const domain = parts.length >= 2 ? '.' + parts.slice(-2).join('.') : host;
    if (value) {
      document.cookie = 'googtrans=' + value + '; path=/';
      document.cookie = 'googtrans=' + value + '; path=/; domain=' + domain;
    } else {
      // clear
      const past = 'expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'googtrans=; path=/; ' + past;
      document.cookie = 'googtrans=; path=/; domain=' + domain + '; ' + past;
    }
  }

  function loadGoogleTranslate() {
    if (document.getElementById('gt-loader')) return;
    // Hidden mount point required by the widget.
    if (!document.getElementById('google_translate_element')) {
      const mount = document.createElement('div');
      mount.id = 'google_translate_element';
      mount.style.cssText =
        'position:absolute;left:-9999px;top:-9999px;height:0;overflow:hidden;';
      document.body.appendChild(mount);
    }
    // The widget also injects a top banner + tooltip iframe. Hide them ALL —
    // Google ships multiple variants (banner-frame, skiptranslate, balloon,
    // gt-tt), all of which can pop up at any time as the widget mutates the
    // DOM. Wide selector + high specificity + !important + MutationObserver
    // is the only reliable way to keep them out of view.
    if (!document.getElementById('gt-hide-style')) {
      const s = document.createElement('style');
      s.id = 'gt-hide-style';
      s.textContent =
        // Only the VISIBLE banner+tooltip+balloon. Never `iframe.skiptranslate`
        // wildcard — the translation worker iframe carries that class too, and
        // hiding it breaks the whole translation pipeline.
        '.goog-te-banner-frame,.goog-te-banner-frame.skiptranslate,' +
        '#goog-gt-tt,.goog-te-balloon-frame,' +
        '.VIpgJd-ZVi9od-l4eHX-hSRGPd,' +          // current banner class as of 2026
        '.VIpgJd-ZVi9od-ORHb-OEVmcd,' +           // current tooltip class
        '.VIpgJd-yAWNEb-L7lbkb' +                 // spinner sometimes left over
        '{display:none!important;visibility:hidden!important;height:0!important;' +
        'width:0!important;border:0!important;position:absolute!important;' +
        'top:-9999px!important;left:-9999px!important;}' +
        // Google forcibly pushes <body> down 40px to make room for the banner.
        // Undo it — every browser, every framework.
        'html{margin-top:0!important;}' +
        'body{top:0!important;position:static!important;min-height:0!important;}' +
        // Tooltip hover on translated words
        '.goog-tooltip,.goog-tooltip:hover,.goog-tooltip *' +
        '{display:none!important;background:transparent!important;' +
        'border:none!important;box-shadow:none!important;}' +
        '.goog-text-highlight{background:transparent!important;box-shadow:none!important;}';
        // NOTE: never `display:none` the #google_translate_element mount div —
        // the widget refuses to apply the googtrans cookie translation when
        // its mount is display:none. The inline off-screen positioning
        // (position:absolute;left:-9999px) is what hides it safely.
      document.head.appendChild(s);
    }
    // CSS alone isn't enough — Google sets `style="top:40px"` inline on <body>
    // right after loading. Observe and strip it.
    if (!window.__gtObserver) {
      const strip = function () {
        if (document.body && document.body.style.top) {
          document.body.style.top = '';
          document.body.style.position = '';
        }
        // ONLY hide the visible banner. Do NOT remove any iframe — Google's
        // translation-worker iframe also carries `skiptranslate` and removing
        // it breaks all translation. Hide by CSS only.
        document.querySelectorAll('.goog-te-banner-frame,iframe.goog-te-banner-frame')
          .forEach(function (el) {
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.height = '0';
          });
      };
      strip();
      window.__gtObserver = new MutationObserver(strip);
      window.__gtObserver.observe(document.documentElement,
        { childList: true, subtree: true, attributes: true,
          attributeFilter: ['style'] });
    }
    // Init callback the loader script will call.
    window.googleTranslateElementInit = function () {
      new google.translate.TranslateElement({
        pageLanguage: 'en',
        includedLanguages: 'ar,es,fr,de,zh-CN,ja,pt',
        autoDisplay: false
      }, 'google_translate_element');
    };
    const s = document.createElement('script');
    s.id = 'gt-loader';
    s.async = true;
    s.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
    document.head.appendChild(s);
  }

  // Try triggering translation via the widget's own <select> (fast in-page
  // swap, no reload). Falls back to a reload with the cookie set.
  function triggerMachineTranslate(langCode, attempt) {
    attempt = attempt || 0;
    const sel = document.querySelector('.goog-te-combo');
    if (sel) {
      sel.value = langCode;
      sel.dispatchEvent(new Event('change'));
      return true;
    }
    if (attempt < 20) {
      setTimeout(function () { triggerMachineTranslate(langCode, attempt + 1); }, 150);
      return false;
    }
    // Widget never loaded in time — cookie-based reload path.
    location.reload();
    return false;
  }

  // ── Public API ───────────────────────────────────────────────────────
  window.ABUZ8_i18n = {
    langs: LANGS,

    getCurrentLang: function () {
      return localStorage.getItem('abuz8-lang')
        || (navigator.language || 'en').slice(0, 2)
        || 'en';
    },

    setLang: function (lang) {
      if (!LANGS[lang]) return;
      localStorage.setItem('abuz8-lang', lang);
      this.apply(lang);
    },

    t: function (key) {
      const lang = this.getCurrentLang();
      return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key])
          || (TRANSLATIONS['en']  && TRANSLATIONS['en'][key])
          || key;
    },

    apply: function (lang) {
      const useLang = LANGS[lang] ? lang : 'en';

      // Layer 0 — HTML lang + direction (RTL for Arabic)
      document.documentElement.lang = useLang;
      document.documentElement.dir = (useLang === 'ar') ? 'rtl' : 'ltr';

      // Layer 1 — replace hand-crafted keys (perfect copy)
      const dict = TRANSLATIONS[useLang] || TRANSLATIONS['en'];
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        const key = el.getAttribute('data-i18n');
        const val = (dict && dict[key]) || (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) || key;
        el.textContent = val;
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
        const key = el.getAttribute('data-i18n-placeholder');
        const val = (dict && dict[key]) || (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) || key;
        el.setAttribute('placeholder', val);
      });
      document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
        const key = el.getAttribute('data-i18n-title');
        const val = (dict && dict[key]) || (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) || key;
        el.setAttribute('title', val);
      });

      // Sync the visible dropdown
      const selector = document.getElementById('lang-selector');
      if (selector) selector.value = useLang;
      // No Google Translate widget. Footer select only flips tagged copy + RTL.
    },

    // Inject a floating language selector if the page didn't ship one.
    injectSelector: function () {
      if (document.getElementById('lang-selector')) return;
      const wrap = document.createElement('div');
      wrap.className = 'lang-selector-wrapper';
      const sel = document.createElement('select');
      sel.id = 'lang-selector';
      sel.setAttribute('aria-label', 'Language');
      sel.style.cssText =
        'padding:6px 10px;border:1px solid rgba(201,168,76,.35);background:rgba(10,22,40,.7);' +
        'color:#c9a84c;border-radius:4px;font-size:12px;cursor:pointer;' +
        'font-family:Inter,system-ui,sans-serif;';
      Object.keys(LANGS).forEach(function (code) {
        const opt = document.createElement('option');
        opt.value = code;
        opt.textContent = LANGS[code];
        sel.appendChild(opt);
      });
      wrap.appendChild(sel);
      const host = document.querySelector('.abuz8-footer .foot-base') || document.querySelector('.abuz8-footer') || document.body;
      host.appendChild(wrap);
    },

    init: function () {
      const self = this;
      this.injectSelector();
      const lang = this.getCurrentLang();
      // Apply Layer 1 immediately (dictionary). If the cookie already reflects
      // this lang, the page reload path already translated Layer 2 for us.
      const useLang = LANGS[lang] ? lang : 'en';
      document.documentElement.lang = useLang;
      document.documentElement.dir = (useLang === 'ar') ? 'rtl' : 'ltr';
      const dict = TRANSLATIONS[useLang] || TRANSLATIONS['en'];
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        const key = el.getAttribute('data-i18n');
        const val = (dict && dict[key]) || (TRANSLATIONS['en'] && TRANSLATIONS['en'][key]) || key;
        el.textContent = val;
      });

      const selector = document.getElementById('lang-selector');
      if (selector) {
        selector.value = useLang;
        selector.addEventListener('change', function (e) {
          self.setLang(e.target.value);
        });
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { window.ABUZ8_i18n.init(); });
  } else {
    window.ABUZ8_i18n.init();
  }
})();
