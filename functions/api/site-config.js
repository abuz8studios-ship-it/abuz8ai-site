/**
 * Cloudflare Pages Function: /api/site-config
 * Public knobs only — Google OAuth client id. No secrets.
 * ABUZ8 LLC — 2026 · support@abuz8ai.com
 */

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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestGet({ env }) {
  return json({ googleClientId: env.GOOGLE_CLIENT_ID || null });
}
