/**
 * Cloudflare Pages Function: /api/stripe-webhook
 * Handles Stripe checkout.session.completed → emails download link
 * Route: functions/api/stripe-webhook.js
 *
 * ENV vars required (Cloudflare Pages → Settings → Environment variables):
 *   STRIPE_WEBHOOK_SECRET   — from Stripe Dashboard → Webhooks → signing secret
 *   RESEND_API_KEY          — OR use SMTP via KV-stored config
 *   DOWNLOAD_BASE_URL       — e.g. https://abuz8ai.com/downloads  (or R2 presigned)
 *
 * ABUZ8 LLC — 2026
 */

import { PRODUCT_FILES, makeDownloadUrl } from './download.js';

// Product ID → file mapping (Stripe Price ID or Product ID → filename in /downloads/)
const PRODUCT_MAP = {
  // Flagship Tier ($97)
  'price_1Tgixh1r1N62QJj76DDnFtrI':  'ABUZ8-Sovereign-AI-Stack.zip',
  'price_1TgixN1r1N62QJj7GuXd7beN':  'ABUZ8-AI-Automation-Blueprint.zip',
  'price_1Tgixg1r1N62QJj75IGoPa7W':  'ABUZ8-SDR-Agent-Playbook.zip',
  'price_1Tgixj1r1N62QJj7u9LrYyTD':  'ABUZ8-AI-Revenue-Empire-Bundle.zip',
  'price_1TgiyJ1r1N62QJj7PJ2hAEzu':  'ABUZ8-Mastery-Pro.zip',
  'price_1TgiyK1r1N62QJj7NUo0k4MK':  'ABUZ8-Mastery-VIP.zip',

  // Professional Tier ($37-$47)
  'price_1Tgizz1r1N62QJj7zn1sp18z':  'ABUZ8-Faceless-Content-Machine-Pro.zip',
  'price_1TgizI1r1N62QJj7EMYyCpTT':  'ABUZ8-Global-Funnels.zip',
  'price_1TgizK1r1N62QJj72Re6q6Up':  'ABUZ8-Upgrade-Protocol.zip',
  'price_1Tgiza1r1N62QJj7nVHC9uI2':  'ABUZ8-Episodic-Art-Production.zip',
  'price_1Tgizw1r1N62QJj7Kw8sGDx9':  'ABUZ8-Workforce-Battalion-Guide.zip',
  'price_1Tgizx1r1N62QJj7NwSnS6Af':  'ABUZ8-Workforce-Empire-Guide.zip',
  'price_1Tgj001r1N62QJj7GIgsGg22':  'ABUZ8-Trading-Math.zip',

  // Standard Tier ($27)
  'price_1Tgj1L1r1N62QJj7csb5TjRk':  'ABUZ8-ComfyUI-77-Workflows.zip',
  'price_1Tgj1K1r1N62QJj7TRxD4kS2':  'ABUZ8-Twin-Agent-Blueprint.zip',
  'price_1Tgj1M1r1N62QJj72Nqv9hIl':  'ABUZ8-Voice-Clone-Toolkit.zip',
  'price_1Tgj1N1r1N62QJj7cfHJKAA0':  'ABUZ8-Outreach-Playbook.zip',
  'price_1Tgj1O1r1N62QJj7ttTKn2AH':  'ABUZ8-Workforce-Scout-Guide.zip',
  'price_1Tgj1m1r1N62QJj7JBe48SI4':  'ABUZ8-Agent-Body-Scripts.zip',
  'price_1Tgj261r1N62QJj7SezbeDzw':  'ABUZ8-Score-Formulas.zip',
  'price_1Tgj261r1N62QJj7qmTAQ5I9':  'ABUZ8-Bee-Series-Production.zip',
  'price_1Tgj271r1N62QJj7e0yuMggu':  'ABUZ8-Crisis-Catalyst.zip',

  // Budget Tier ($19)
  'price_1Tgj281r1N62QJj7EymPIXr8':  'ABUZ8-Network-Whitepaper.zip',

  // Agent-Generated Digital Products (2026-07-25)
  'price_1Tx6641r1N62QJj755uzKr6m':  'ABUZ8-AI-Prompt-Mastery-Pack.zip',
  'price_1Tx6651r1N62QJj7OkQCNsYj':  'ABUZ8-Notion-Business-OS.zip',
  'price_1Tx6651r1N62QJj7HC5OmWUQ':  'ABUZ8-Video-Presets-Bundle.zip',
  'price_1Tx6661r1N62QJj7zKeb2wmc':  'ABUZ8-500-ChatGPT-Prompts.zip',
  'price_1Tx6661r1N62QJj7YT8o3CnL':  'ABUZ8-Faceless-YT-Guide.zip',
  'price_1Tx6671r1N62QJj7HM4H2Z5n':  'ABUZ8-Agent-Business-Blueprint.zip',
  'price_1Tx6681r1N62QJj7aFUMULNh':  'ABUZ8-Social-Content-Vault.zip',
  'price_1Tx6681r1N62QJj7yaaDzMM2':  'ABUZ8-ComfyUI-Workflows-77.zip',
};

