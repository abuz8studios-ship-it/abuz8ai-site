/**
 * QADIR OS — Stripe Fulfillment Worker (G8 → G9)
 * ================================================
 *
 * Closes the revenue loop: Stripe payment → signed download link → PDF from R2.
 *
 * v3.0.0 changes (2026-06-09):
 *   - Products now served as actual PDFs from R2 bucket (not hollow ZIPs)
 *   - Signed download URLs with 7-day expiry (HMAC-SHA256)
 *   - GET /download?file=…&exp=…&sig=… serves PDF directly from R2
 *   - 3 flagship products added (NZT-8200, Business Prompts, Consulting Kit)
 *   - Legacy price_ids preserved, pointing to real PDF filenames
 *
 * Bindings (wrangler.toml)
 * ---------
 *   D1:  env.abuz8_waiting_list
 *   R2:  env.PRODUCTS_BUCKET  →  abuz8-downloads
 *
 * Secrets (wrangler secret put <NAME>)
 * ---------
 *   STRIPE_WEBHOOK_SECRET     whsec_… from Stripe Dashboard
 *   DOWNLOAD_SIGN_SECRET      random 32+ char string for signing download URLs
 *   MAIL_FROM                 sales@abuz8ai.com
 *   MAIL_FROM_NAME            ABUZ8 Studios
 *   ADMIN_BCC                 abuz8studios@gmail.com
 *
 * Endpoints
 * ---------
 *   POST /              Stripe webhook handler
 *   GET  /download      Signed PDF download from R2
 *   GET  /health        liveness probe
 *   GET  /status        last 25 fulfillment rows
 */

// ────────────────────────────────────────────────────────────────────────────
// PRODUCT CATALOG — price_id → deliverable
// Updated 2026-06-09: real PDF filenames from cinematic_pdfs/, no more hollow ZIPs
// ────────────────────────────────────────────────────────────────────────────

