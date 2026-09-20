// ABUZ8 — live Hugging Face boards (server-side, no CORS).
// GET /api/hf-live?kind=models|datasets|spaces|gguf|arabic
// We aggregate, credit, and link. Never invent counts.

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };
const HF = "https://huggingface.co/api";
const LIMIT = 24;

const ARABIC_SEARCHES = [
  "ALLaM-7B-Instruct",
  "Jais-2-8B",
  "Fanar-1-9B",
  "SILMA-9B",
  "AceGPT-v2",
  "Hala-350M",
  "Falcon-H1-0.5B",
  "arabic instruct",
];

function compact(m, kind) {
  if (!m || !(m.id || m.modelId)) return null;
  const id = m.id || m.modelId;
  return {
    id,
    likes: typeof m.likes === "number" ? m.likes : 0,
    downloads: typeof m.downloads === "number" ? m.downloads : 0,
    pipeline_tag: m.pipeline_tag || null,
    sdk: m.sdk || null,
    tags: Array.isArray(m.tags) ? m.tags.slice(0, 8) : [],
    url:
      kind === "dataset" ? "https://huggingface.co/datasets/" + id
      : kind === "space" ? "https://huggingface.co/spaces/" + id
      : "https://huggingface.co/" + id,
  };
}

async function hfJson(path) {
  const res = await fetch(HF + path, {
    headers: { "User-Agent": "abuz8-hf-live (+https://abuz8ai.com)", Accept: "application/json" },
    cf: { cacheTtl: 900, cacheEverything: true },
  });
  if (!res.ok) throw new Error("hf " + res.status);
  return res.json();
}

async function listKind(kind) {
  if (kind === "models") {
    const d = await hfJson("/models?sort=trendingScore&limit=" + LIMIT);
    return Array.isArray(d) ? d.map((x) => compact(x, "model")).filter(Boolean) : [];
  }
  if (kind === "datasets") {
    const d = await hfJson("/datasets?sort=trendingScore&limit=" + LIMIT);
    return Array.isArray(d) ? d.map((x) => compact(x, "dataset")).filter(Boolean) : [];
  }
  if (kind === "spaces") {
    const d = await hfJson("/spaces?sort=trendingScore&limit=" + LIMIT);
    return Array.isArray(d) ? d.map((x) => compact(x, "space")).filter(Boolean) : [];
  }
  if (kind === "gguf") {
    const d = await hfJson("/models?filter=gguf&sort=trendingScore&limit=" + LIMIT);
    return Array.isArray(d) ? d.map((x) => compact(x, "model")).filter(Boolean) : [];
  }
  if (kind === "arabic") {
    const seen = new Set();
    const out = [];
    for (const q of ARABIC_SEARCHES) {
      let d = [];
      try {
        d = await hfJson("/models?search=" + encodeURIComponent(q) + "&limit=8");
      } catch (_) { continue; }
      if (!Array.isArray(d)) continue;
      for (const raw of d) {
        const c = compact(raw, "model");
        if (!c || seen.has(c.id)) continue;
        seen.add(c.id);
        out.push(c);
      }
    }
    out.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    return out.slice(0, LIMIT);
  }
  return [];
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const kind = (url.searchParams.get("kind") || "models").toLowerCase();
  const allowed = ["models", "datasets", "spaces", "gguf", "arabic"];
  if (!allowed.includes(kind)) {
    return new Response(JSON.stringify({ ok: false, error: "bad kind" }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS },
    });
  }
  try {
    const items = await listKind(kind);
    if (!items.length) throw new Error("empty");
    return new Response(JSON.stringify({
      ok: true,
      source: "huggingface",
      source_url: "https://huggingface.co",
      kind,
      ts: Date.now(),
      items,
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=600", ...CORS },
    });
  } catch (e) {
    return new Response(JSON.stringify({
      ok: false,
      source: "offline",
      kind,
      ts: Date.now(),
      items: [],
      error: "Hugging Face public API unreachable from our edge just now.",
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...CORS },
    });
  }
}
