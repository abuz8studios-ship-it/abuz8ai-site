// ABUZ8 — The 20 fastest-growing GitHub repos THIS WEEK (with monthly top-up).
// Route: GET /api/github-trending   (optional ?limit=20, max 30)
//
// Source of truth: GitHub's own Trending pages, which rank repos by star *velocity*
// (and acceleration) — the honest answer to "fastest growing." There is no official
// JSON API for trending, so we fetch the public pages server-side (no CORS, no token)
// and parse them. We aggregate, credit, and link straight to each repo — never copy.
//
// We pull the WEEKLY list first (true "stars this week"). GitHub's weekly list is often
// short of 20, so we top it up with the MONTHLY list (30-day risers), de-duped, and tag
// each repo with its window so the board is honest about what each number measures.
//
// Edge-cached 1h. If the pages are unreachable / their markup changes so we can't parse,
// we serve a frozen real snapshot (captured 2026-05-24) flagged source:"snapshot", so a
// visitor never sees an error or an empty board.

const WEEKLY_URL = "https://github.com/trending?since=weekly";
const MONTHLY_URL = "https://github.com/trending?since=monthly";

// Frozen real snapshot — captured 2026-05-24 (17 weekly + 3 monthly top-up = 20).
const SNAPSHOT = [
  {"full_name":"colbymchenry/codegraph","description":"Pre-indexed code knowledge graph for Claude Code, Codex, Cursor, OpenCode, and Hermes Agent — fewer tokens, fewer tool calls, 100% local","language":"TypeScript","langColor":"#3178c6","stars":20826,"forks":1161,"gained":15909,"period":"week"},
  {"full_name":"tinyhumansai/openhuman","description":"Your Personal AI super intelligence. Private, Simple and extremely powerful.","language":"Rust","langColor":"#dea584","stars":26727,"forks":2473,"gained":16288,"period":"week"},
  {"full_name":"Imbad0202/academic-research-skills","description":"Academic Research Skills for Claude Code: research → write → review → revise → finalize","language":"Python","langColor":"#3572A5","stars":20164,"forks":1722,"gained":11691,"period":"week"},
  {"full_name":"rohitg00/ai-engineering-from-scratch","description":"Learn it. Build it. Ship it for others.","language":"Python","langColor":"#3572A5","stars":14501,"forks":2673,"gained":5026,"period":"week"},
  {"full_name":"ruvnet/RuView","description":"RuView turns commodity WiFi signals into real-time spatial intelligence, vital sign monitoring, and presence detection — all without a single pixel of video.","language":"Rust","langColor":"#dea584","stars":65047,"forks":8604,"gained":6741,"period":"week"},
  {"full_name":"rohitg00/agentmemory","description":"#1 Persistent memory for AI coding agents based on real-world benchmarks","language":"TypeScript","langColor":"#3178c6","stars":17082,"forks":1403,"gained":6734,"period":"week"},
  {"full_name":"Lum1104/Understand-Anything","description":"Graphs that teach > graphs that impress. Turn any code into an interactive knowledge graph you can explore, search, and ask questions about. Works with Claude Code, Codex, Cursor, Copilot, Gemini CLI, and more.","language":"TypeScript","langColor":"#3178c6","stars":23478,"forks":2078,"gained":4880,"period":"week"},
  {"full_name":"CloakHQ/CloakBrowser","description":"Stealth Chromium that passes every bot detection test. Drop-in Playwright replacement with source-level fingerprint patches. 30/30 tests passed.","language":"Python","langColor":"#3572A5","stars":19928,"forks":1573,"gained":6991,"period":"week"},
  {"full_name":"supertone-inc/supertonic","description":"Lightning-Fast, On-Device, Multilingual TTS — running natively via ONNX.","language":"Swift","langColor":"#F05138","stars":9970,"forks":1021,"gained":3281,"period":"week"},
  {"full_name":"can1357/oh-my-pi","description":"AI Coding agent for the terminal — hash-anchored edits, optimized tool harness, LSP, Python, browser, subagents, and more","language":"TypeScript","langColor":"#3178c6","stars":6909,"forks":559,"gained":2073,"period":"week"},
  {"full_name":"datawhalechina/easy-vibe","description":"vibe coding 2026 | Your first modern Coding course for beginners to master step by step.","language":"JavaScript","langColor":"#f1e05a","stars":14378,"forks":1368,"gained":2711,"period":"week"},
  {"full_name":"obra/superpowers","description":"An agentic skills framework & software development methodology that works.","language":"Shell","langColor":"#89e051","stars":204456,"forks":18207,"gained":10367,"period":"week"},
  {"full_name":"K-Dense-AI/scientific-agent-skills","description":"A set of ready to use Agent Skills for research, science, engineering, analysis, finance and writing.","language":"Python","langColor":"#3572A5","stars":25505,"forks":2667,"gained":2522,"period":"week"},
  {"full_name":"stablyai/orca","description":"Orca is the next-gen ADE for working with a fleet of parallel agents. Run any coding agent with your own subscription. Available on desktop and mobile.","language":"TypeScript","langColor":"#3178c6","stars":3162,"forks":217,"gained":563,"period":"week"},
  {"full_name":"HKUDS/CLI-Anything","description":"\"CLI-Anything: Making ALL Software Agent-Native\" -- CLI-Hub: https://clianything.cc/","language":"Python","langColor":"#3572A5","stars":39929,"forks":3769,"gained":4773,"period":"week"},
  {"full_name":"yikart/AiToEarn","description":"Let's use AI to Earn!","language":"TypeScript","langColor":"#3178c6","stars":16199,"forks":2623,"gained":1929,"period":"week"},
  {"full_name":"cursor/plugins","description":"Cursor plugin specification and official plugins","language":"TypeScript","langColor":"#3178c6","stars":697,"forks":84,"gained":254,"period":"week"},
  {"full_name":"mattpocock/skills","description":"Skills for Real Engineers. Straight from my .claude directory.","language":"Shell","langColor":"#89e051","stars":102940,"forks":9105,"gained":85195,"period":"month"},
  {"full_name":"anthropics/financial-services","description":null,"language":"Python","langColor":"#3572A5","stars":27183,"forks":3807,"gained":19289,"period":"month"},
  {"full_name":"ComposioHQ/awesome-codex-skills","description":"A curated list of practical Codex skills for automating workflows across the Codex CLI and API.","language":"Python","langColor":"#3572A5","stars":11363,"forks":1082,"gained":10326,"period":"month"},
];

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