const PRODUCT_CATALOG = {
  // ── THE ONLY SELLABLE PRODUCT AS OF 2026-07-29 ─────────────────────────
  // Every other entry below is retired. On 2026-07-29 the fulfilment PDFs were
  // read for the first time and 33 of 35 turned out to be children's picture
  // books ("You are now officially an ABUZ8 Junior Explorer"), verified against
  // the live R2 object, not an archive copy. Checkout is paused sitewide.
  // This entry is the one deliverable whose contents were execution-verified:
  // 7 ComfyUI workflows, each submitted to a live ComfyUI 0.21.1 on an RTX 5090
  // and required to return a real output file before packaging.
  //   package sha256 f0a6e3e78edf2fd0fbe8bb8b6b82ee103b5099e5df9cf863361c75446e5f3571
  //   6,556,112 bytes · 21 zip entries · R2 round-trip verified byte-identical
  "price_1Tyjf21r1N62QJj7EWoAeFR0": {
    name: "ABUZ8 Verified ComfyUI Workflows",
    file: "abuz8-verified-workflows.zip",
    type: "digital",
  },

  // ── Flagship products ($97) — RETIRED, deliverables are not what the ────
  //    pages claimed. Left in place so a stray webhook resolves to a name
  //    rather than throwing, but no buy button reaches any of them.
  // ── Flagship products ($97) ────────────────────────────────────────────
  "price_1TgYt41r1N62QJj7K9cW0sQV": {
    name: "NZT-8200 Deep Thinking Protocol",
    file: "NZT-8200_Deep_Thinking_Protocol.pdf",
    type: "digital",
  },
  "price_1TgYtB1r1N62QJj7dz9fKtaz": {
    name: "AI Consulting Kit",
    file: "consulting_kit.pdf",
    type: "digital",
  },

  // ── Professional products ($47) ────────────────────────────────────────
  "price_1TgYt71r1N62QJj7LbuznDR9": {
    name: "100 Business AI Prompts",
    file: "business_prompts.pdf",
    type: "digital",
  },

  // ── Starter ($19) — added 2026-06-10: live payment link existed with NO
  // catalog entry (purchases fell to manual_review). Maps to the curated
  // SHIP_NOW digital-goods PDF uploaded to R2 the same day.
  "price_1Tg5SI1r1N62QJj7mSlPbhCC": {
    name: "ABUZ8 Mastery Starter — Vol 41",
    file: "mastery_starter.pdf",
    type: "digital",
  },

  // ── ABUZ8 OS "Fable" build — added 2026-06-12. Source of truth:
  // G:\ABUZ8-Fable-Build\Abuz8Fable.exe (64GB drive, 2026-06-12 14:21),
  // 5,141,145,253 bytes, SHA256 78194F86CEBB7CE24A74DD975665DBF3B0C5C901139C0868551766A1F472F4C3,
  // UNSIGNED (cert pending — disclosed on the sales pages). All three live
  // Qadir/ABUZ8-OS prices deliver this same build.
  "price_1Th9FY1r1N62QJj7T3JFT8py": {
    name: "QADIR OS — ABUZ8 OS Fable Build ($197)",
    file: "abuz8os/Abuz8Fable-1.0.0.exe",
    type: "digital",
  },
  "price_1TglhX1r1N62QJj7q4IuwPFL": {
    name: "Qadir OS — Early Access (Founder's Build, $99)",
    file: "abuz8os/Abuz8Fable-1.0.0.exe",
    type: "digital",
  },
  "price_1Tgm8I1r1N62QJj7V78G4lLy": {
    name: "Qadir OS — Early Access (Founder's Build, duplicate price)",
    file: "abuz8os/Abuz8Fable-1.0.0.exe",
    type: "digital",
  },

  // ── Legacy price IDs (existing Stripe links) — now pointing to real PDFs
  "price_1TL9zN1r1N62QJj7FDduB7eQ": {
    name: "AI Agent Skills Pack",
    file: "agent_skills_pack.pdf",
    type: "digital",
  },
  "price_1TL9zO1r1N62QJj7qO0dnm2g": {
    name: "ComfyUI Production Blueprint",
    file: "comfyui_blueprint.pdf",
    type: "digital",
  },
  "price_1TL9zP1r1N62QJj7iJgQ0IJT": {
    name: "Desktop Automation Toolkit",
    file: "desktop_automation.pdf",
    type: "digital",
  },
  "price_1TL9zQ1r1N62QJj7Pc8iXxUu": {
    name: "ABU365 Content Machine",
    file: "abu365_content_machine.pdf",
    type: "digital",
  },
  "price_1TL9zR1r1N62QJj7IGZUSuHl": {
    name: "NZT-8200 Doctrine",
    file: "NZT-8200_Deep_Thinking_Protocol.pdf",
    type: "digital",
  },
  "price_1TL9zS1r1N62QJj7hJ2jcC23": {
    name: "Revenue Playbook 2026",
    file: "Revenue_Playbook_2026.pdf",
    type: "digital",
  },
  "price_1TL9zT1r1N62QJj7DCOpYakm": {
    name: "AI Video Generator Toolkit",
    file: "video_generator.pdf",
    type: "digital",
  },

  // ── Tier 1 — $97 products (2026-06-10) ────────────────────────────────
  "price_1TgixN1r1N62QJj7GuXd7beN": {
    name: "AI Automation Blueprint",
    file: "ai_automation_blueprint.pdf",
    type: "digital",
  },
  "price_1Tgixg1r1N62QJj75IGoPa7W": {
    name: "SDR Agent Playbook",
    file: "sdr_agent_playbook.pdf",
    type: "digital",
  },
  "price_1Tgixh1r1N62QJj76DDnFtrI": {
    name: "Sovereign AI Stack",
    file: "sovereign_ai_stack.pdf",
    type: "digital",
  },
  "price_1Tgixi1r1N62QJj7p1X4qiQC": {
    name: "ABU365 Content Machine",
    file: "abu365_content_machine.pdf",
    type: "digital",
  },
  "price_1Tgixj1r1N62QJj7u9LrYyTD": {
    name: "Revenue Empire Bundle",
    file: "revenue_empire_bundle.pdf",
    type: "digital",
  },
  "price_1TgiyJ1r1N62QJj7PJ2hAEzu": {
    name: "Mastery Pro",
    file: "mastery_pro.pdf",
    type: "digital",
  },
  "price_1TgiyK1r1N62QJj7NUo0k4MK": {
    name: "Mastery VIP",
    file: "mastery_vip.pdf",
    type: "digital",
  },

  // ── Tier 2 — $47 products (2026-06-10) ────────────────────────────────
  "price_1TgizG1r1N62QJj7nxEkKfvj": {
    name: "AI Agent Skills Pack",
    file: "agent_skills_pack.pdf",
    type: "digital",
  },
  "price_1TgizH1r1N62QJj7Tzc1KcQ9": {
    name: "ComfyUI Production Blueprint",
    file: "comfyui_blueprint.pdf",
    type: "digital",
  },
  "price_1TgizI1r1N62QJj73RiMax6n": {
    name: "Desktop Automation Toolkit",
    file: "desktop_automation.pdf",
    type: "digital",
  },
  "price_1TgizI1r1N62QJj7EMYyCpTT": {
    name: "Global Funnels",
    file: "global_funnels.pdf",
    type: "digital",
  },
  "price_1TgizK1r1N62QJj72Re6q6Up": {
    name: "Ahmad Upgrade Protocol",
    file: "ahmad_upgrade_protocol.pdf",
    type: "digital",
  },
  "price_1Tgiza1r1N62QJj7nVHC9uI2": {
    name: "Episodic Art Production",
    file: "episodic_art_production.pdf",
    type: "digital",
  },
  "price_1Tgizw1r1N62QJj7Kw8sGDx9": {
    name: "Workforce Battalion Guide",
    file: "workforce_battalion_guide.pdf",
    type: "digital",
  },
  "price_1Tgizx1r1N62QJj7NwSnS6Af": {
    name: "Workforce Empire Guide",
    file: "workforce_empire_guide.pdf",
    type: "digital",
  },
  "price_1Tgizy1r1N62QJj7kjmjXgVY": {
    name: "AI Video Generator Toolkit",
    file: "video_generator.pdf",
    type: "digital",
  },
  "price_1Tgizz1r1N62QJj7zn1sp18z": {
    name: "Faceless Content Pro",
    file: "faceless_content_pro.pdf",
    type: "digital",
  },
  "price_1Tgj001r1N62QJj7GIgsGg22": {
    name: "Trading Math",
    file: "trading_math.pdf",
    type: "digital",
  },

  // ── Tier 3 — $27 products (2026-06-10) ────────────────────────────────
  "price_1Tgj0m1r1N62QJj7jwkNGsz3": {
    name: "Revenue Playbook 2026",
    file: "Revenue_Playbook_2026.pdf",
    type: "digital",
  },
  "price_1Tgj1K1r1N62QJj7TRxD4kS2": {
    name: "Twin Agent Blueprint",
    file: "twin_agent_blueprint.pdf",
    type: "digital",
  },
  "price_1Tgj1L1r1N62QJj7csb5TjRk": {
    name: "ComfyUI 77 Workflows",
    file: "comfyui_77_workflows.pdf",
    type: "digital",
  },
  "price_1Tgj1M1r1N62QJj72Nqv9hIl": {
    name: "Voice Clone Toolkit",
    file: "voice_clone_toolkit.pdf",
    type: "digital",
  },
  "price_1Tgj1N1r1N62QJj7cfHJKAA0": {
    name: "Outreach Playbook",
    file: "outreach_playbook.pdf",
    type: "digital",
  },
  "price_1Tgj1O1r1N62QJj7ttTKn2AH": {
    name: "Workforce Scout Guide",
    file: "workforce_scout_guide.pdf",
    type: "digital",
  },
  "price_1Tgj1m1r1N62QJj7JBe48SI4": {
    name: "Agent Body Scripts",
    file: "agent_body_scripts.pdf",
    type: "digital",
  },
  "price_1Tgj261r1N62QJj7SezbeDzw": {
    name: "ABUZ8 Score Formulas",
    file: "abuz8_score_formulas.pdf",
    type: "digital",
  },
  "price_1Tgj261r1N62QJj7qmTAQ5I9": {
    name: "Bee Series Production",
    file: "bee_series_production.pdf",
    type: "digital",
  },
  "price_1Tgj271r1N62QJj7e0yuMggu": {
    name: "Crisis Catalyst",
    file: "crisis_catalyst.pdf",
    type: "digital",
  },

  // ── Budget — $19 products (2026-06-10) ─────────────────────────────────
  "price_1Tgj281r1N62QJj7EymPIXr8": {
    name: "ABUZ8 Network Whitepaper",
    file: "abuz8_network_whitepaper.pdf",
    type: "digital",
  },
  // REMOVED: Islamic Stories Vol. 1 — religious content, never monetized
  // REMOVED: Ethical Business Blueprint — contains Islamic references, needs Ahmad's verification

  // ── New products ($27) — wired 2026-06-10 ──────────────────────────────
  "price_1TgjjC1r1N62QJj7ztk1hjXY": {
    name: "Islamic AI Ethics",
    file: "islamic_ai_ethics.pdf",
    type: "digital",
  },
  "price_1TgjjD1r1N62QJj7XtLoRi4l": {
    name: "Islamic Business Mastery",
    file: "islamic_business_mastery.pdf",
    type: "digital",
  },
  "price_1TgjjE1r1N62QJj7IvYnA6N2": {
    name: "Revenue Playbook",
    file: "revenue_playbook.pdf",
    type: "digital",
  },
  "price_1TgjjF1r1N62QJj7wrnsOZuo": {
    name: "Revenue Playbook — 7 Streams",
    file: "revenue_playbook_7_streams.pdf",
    type: "digital",
  },

  // ── Services — no auto-file; onboarding email + admin notify ───────────
  "price_1TM3VO1r1N62QJj7yz4z2SHs": {
    name: "AI SDR Agent (one-time setup)",
    type: "service",
    onboarding: "We'll reach out within 24 hours with your ICP intake form and the 5-day deployment runbook.",
  },
  "price_1TM3VN1r1N62QJj7HmD8N0RG": {
    name: "AI SDR Agent ($499/mo)",
    type: "service",
    onboarding: "Welcome aboard. Onboarding kickoff link arriving within 24 hours.",
  },
  "price_1TLL681r1N62QJj7cwwxd3kx": {
    name: "ABUZ8 AI Workforce — Scout",
    type: "service",
    onboarding: "Scout agent provisioning starts now. Kickoff link arriving within 24 hours.",
  },
  "price_1TLL691r1N62QJj709KZa8DC": {
    name: "ABUZ8 AI Workforce — Battalion",
    type: "service",
    onboarding: "Battalion (3 coordinated agents) provisioning starts now. Kickoff link arriving within 24 hours.",
  },
  "price_1TO4Y31r1N62QJj7lYffWfTu": {
    name: "PM Workflow Rescue Audit",
    type: "service",
    onboarding: "48-hour rescue audit begins now. Intake form + scheduling link arriving within a few hours.",
  },
  "price_1TTrKa1r1N62QJj7DQ9kGjAm": {
    name: "Deep Automation Map",
    type: "service",
    onboarding: "Intake form + scheduling link for your 2-hour deep dive arriving within 24 hours.",
  },
  "price_1TTrKd1r1N62QJj7af7RYsXy": {
    name: "Standard MCP Business Automation",
    type: "service",
    onboarding: "Onboarding kickoff for MCP agent setup arriving within 24 hours.",
  },
  "price_1TTrKg1r1N62QJj7YnIxnfC3": {
    name: "Qadir MCP Agent Setup",
    type: "service",
    onboarding: "Enterprise QADIR deployment kickoff arriving within 24 hours. White-glove from here.",
  },
  "price_1TTrKk1r1N62QJj7lQocFwHx": {
    name: "Data Pipeline Report",
    type: "service",
    onboarding: "Send your CSV to hello@abuz8ai.com and we'll return the executive report within 1 business day.",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Entry
// ────────────────────────────────────────────────────────────────────────────

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, worker: "stripe-fulfillment", version: "3.0.0" });
    }

    if (request.method === "GET" && url.pathname === "/status") {
      return await handleStatus(env);
    }

    if (request.method === "GET" && url.pathname === "/download") {
      return await handleDownload(url, env);
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    return await handleStripeEvent(request, env, ctx);
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Signed download handler — serves PDF from R2
// URL: /download?file=<name.pdf>&exp=<unix_ts>&sig=<hmac_hex>
// ────────────────────────────────────────────────────────────────────────────

async function handleDownload(url, env) {
  const file = url.searchParams.get("file");
  const exp = url.searchParams.get("exp");
  const sig = url.searchParams.get("sig");

  if (!file || !exp || !sig) {
    return json({ error: "missing_params", hint: "Requires file, exp, sig" }, 400);
  }

  // Verify expiry
  const now = Math.floor(Date.now() / 1000);
  if (now > parseInt(exp, 10)) {
    return json({ error: "link_expired", hint: "This download link has expired. Contact support at ahmad@abuz8ai.com for a fresh link." }, 403);
  }

  // Verify signature
  const secret = env.DOWNLOAD_SIGN_SECRET || env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return json({ error: "server_config_error" }, 500);
  }

  const expectedSig = await hmacSign(`${file}:${exp}`, secret);
  if (!timingSafeEqual(expectedSig, sig)) {
    return json({ error: "invalid_signature" }, 403);
  }

  // Sanitize filename — no path traversal
  const safeFile = file.replace(/[^a-zA-Z0-9_\-\.]/g, "_");

  // Fetch from R2
  const object = await env.PRODUCTS_BUCKET.get(safeFile);
  if (!object) {
    return json({ error: "file_not_found", file: safeFile }, 404);
  }

  // Serve with download headers
  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/pdf");
  headers.set("Content-Disposition", `attachment; filename="${safeFile}"`);
  headers.set("Cache-Control", "private, no-cache");

  return new Response(object.body, { headers });
}

