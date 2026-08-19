/**
 * Cloudflare Pages Function: /api/checkout-session
 * Post-purchase router for the ABUZ8 thank-you page (C4 in TRUE_100_GAP).
 *
 * Flow:
 *   Stripe success_url  ->  /thank-you.html?session_id=cs_xxx
 *   thank-you.html fetches  /api/checkout-session?session_id=cs_xxx
 *   this function retrieves the paid session, classifies the SKU, and returns:
 *     - DIGITAL  -> a freshly-minted, HMAC-signed 48h download URL (reuses makeDownloadUrl)
 *     - SERVICE  -> a booking handle (Cal.com) so the buyer can schedule immediately
 *
 * Why this exists:
 *   Every SKU currently lands on the SAME static thank-you.html: no download shown,
 *   no way to book a call. The webhook mints a download link but the buyer never sees it,
 *   and the 3 service SKUs have zero scheduling path. This closes the post-purchase gap
 *   and is one of the "prove the delivery path" gates blocking the checkout kill switch.
 *
 * ENV / bindings (Cloudflare Pages -> Settings):
 *   STRIPE_SECRET_KEY        - required to retrieve the session. If unset, returns a
 *                              graceful "pending" payload (page shows generic confirmation).
 *   DOWNLOAD_SIGNING_SECRET  - reused from download.js; if unset, falls back to email delivery.
 *   CAL_HANDLE               - optional Cal.com handle, e.g. "ahmad/strategy-call".
 *                              If unset, service buyers get an email CTA (nothing breaks).
 *
 * Read-only. No writes, no side effects. ABUZ8 LLC - 2026 - ahmad@abuz8ai.com
 */

import { PRODUCT_FILES, makeDownloadUrl } from './download.js';

const STRIPE_API = 'https://api.stripe.com/v1';
const SUPPORT_EMAIL = 'ahmad@abuz8ai.com';

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

/**
 * Stripe price id → canonical product slug.
 *
 * This is the ONLY resolution path that is deterministic. The two below it are
 * guesses: Payment Link metadata does not reliably land on the Checkout Session,
 * and the nickname fallback would turn this product's price nickname
 * ("One-time — verified workflow pack") into "one-time-verified-workflow-pack",
 * which is not a slug in PRODUCT_FILES — so delivery would silently fall through
 * to "pending" and the buyer would get nothing after paying. Map the price id.
 */
const PRICE_TO_SLUG = {
  price_1Tyjf21r1N62QJj7EWoAeFR0: 'verified-comfyui-workflows',

  // TEMPORARY — $1 verification price on the SAME product, created 2026-07-29.
  // It exists so the paid-session path can be proven end to end without spending
  // $59, and it is mapped here deliberately: without this entry the test would
  // resolve to nothing and report a false failure of a working system.
  // REMOVE THIS LINE and deactivate price_1TymCx… once delivery is confirmed.
  price_1TymCx1r1N62QJj7asM2ZKGt: 'verified-comfyui-workflows',
};

/** Derive the canonical product slug from a Stripe session's metadata / line items. */
function slugFromSession(session) {
  // Most reliable: the price id itself.
  const li0 = session.line_items && session.line_items.data && session.line_items.data[0];
  const priceId = li0 && li0.price && li0.price.id;
  if (priceId && PRICE_TO_SLUG[priceId]) return PRICE_TO_SLUG[priceId];

  const md = session.metadata || {};
  // Next: an explicit slug set by checkout metadata.
  let slug = md.slug || md.product || md.tool || '';
  slug = String(slug).trim().toLowerCase();
  if (slug) return slug;

  // Fallback: try to infer from the first line item's price nickname / product name.
  const li = session.line_items && session.line_items.data && session.line_items.data[0];
  if (li) {
    const nick = (li.price && li.price.nickname) || '';
    const name = (li.description) || '';
    const guess = (nick || name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (guess) return guess;
  }
  return '';
}

/** A slug is "digital" if it maps to a downloadable file; otherwise it's a service. */
function isDigital(slug) {
  return Object.prototype.hasOwnProperty.call(PRODUCT_FILES, slug);
}

async function retrieveSession(env, sessionId) {
  const url = `${STRIPE_API}/checkout/sessions/${encodeURIComponent(sessionId)}` +
    `?expand[]=line_items&expand[]=line_items.data.price`;
  const r = await fetch(url, {
    headers: { 'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}` },
  });
  const data = await r.json();
  return { ok: r.ok, data };
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const sessionId = (url.searchParams.get('session_id') || '').trim();

  // No/invalid session id -> generic confirmation (page still renders cleanly).
  if (!sessionId || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) {
    return json({ status: 'pending', kind: 'unknown', support: SUPPORT_EMAIL });
  }

  // No Stripe key (e.g. kill switch / preview) -> graceful pending, never an error page.
  if (!env.STRIPE_SECRET_KEY) {
    return json({ status: 'pending', kind: 'unknown', support: SUPPORT_EMAIL });
  }

  let sess;
  try {
    const { ok, data } = await retrieveSession(env, sessionId);
    if (!ok) return json({ status: 'pending', kind: 'unknown', support: SUPPORT_EMAIL });
    sess = data;
  } catch (_) {
    return json({ status: 'pending', kind: 'unknown', support: SUPPORT_EMAIL });
  }

  // Only treat fully-paid sessions as fulfilled.
  const paid = sess.payment_status === 'paid' || sess.status === 'complete';
  if (!paid) {
    return json({ status: 'pending', kind: 'unknown', support: SUPPORT_EMAIL });
  }

  const email = (sess.customer_details && sess.customer_details.email) || '';
  const slug = slugFromSession(sess);

  // DIGITAL: mint a fresh signed 48h link if we can; else fall back to email delivery.
  if (slug && isDigital(slug)) {
    let downloadUrl = null;
    try {
      const origin = url.origin; // e.g. https://abuz8ai.com
      downloadUrl = await makeDownloadUrl(env, origin, slug);
    } catch (_) { downloadUrl = null; }

    return json({
      status: 'paid',
      kind: 'digital',
      slug,
      email,
      download_url: downloadUrl,           // null -> page shows "check your email" path
      expires_hours: 48,
      support: SUPPORT_EMAIL,
    });
  }

  // SERVICE (or unknown-but-paid): offer scheduling. Cal.com handle if configured.
  const handle = (env.CAL_HANDLE || '').trim();
  return json({
    status: 'paid',
    kind: 'service',
    slug: slug || null,
    email,
    cal_url: handle ? `https://cal.com/${handle}` : null, // null -> email CTA fallback
    support: SUPPORT_EMAIL,
  });
}
