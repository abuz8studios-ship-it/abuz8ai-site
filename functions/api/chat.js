/**
 * Cloudflare Pages Function: /api/chat
 * Proxies chat messages from the Zait widget → Qadir Core (:8900 via api.abuz8ai.com)
 * Route: functions/api/chat.js → abuz8ai.com/api/chat
 *
 * ABUZ8 LLC — 2026
 */

const QADIR_ENDPOINT = 'https://api.abuz8ai.com/api/agent';
const FALLBACK_REPLY = "I'm Zait — ABUZ8's AI. I'm waking up. Check back in a moment or email ahmad@abuz8ai.com.";

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': 'https://abuz8ai.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response(JSON.stringify({ reply: FALLBACK_REPLY }), { headers: corsHeaders, status: 200 });
  }

  const { message, session_id } = body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return new Response(JSON.stringify({ reply: FALLBACK_REPLY }), { headers: corsHeaders, status: 200 });
  }

  // Forward to Qadir Core via cloudflared tunnel
  try {
    const upstream = await fetch(QADIR_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Source': 'zait-widget' },
      body: JSON.stringify({
        message: message.trim(),
        session_id: session_id || 'zait-web',
        system: 'You are Zait, the AI assistant for ABUZ8. You are helpful, direct, and represent ABUZ8 products professionally. Keep responses concise (3-5 sentences max). Direct sales questions to abuz8ai.com/store.',
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (upstream.ok) {
      const data = await upstream.json();
      const reply = data.response || data.reply || data.message || data.output || FALLBACK_REPLY;
      return new Response(JSON.stringify({ reply }), { headers: corsHeaders, status: 200 });
    }
  } catch (_e) {
    // upstream down — return graceful fallback
  }

  return new Response(JSON.stringify({ reply: FALLBACK_REPLY }), { headers: corsHeaders, status: 200 });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': 'https://abuz8ai.com',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
