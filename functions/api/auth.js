/**
 * Cloudflare Pages Function: /api/auth
 * Passwordless login for the Life Hub desk — email magic link, no new spend.
 * POST {email} → Resend sends 15-min link · GET ?t= → sets cookie → /desk.html
 * GET ?me=1 → session check · POST {logout:1} → clears cookie.
 * Tables: users, magic_tokens (desk-schema.sql). Secrets: RESEND_API_KEY, FROM_EMAIL, AUTH_SECRET.
 * ABUZ8 LLC — 2026 · support@abuz8ai.com
 */

const CORS = {
  "Access-Control-Allow-Origin": "https://abuz8ai.com",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS, ...extra },
  });
}

function validEmail(e) {
  return typeof e === "string" && e.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
}

function b64url(bytes) {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}

function signSession(env, email, exp) {
  return hmac(env.AUTH_SECRET || "abuz8-dev-only", `${email}.${exp}`);
}

export async function readSession(request, env) {
  const m = (request.headers.get("Cookie") || "").match(/(?:^|;\s*)abuz8_session=([^;]+)/);
  if (!m) return null;
  const parts = decodeURIComponent(m[1]).split(".");
  if (parts.length !== 3) return null;
  const email = parts[0].toLowerCase();
  const exp = parseInt(parts[1], 10);
  if (!validEmail(email) || !Number.isFinite(exp) || Date.now() > exp) return null;
  const good = await signSession(env, email, exp);
  return good === parts[2] ? email : null;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("me") === "1") {
    const email = await readSession(request, env);
    return email ? json({ ok: true, email }) : json({ ok: false }, 401);
  }
  const t = url.searchParams.get("t");
  if (!t) return json({ ok: false, error: "missing token" }, 400);
  if (!env.WAITLIST_DB) return json({ ok: false, error: "login not configured yet" }, 503);

  try {
    await env.WAITLIST_DB.prepare(
      "DELETE FROM magic_tokens WHERE expires < ? OR used = 1"
    ).bind(Date.now() - 86400000).run();
  } catch (_) { /* non-fatal */ }

  let row = null;
  try {
    row = await env.WAITLIST_DB.prepare(
      "SELECT email, expires, used FROM magic_tokens WHERE token = ?"
    ).bind(t).first();
  } catch (_) {
    return json({ ok: false, error: "login store unreachable" }, 503);
  }
  if (!row || row.used || Date.now() > row.expires) {
    return json({ ok: false, error: "link expired — request a fresh one" }, 401);
  }
  const email = String(row.email).toLowerCase();
  try {
    await env.WAITLIST_DB.prepare("UPDATE magic_tokens SET used = 1 WHERE token = ?").bind(t).run();
    await env.WAITLIST_DB.prepare(
      "INSERT OR IGNORE INTO users (email, created_at) VALUES (?, ?)"
    ).bind(email, Date.now()).run();
  } catch (_) { /* non-fatal */ }

  const exp = Date.now() + 30 * 86400000;
  const sig = await signSession(env, email, exp);
  const cookie = `abuz8_session=${encodeURIComponent(`${email}.${exp}.${sig}`)}; Path=/; Max-Age=${30 * 86400}; HttpOnly; Secure; SameSite=Lax`;
  return new Response(null, {
    status: 302,
    headers: { Location: "/desk.html", "Set-Cookie": cookie },
  });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }

  if (body.logout) {
    return json({ ok: true }, 200, {
      "Set-Cookie": "abuz8_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax",
    });
  }

  const email = String(body.email || "").trim().toLowerCase();
  if (!validEmail(email)) return json({ ok: false, error: "invalid email" }, 422);
  if (!env.WAITLIST_DB || !env.RESEND_API_KEY) {
    return json({ ok: false, error: "login is being wired — email support@abuz8ai.com" }, 503);
  }

  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  const token = b64url(raw);
  try {
    await env.WAITLIST_DB.prepare(
      "INSERT INTO magic_tokens (token, email, expires, used, created_at) VALUES (?, ?, ?, 0, ?)"
    ).bind(token, email, Date.now() + 15 * 60000, Date.now()).run();
  } catch (_) {
    return json({ ok: false, error: "could not create login link" }, 500);
  }

  const link = `${new URL(request.url).origin}/api/auth?t=${token}`;
  const from = env.FROM_EMAIL || "delivery@abuz8ai.com";
  const html =
    `<div style="font-family:Inter,system-ui,sans-serif;background:#0a1628;color:#e8e4d8;padding:40px 20px;max-width:560px;margin:auto;border-radius:12px;">` +
    `<div style="font-size:26px;font-weight:700;color:#c9a84c;margin-bottom:8px;">ABUZ8</div>` +
    `<p style="font-size:17px;">Your login link — valid 15 minutes.</p>` +
    `<a href="${link}" style="display:inline-block;margin:16px 0;padding:14px 32px;background:#c9a84c;color:#0a1628;font-weight:700;border-radius:8px;text-decoration:none;">Open my desk →</a>` +
    `<p style="color:#8a9aaa;font-size:13px;">Didn't ask? Ignore this email. Nothing changes.</p></div>`;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `ABUZ8 <${from}>`, to: [email], subject: "Your ABUZ8 desk login", html }),
    });
    if (!r.ok) throw new Error("resend " + r.status);
  } catch (_) {
    return json({ ok: false, error: "could not send email — try again" }, 502);
  }
  return json({ ok: true, sent: true });
}
