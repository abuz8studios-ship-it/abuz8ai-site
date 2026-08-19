/**
 * POST /api/e — first-party, cookieless analytics beacon.
 *
 * WHY THIS INSTEAD OF GOOGLE ANALYTICS
 * ABUZ8 sells sovereignty, privacy, and local-first control. Loading a
 * third-party tracker to measure a site that sells privacy would be selling
 * one thing and doing another, and it would hand visitor data to the exact
 * kind of vendor the product exists to avoid. This endpoint keeps the data on
 * Ahmad's own Cloudflare account, in his own D1.
 *
 * As of 2026-07-29 the site had NO working analytics at all: 4 pages carried a
 * gtag snippet with no measurement ID, and index/store/tools had nothing. Seven
 * months of business decisions were made without a single measured pageview.
 *
 * WHAT IS DELIBERATELY NOT STORED
 *   no cookie · no localStorage id · no device fingerprint · no IP address
 *   no full referrer URL (host only) · no query strings (they carry PII)
 *   no user agent string (bucketed to desktop/mobile/bot)
 * A visitor cannot be followed across sessions, because nothing durable about
 * them is written. That is a design constraint, not an oversight - it is the
 * product's own claim applied to itself.
 */

const KINDS = new Set(['pageview', 'store_click', 'checkout_start', 'download']);
const MAX = { path: 256, referrer: 128, product: 64 };

const clip = (v, n) => (typeof v === 'string' ? v.slice(0, n) : null);

function uaClass(ua = '') {
  const s = ua.toLowerCase();
  if (/bot|crawl|spider|slurp|bingpreview|headless|curl|wget|python-requests/.test(s)) return 'bot';
  if (/mobile|android|iphone|ipad|ipod/.test(s)) return 'mobile';
  return 'desktop';
}

/** Host only. A full referrer can carry a search query or a session token. */
function refHost(r) {
  if (!r) return null;
  try { return clip(new URL(r).host, MAX.referrer); } catch { return null; }
}

/** Same-origin path, query and fragment discarded. */
function cleanPath(p) {
  if (typeof p !== 'string' || !p.startsWith('/')) return null;
  return clip(p.split('?')[0].split('#')[0], MAX.path);
}

export async function onRequestPost({ request, env }) {
  // Browsers omit Origin on some same-origin requests, so Sec-Fetch-Site
  // carries the decision and Origin is only checked when it is actually sent.
  // (Requiring Origin outright once blocked the site's own fetch while letting
  // a spoofed curl through - wrong in both directions at once.)
  const site = request.headers.get('Sec-Fetch-Site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return new Response(null, { status: 204 });
  }
  const origin = request.headers.get('Origin');
  if (origin) {
    try {
      if (new URL(origin).host !== new URL(request.url).host) {
        return new Response(null, { status: 204 });
      }
    } catch { return new Response(null, { status: 204 }); }
  }

  let body = {};
  try { body = await request.json(); } catch { /* beacon may send an empty body */ }

  const kind = KINDS.has(body.kind) ? body.kind : 'pageview';
  const path = cleanPath(body.path) || '/';

  // Never trust a client timestamp - it is trivially wrong or forged.
  const ts = Math.floor(Date.now() / 1000);

  try {
    await env.WAITLIST_DB.prepare(
      `INSERT INTO events (ts, kind, path, referrer, product, country, ua_class)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ts, kind, path,
      refHost(body.referrer),
      clip(body.product, MAX.product),
      clip(request.headers.get('CF-IPCountry'), 2),
      uaClass(request.headers.get('User-Agent') || '')
    ).run();
  } catch (err) {
    // Measurement must never break the page or block a purchase.
    return new Response(null, { status: 204 });
  }

  return new Response(null, { status: 204 });
}

/** GET /api/e?days=7 — read-only rollup for the internal dashboard. */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '7', 10) || 7, 1), 90);
  const since = Math.floor(Date.now() / 1000) - days * 86400;

  try {
    const q = (sql) => env.WAITLIST_DB.prepare(sql).bind(since).all();
    const [totals, top, refs, funnel] = await Promise.all([
      q(`SELECT kind, COUNT(*) n FROM events WHERE ts > ? AND ua_class!='bot' GROUP BY kind`),
      q(`SELECT path, COUNT(*) n FROM events WHERE ts > ? AND kind='pageview' AND ua_class!='bot'
         GROUP BY path ORDER BY n DESC LIMIT 25`),
      q(`SELECT COALESCE(referrer,'(direct)') r, COUNT(*) n FROM events WHERE ts > ? AND ua_class!='bot'
         GROUP BY r ORDER BY n DESC LIMIT 15`),
      q(`SELECT product, kind, COUNT(*) n FROM events WHERE ts > ? AND product IS NOT NULL
         GROUP BY product, kind ORDER BY n DESC`),
    ]);
    return Response.json({
      days,
      note: 'bots excluded; no per-visitor identity is stored, so these are event counts, not unique users',
      totals: totals.results, top_paths: top.results,
      referrers: refs.results, product_funnel: funnel.results,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
