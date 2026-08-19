// ABUZ8 — AI Generation endpoint powered by Cloudflare Workers AI
// Route: POST /api/ai-generate
// Free tier: 10,000 neurons/day on Workers AI
// Model: @cf/meta/llama-3.1-8b-instruct (free, fast, good quality)
//
// Request: { prompt: string, system?: string, max_tokens?: number }
// Response: { ok: true, text: string } or { ok: false, error: string }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestPost({ request, env }) {
  // Check if AI binding exists
  if (!env.AI) {
    return json({ ok: false, error: "AI not configured" }, 503);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "invalid JSON" }, 400);
  }

  const prompt = String(body.prompt || "").trim();
  if (!prompt) {
    return json({ ok: false, error: "prompt required" }, 400);
  }

  const system = body.system || "You are a helpful AI assistant for ABUZ8 AI tools. Be concise, professional, and deliver high-quality output.";
  const maxTokens = Math.min(Number(body.max_tokens) || 2048, 4096);

  try {
    const result = await env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    return json({
      ok: true,
      text: result.response || "",
    });
  } catch (e) {
    console.error("[ai-generate] error:", e);
    return json({ ok: false, error: "AI generation failed" }, 500);
  }
}