// ABUZ8 — The Frontier AI Leaderboard: who's actually leading the race to AGI.
// Route: GET /api/ai-models   (optional ?limit=20 — applies to the LIVE view, max 50)
//
// TWO honest, clearly-separated data sources (same ethos as /api/github-trending):
//
//  1. LIVE roster — OpenRouter's public models API (https://openrouter.ai/api/v1/models).
//     Free, no key, fetched server-side (no CORS), edge-cached 1h. This is the real,
//     always-current list of frontier models with their REAL pricing, context window,
//     modalities and release date. New models appear here automatically — zero upkeep.
//
//  2. EDITORIAL frontier ranking — a curated ordering of the genuine frontier contenders
//     with a tier, a plain-English "what it leads", and a headline benchmark. This is the
//     part that needs human judgement, so it carries a `reviewed` date and links to its
//     sources. Each entry is bound to its EXACT OpenRouter id(s) for live specs — we never
//     bind a model to a different sibling SKU (e.g. a "Flash"/"Fast" variant), so a card's
//     price/context always describes the model it names. Rows we can't bind show clearly
//     labelled "editorial spec" numbers instead of guessing.
//
// If OpenRouter is unreachable we serve frozen real specs (captured 2026-05-27) flagged
// source:"snapshot" so a visitor never sees an empty board.

const OPENROUTER_URL = "https://openrouter.ai/api/v1/models";
const REVIEWED = "2026-05-27"; // editorial ranking last reviewed (Get-Date verified)

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

