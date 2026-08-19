// ABUZ8 — Read-only Polymarket market-data proxy (educational paper-tester feed).
// Route: GET /api/polymarket?type=markets|events  (optional &limit=1..50, default 20)
//
// STRICT WHITELIST — exactly two upstream shapes on gamma-api.polymarket.com:
//   type=markets → /markets?active=true&closed=false&limit=N&order=volume24hr&ascending=false
//   type=events  → /events?active=true&closed=false&limit=N&order=volume24hr&ascending=false
// Nothing else is ever forwarded. The path segment comes from a fixed map (never from
// the caller), every upstream query param is hardcoded except `limit`, which is parsed
// to an integer and clamped 1–50. Arbitrary paths/params cannot reach the upstream.
//
// GET-only. Edge-cached 5 minutes (cf cacheTtl 300 + Cache-Control max-age=300).
// If the upstream is unreachable or returns junk, we serve a small frozen REAL
// snapshot (captured live from the same API on 2026-07-17) flagged source:"snapshot"
// so the page never breaks and never lies about freshness.
//
// Read-only PUBLIC data, credited to Polymarket. No orders, no wallets, no auth,
// no user data. We are not affiliated with Polymarket.

const GAMMA = "https://gamma-api.polymarket.com";
const PATHS = { markets: "/markets", events: "/events" };

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

// Frozen real snapshot — captured live from gamma-api.polymarket.com on 2026-07-17.
const SNAPSHOT_DATE = "2026-07-17";
const SNAPSHOT_MARKETS = [
  { id: "2063129", question: "Will Belete Molla be the next Prime Minister of Ethiopia?", slug: "will-belete-molla-be-the-next-prime-minister-of-ethiopia", outcomes: ["Yes", "No"], outcomePrices: [0.0025, 0.9975], volume24hr: 4173057, endDate: "2026-06-01T00:00:00Z" },
  { id: "2063135", question: "Will Gedion Timothewos be the next Prime Minister of Ethiopia?", slug: "will-gedion-timothewos-be-the-next-prime-minister-of-ethiopia", outcomes: ["Yes", "No"], outcomePrices: [0.008, 0.992], volume24hr: 3718282, endDate: "2026-06-01T00:00:00Z" },
  { id: "558938", question: "Will Argentina win the 2026 FIFA World Cup?", slug: "will-argentina-win-the-2026-fifa-world-cup-245", outcomes: ["Yes", "No"], outcomePrices: [0.4115, 0.5885], volume24hr: 2813625, endDate: "2026-07-20T00:00:00Z" },
  { id: "2942022", question: "Exact Score: Spain 2 - 3 Argentina?", slug: "fifwc-esp-arg-2026-07-19-exact-score-2-3", outcomes: ["Yes", "No"], outcomePrices: [0.036, 0.964], volume24hr: 2533146, endDate: "2026-07-19T19:00:00Z" },
  { id: "2063134", question: "Will Adanech Abiebie be the next Prime Minister of Ethiopia?", slug: "will-adanech-abiebie-be-the-next-prime-minister-of-ethiopia", outcomes: ["Yes", "No"], outcomePrices: [0.0065, 0.9935], volume24hr: 1886526, endDate: "2026-06-01T00:00:00Z" },
  { id: "2063132", question: "Will Demeke Mekonnen be the next Prime Minister of Ethiopia?", slug: "will-demeke-mekonnen-be-the-next-prime-minister-of-ethiopia", outcomes: ["Yes", "No"], outcomePrices: [0.002, 0.998], volume24hr: 1716267, endDate: "2026-06-01T00:00:00Z" },
];
const SNAPSHOT_EVENTS = [
  { id: "411239", title: "Next Prime Minister of Ethiopia?", slug: "next-prime-minister-of-ethiopia", volume24hr: 11446520, endDate: "2026-06-01T00:00:00Z", marketCount: null },
  { id: "708604", title: "Spain vs. Argentina - Exact Score", slug: "fifwc-esp-arg-2026-07-19-exact-score", volume24hr: 4898942, endDate: "2026-07-19T19:00:00Z", marketCount: null },
  { id: "30615", title: "World Cup Winner", slug: "world-cup-winner", volume24hr: 4048713, endDate: "2026-07-20T00:00:00Z", marketCount: null },
  { id: "710524", title: "LoL: Hanwha Life Esports vs T1 (BO3) - Esports World Cup Playoffs", slug: "lol-hle1-t1-2026-07-17", volume24hr: 2812004, endDate: "2026-07-17T17:00:00Z", marketCount: null },
];

