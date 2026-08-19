/**
 * Cloudflare Pages Function: /api/download
 * Pirate-proof, time-limited download delivery for ABUZ8 digital products.
 *
 * Flow:
 *   stripe-webhook.js mints a signed token  →  emails  /api/download?p=<product>&e=<expiry>&s=<sig>
 *   buyer clicks  →  this function verifies HMAC + expiry  →  streams the ZIP from R2
 *
 * Why this exists (C3 in TRUE_100_GAP):
 *   The old webhook emailed a raw static /downloads/<file>.zip URL — no expiry, infinitely
 *   shareable. This replaces it with an HMAC-signed, 48-hour link bound to the exact product.
 *   A leaked link dies in 48h and cannot be re-pointed at a different product.
 *
 * ENV / bindings (Cloudflare Pages → Settings):
 *   DOWNLOAD_SIGNING_SECRET  — any long random string (self-generatable; NO third-party key).
 *                              `openssl rand -hex 32` or a password manager. Set once.
 *   DOWNLOADS  (R2 binding)  — R2 bucket holding the product ZIPs (key = filename in PRODUCT_MAP).
 *                              Optional: if absent, falls back to redirecting to DOWNLOAD_BASE_URL.
 *   DOWNLOAD_BASE_URL        — optional fallback static base, e.g. https://abuz8ai.com/downloads
 *
 * ABUZ8 LLC — 2026 · ahmad@abuz8ai.com
 */

// Canonical product slug → filename in the R2 bucket / /downloads folder.
// Slugs (not Stripe price IDs) are used in the URL so links are human-readable and stable.
export const PRODUCT_FILES = {
  // The ONLY deliverable slug. Its contents were execution-verified 2026-07-29:
  // 7 ComfyUI workflows, each run on live ComfyUI 0.21.1 / RTX 5090 and required to
  // return a real output file. Package sha256 f0a6e3e7…6e5f3571, published on the
  // product page so a buyer can confirm the bytes they receive.
  'verified-comfyui-workflows': 'abuz8-verified-workflows.zip',

  // ── EVERY OTHER SLUG REMOVED 2026-07-29 ────────────────────────────────────
  // They resolved to deliverables that are not what their pages described, and a
  // signed link would have served them regardless of checkout being paused.
  // Measured, not assumed:
  //   ABUZ8-AI-Revenue-Empire-Bundle.zip  1,634 B — two markdown files totalling
  //     2,541 B uncompressed, listed on the site at $97 as "the flagship bundle",
  //     while its own README says "Price: $49".
  //   ABUZ8-ComfyUI-Workflows-77.zip      does not exist in R2 at all (404).
  //   the 33 PDFs behind the other SKUs   children's picture books ("You are now
  //     officially an ABUZ8 Junior Explorer"), verified against live R2.
  // Deleting the map entries is the real gate: pausing a buy button stops new
  // purchases, but any already-minted or forged-then-signed link would still have
  // served the file. /api/download now answers 404 for all of them.
  // Restore an entry ONLY after its deliverable has been rebuilt and verified.
};


const DEFAULT_TTL_SECONDS = 48 * 60 * 60; // 48 hours

/** base64url encode an ArrayBuffer / Uint8Array */
function b64url(bytes) {
  let bin = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * HMAC-SHA256 over `${product}.${expiry}` → base64url signature.
 * Same Web Crypto pattern already used by stripe-webhook.js verifyStripeSignature.
 */
async function signToken(secret, product, expiry) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign(
    'HMAC', key, new TextEncoder().encode(`${product}.${expiry}`)
  );
  return b64url(mac);
}

/** Constant-time string compare (avoids timing oracle on the signature). */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Public helper used by stripe-webhook.js to build a signed delivery URL.
 *   makeDownloadUrl(env, origin, 'comfyui-blueprint')
 *   → https://abuz8ai.com/api/download?p=comfyui-blueprint&e=1750000000&s=<sig>
 * Returns null if the secret is unset (caller falls back to a static link).
 */
export async function makeDownloadUrl(env, origin, product, ttlSeconds = DEFAULT_TTL_SECONDS) {
  const secret = env.DOWNLOAD_SIGNING_SECRET;
  if (!secret || !PRODUCT_FILES[product]) return null;
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const sig = await signToken(secret, product, expiry);
  const base = (origin || 'https://abuz8ai.com').replace(/\/$/, '');
  const qs = new URLSearchParams({ p: product, e: String(expiry), s: sig });
  return `${base}/api/download?${qs.toString()}`;
}

function fail(status, message) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">` +
    `<title>Download — ABUZ8</title>` +
    // Lapis/gold, matching abuz8-theme.css. This page previously shipped the
    // LIGHT palette (#F8FAFC / #2C3E50 / #2E75B6) retired on 2026-07-17, so a
    // buyer whose link expired was dropped onto a page from a different website.
    `<body style="font-family:Inter,system-ui,sans-serif;background:#0a1628;color:#e8e4d8;` +
    `display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px;">` +
    `<div><h1 style="color:#c9a84c;font-size:22px;margin:0 0 8px;font-weight:700;">${message}</h1>` +
    `<p style="color:#8a9aaa;font-size:15px;margin:0 0 16px;line-height:1.6;">` +
    `If you purchased and your link expired, email <a href="mailto:ahmad@abuz8ai.com" style="color:#2fbf8f;">ahmad@abuz8ai.com</a> and we will re-issue it.</p>` +
    `<a href="https://abuz8ai.com" style="color:#c9a84c;">← abuz8ai.com</a></div></body>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8' } }
  );
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const product = url.searchParams.get('p') || '';
  const expiry = url.searchParams.get('e') || '';
  const sig = url.searchParams.get('s') || '';

  const secret = env.DOWNLOAD_SIGNING_SECRET;
  if (!secret) return fail(503, 'Download service not configured');

  const filename = PRODUCT_FILES[product];
  if (!filename) return fail(404, 'Unknown product');

  // Expiry check
  const expNum = parseInt(expiry, 10);
  if (!Number.isFinite(expNum)) return fail(400, 'Malformed link');
  if (Math.floor(Date.now() / 1000) > expNum) return fail(410, 'This download link has expired');

  // Signature check (constant-time)
  const expected = await signToken(secret, product, expiry);
  if (!safeEqual(expected, sig)) return fail(403, 'Invalid or tampered link');

  // Serve from R2 if bound; otherwise redirect to the static fallback base.
  if (env.DOWNLOADS && typeof env.DOWNLOADS.get === 'function') {
    const obj = await env.DOWNLOADS.get(filename);
    if (!obj) return fail(404, 'File not found');
    const headers = new Headers();
    headers.set('content-type', 'application/zip');
    headers.set('content-disposition', `attachment; filename="${filename}"`);
    headers.set('cache-control', 'private, no-store');
    if (obj.size) headers.set('content-length', String(obj.size));
    if (obj.httpEtag) headers.set('etag', obj.httpEtag);
    return new Response(obj.body, { status: 200, headers });
  }

  const fallbackBase = (env.DOWNLOAD_BASE_URL || 'https://abuz8ai.com/downloads').replace(/\/$/, '');
  return Response.redirect(`${fallbackBase}/${filename}`, 302);
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