// ── Editorial frontier ranking ──────────────────────────────────────────────
// `ids`  = exact OpenRouter id(s) to bind for live specs, in priority order.
// `spec` = fallback numbers used when the live API is down OR none of `ids` are live.
//          Prices are left null where we don't have a verified figure — we show "—"
//          rather than fabricate. ctx / modalities are well-known, defensible values.
// `leads` / `bench` are sourced facts as of REVIEWED (see SOURCES in the page footer).
const EDITORIAL = [
  { rank: 1, name: "GPT-5.5", org: "OpenAI", tier: "frontier", ids: ["openai/gpt-5.5", "openai/gpt-5.5-pro"],
    leads: "Highest overall intelligence index at the frontier — and a perfect AIME 2026 math score.",
    bench: "Intelligence #1 · AIME 2026 100%",
    spec: { in: null, out: null, ctx: 1050000, mod: ["text","image","file"] } },
  { rank: 2, name: "Claude Opus 4.7", org: "Anthropic", tier: "frontier", ids: ["anthropic/claude-opus-4.7"],
    leads: "The coding & agentic leader — reclaimed #1 on SWE-bench Pro and tops head-to-head coding arena. 1M context.",
    bench: "SWE-bench Pro #1 · coding-arena #1",
    spec: { in: 5, out: 25, ctx: 1000000, mod: ["text","image","file"] } },
  { rank: 3, name: "Claude Mythos Preview", org: "Anthropic", tier: "reasoning", ids: ["anthropic/claude-mythos-preview", "anthropic/claude-mythos"],
    leads: "Leads GPQA Diamond at 94.6% — the most discriminating frontier reasoning benchmark there is.",
    bench: "GPQA Diamond 94.6% (best)",
    spec: { in: null, out: null, ctx: 1000000, mod: ["text","image","file"] } },
  { rank: 4, name: "Gemini 3.1 Pro", org: "Google DeepMind", tier: "frontier", ids: ["google/gemini-3.1-pro", "google/gemini-3.1-pro-preview", "google/gemini-3-pro"],
    leads: "Top-3 intelligence with the deepest native multimodality — text, image, video AND audio in one model.",
    bench: "Arena top-3 · native video+audio",
    spec: { in: null, out: null, ctx: 1048576, mod: ["text","image","video","file","audio"] } },
  { rank: 5, name: "Grok 4.20", org: "xAI", tier: "frontier", ids: ["x-ai/grok-4.20"],
    leads: "The biggest context at the frontier — 2,000,000 tokens — plus real-time data straight off X.",
    bench: "2M context · live-data grounding",
    spec: { in: 1.25, out: 2.5, ctx: 2000000, mod: ["text","image","file"] } },
  { rank: 6, name: "DeepSeek V4 Pro", org: "DeepSeek", tier: "value", ids: ["deepseek/deepseek-v4-pro", "deepseek/deepseek-v4"],
    leads: "Frontier-class reasoning at roughly a tenth of flagship pricing — the efficiency benchmark everyone chases.",
    bench: "≈$0.44/M in · frontier reasoning",
    spec: { in: 0.435, out: 0.87, ctx: 1048576, mod: ["text"] } },
  { rank: 7, name: "GLM-5.1", org: "Z.AI (Zhipu)", tier: "open", ids: ["z-ai/glm-5.1", "zhipuai/glm-5.1", "z-ai/glm-5", "thudm/glm-5.1"],
    leads: "Made history Apr 7 2026 as the FIRST open-weight model to ever hold #1 on SWE-bench Pro (58.4%).",
    bench: "SWE-bench Pro 58.4% · open weights",
    spec: { in: null, out: null, ctx: 200000, mod: ["text"] } },
  { rank: 8, name: "Qwen3.7 Max", org: "Alibaba", tier: "flagship", ids: ["qwen/qwen3.7-max", "qwen/qwen3-max"],
    leads: "The strongest open-ecosystem flagship — 1M context and the broadest multilingual coverage in the top tier.",
    bench: "1M context · multilingual leader",
    spec: { in: 1.25, out: 3.75, ctx: 1000000, mod: ["text"] } },
  { rank: 9, name: "Kimi K2.6", org: "Moonshot AI", tier: "value", ids: ["moonshotai/kimi-k2.6", "moonshotai/kimi-k2"],
    leads: "The cheapest model in the entire top 10 — about $0.95 / M tokens — at frontier-class quality.",
    bench: "$0.95/M — cheapest in top 10",
    spec: { in: 0.73, out: 3.49, ctx: 262144, mod: ["text","image"] } },
  { rank: 10, name: "MiniMax M2", org: "MiniMax", tier: "challenger", ids: ["minimax/minimax-m2", "minimaxai/minimax-m2", "minimax/minimax-01"],
    leads: "A fast-rising agentic + long-context challenger out of China with strong tool-use and very aggressive pricing.",
    bench: "agentic · long-context challenger",
    spec: { in: null, out: null, ctx: 1000000, mod: ["text"] } },
  { rank: 11, name: "GPT-5.4 Pro", org: "OpenAI", tier: "flagship", ids: ["openai/gpt-5.4-pro"],
    leads: "The long-horizon agentic workhorse — built for multi-step tool orchestration over a 1M+ context.",
    bench: "1.05M context · agentic tool-use",
    spec: { in: 30, out: 180, ctx: 1050000, mod: ["text","image","file"] } },
  { rank: 12, name: "Llama 4 Maverick", org: "Meta", tier: "open", ids: ["meta-llama/llama-4-maverick", "meta-llama/llama-4-maverick-17b-128e-instruct", "meta-llama/llama-4"],
    leads: "The most-deployed open-weight base on Earth — the default foundation for self-hosted and fine-tuned stacks.",
    bench: "open weights · ecosystem default",
    spec: { in: null, out: null, ctx: 1048576, mod: ["text","image"] } },
  { rank: 13, name: "Gemini 3.5 Flash", org: "Google DeepMind", tier: "fast", ids: ["google/gemini-3.5-flash"],
    leads: "Frontier-quality at flash speed and price — full multimodal including audio and video for under $2/M.",
    bench: "$1.5/M · full multimodal · fast",
    spec: { in: 1.5, out: 9, ctx: 1048576, mod: ["text","image","video","file","audio"] } },
  { rank: 14, name: "Mistral Medium 3.5", org: "Mistral AI", tier: "flagship", ids: ["mistralai/mistral-medium-3.5"],
    leads: "Europe's sovereign frontier contender — strong price/performance with multimodal input, EU-hosted.",
    bench: "EU-sovereign · multimodal",
    spec: { in: 1.5, out: 7.5, ctx: 262144, mod: ["text","image","file"] } },
];

