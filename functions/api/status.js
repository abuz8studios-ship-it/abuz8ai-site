// ABUZ8 — Status API for the live System Status dashboard
// Route: GET /api/status
//
// Returns data reachable from the edge (not the local rig):
//   - waitlist count + recent signups by product (from D1 env.WAITLIST_DB)
//   - deployment timestamp
// Local GPU/service status is probed client-side from the dashboard (only
// works when the dashboard is opened on the rig itself), since localhost:8188
// etc. are not reachable from Cloudflare's edge.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ env }) {
  const out = { ok: true, ts: Date.now(), waitlist: null, byProduct: [], recent: [] };

  if (env.WAITLIST_DB) {
    try {
      const total = await env.WAITLIST_DB.prepare("SELECT COUNT(*) AS n FROM waitlist").first();
      out.waitlist = total?.n ?? 0;

      const byProd = await env.WAITLIST_DB
        .prepare("SELECT product, COUNT(*) AS n FROM waitlist GROUP BY product ORDER BY n DESC LIMIT 25")
        .all();
      out.byProduct = (byProd?.results) || [];

      const recent = await env.WAITLIST_DB
        .prepare("SELECT email, product, country, created_at FROM waitlist ORDER BY id DESC LIMIT 15")
        .all();
      // mask emails for display (privacy): show first 2 chars + domain
      out.recent = ((recent?.results) || []).map(r => ({
        email: maskEmail(r.email),
        product: r.product,
        country: r.country || "—",
        created_at: r.created_at,
      }));
    } catch (e) {
      out.ok = false;
      out.error = String(e);
    }
  } else {
    out.note = "No WAITLIST_DB binding.";
  }

  return json(out);
}

function maskEmail(e) {
  if (!e || typeof e !== "string" || e.indexOf("@") < 0) return "—";
  const [u, d] = e.split("@");
  const head = u.length <= 2 ? u : u.slice(0, 2);
  return head + "***@" + d;
}
