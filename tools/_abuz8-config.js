/* ABUZ8 Tools — shared backend config + LLM helper + brand links.
   Updated: 2026-05-08 afternoon shift — added social/community URLs.
   Cloudflare quick tunnels are ephemeral —
   when the URLs rotate, edit ABUZ8_API_URL and ABUZ8_COMFY_URL below. */
window.ABUZ8 = window.ABUZ8 || {};
window.ABUZ8.API_URL = "https://api.abuz8ai.com";
window.ABUZ8.COMFY_URL = "https://comfy.abuz8ai.com";
window.ABUZ8.MODEL = "qwen25_7b_1m";
window.ABUZ8.MAX_LATENCY_MS = 90000;

/* Brand & community links — single source of truth.
   When these change, this file is the only place to update them. */
window.ABUZ8.LINKS = {
  home:        "https://abuz8ai.com",
  tools:       "https://abuz8ai.com/tools.html",
  free:        "https://abuz8ai.com/free.html",
  store:       "https://abuz8ai.com/store.html",
  github:      "https://github.com/abuz8studios-ship-it",
  huggingface: "https://huggingface.co/abuz8studios",
  news:        "https://ai-news-feed-284.pages.dev",
  scanner:     "https://abuz8ai.com/scanner.html",
  email:       "hello@abuz8ai.com",
  support:     "https://abuz8ai.com/support.html"
};

/**
 * Call the live brain. Returns plain string content or null on failure.
 * Calling code should ALWAYS have a heuristic fallback — the brain may be
 * cold-loading, the tunnel may rotate, the user may be offline.
 */
window.ABUZ8.callBrain = async function(systemPrompt, userPrompt, opts) {
  opts = opts || {};
  const url = (opts.apiUrl || window.ABUZ8.API_URL) + "/v1/chat/completions";
  const body = {
    model: opts.model || window.ABUZ8.MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    max_tokens: opts.maxTokens || 1500,
    temperature: opts.temperature == null ? 0.7 : opts.temperature
  };
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), opts.timeoutMs || window.ABUZ8.MAX_LATENCY_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    if (data && data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    }
    return null;
  } catch (e) {
    clearTimeout(timeoutId);
    return null;
  }
};

/**
 * Health probe. Returns true if API tunnel + brain are responsive.
 */
window.ABUZ8.brainHealthy = async function() {
  try {
    const r = await fetch(window.ABUZ8.API_URL + "/health", { method: "GET" });
    return r.ok;
  } catch (_) { return false; }
};
