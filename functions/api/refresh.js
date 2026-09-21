/**
 * Cloudflare Pages Function: GET /api/refresh
 * Nightly (or on-demand) cache of the public boards into D1 snapshots + AGENT_KV.
 * Auth: header X-Cron-Secret === env.CRON_SECRET (or ?secret=). No secret in prod = 401.
 * Also callable by a logged-in hub subscriber (cookie + active entitlement).
 * ABUZ8 LLC — 2026 · support@abuz8ai.com
 */

import { readSession } from "./auth.js";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

async function allowed(request, env) {
  const secret = env.CRON_SECRET;
  const header = request.headers.get("X-Cron-Secret") || "";
  const qs = new URL(request.url).searchParams.get("secret") || "";
  if (secret && (header === secret || qs === secret)) return true;
  const email = await readSession(request, env);
  if (!email || !env.WAITLIST_DB) return false;
  try {
    const ent = await env.WAITLIST_DB.prepare(
      "SELECT status FROM entitlements WHERE email = ?"
    ).bind(email).first();
    return ent && ent.status === "active";
  } catch (_) {
    return false;
  }
}

async function putSnap(env, key, data) {
  const body = JSON.stringify(data);
  const ts = Date.now();
  if (env.WAITLIST_DB) {
    await env.WAITLIST_DB.prepare(
      "INSERT OR REPLACE INTO snapshots (key, body, ts) VALUES (?, ?, ?)"
    ).bind(key, body, ts).run();
  }
  if (env.AGENT_KV) {
    await env.AGENT_KV.put("snap:" + key, body, { expirationTtl: 60 * 60 * 26 });
  }
  return ts;
}

export async function onRequestGet({ request, env }) {
  if (!(await allowed(request, env))) {
    return json({ ok: false, error: "unauthorized" }, 401);
  }
  const origin = new URL(request.url).origin;
  const out = { ok: true, ts: Date.now(), keys: [] };
  const jobs = [
    ["repos", origin + "/api/github-trending?limit=20"],
    ["models", origin + "/api/hf-live?kind=models"],
    ["apis", origin + "/api/free-apis"],
  ];
  for (const [key, url] of jobs) {
    try {
      const r = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await r.json();
      await putSnap(env, key, data);
      out.keys.push(key);
    } catch (e) {
      out[key + "_error"] = String(e);
    }
  }
  return json(out);
}
