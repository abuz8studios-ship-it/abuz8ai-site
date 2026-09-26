/**
 * Cloudflare Pages Functions: /api/site-config + /api/carrier
 * site-config: public knobs the login/carrier pages need (Google client id only).
 * carrier: the master home base feed — lot lanes, needs-you feed, gate, ledger.
 *   Reads the SAME canonical sources as the desktop Dealer Center:
 *   kanban boards (via committed mirrors) + filed ops log. No secrets here.
 * ABUZ8 LLC — 2026 · support@abuz8ai.com
 */

import { readSession } from "./auth.js";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
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

// GET /api/carrier → lot lanes + needs-you feed + gate + ledger (login required)
export async function onRequestGet({ request, env }) {
    const email = await readSession(request, env);
    if (!email) return json({ ok: false, error: "login required" }, 401);
    // Canonical lot mirrors live under /lot/*.json (committed by the dealer-snapshot
    // companion; falls back to empty lanes when the mirror hasn't landed yet).
    const origin = new URL(request.url).origin;
    async function mirror(name) {
      try {
        const r = await fetch(`${origin}/lot/${name}.json`, { cf: { cacheTtl: 60 } });
        if (r.ok) return await r.json();
      } catch (_) { /* fall through */ }
      return null;
    }
    const [lanes, feed, gate, ledger] = await Promise.all([
      mirror("lanes"), mirror("feed"), mirror("gate"), mirror("ledger"),
    ]);
    const laneMap = {};
    for (const u of (lanes && lanes.units) || []) {
      (laneMap[u.recon || "acquired"] = laneMap[u.recon || "acquired"] || []).push(u);
    }
    return json({
      ok: true,
      email,
      plan: "free",
      lot: { lanes: laneMap, ...(ledger || { money_in: 0, money_out: 0, net: 0 }) },
      feed: feed || { items: [] },
      gate: gate || { checks: [], engine_running: false },
    });
}