// ────────────────────────────────────────────────────────────────────────────
// Webhook handler
// ────────────────────────────────────────────────────────────────────────────

async function handleStripeEvent(request, env, ctx) {
  const sig = request.headers.get("stripe-signature");
  const body = await request.text();

  // 1) Verify Stripe signature
  if (env.STRIPE_WEBHOOK_SECRET) {
    const verified = await verifyStripeSignature(body, sig, env.STRIPE_WEBHOOK_SECRET);
    if (!verified) {
      return json({ error: "invalid_signature" }, 400);
    }
  } else {
    console.warn("[stripe-fulfillment] STRIPE_WEBHOOK_SECRET not set — refusing event");
    return json({ error: "webhook_secret_unconfigured" }, 503);
  }

  let event;
  try {
    event = JSON.parse(body);
  } catch (e) {
    return json({ error: "invalid_json" }, 400);
  }

  // 2) Idempotency
  try {
    const dupe = await env.abuz8_waiting_list
      .prepare("SELECT id FROM fulfillment_queue WHERE stripe_event_id = ?1 LIMIT 1")
      .bind(event.id)
      .first();
    if (dupe) {
      return json({ ok: true, status: "duplicate", event_id: event.id });
    }
  } catch (e) {
    console.warn("[stripe-fulfillment] idempotency check failed:", e.message);
  }

  if (event.type !== "checkout.session.completed") {
    return json({ ok: true, status: "ignored", type: event.type });
  }

  const session = event.data.object;
  const customerEmail = session.customer_details?.email || session.customer_email;
  const priceId =
    session.metadata?.price_id ||
    session.line_items?.data?.[0]?.price?.id ||
    null;
  const amountTotal = session.amount_total || 0;
  const currency = (session.currency || "usd").toUpperCase();

  if (!customerEmail) {
    return await logAndRespond(env, event.id, null, priceId, "failed_no_email", "No customer email on session");
  }

  const product = priceId ? PRODUCT_CATALOG[priceId] : null;

  if (!product) {
    await sendAdminEmail(env, {
      subject: `[ABUZ8] Unknown price_id in Stripe webhook — manual delivery needed`,
      body: `Customer: ${customerEmail}\nPrice ID: ${priceId}\nAmount: ${amountTotal/100} ${currency}\nEvent: ${event.id}\n\nMap this price_id in stripe-fulfillment/index.js PRODUCT_CATALOG and re-process.`,
    });
    return await logAndRespond(env, event.id, customerEmail, priceId, "manual_review", "Unknown price_id");
  }

  // 3) Build + send the customer email
  let emailResult = { ok: false };

  if (product.type === "digital" && product.file) {
    // Generate signed download URL pointing to this worker's /download endpoint
    const workerOrigin = new URL(request.url).origin;
    const expiry = Math.floor(Date.now() / 1000) + 7 * 24 * 3600; // 7 days
    const secret = env.DOWNLOAD_SIGN_SECRET || env.STRIPE_WEBHOOK_SECRET;
    const downloadSig = await hmacSign(`${product.file}:${expiry}`, secret);
    const fileUrl = `${workerOrigin}/download?file=${encodeURIComponent(product.file)}&exp=${expiry}&sig=${downloadSig}`;

    emailResult = await sendCustomerEmail(env, {
      to: customerEmail,
      subject: `Your ABUZ8 download: ${product.name}`,
      html: digitalDeliveryHtml({
        productName: product.name,
        downloadUrl: fileUrl,
        amount: `${(amountTotal/100).toFixed(2)} ${currency}`,
      }),
    });
  } else if (product.type === "service") {
    emailResult = await sendCustomerEmail(env, {
      to: customerEmail,
      subject: `Welcome to ${product.name} — onboarding starts now`,
      html: serviceOnboardingHtml({
        productName: product.name,
        onboardingNote: product.onboarding || "Onboarding details arriving within 24 hours.",
        amount: `${(amountTotal/100).toFixed(2)} ${currency}`,
      }),
    });
    ctx.waitUntil(sendAdminEmail(env, {
      subject: `[ABUZ8 ONBOARDING] ${product.name} — ${customerEmail}`,
      body: `New service purchase — kick off onboarding for ${customerEmail} on ${product.name}.\n\nAmount: ${(amountTotal/100).toFixed(2)} ${currency}\nEvent: ${event.id}`,
    }));
  }

  const status = emailResult.ok ? "sent" : "send_failed";
  await logAndRespond(env, event.id, customerEmail, priceId, status, emailResult.error || null, product.name);

  return json({ ok: true, status, product: product.name, email: customerEmail });
}