// ---------- sanitizers ----------
function toNum(v) {
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : null;
}
function cleanStr(v, max) {
  return typeof v === "string" && v.length ? v.slice(0, max) : null;
}
// Gamma returns outcomes/outcomePrices as JSON-encoded strings — parse defensively.
function parseJsonArray(v) {
  if (Array.isArray(v)) return v;
  if (typeof v !== "string") return [];
  try {
    const a = JSON.parse(v);
    return Array.isArray(a) ? a : [];
  } catch (_) {
    return [];
  }
}
// Only allow slugs that are safe to embed in an outbound polymarket.com link.
function slugOk(s) {
  return typeof s === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(s) ? s : null;
}

function mapMarket(m) {
  if (!m || typeof m !== "object") return null;
  const question = cleanStr(m.question, 300);
  if (!question) return null;
  const outcomes = parseJsonArray(m.outcomes).slice(0, 8).map((o) => String(o).slice(0, 80));
  const prices = parseJsonArray(m.outcomePrices).slice(0, 8).map(toNum);
  return {
    id: cleanStr(String(m.id == null ? "" : m.id), 32),
    question,
    slug: slugOk(m.slug),
    outcomes,
    outcomePrices: prices,
    volume24hr: toNum(m.volume24hr),
    endDate: cleanStr(m.endDate, 40),
  };
}
function mapEvent(e) {
  if (!e || typeof e !== "object") return null;
  const title = cleanStr(e.title, 300);
  if (!title) return null;
  return {
    id: cleanStr(String(e.id == null ? "" : e.id), 32),
    title,
    slug: slugOk(e.slug),
    volume24hr: toNum(e.volume24hr),
    endDate: cleanStr(e.endDate, 40),
    marketCount: Array.isArray(e.markets) ? e.markets.length : null,
  };
}

async function fetchGamma(type, limit) {
  // Path chosen from the fixed map only; params hardcoded except the clamped limit.
  const upstream =
    GAMMA + PATHS[type] +
    "?active=true&closed=false&limit=" + limit +
    "&order=volume24hr&ascending=false";
  try {
    const res = await fetch(upstream, {
      headers: {
        "User-Agent": "abuz8-polymarket-tester (+https://abuz8ai.com/polymarket.html)",
        "Accept": "application/json",
      },
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    const mapped = data
      .map(type === "events" ? mapEvent : mapMarket)
      .filter(Boolean);
    return mapped.length ? mapped : null;
  } catch (_) {
    return null;
  }
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);

  // Whitelist type: anything that is not exactly "events" becomes "markets".
  const type = url.searchParams.get("type") === "events" ? "events" : "markets";

  // Clamp limit to 1..50 (default 20).
  let limit = parseInt(url.searchParams.get("limit") || "20", 10);
  if (!Number.isFinite(limit) || limit < 1) limit = 20;
  if (limit > 50) limit = 50;

  let list = await fetchGamma(type, limit);
  let source = "live";
  if (!list || list.length < 1) {
    list = (type === "events" ? SNAPSHOT_EVENTS : SNAPSHOT_MARKETS).slice(0, limit);
    source = "snapshot";
  }

  const body = {
    ok: true,
    ts: Date.now(),
    type,
    source, // "live" = fetched just now (edge-cached 5 min) · "snapshot" = frozen real capture 2026-07-17
    count: list.length,
    credit: "Market data from Polymarket's public Gamma API (gamma-api.polymarket.com). Read-only; not affiliated.",
  };
  if (source === "snapshot") body.snapshot_date = SNAPSHOT_DATE;
  body[type] = list;

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300", ...CORS },
  });
}