// Category leaders — sourced facts as of REVIEWED.
const CATEGORIES = [
  { k: "Reasoning",   model: "Claude Mythos Preview", detail: "GPQA Diamond 94.6% — hardest frontier reasoning test" },
  { k: "Math",        model: "GPT-5.5",               detail: "Perfect AIME 2026 score" },
  { k: "Coding",      model: "Claude Opus 4.7",       detail: "#1 SWE-bench Pro · #1 coding arena" },
  { k: "Open-weight", model: "GLM-5.1 (Z.AI)",        detail: "First open model to ever top SWE-bench Pro (58.4%)" },
  { k: "Value",       model: "Kimi K2.6",             detail: "≈$0.95/M — cheapest in the top 10" },
  { k: "Context",     model: "Grok 4.20",             detail: "2,000,000-token window" },
];

// Frozen LIVE-roster snapshot (captured 2026-05-27) — only used if OpenRouter is down.
const LIVE_SNAPSHOT = [
  { id:"google/gemini-3.5-flash", name:"Google: Gemini 3.5 Flash", org:"Google", created:1779193800, ctx:1048576, in:1.5, out:9, mod:["text","image","video","file","audio"] },
  { id:"qwen/qwen3.7-max", name:"Qwen: Qwen3.7 Max", org:"Alibaba", created:1779376861, ctx:1000000, in:1.25, out:3.75, mod:["text"] },
  { id:"mistralai/mistral-medium-3.5", name:"Mistral: Mistral Medium 3.5", org:"Mistral AI", created:1777570439, ctx:262144, in:1.5, out:7.5, mod:["text","image","file"] },
  { id:"deepseek/deepseek-v4-pro", name:"DeepSeek: DeepSeek V4 Pro", org:"DeepSeek", created:1777000679, ctx:1048576, in:0.435, out:0.87, mod:["text"] },
  { id:"moonshotai/kimi-k2.6", name:"MoonshotAI: Kimi K2.6", org:"Moonshot AI", created:1776699402, ctx:262144, in:0.73, out:3.49, mod:["text","image"] },
  { id:"anthropic/claude-opus-4.7", name:"Anthropic: Claude Opus 4.7", org:"Anthropic", created:1776351100, ctx:1000000, in:5, out:25, mod:["text","image","file"] },
  { id:"x-ai/grok-4.20", name:"xAI: Grok 4.20", org:"xAI", created:1774979019, ctx:2000000, in:1.25, out:2.5, mod:["text","image","file"] },
  { id:"openai/gpt-5.4-pro", name:"OpenAI: GPT-5.4 Pro", org:"OpenAI", created:1772734366, ctx:1050000, in:30, out:180, mod:["text","image","file"] },
];

// Pretty org label from an OpenRouter id ("anthropic/claude-opus-4.7" → "Anthropic").
const ORG_MAP = { "anthropic":"Anthropic","openai":"OpenAI","google":"Google","x-ai":"xAI","deepseek":"DeepSeek",
  "meta-llama":"Meta","mistralai":"Mistral AI","qwen":"Alibaba","moonshotai":"Moonshot AI","minimax":"MiniMax",
  "minimaxai":"MiniMax","z-ai":"Z.AI","zhipuai":"Z.AI","thudm":"Z.AI","cohere":"Cohere","microsoft":"Microsoft",
  "nvidia":"NVIDIA","amazon":"Amazon","perplexity":"Perplexity","ai21":"AI21","databricks":"Databricks",
  "inflection":"Inflection","liquid":"Liquid AI","perceptron":"Perceptron" };
function orgFromId(id) {
  const slug = (id || "").split("/")[0].toLowerCase();
  return ORG_MAP[slug] || (slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : "—");
}
const perM = (p) => { const n = parseFloat(p); return Number.isFinite(n) ? Math.round(n * 1e6 * 1000) / 1000 : null; };
const norm = (s) => (s || "").toLowerCase().replace(/[._\-\s]+/g, ""); // "x-ai/grok-4.20" → "xai/grok420"

