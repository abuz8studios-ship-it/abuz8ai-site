/**
 * ABUZ8 Polymarket Proxy — Cloudflare Worker
 * Solves: CORS blocking + deprecated /markets endpoint
 * Routes: /markets → gamma-api.polymarket.com/markets (with keyset fallback)
 *
 * Deploy: cd workers/polymarket-proxy && npx wrangler deploy
 */

const GAMMA_API = 'https://gamma-api.polymarket.com';
const ALLOWED_ORIGINS = [
  'https://abuz8ai.com',
  'https://www.abuz8ai.com',
  'https://abuz8ai.pages.dev',
  'http://localhost:8788',
  'http://127.0.0.1:8788',
];

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || '';

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Only allow GET
    if (request.method !== 'GET') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders(origin) });
    }

    // Rate limiting: simple per-IP throttle via CF headers
    // (For production, use CF Rate Limiting rules)

    // Build upstream URL
    let upstreamPath = url.pathname;

    // Only allow /markets endpoint
    if (!upstreamPath.startsWith('/markets')) {
      return new Response(JSON.stringify({ error: 'Only /markets endpoint is proxied' }), {
        status: 400,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }

    // Forward query params
    const upstreamUrl = `${GAMMA_API}${upstreamPath}${url.search}`;

    try {
      const resp = await fetch(upstreamUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ABUZ8-Scanner/1.0',
        },
        cf: { cacheTtl: 30, cacheEverything: true }, // Cache for 30s at edge
      });

      // Check if we got a deprecation warning — try keyset endpoint
      const body = await resp.text();
      let data;
      try {
        data = JSON.parse(body);
      } catch (e) {
        // If JSON parse fails, return error
        return new Response(JSON.stringify({ error: 'Upstream returned invalid JSON', status: resp.status }), {
          status: 502,
          headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
        });
      }

      // If /markets returned empty or error, try /markets/keyset
      if (Array.isArray(data) && data.length === 0 && upstreamPath === '/markets') {
        const keysetUrl = `${GAMMA_API}/markets/keyset${url.search}`;
        const keysetResp = await fetch(keysetUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'ABUZ8-Scanner/1.0',
          },
          cf: { cacheTtl: 30, cacheEverything: true },
        });
        const keysetBody = await keysetResp.text();
        return new Response(keysetBody, {
          status: keysetResp.status,
          headers: {
            ...corsHeaders(origin),
            'Content-Type': 'application/json',
            'X-Upstream': 'keyset-fallback',
          },
        });
      }

      return new Response(JSON.stringify(data), {
        status: resp.status,
        headers: {
          ...corsHeaders(origin),
          'Content-Type': 'application/json',
          'X-Upstream': 'markets',
          'Cache-Control': 'public, max-age=30',
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: `Proxy error: ${e.message}` }), {
        status: 502,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
      });
    }
  },
};
