// GET /api/free-apis
// Curated free-tier LLM APIs + live OpenRouter :free models. Credited, never invented.

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

const PROVIDERS = [
  { name: "Groq", url: "https://console.groq.com", note: "Very fast free Llama / Mixtral / Qwen endpoints. Rate-limited." },
  { name: "Google AI Studio", url: "https://aistudio.google.com", note: "Gemini free tier for developers. Key stays in your account." },
  { name: "OpenRouter free", url: "https://openrouter.ai/models?max_price=0", note: "One key, many :free models. Availability rotates." },
  { name: "GitHub Models", url: "https://github.com/marketplace/models", note: "Free playground models with a GitHub account." },
  { name: "Hugging Face Inference", url: "https://huggingface.co/docs/api-inference", note: "Public models, rate-limited. Gated models need a token." },
  { name: "Cerebras", url: "https://cloud.cerebras.ai", note: "Fast free-tier inference when the queue is open." },
  { name: "NVIDIA NIM", url: "https://build.nvidia.com", note: "Free credits on NVIDIA-hosted models. Rate-limited." },
  { name: "Cloudflare Workers AI", url: "https://developers.cloudflare.com/workers-ai/", note: "Free daily neurons on a Workers account." },
  { name: "Mistral", url: "https://console.mistral.ai", note: "Experimentation tier. Read current limits on their console." },
  { name: "Together", url: "https://api.together.xyz", note: "Free credits for new accounts. Not a forever free API." }
];

function isFree(m) {
  const p = m.pricing || {};
  const a = parseFloat(p.prompt || "1");
  const b = parseFloat(p.completion || "1");
  return a === 0 && b === 0;
}

async function openrouterFree() {
  try {
    const res = await fetch("https://openrouter.ai/api/v1/models", {
      headers: { "User-Agent": "abuz8-free-apis (+https://abuz8ai.com)", Accept: "application/json" },
      cf: { cacheTtl: 1800, cacheEverything: true }
    });
    if (!res.ok) return [];
    const j = await res.json();
    const arr = Array.isArray(j && j.data) ? j.data : [];
    return arr.filter(isFree).slice(0, 24).map((m) => ({
      id: m.id,
      name: m.name || m.id,
      ctx: m.context_length || null,
      url: "https://openrouter.ai/" + m.id
    }));
  } catch (_) {
    return [];
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet() {
  const live = await openrouterFree();
  return new Response(JSON.stringify({
    ok: true,
    ts: Date.now(),
    source: live.length ? "live" : "providers-only",
    providers: PROVIDERS,
    openrouter_free: live
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=1800", ...CORS }
  });
}