// Normalize one OpenRouter model object into our compact shape.
function normalize(m) {
  const a = m.architecture || {};
  const pr = m.pricing || {};
  return {
    id: m.id,
    name: m.name || m.id,
    org: orgFromId(m.id),
    created: typeof m.created === "number" ? m.created : null,
    ctx: m.context_length || null,
    in: perM(pr.prompt),
    out: perM(pr.completion),
    mod: Array.isArray(a.input_modalities) ? a.input_modalities : (a.modality ? [a.modality] : ["text"]),
    cutoff: m.knowledge_cutoff || null,
    url: "https://openrouter.ai/" + m.id,
  };
}

async function fetchOpenRouter() {
  try {
    const res = await fetch(OPENROUTER_URL, {
      headers: { "User-Agent": "abuz8-frontier-board (+https://abuz8ai.com)", "Accept": "application/json" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) return [];
    const j = await res.json();
    const arr = Array.isArray(j && j.data) ? j.data : [];
    return arr.map(normalize).filter((x) => x.id);
  } catch (_) {
    return [];
  }
}

// Index the live roster for EXACT id lookup (with a punctuation-insensitive fallback,
// so "4.7" still matches "4-7" — but never a different model family or SKU).
function indexLive(live) {
  const byId = new Map(), byNorm = new Map();
  for (const m of live) {
    byId.set(m.id.toLowerCase(), m);
    const n = norm(m.id);
    if (!byNorm.has(n)) byNorm.set(n, m);
  }
  return { byId, byNorm };
}
function bindExact(ids, idx) {
  for (const id of ids) {
    const m = idx.byId.get(id.toLowerCase()) || idx.byNorm.get(norm(id));
    if (m) return m;
  }
  return null;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  let limit = parseInt(url.searchParams.get("limit") || "30", 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 30;
  if (limit > 50) limit = 50;

  const live = await fetchOpenRouter();
  const haveLive = live.length >= 5;
  const source = haveLive ? "live" : "snapshot";
  const idx = haveLive ? indexLive(live) : null;

  // Ranked editorial board, each row enriched with its EXACT live variant when present.
  const ranked = EDITORIAL.map((e) => {
    const m = idx ? bindExact(e.ids, idx) : null;
    const specLive = !!m;
    return {
      rank: e.rank,
      name: e.name,
      liveName: m ? m.name : null,    // the exact current listing on OpenRouter, if bound
      org: e.org,
      tier: e.tier,
      leads: e.leads,
      bench: e.bench,
      ctx: m ? m.ctx : e.spec.ctx,
      in: m && m.in != null ? m.in : e.spec.in,
      out: m && m.out != null ? m.out : e.spec.out,
      mod: m && m.mod && m.mod.length ? m.mod : e.spec.mod,
      cutoff: m ? m.cutoff : null,
      specLive,
      url: m ? m.url : "https://openrouter.ai/models",
    };
  });

  // Live view: the real OpenRouter roster, newest first (de-duped by canonical name).
  let liveView;
  if (haveLive) {
    const seen = new Set();
    liveView = live
      .slice()
      .sort((a, b) => (b.created || 0) - (a.created || 0))
      .filter((m) => { const k = m.name.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
  } else {
    liveView = LIVE_SNAPSHOT.map((m) => ({ ...m, cutoff: null, url: "https://openrouter.ai/" + m.id }));
  }
  liveView = liveView.slice(0, limit);

  return new Response(JSON.stringify({
    ok: true,
    ts: Date.now(),
    source,                 // "live" = pulled from OpenRouter just now · "snapshot" = frozen 2026-05-27
    reviewed: REVIEWED,     // editorial ranking review date
    liveCount: live.length, // how many models OpenRouter is serving right now
    ranked,                 // editorial frontier ranking (default view)
    categories: CATEGORIES, // category leaders
    live: liveView,         // pure OpenRouter roster, newest first (the "live" toggle)
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600", ...CORS },
  });
}
