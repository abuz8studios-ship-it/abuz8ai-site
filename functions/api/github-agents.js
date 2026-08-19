// ABUZ8 — Live GitHub stars for the Agent Systems board.
// Route: GET /api/github-agents
//
// Aggregates PUBLIC star counts from the GitHub API for a curated set of the
// top open-source agentic projects. We aggregate and credit — we never copy
// their code or claim it as ours. The board links straight to each repo.
//
// Edge-cached 30 min. If GitHub rate-limits or is unreachable, we return
// last-known fallback numbers so the board never shows an error to a visitor.

const REPOS = [
  "n8n-io/n8n","significant-gravitas/AutoGPT","langgenius/dify","langchain-ai/langchain",
  "comfyanonymous/ComfyUI","browser-use/browser-use","lobehub/lobe-chat","All-Hands-AI/OpenHands",
  "geekan/MetaGPT","mem0ai/mem0","microsoft/autogen","FlowiseAI/Flowise","crewAIInc/crewAI",
  "run-llama/llama_index","danny-avila/LibreChat","stanfordnlp/dspy","ComposioHQ/composio",
  "microsoft/semantic-kernel","assafelovic/gpt-researcher","openai/openai-agents-python"
];

// Last-known stars (rounded) captured 2026-05-20 — fallback only.
const FALLBACK = {
  "n8n-io/n8n":188988,"significant-gravitas/AutoGPT":184440,"langgenius/dify":142139,
  "langchain-ai/langchain":137279,"comfyanonymous/ComfyUI":113822,"browser-use/browser-use":94946,
  "lobehub/lobe-chat":77470,"All-Hands-AI/OpenHands":74366,"geekan/MetaGPT":68186,"mem0ai/mem0":56334,
  "microsoft/autogen":58244,"FlowiseAI/Flowise":52977,"crewAIInc/crewAI":51866,"run-llama/llama_index":49551,
  "danny-avila/LibreChat":37271,"stanfordnlp/dspy":34565,"ComposioHQ/composio":28371,
  "microsoft/semantic-kernel":27950,"assafelovic/gpt-researcher":27201,"openai/openai-agents-python":26536
};

const CORS = { "Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET, OPTIONS" };

export async function onRequestOptions(){ return new Response(null,{status:204,headers:CORS}); }

export async function onRequestGet({ env }){
  const headers = { "User-Agent":"abuz8-agent-board", "Accept":"application/vnd.github+json" };
  if (env && env.GITHUB_TOKEN) headers["Authorization"] = "Bearer " + env.GITHUB_TOKEN;

  const out = {};
  let live = 0;
  // Fetch in parallel, fall back per-repo on any failure.
  await Promise.all(REPOS.map(async (r) => {
    try {
      const res = await fetch("https://api.github.com/repos/" + r, { headers, cf:{ cacheTtl:1800, cacheEverything:true } });
      if (res.ok) {
        const j = await res.json();
        out[r] = { stars: j.stargazers_count, lang: j.language || "", archived: !!j.archived };
        live++;
        return;
      }
    } catch (_) {}
    out[r] = { stars: FALLBACK[r] || null, lang: "", archived: false, fallback: true };
  }));

  return new Response(JSON.stringify({ ok:true, ts:Date.now(), live, total:REPOS.length, repos:out }), {
    status:200,
    headers:{ "Content-Type":"application/json","Cache-Control":"public, max-age=1800", ...CORS }
  });
}