// Stripe Price ID → canonical product slug used by /api/download
const PRICE_TO_SLUG = {
  'price_1Tgixh1r1N62QJj76DDnFtrI':  'sovereign-ai-stack',
  'price_1TgixN1r1N62QJj7GuXd7beN':  'ai-automation-blueprint',
  'price_1Tgixg1r1N62QJj75IGoPa7W':  'sdr-agent-playbook',
  'price_1Tgixj1r1N62QJj7u9LrYyTD':  'revenue-empire-bundle',
  'price_1TgiyJ1r1N62QJj7PJ2hAEzu':  'mastery-pro',
  'price_1TgiyK1r1N62QJj7NUo0k4MK':  'mastery-vip',
  'price_1Tgizz1r1N62QJj7zn1sp18z':  'faceless-content-pro',
  'price_1TgizI1r1N62QJj7EMYyCpTT':  'global-funnels',
  'price_1Tgj1L1r1N62QJj7csb5TjRk':  'comfyui-77-workflows',
  'price_1Tgj1K1r1N62QJj7TRxD4kS2':  'twin-agent-blueprint',

  // Agent-Generated Digital Products (2026-07-25)
  'price_1Tx6641r1N62QJj755uzKr6m':  'ai-prompt-mastery-pack',
  'price_1Tx6651r1N62QJj7OkQCNsYj':  'notion-business-os',
  'price_1Tx6651r1N62QJj7HC5OmWUQ':  'video-presets-bundle',
  'price_1Tx6661r1N62QJj7zKeb2wmc':  '500-chatgpt-prompts',
  'price_1Tx6661r1N62QJj7YT8o3CnL':  'faceless-yt-guide',
  'price_1Tx6671r1N62QJj7HM4H2Z5n':  'agent-business-blueprint',
  'price_1Tx6681r1N62QJj7aFUMULNh':  'social-content-vault',
  'price_1Tx6681r1N62QJj7yaaDzMM2':  'comfyui-workflows-77',
};

/**
 * Verify Stripe webhook signature using Web Crypto API (Cloudflare Workers compatible)
 * Stripe uses HMAC-SHA256 of timestamp + payload
 */
