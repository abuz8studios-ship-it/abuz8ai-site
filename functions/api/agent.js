// ABUZ8 — /api/agent
// Cloudflare Pages Function that proxies public chat requests to the sovereign Q3 brain.
//
// ARCHITECTURE (matches OS_ARCHITECTURE.md):
//   user  →  abuz8ai.com/chat  →  /api/agent  →  ${env.BRAIN_URL}/v1/chat/completions
//                                                         ↑
//                                              cloudflared tunnel to Q3 :8900
//                                              (Q3 = Bayesian router across 28 lanes:
//                                               Ollama local, Claude, Gemini, Grok,
//                                               DeepSeek, OpenRouter, Groq, Cerebras,
//                                               SambaNova, Kimi, Cloudflare Workers AI,
//                                               Inception Labs, plus Nemotron Omni)
//
// ENV VARS (set in Cloudflare Pages → Settings → Environment variables):
//   BRAIN_URL          — e.g. https://api.abuz8ai.com (cloudflared route)
//   BRAIN_KEY          — optional shared bearer for Q3 (empty = no auth, internal only)
//   FREE_DAILY_QUOTA   — int, default 5
//   ENABLE_KV_RATE     — "1" to enable KV-backed per-IP daily quotas
//
// KV BINDING (Pages → Settings → Functions → KV bindings):
//   AGENT_KV  → Workers KV namespace (created with `wrangler kv:namespace create AGENT_KV`)
//
// FALLBACK: if BRAIN_URL is unreachable, we return a clear 503 telling the user
// the brain is temporarily routing offline (operational truth — see /privacy + Truth-Status rule).

import { readSession } from "./auth.js";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const JSON_HEADERS = { "Content-Type": "application/json", ...CORS };

function j(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  });
}

// Pull a stable client identifier — prefer CF connecting IP, then forwarded.
function clientId(req) {
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anon"
  );
}

// Today's bucket key in UTC (resets at 00:00 UTC).
function dayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
}

// Read + increment the per-IP daily counter. Returns { used, quota, remaining, ok }.
async function checkQuota(env, ip) {
  const quota = parseInt(env.FREE_DAILY_QUOTA || "5", 10);
  if (env.ENABLE_KV_RATE !== "1" || !env.AGENT_KV) {
    return { used: 0, quota, remaining: quota, ok: true, mode: "disabled" };
  }
  const k = `q:${dayKey()}:${ip}`;
  const cur = parseInt((await env.AGENT_KV.get(k)) || "0", 10);
  if (cur >= quota) return { used: cur, quota, remaining: 0, ok: false, mode: "kv" };
  await env.AGENT_KV.put(k, String(cur + 1), { expirationTtl: 60 * 60 * 26 }); // 26h
  return { used: cur + 1, quota, remaining: quota - (cur + 1), ok: true, mode: "kv" };
}

// Probe the brain — returns {ok, lanes, latency_ms, model_count} or {ok:false}.
async function probeBrain(env) {
  const url = env.BRAIN_URL;
  if (!url) return { ok: false, reason: "BRAIN_URL not set" };
  const t0 = Date.now();
  try {
    const r = await fetch(`${url.replace(/\/$/, "")}/api/routing/status`, {
      method: "GET",
      cf: { cacheTtl: 30, cacheEverything: false },
      headers: env.BRAIN_KEY ? { Authorization: `Bearer ${env.BRAIN_KEY}` } : {},
    });
    if (!r.ok) return { ok: false, reason: `brain ${r.status}` };
    const data = await r.json();
    const lanes = data?.cost_status?.n_lanes ?? null;
    return { ok: true, lanes, latency_ms: Date.now() - t0 };
  } catch (e) {
    return { ok: false, reason: e.message || "fetch failed" };
  }
}

// ── GET: probe + status (no quota counted) ──────────────────────────────────
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("probe") === "1") {
    const probe = await probeBrain(env);
    const q = await checkQuotaPeek(env, clientId(request));
    return j({
      ok: probe.ok,
      lanes: probe.lanes,
      latency_ms: probe.latency_ms,
      reason: probe.reason,
      remaining: q.remaining,
      quota: q.quota,
    });
  }
  return j({ ok: true, info: "POST /api/agent with {messages:[{role,content}...]} to chat. GET ?probe=1 for status." });
}

// Peek quota WITHOUT incrementing (used by GET probe).
async function checkQuotaPeek(env, ip) {
  const quota = parseInt(env.FREE_DAILY_QUOTA || "5", 10);
  if (env.ENABLE_KV_RATE !== "1" || !env.AGENT_KV) {
    return { used: 0, quota, remaining: quota };
  }
  const k = `q:${dayKey()}:${ip}`;
  const cur = parseInt((await env.AGENT_KV.get(k)) || "0", 10);
  return { used: cur, quota, remaining: Math.max(0, quota - cur) };
}