// Strip leaked HTML tags, decode the common entities, collapse whitespace.
function decode(s) {
  return s
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ").trim();
}
function num(s) { return s ? parseInt(s.replace(/[^\d]/g, ""), 10) : null; }

// Parse a trending page (weekly or monthly) into structured repos. Anchored per-<article>
// parse; skips any article it can't read cleanly so one markup quirk never breaks the board.
// `period` ("week"/"month") is read from each card's own "stars this <period>" label.
function parseTrending(html) {
  const parts = html.split('<article class="Box-row"');
  const out = [];
  for (let i = 1; i < parts.length; i++) {
    const a = parts[i];
    const nameM = a.match(/<h2 class="h3 lh-condensed">[\s\S]*?href="\/([^"]+)"/);
    if (!nameM) continue;
    const full = nameM[1].replace(/^\/+|\/+$/g, "");
    if (!/^[\w.-]+\/[\w.-]+$/.test(full)) continue;
    const descM = a.match(/<p class="col-9[^"]*">([\s\S]*?)<\/p>/);
    const langM = a.match(/<span itemprop="programmingLanguage">([^<]+)<\/span>/);
    const colorM = a.match(/repo-language-color"\s+style="background-color:\s*(#[0-9a-fA-F]{3,8})/);
    const starM = a.match(/href="\/[^"]+\/stargazers"[\s\S]*?<\/svg>\s*([\d,]+)/);
    const forkM = a.match(/href="\/[^"]+\/forks"[\s\S]*?<\/svg>\s*([\d,]+)/);
    const gM = a.match(/float-sm-right[\s\S]*?([\d,]+)\s+stars?\s+this\s+(week|month)/);
    out.push({
      full_name: full,
      description: descM ? decode(descM[1]) : null,
      language: langM ? langM[1].trim() : null,
      langColor: colorM ? colorM[1] : null,
      stars: num(starM && starM[1]),
      forks: num(forkM && forkM[1]),
      gained: num(gM && gM[1]),
      period: gM ? gM[2] : null,
    });
  }
  return out;
}

async function fetchTrending(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "abuz8-trending-board (+https://abuz8ai.com)", "Accept": "text/html" },
      cf: { cacheTtl: 3600, cacheEverything: true },
    });
    if (!res.ok) return [];
    return parseTrending(await res.text());
  } catch (_) {
    return [];
  }
}

function withUrls(repos) {
  return repos.map(r => ({ ...r, url: "https://github.com/" + r.full_name }));
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  let limit = parseInt(url.searchParams.get("limit") || "20", 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 30) limit = 30;

  // Fetch both windows so the page can toggle Week/Month instantly (no refetch).
  const [weekly, monthly] = await Promise.all([fetchTrending(WEEKLY_URL), fetchTrending(MONTHLY_URL)]);

  // Week view: this week's risers first, topped up with 30-day risers when weekly runs short.
  let weekView = weekly.slice();
  if (weekView.length < limit) {
    const seen = new Set(weekView.map(r => r.full_name.toLowerCase()));
    for (const r of monthly) {
      if (weekView.length >= limit) break;
      if (!seen.has(r.full_name.toLowerCase())) { seen.add(r.full_name.toLowerCase()); weekView.push(r); }
    }
  }
  // Month view: the pure 30-day risers.
  let monthView = monthly.slice();

  let source = "live";
  if (weekView.length < 5) { weekView = SNAPSHOT.slice(); source = "snapshot"; }
  if (monthView.length < 5) { monthView = SNAPSHOT.slice(); source = "snapshot"; }
  weekView = weekView.slice(0, limit);
  monthView = monthView.slice(0, limit);

  return new Response(JSON.stringify({
    ok: true,
    ts: Date.now(),
    since: "weekly+monthly",
    source,            // "live" = parsed just now · "snapshot" = frozen 2026-05-24 fallback
    count: weekView.length,
    repos: withUrls(weekView),    // default Week view (kept as `repos` for back-compat)
    monthly: withUrls(monthView), // pure 30-day view for the toggle
  }), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=3600", ...CORS },
  });
}
