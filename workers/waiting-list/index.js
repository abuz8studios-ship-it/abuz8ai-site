// abuz8ai.com waiting-list + request worker
// 2026-05-20 01:18 EDT — extended from waitlist-only to also handle:
//   POST /              → unchanged: waitlist signup
//   POST /request       → site-wide request form (email + details)
//   GET  /list?token=…  → admin: dump recent rows (bearer token in ADMIN_TOKEN)
//   GET  /stats?token=… → admin: counts per product + per day

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const json = (status, body) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", ...cors },
});

function adminOk(request, env) {
  const url = new URL(request.url);
  const tokenFromQuery = url.searchParams.get("token");
  const tokenFromHeader = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const provided = tokenFromHeader || tokenFromQuery;
  return env.ADMIN_TOKEN && provided && provided === env.ADMIN_TOKEN;
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });

    const url = new URL(request.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    // ===== Admin: list recent submissions =====
    if (request.method === "GET" && path === "/list") {
      if (!adminOk(request, env)) return json(401, { error: "unauthorized" });
      const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);
      const rows = await env.abuz8_waiting_list.prepare(
        "SELECT id, email, product_id, source, details, created_at FROM waiting_list ORDER BY id DESC LIMIT ?"
      ).bind(limit).all();
      return json(200, { rows: rows.results || [], count: (rows.results || []).length });
    }

    // ===== Admin: summary stats =====
    if (request.method === "GET" && path === "/stats") {
      if (!adminOk(request, env)) return json(401, { error: "unauthorized" });
      const total = await env.abuz8_waiting_list.prepare(
        "SELECT COUNT(*) AS n FROM waiting_list"
      ).first();
      const perProduct = await env.abuz8_waiting_list.prepare(
        "SELECT product_id, COUNT(*) AS n FROM waiting_list GROUP BY product_id ORDER BY n DESC"
      ).all();
      const perDay = await env.abuz8_waiting_list.prepare(
        "SELECT DATE(created_at) AS day, COUNT(*) AS n FROM waiting_list GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30"
      ).all();
      const last24h = await env.abuz8_waiting_list.prepare(
        "SELECT COUNT(*) AS n FROM waiting_list WHERE created_at >= datetime('now', '-1 day')"
      ).first();
      return json(200, {
        total: total?.n || 0,
        last_24h: last24h?.n || 0,
        per_product: perProduct.results || [],
        per_day: perDay.results || [],
      });
    }

    // ===== Public: submit waitlist or request =====
    if (request.method !== "POST") return json(405, { error: "method_not_allowed" });

    let body;
    try { body = await request.json(); } catch (e) { return json(400, { error: "invalid_json" }); }

    const { email, product_id, source, details } = body || {};
    if (!email || !email.includes("@")) return json(400, { error: "valid_email_required" });

    // /request endpoint stores details as well; backward-compatible with /
    const isRequest = path === "/request";
    const pid = isRequest ? (product_id || "site-request") : product_id;
    if (!pid) return json(400, { error: "product_id_required" });

    try {
      await env.abuz8_waiting_list.prepare(
        "INSERT OR IGNORE INTO waiting_list (email, product_id, source, details) VALUES (?, ?, ?, ?)"
      ).bind(
        email.trim().toLowerCase(),
        pid,
        source || (isRequest ? "request-form" : "direct"),
        details || null,
      ).run();
      return json(200, { success: true, message: isRequest ? "Request received. We'll reply when we have something real to ship." : "Added to waiting list." });
    } catch (err) {
      return json(500, { error: err.message });
    }
  },
};
