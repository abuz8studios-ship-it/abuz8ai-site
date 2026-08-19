/**
 * ABUZ8 Pages Middleware — Site-wide Analytics Injector
 *
 * Injects the full measurement stack into every HTML response at the edge.
 * No per-page edits — one file lights up all 90+ HTML pages + 180+ tools.
 *
 * WHAT GETS INJECTED (all conditional on env vars — page is untouched if unset):
 *   1. abuz8-measure.js — first-party pageview + intent beacon (D1-backed, cookieless)
 *      → Always injected. This is Ahmad's own analytics, feeds /api/e.
 *   2. abuz8-intent.js  — first-party behavior scoring (scroll, clicks, dwell)
 *      → Always injected. Feeds /api/behavior.
 *   3. Cloudflare Web Analytics beacon
 *      → Injected when env.CF_ANALYTICS_TOKEN is set. Free country/referrer rollup.
 *   4. Microsoft Clarity (session replay + heatmaps)
 *      → Injected when env.CLARITY_ID is set. This is the "what are they DOING" layer.
 *   5. Google Analytics 4
 *      → Injected when env.GA4_ID is set. Existing gtag() event calls (calc_answer,
 *        dfy_scroll_depth, etc.) will finally have somewhere to land.
 *
 * SETUP (Ahmad, in Cloudflare Pages → Settings → Environment Variables → Production):
 *   CF_ANALYTICS_TOKEN = <from Cloudflare dashboard → Web Analytics → Add site>
 *   CLARITY_ID         = <from clarity.microsoft.com → New Project (free, unlimited)>
 *   GA4_ID             = <G-XXXXXXXXXX from Google Analytics → Admin → Data Streams>
 *
 * Add whichever you want. All optional. Site works with none.
 */

export async function onRequest(context) {
  const { request, next, env } = context;

  const url = new URL(request.url);
  const path = url.pathname;

  // Fast path: skip anything that isn't an HTML page request.
  if (
    path.startsWith('/api/') ||
    path.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|otf|pdf|zip|mp4|mp3|flac|json|xml|txt)$/)
  ) {
    return next();
  }

  const response = await next();

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return response;
  }

  // ── Build the injection payload ──────────────────────────────────────────

  const scripts = [];

  // 1 & 2 — First-party (always on). These already exist in /assets/js/,
  // this makes them site-wide instead of per-page opt-in.
  scripts.push(`<script src="/assets/js/abuz8-measure.js" defer></script>`);
  scripts.push(`<script src="/assets/js/abuz8-intent.js" defer></script>`);

  // 2b — Site-wide i18n (two-layer: hand-crafted dictionary for money copy,
  // Google Translate widget for everything else). Auto-injects a language
  // dropdown on any page that doesn't already carry one, and sets the RTL
  // direction attribute for Arabic. See assets/js/abuz8-i18n.js.
  // Bump the ?v= query when the JS changes so browsers refetch immediately.
  scripts.push(`<script src="/assets/js/abuz8-i18n.js?v=3.4" defer></script>`);

  // 3 — Cloudflare Web Analytics (conditional)
  const cfToken = env.CF_ANALYTICS_TOKEN;
  if (cfToken) {
    scripts.push(
      `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" ` +
      `data-cf-beacon='{"token":"${escapeAttr(cfToken)}","spa":true}'></script>`
    );
  }

  // 4 — Microsoft Clarity (conditional). Session recording + heatmaps.
  const clarityId = env.CLARITY_ID;
  if (clarityId) {
    scripts.push(
      `<script>(function(c,l,a,r,i,t,y){` +
      `c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};` +
      `t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;` +
      `y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);` +
      `})(window,document,"clarity","script","${escapeAttr(clarityId)}");</script>`
    );
  }

  // 5 — Google Analytics 4 (conditional). Existing gtag() calls will start firing.
  const gaId = env.GA4_ID;
  if (gaId) {
    scripts.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeAttr(gaId)}"></script>` +
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
      `gtag('js',new Date());gtag('config','${escapeAttr(gaId)}',{anonymize_ip:true,send_page_view:true});</script>`
    );
  }

  const payload = scripts.join('');

  return new HTMLRewriter()
    .on('head', new HeadInjector(payload))
    .transform(response);
}

class HeadInjector {
  constructor(html) {
    this.html = html;
    this.injected = false;
  }
  element(element) {
    if (!this.injected && this.html) {
      element.append(this.html, { html: true });
      this.injected = true;
    }
  }
}

// Very narrow escape — env vars are trusted, but never let a stray quote break the tag.
function escapeAttr(s) {
  return String(s).replace(/["'<>&]/g, (c) => ({
    '"': '&quot;', "'": '&#39;', '<': '&lt;', '>': '&gt;', '&': '&amp;'
  })[c]);
}
