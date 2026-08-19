/**
 * ABUZ8 Waitlist Worker
 * Captures email signups from any tool page and stores in D1.
 */
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token",
      "Access-Control-Max-Age": "86400",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });

    try {
      if (url.pathname === "/signup" && req.method === "POST") {
        const body = await req.json();
        const tool = String(body.tool || "unknown").slice(0, 60);
        const email = String(body.email || "").trim().toLowerCase();
        const meta = body.meta ? JSON.stringify(body.meta).slice(0, 1000) : null;
        if (!email || !email.includes("@") || email.length > 200) {
          return json({ ok: false, error: "invalid_email" }, 400, cors);
        }
        const ip = req.headers.get("CF-Connecting-IP") || "0.0.0.0";
        const ua = (req.headers.get("User-Agent") || "").slice(0, 200);
        const ts = new Date().toISOString();
        await env.DB.prepare(
          "INSERT OR IGNORE INTO signups (tool, email, meta, ip, ua, ts) VALUES (?, ?, ?, ?, ?, ?)"
        ).bind(tool, email, meta, ip, ua, ts).run();
        return json({ ok: true, tool, ts }, 200, cors);
      }

      if (url.pathname === "/count" && req.method === "GET") {
        const total = await env.DB.prepare("SELECT COUNT(*) as n FROM signups").first();
        const byTool = await env.DB.prepare(
          "SELECT tool, COUNT(*) as n FROM signups GROUP BY tool ORDER BY n DESC LIMIT 50"
        ).all();
        return json({ ok: true, total: total?.n || 0, by_tool: byTool.results || [] }, 200, cors);
      }

      if (url.pathname === "/export" && req.method === "GET") {
        const token = url.searchParams.get("token") || req.headers.get("X-Admin-Token");
        if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
          return json({ ok: false, error: "unauthorized" }, 401, cors);
        }
        const rows = await env.DB.prepare(
          "SELECT tool, email, meta, ts FROM signups ORDER BY ts DESC LIMIT 5000"
        ).all();
        return json({ ok: true, count: (rows.results || []).length, rows: rows.results }, 200, cors);
      }

      return json({ ok: true, service: "abuz8-waitlist", endpoints: ["/signup POST", "/count GET", "/export?token= GET"] }, 200, cors);
    } catch (e) {
      return json({ ok: false, error: String(e.message || e) }, 500, cors);
    }
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
