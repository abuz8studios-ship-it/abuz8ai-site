// ABUZ8 — AI Image Generation endpoint powered by Cloudflare Workers AI
// Route: POST /api/ai-image
// Uses @cf/stabilityai/stable-diffusion-xl-base-1.0 (free tier)
//
// Request: { prompt: string, width?: number, height?: number }
// Response: image/png binary

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  if (!env.AI) {
    return new Response(JSON.stringify({ ok: false, error: "AI not configured" }), {
      status: 503,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ ok: false, error: "invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return new Response(JSON.stringify({ ok: false, error: "prompt required" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }

  try {
    const result = await env.AI.run("@cf/stabilityai/stable-diffusion-xl-base-1.0", {
      prompt: prompt,
      num_steps: 20,
    });

    return new Response(result, {
      headers: {
        "Content-Type": "image/png",
        ...CORS,
      },
    });
  } catch (e) {
    console.error("[ai-image] error:", e);
    return new Response(JSON.stringify({ ok: false, error: "Image generation failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
}