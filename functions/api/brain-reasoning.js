// ABUZ8 — Brain Reasoning endpoint (local Ornith at :8011)
// Route: POST /api/brain-reasoning
// Uses: Ornith at localhost:8011 (local LLM reasoning engine)
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

  const system = body.system || "You are a helpful AI assistant for ABUZ8. Respond concisely and accurately.";
  const maxTokens = Math.min(Number(body.max_tokens) || 2048, 8192);

  try {
    // Call Ornith at :8011 using OpenAI-compatible API
    const response = await fetch("http://localhost:8011/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "local",
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.9,
      })
    });

    if (!response.ok) {
      const error = await response.text();
      return json({
        ok: false,
        error: `Ornith error: ${response.status}`,
        detail: error
      }, response.status);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";

    if (!text) {
      return json({ ok: false, error: "No response from Ornith" }, 503);
    }

    return json({
      ok: true,
      text: text,
      tokens_used: data.usage?.completion_tokens || 0
    });

  } catch (error) {
    // Ornith is down — return clear offline message
    return json({
      ok: false,
      error: "Brain reasoning engine is temporarily offline",
      offline: true
    }, 503);
  }
}
