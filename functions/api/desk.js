/**
 * Cloudflare Pages Function: /api/desk
 * Logged-in Life Hub: connections + plan. Cookie from /api/auth.
 * GET  → { email, plan, status, connections, snapshots }
 * POST { kind, label, detail } → add connection
 * POST { id, remove: true }    → drop connection
 * ABUZ8 LLC — 2026 · support@abuz8ai.com
 */

import { readSession } from "./auth.js";

const CORS = {
  "Access-Control-Allow-Origin": "https://abuz8ai.com",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Credentials": "true",
};

const KINDS = new Set(["ai", "calendar", "contacts", "social", "money", "system", "app", "game", "site"]);

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

async function requireUser(request, env) {
  const email = await readSession(request, env);
  if (!email) return { error: json({ ok: false, error: "login required" }, 401) };
  if (!env.WAITLIST_DB) return { error: json({ ok: false, error: "desk not configured" }, 503) };
  return { email };
}

export async function onRequestGet({ request, env }) {
  const gate = await requireUser(request, env);
  if (gate.error) return gate.error;
  const email = gate.email;
  let plan = "free";
  let status = "none";
  let connections = [];
  let snapshots = {};
  try {
    const ent = await env.WAITLIST_DB.prepare(
      "SELECT plan, status FROM entitlements WHERE email = ?"
    ).bind(email).first();
    if (ent) {
      plan = ent.plan || "hub";
      status = ent.status || "none";
    }
    const rows = await env.WAITLIST_DB.prepare(
      "SELECT id, kind, label, detail, created_at FROM connections WHERE email = ? ORDER BY id DESC LIMIT 80"
    ).bind(email).all();
    connections = rows?.results || [];
    const snaps = await env.WAITLIST_DB.prepare(
      "SELECT key, body, ts FROM snapshots"
    ).all();
    for (const s of snaps?.results || []) {
      try { snapshots[s.key] = { ts: s.ts, data: JSON.parse(s.body) }; } catch (_) { /* skip */ }
    }
  } catch (e) {
    return json({ ok: false, error: "desk store unreachable", detail: String(e) }, 503);
  }
  return json({ ok: true, email, plan, status, connections, snapshots });
}

export async function onRequestPost({ request, env }) {
  const gate = await requireUser(request, env);
  if (gate.error) return gate.error;
  const email = gate.email;
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: "invalid JSON" }, 400); }

  if (body.remove && body.id) {
    try {
      await env.WAITLIST_DB.prepare(
        "DELETE FROM connections WHERE id = ? AND email = ?"
      ).bind(Number(body.id), email).run();
    } catch (e) {
      return json({ ok: false, error: String(e) }, 500);
    }
    return json({ ok: true, removed: true });
  }

  const kind = String(body.kind || "").toLowerCase();
  const label = String(body.label || "").trim().slice(0, 120);
  const detail = body.detail ? String(body.detail).trim().slice(0, 500) : null;
  if (!KINDS.has(kind) || !label) {
    return json({ ok: false, error: "kind + label required" }, 422);
  }
  try {
    await env.WAITLIST_DB.prepare(
      "INSERT INTO connections (email, kind, label, detail, created_at) VALUES (?, ?, ?, ?, ?)"
    ).bind(email, kind, label, detail, Date.now()).run();
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
  return json({ ok: true, added: true });
}