// ── OPTIONS: CORS preflight ─────────────────────────────────────────────────
export function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── POST: chat → proxy to Q3 /v1/chat/completions ───────────────────────────
export async function onRequestPost({ request, env }) {
  // 1) parse body
  let body;
  try { body = await request.json(); }
  catch { return j({ error: "invalid JSON body" }, 400); }

  const messages = Array.isArray(body?.messages) ? body.messages : null;
  if (!messages || messages.length === 0) {
    return j({ error: "body.messages must be a non-empty array of {role, content}" }, 400);
  }

  // 2) quota — hub subscribers skip the free IP cap
  const ip = clientId(request);
  let q;
  try {
    const email = await readSession(request, env);
    let hub = false;
    if (email && env.WAITLIST_DB) {
      const ent = await env.WAITLIST_DB.prepare(
        "SELECT status FROM entitlements WHERE email = ?"
      ).bind(email).first();
      hub = !!(ent && ent.status === "active");
    }
    q = hub
      ? { used: 0, quota: 999, remaining: 999, ok: true, mode: "hub" }
      : await checkQuota(env, ip);
  } catch (_) {
    q = await checkQuota(env, ip);
  }
  if (!q.ok) {
    return j(
      { error: "free-tier quota exhausted", quota: q.quota, remaining: 0,
        upgrade: "Email support@abuz8ai.com for higher limits or a Pro subscription." },
      429,
      { "x-quota-remaining": "0" }
    );
  }

  // 3) sanitize messages — enforce supported roles + cap length
  const ALLOWED_ROLES = new Set(["user", "assistant", "system"]);
  const cleaned = [];
  let totalChars = 0;
  for (const m of messages) {
    if (!m || !ALLOWED_ROLES.has(m.role)) continue;
    const content = typeof m.content === "string" ? m.content : String(m.content ?? "");
    if (!content) continue;
    cleaned.push({ role: m.role, content });
    totalChars += content.length;
    if (totalChars > 60000) break; // hard cap ~15K tokens
  }
  if (cleaned.length === 0) {
    return j({ error: "no valid messages after sanitization" }, 400);
  }

  // 4) prepend a soft system note if the user didn't provide one
  if (!cleaned.some((m) => m.role === "system")) {
    cleaned.unshift({
      role: "system",
      content:
        "You are the ABUZ8 brain — a sovereign multi-lane AI router built by ABUZ8 LLC (Dayton, OH). " +
        "Be concise, direct, and honest. Never claim to be ChatGPT or Claude. " +
        "Local-first values: prefer information that respects user sovereignty.",
    });
  }

  // 5) forward to Q3 brain
  if (!env.BRAIN_URL) {
    return j({ error: "BRAIN_URL not configured", remaining: q.remaining }, 503,
      { "x-quota-remaining": String(q.remaining) });
  }
  const brainUrl = `${env.BRAIN_URL.replace(/\/$/, "")}/v1/chat/completions`;
  const t0 = Date.now();
  let upstream;
  try {
    upstream = await fetch(brainUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.BRAIN_KEY ? { Authorization: `Bearer ${env.BRAIN_KEY}` } : {}),
      },
      body: JSON.stringify({
        // OpenAI-compatible body. Q3's Bayesian router picks the lane.
        // "auto" tells Q3 to use cost/difficulty heuristic.
        model: body.model || "auto",
        messages: cleaned,
        temperature: typeof body.temperature === "number" ? body.temperature : 0.4,
        max_tokens: typeof body.max_tokens === "number" ? Math.min(body.max_tokens, 2048) : 1024,
        stream: false, // /chat.html does non-streaming for now; streaming via /api/agent-stream later
        // Pass-through hints for Q3 routing:
        user: `web:${ip}`,
      }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (e) {
    return j(
      { error: "brain unreachable — tunnel may be offline", detail: e.message, remaining: q.remaining },
      503,
      { "x-quota-remaining": String(q.remaining) }
    );
  }

  // 6) bubble up upstream response (with our quota header + latency)
  const text = await upstream.text();
  let data; try { data = JSON.parse(text); } catch { data = { error: "non-JSON brain response", raw: text.slice(0, 600) }; }
  if (!upstream.ok) {
    return j(
      { error: "brain returned non-2xx", status: upstream.status, detail: data, remaining: q.remaining },
      upstream.status,
      { "x-quota-remaining": String(q.remaining), "x-brain-latency-ms": String(Date.now() - t0) }
    );
  }
  return j(data, 200, {
    "x-quota-remaining": String(q.remaining),
    "x-brain-latency-ms": String(Date.now() - t0),
  });
}