// ────────────────────────────────────────────────────────────────────────────
// HMAC signing for download URLs (Web Crypto, no npm)
// ────────────────────────────────────────────────────────────────────────────

async function hmacSign(message, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const buf = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ────────────────────────────────────────────────────────────────────────────
// Stripe signature verification (HMAC-SHA256, Web Crypto — no npm)
// ────────────────────────────────────────────────────────────────────────────

async function verifyStripeSignature(payload, sigHeader, secret) {
  if (!sigHeader || !secret) return false;
  const parts = Object.fromEntries(
    sigHeader.split(",").map(p => p.split("=").map(s => s.trim()))
  );
  const ts = parts.t;
  const sig = parts.v1;
  if (!ts || !sig) return false;

  const nowSec = Math.floor(Date.now() / 1000);
  if (Math.abs(nowSec - parseInt(ts, 10)) > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const macBuf = await crypto.subtle.sign("HMAC", key, enc.encode(`${ts}.${payload}`));
  const macHex = Array.from(new Uint8Array(macBuf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeEqual(macHex, sig);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ────────────────────────────────────────────────────────────────────────────
// Email — MailChannels
// ────────────────────────────────────────────────────────────────────────────

async function sendCustomerEmail(env, { to, subject, html }) {
  const from = env.MAIL_FROM || "sales@abuz8ai.com";
  const fromName = env.MAIL_FROM_NAME || "ABUZ8 Studios";
  const bcc = env.ADMIN_BCC || null;

  const personalizations = [{ to: [{ email: to }] }];
  if (bcc) personalizations[0].bcc = [{ email: bcc }];

  const payload = {
    personalizations,
    from: { email: from, name: fromName },
    subject,
    content: [{ type: "text/html", value: html }],
  };

  try {
    const res = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok || res.status === 202) return { ok: true };
    const text = await res.text();
    return { ok: false, error: `mailchannels ${res.status}: ${text.slice(0, 200)}` };
  } catch (e) {
    return { ok: false, error: `mailchannels_exception: ${e.message}` };
  }
}

async function sendAdminEmail(env, { subject, body }) {
  const admin = env.ADMIN_BCC || "hello@abuz8ai.com";
  return await sendCustomerEmail(env, {
    to: admin,
    subject,
    html: `<pre style="font-family:monospace;white-space:pre-wrap">${escapeHtml(body)}</pre>`,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// D1 logging + /status
// ────────────────────────────────────────────────────────────────────────────

async function logAndRespond(env, eventId, email, priceId, status, errorMsg, productName) {
  try {
    await env.abuz8_waiting_list
      .prepare(
        "INSERT INTO fulfillment_queue (customer_email, product_id, price_id, status, stripe_event_id, error_msg, product_name) " +
        "VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"
      )
      .bind(email || "", "auto", priceId || "", status, eventId, errorMsg || null, productName || null)
      .run();
  } catch (e) {
    try {
      await env.abuz8_waiting_list
        .prepare("INSERT INTO fulfillment_queue (customer_email, product_id, price_id) VALUES (?1, ?2, ?3)")
        .bind(email || "", "auto", priceId || "")
        .run();
    } catch (e2) {
      console.error("[stripe-fulfillment] d1 insert failed:", e2.message);
    }
  }
}

async function handleStatus(env) {
  try {
    const rows = await env.abuz8_waiting_list
      .prepare(
        "SELECT id, customer_email, product_name, price_id, status, error_msg, created_at " +
        "FROM fulfillment_queue ORDER BY id DESC LIMIT 25"
      )
      .all();
    return json({ ok: true, rows: rows.results || [] });
  } catch (e) {
    return json({ ok: false, error: e.message }, 500);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// HTML email templates — ABUZ8 brand (lapis / gold / turq / Playfair + Inter)
// ────────────────────────────────────────────────────────────────────────────

function digitalDeliveryHtml({ productName, downloadUrl, amount }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0a1628;font-family:Inter,Helvetica,Arial,sans-serif;color:#e8e4d8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:40px 16px">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#0d1a30;border:1px solid #1a2e50;border-radius:12px;max-width:600px">
  <tr><td style="padding:32px 32px 8px">
    <div style="font-family:'Playfair Display',Georgia,serif;color:#c9a84c;font-size:28px;letter-spacing:-0.01em">ABUZ8</div>
    <div style="color:#8a9aaa;font-size:13px;margin-top:4px">Your purchase is ready</div>
  </td></tr>
  <tr><td style="padding:8px 32px 24px">
    <h1 style="font-family:'Playfair Display',Georgia,serif;color:#f5f0e8;font-size:26px;margin:24px 0 8px;line-height:1.2">${escapeHtml(productName)}</h1>
    <div style="color:#8a9aaa;font-size:14px;margin-bottom:24px">Payment received — ${escapeHtml(amount)}</div>
    <a href="${escapeHtml(downloadUrl)}" style="display:inline-block;background:#c9a84c;color:#0a1628;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;font-size:15px">Download your files →</a>
    <div style="color:#8a9aaa;font-size:13px;margin-top:24px;line-height:1.6">If the button doesn't work, copy this link:<br><a href="${escapeHtml(downloadUrl)}" style="color:#34d4b0;word-break:break-all">${escapeHtml(downloadUrl)}</a></div>
    <div style="color:#8a9aaa;font-size:12px;margin-top:16px">This link expires in 7 days. Need a fresh one? Reply to this email.</div>
  </td></tr>
  <tr><td style="padding:24px 32px;border-top:1px solid #1a2e50">
    <div style="color:#8a9aaa;font-size:13px;line-height:1.6">
      Questions? Just reply — we read every email.<br>
      <strong style="color:#e8e4d8">Ahmad &amp; the ABUZ8 team</strong><br>
      <a href="https://abuz8ai.com" style="color:#34d4b0;text-decoration:none">abuz8ai.com</a>
    </div>
  </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

function serviceOnboardingHtml({ productName, onboardingNote, amount }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#0a1628;font-family:Inter,Helvetica,Arial,sans-serif;color:#e8e4d8">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0a1628;padding:40px 16px">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#0d1a30;border:1px solid #1a2e50;border-radius:12px;max-width:600px">
  <tr><td style="padding:32px 32px 8px">
    <div style="font-family:'Playfair Display',Georgia,serif;color:#c9a84c;font-size:28px;letter-spacing:-0.01em">ABUZ8</div>
    <div style="color:#8a9aaa;font-size:13px;margin-top:4px">Welcome aboard</div>
  </td></tr>
  <tr><td style="padding:8px 32px 24px">
    <h1 style="font-family:'Playfair Display',Georgia,serif;color:#f5f0e8;font-size:26px;margin:24px 0 8px;line-height:1.2">${escapeHtml(productName)}</h1>
    <div style="color:#8a9aaa;font-size:14px;margin-bottom:24px">Payment received — ${escapeHtml(amount)}</div>
    <div style="background:#0a1628;border:1px solid #1a2e50;border-radius:8px;padding:20px;color:#e8e4d8;font-size:15px;line-height:1.6">
      ${escapeHtml(onboardingNote)}
    </div>
    <div style="color:#8a9aaa;font-size:13px;margin-top:24px;line-height:1.6">
      In the meantime, reply to this email with any questions or context that'll help us hit the ground running.
    </div>
  </td></tr>
  <tr><td style="padding:24px 32px;border-top:1px solid #1a2e50">
    <div style="color:#8a9aaa;font-size:13px;line-height:1.6">
      <strong style="color:#e8e4d8">Ahmad &amp; the ABUZ8 team</strong><br>
      <a href="https://abuz8ai.com" style="color:#34d4b0;text-decoration:none">abuz8ai.com</a>
    </div>
  </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
