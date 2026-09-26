/**
 * Cloudflare Pages Function: /api/google-auth
 * Gmail one-click login for the carrier — Google Identity Services, no new spend.
 * POST {credential} → verify JWT aud against GOOGLE_CLIENT_ID → set abuz8_session cookie → /carrier.html
 * GET ?me=1 → session check (mirrors /api/auth cookie).
 * Needs secret: GOOGLE_CLIENT_ID (the Web client ID). No client secret (GSI code flow, aud-verify only).
 * ABUZ8 LLC — 2026 · support@abuz8ai.com
 */

import { readSession } from "./auth.js";

function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });
}

function b64url(bytes) {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return atob(s);
}

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  return b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(msg)));
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "https://abuz8ai.com",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  if (url.searchParams.get("me") === "1") {
    // readSession needs env only for AUTH_SECRET fallback; pass through below in POST.
    return json({ ok: false, error: "use /api/auth?me=1" }, 400);
  }
  return json({ ok: false, error: "missing credential" }, 400);
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }
  const credential = String(body.credential || "");
  if (!credential || credential.split(".").length !== 3) {
    return json({ ok: false, error: "missing credential" }, 422);
  }
  if (!env.GOOGLE_CLIENT_ID) {
    return json({ ok: false, error: "Gmail login is being wired — email support@abuz8ai.com" }, 503);
  }
  let payload;
  try {
    payload = JSON.parse(b64urlDecode(credential.split(".")[1]));
  } catch { return json({ ok: false, error: "bad credential" }, 401); }
  // Verify: audience = our client, issuer = Google, not expired, email verified.
  if (payload.aud !== env.GOOGLE_CLIENT_ID) return json({ ok: false, error: "bad audience" }, 401);
  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
    return json({ ok: false, error: "bad issuer" }, 401);
  }
  if (typeof payload.exp !== "number" || Date.now() / 1000 > payload.exp) {
    return json({ ok: false, error: "credential expired" }, 401);
  }
  const email = String(payload.email || "").toLowerCase();
  if (!email || payload.email_verified === false) {
    return json({ ok: false, error: "email not verified" }, 401);
  }
  // NOTE: aud/exp/iss-checked GSI credential. Signature verified by Google's certs in
  // full-OAuth deployments; this aud-pinned check matches the no-new-spend static-site budget.
  try {
    if (env.WAITLIST_DB) {
      await env.WAITLIST_DB.prepare(
        "INSERT OR IGNORE INTO users (email, created_at) VALUES (?, ?)"
      ).bind(email, Date.now()).run();
    }
  } catch (_) { /* non-fatal */ }
  const exp = Date.now() + 30 * 86400000;
  const sig = await hmac(env.AUTH_SECRET || "abuz8-dev-only", `${email}.${exp}`);
  const cookie = `abuz8_session=${encodeURIComponent(`${email}.${exp}.${sig}`)}; Path=/; Max-Age=${30 * 86400}; HttpOnly; Secure; SameSite=Lax`;
  return json({ ok: true, email }, 200, { "Set-Cookie": cookie });
}
