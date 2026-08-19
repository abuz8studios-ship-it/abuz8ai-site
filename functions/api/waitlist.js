// ABUZ8 — Waitlist / Early Access capture handler
// Route: POST /api/waitlist   (also GET /api/waitlist for a count)
//
// Every "Join Early Access" form on every tool page POSTs here:
//   { email, product, ts, referrer }
//
// Persistence is resilient and degrades gracefully:
//   1. D1 database  (binding: env.WAITLIST_DB)  — preferred, queryable
//   2. KV namespace (binding: env.WAITLIST_KV)  — fallback if no D1
//   3. Resend email (env.RESEND_API_KEY)        — ALWAYS mirrors the lead to NOTIFY_EMAIL
//                                                  so a capture is never silently lost
//
// At least one of the above should be configured. If NONE are, the handler
// still returns ok:true (so the visitor sees success) but logs a hard warning
// — captures would then live only in Cloudflare's request logs.
//
// Required / optional env vars (Cloudflare Pages > Settings > Environment Variables / Bindings):
//   WAITLIST_DB   (D1 binding)        — optional, preferred
//   WAITLIST_KV   (KV binding)        — optional, fallback
//   RESEND_API_KEY (secret)           — optional, enables email mirror
//   FROM_EMAIL    (e.g. delivery@abuz8ai.com)   — sender for the mirror
//   NOTIFY_EMAIL  (e.g. ahmad@abuz8ai.com)      — where lead notifications go
//
// D1 schema (run once in the Cloudflare D1 console, or via wrangler d1 execute):
//   CREATE TABLE IF NOT EXISTS waitlist (
//     id INTEGER PRIMARY KEY AUTOINCREMENT,
//     email TEXT NOT NULL,
//     product TEXT,
//     referrer TEXT,
//     ip TEXT,
//     country TEXT,
//     created_at INTEGER NOT NULL,
//     UNIQUE(email, product)
//   );

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid JSON body" }, 400);
  }

  const email = String(body.email || "").trim().toLowerCase();
  // Accept both keys: 25 legacy tool pages POST `product_id` while newer pages POST
  // `product` — the mismatch recorded their leads as product="unknown" (found 2026-07-20).
  const product = String(body.product || body.product_id || "unknown").slice(0, 120);
  const referrer = body.referrer ? String(body.referrer).slice(0, 300) : null;

  // Validate email server-side (never trust the client)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return json({ ok: false, error: "invalid email" }, 422);
  }

  const ts = Number.isFinite(body.ts) ? body.ts : Date.now();
  const ip = request.headers.get("CF-Connecting-IP") || null;
  const country = request.cf?.country || request.headers.get("CF-IPCountry") || null;

  const record = { email, product, referrer, ip, country, created_at: ts };

  let stored = "none";
  const warnings = [];

  // 1. Try D1
  if (env.WAITLIST_DB) {
    try {
      await env.WAITLIST_DB
        .prepare(
          "INSERT OR IGNORE INTO waitlist (email, product, referrer, ip, country, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(email, product, referrer, ip, country, ts)
        .run();
      stored = "d1";
    } catch (e) {
      warnings.push("d1: " + String(e));
    }
  }

  // 2. Fallback to KV (only if D1 didn't take it)
  if (stored === "none" && env.WAITLIST_KV) {
    try {
      const key = `wl:${product}:${email}:${ts}`;
      await env.WAITLIST_KV.put(key, JSON.stringify(record));
      stored = "kv";
    } catch (e) {
      warnings.push("kv: " + String(e));
    }
  }

  // 3. ALWAYS mirror to email if Resend is configured — so a lead is never lost
  let emailed = false;
  if (env.RESEND_API_KEY) {
    try {
      emailed = await sendNotify(record, env);
    } catch (e) {
      warnings.push("resend: " + String(e));
    }
  }

  if (stored === "none" && !emailed) {
    // Nothing persisted anywhere except request logs — make it loud in the logs.
    console.error(
      `[waitlist] NO PERSISTENCE configured. Lead landed only in logs: ${email} / ${product}. ` +
      `Configure WAITLIST_DB (D1), WAITLIST_KV (KV), or RESEND_API_KEY.`
    );
  }
  console.log(`[waitlist] email=${email} product=${product} stored=${stored} emailed=${emailed}`);

  // Visitor always sees success once we've at least logged it.
  return json({ ok: true, stored, emailed, warnings: warnings.length ? warnings : undefined });
}

// GET /api/waitlist  -> rough count (D1 only); handy for a dashboard widget.
export async function onRequestGet({ env }) {
  if (env.WAITLIST_DB) {
    try {
      const row = await env.WAITLIST_DB
        .prepare("SELECT COUNT(*) AS n FROM waitlist")
        .first();
      return json({ ok: true, source: "d1", count: row?.n ?? 0 });
    } catch (e) {
      return json({ ok: false, error: String(e) }, 500);
    }
  }
  return json({ ok: true, source: "none", count: null, note: "No D1 binding; count unavailable." });
}

async function sendNotify(record, env) {
  const from = env.FROM_EMAIL || "delivery@abuz8ai.com";
  const to = env.NOTIFY_EMAIL || "ahmad@abuz8ai.com";
  const when = new Date(record.created_at).toISOString();
  const html =
    `<!DOCTYPE html><html><body style="font-family:-apple-system,sans-serif;background:#0a1628;color:#e8e4d8;padding:32px 20px;margin:0;">` +
    `<div style="max-width:560px;margin:0 auto;background:#0d1a30;border:1px solid #c9a84c;border-radius:12px;padding:28px;">` +
    `<h1 style="font-family:'Playfair Display',Georgia,serif;color:#c9a84c;font-size:22px;margin:0 0 4px;">New Early-Access Lead</h1>` +
    `<p style="color:#8a9aaa;font-size:12px;margin:0 0 20px;letter-spacing:1.5px;text-transform:uppercase;">${escapeHtml(record.product)}</p>` +
    `<table style="width:100%;border-collapse:collapse;font-size:14px;color:#f5f0e8;">` +
    row("Email", record.email) +
    row("Product", record.product) +
    row("Referrer", record.referrer || "—") +
    row("Country", record.country || "—") +
    row("When", when) +
    `</table></div></body></html>`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject: `Early access: ${record.email} — ${record.product}`,
      html,
    }),
  });
  if (!r.ok) {
    console.error("resend notify failed", r.status, await r.text());
    return false;
  }
  return true;
}

function row(k, v) {
  return `<tr><td style="padding:6px 10px 6px 0;color:#8a9aaa;white-space:nowrap;">${k}</td>` +
         `<td style="padding:6px 0;color:#f5f0e8;">${escapeHtml(String(v))}</td></tr>`;
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