async function verifyStripeSignature(payload, sigHeader, secret) {
  try {
    const parts = sigHeader.split(',');
    const tPart = parts.find(p => p.startsWith('t='));
    const v1Part = parts.find(p => p.startsWith('v1='));
    if (!tPart || !v1Part) return false;

    const timestamp = tPart.slice(2);
    const signature = v1Part.slice(3);
    const signed = `${timestamp}.${payload}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signed));
    const hex = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('');

    // Constant-time compare
    if (hex.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  } catch { return false; }
}

/**
 * Send delivery email via Resend API (or swap in any email provider)
 */
async function sendDeliveryEmail(env, { to, productName, downloadUrl }) {
  if (!env.RESEND_API_KEY) {
    console.warn('[zait-delivery] RESEND_API_KEY not set — skipping email delivery');
    return false;
  }
  const html = `
    <div style="font-family:Inter,sans-serif;background:#0a1628;color:#e8e4d8;padding:40px;max-width:560px;margin:auto;border-radius:12px;">
      <div style="font-size:28px;font-weight:700;color:#c9a84c;margin-bottom:8px;">ABUZ8 LLC</div>
      <p style="color:#f5f0e8;font-size:18px;font-weight:600;">Your download is ready 🎉</p>
      <p>Thanks for your purchase of <strong style="color:#c9a84c">${productName}</strong>.</p>
      <p>Click the button below to download — link is valid for 48 hours.</p>
      <a href="${downloadUrl}" style="display:inline-block;margin:20px 0;padding:14px 32px;background:#c9a84c;color:#0a1628;font-weight:700;border-radius:8px;text-decoration:none;font-size:15px;">
        Download Now →
      </a>
      <p style="color:#8a9aaa;font-size:12px;margin-top:24px;">
        Questions? Reply to this email or visit <a href="https://abuz8ai.com" style="color:#0e9f6e;">abuz8ai.com</a><br>
        ABUZ8 LLC · support@abuz8ai.com
      </p>
    </div>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ABUZ8 <support@abuz8ai.com>',
        to: [to],
        subject: `Your ${productName} download — ABUZ8`,
        html,
      }),
    });
    return res.ok;
  } catch { return false; }
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Read raw body for signature verification
  const rawBody = await request.text();
  const sigHeader = request.headers.get('Stripe-Signature') || '';
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET || '';

  // Verify signature (skip only in dev without secret)
  if (webhookSecret) {
    const valid = await verifyStripeSignature(rawBody, sigHeader, webhookSecret);
    if (!valid) {
      return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
    }
  }

  let event;
  try { event = JSON.parse(rawBody); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  // Life Hub subscription lifecycle — writes entitlements on WAITLIST_DB.
  if (event.type === 'customer.subscription.deleted' ||
      (event.type === 'customer.subscription.updated' && event.data?.object?.status === 'canceled')) {
    const sub = event.data.object;
    const db = env.WAITLIST_DB || env.DB;
    if (db) {
      try {
        const email = (sub.metadata && sub.metadata.email) || null;
        if (email) {
          await db.prepare(
            "UPDATE entitlements SET status = 'canceled', updated_at = ? WHERE email = ?"
          ).bind(Date.now(), String(email).toLowerCase()).run();
        } else if (sub.id) {
          await db.prepare(
            "UPDATE entitlements SET status = 'canceled', updated_at = ? WHERE stripe_sub = ?"
          ).bind(Date.now(), sub.id).run();
        }
      } catch (_) { /* non-fatal */ }
    }
    return new Response(JSON.stringify({ received: true, hub: 'canceled' }), { status: 200 });
  }

  // Only handle completed checkouts below
  if (event.type !== 'checkout.session.completed') {
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  }

  const session = event.data.object;
  const customerEmail = session.customer_details?.email || session.customer_email;
  const lineItems = session.line_items?.data || [];
  const priceId = lineItems[0]?.price?.id || session.metadata?.price_id || '';

  // Look up product file
  const filename = PRODUCT_MAP[priceId];
  const downloadBase = (env.DOWNLOAD_BASE_URL || 'https://abuz8ai.com/downloads').replace(/\/$/, '');

  if (customerEmail && filename) {
    // Prefer an HMAC-signed, 48h-expiry link via /api/download (pirate-proof).
    // Falls back to the raw static path if DOWNLOAD_SIGNING_SECRET is not set yet.
    const slug = PRICE_TO_SLUG[priceId];
    const origin = new URL(request.url).origin;
    let downloadUrl = null;
    if (slug) {
      try { downloadUrl = await makeDownloadUrl(env, origin, slug); } catch (_) { downloadUrl = null; }
    }
    if (!downloadUrl) downloadUrl = `${downloadBase}/${filename}`;
    const productName = filename.replace('ABUZ8-', '').replace('.zip', '').replace(/-/g, ' ');
    await sendDeliveryEmail(env, { to: customerEmail, productName, downloadUrl });
  }

  // Life Hub entitlement — checkout.session.completed with mode=subscription
  const isHub = session.mode === 'subscription' || (session.metadata && session.metadata.kind === 'hub');
  const db = env.WAITLIST_DB || env.DB;
  if (isHub && customerEmail && db) {
    try {
      await db.prepare(
        'INSERT OR REPLACE INTO entitlements (email, plan, status, stripe_customer, stripe_sub, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(
        String(customerEmail).toLowerCase(),
        'hub',
        'active',
        session.customer || null,
        session.subscription || null,
        Date.now()
      ).run();
    } catch (_) { /* non-fatal */ }
  }

  // Log to D1 if available (abuz8_waitlist DB)
  if (db && customerEmail) {
    try {
      await db.prepare(
        'INSERT OR IGNORE INTO purchases (email, price_id, session_id, created_at) VALUES (?, ?, ?, ?)'
      ).bind(customerEmail, priceId, session.id, new Date().toISOString()).run();
    } catch (_) { /* non-fatal */ }
  }

  return new Response(JSON.stringify({ received: true, delivered: !!filename }), { status: 200 });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204 });
}
