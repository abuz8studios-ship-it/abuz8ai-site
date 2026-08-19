// ABUZ8 first-party behavior scoring
// Routes:
//   POST /api/behavior  -> store visitor intent events
//   GET  /api/behavior  -> aggregate scorecard data
//
// Privacy posture:
// - no emails, names, raw IPs, or user-agent strings stored here
// - session_id is a browser-generated anonymous id
// - paths/click labels are trimmed to avoid capturing form input

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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
    return json({ ok: false, error: "invalid JSON body" }, 400);
  }

  const db = env.WAITLIST_DB;
  const event = normalizeEvent(body, request);
  const warnings = [];

  if (db) {
    try {
      await ensureTable(db);
      await db
        .prepare(
          `INSERT INTO behavior_events
           (created_at, session_id, event_type, path, title, referrer, target_text, target_href, section, tool, intent_score, country, meta_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          event.created_at,
          event.session_id,
          event.event_type,
          event.path,
          event.title,
          event.referrer,
          event.target_text,
          event.target_href,
          event.section,
          event.tool,
          event.intent_score,
          event.country,
          event.meta_json
        )
        .run();
      return json({ ok: true, stored: "d1", score: event.intent_score });
    } catch (e) {
      warnings.push("d1: " + String(e));
    }
  }

  console.log("[behavior]", JSON.stringify(event));
  return json({ ok: true, stored: "log", score: event.intent_score, warnings });
}

export async function onRequestGet({ request, env }) {
  const db = env.WAITLIST_DB;
  if (!db) {
    return json({ ok: true, source: "none", note: "WAITLIST_DB binding unavailable." });
  }

  const url = new URL(request.url);
  const days = clampInt(url.searchParams.get("days"), 1, 90, 7);
  const since = Date.now() - days * 86400000;

  try {
    await ensureTable(db);
    const [totals, pages, events, clicks, tools, countries, fixes] = await Promise.all([
      db
        .prepare(
          `SELECT COUNT(*) AS events,
                  COUNT(DISTINCT session_id) AS visitors,
                  SUM(intent_score) AS intent_score
           FROM behavior_events
           WHERE created_at >= ?`
        )
        .bind(since)
        .first(),
      db
        .prepare(
          `SELECT path,
                  COUNT(*) AS events,
                  COUNT(DISTINCT session_id) AS visitors,
                  SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) AS views,
                  SUM(CASE WHEN event_type LIKE '%click%' OR event_type IN ('download_intent','checkout_intent','waitlist_intent','gpu_generate_click') THEN 1 ELSE 0 END) AS clicks,
                  SUM(intent_score) AS score
           FROM behavior_events
           WHERE created_at >= ?
           GROUP BY path
           ORDER BY score DESC
           LIMIT 25`
        )
        .bind(since)
        .all(),
      db
        .prepare(
          `SELECT event_type, COUNT(*) AS n, SUM(intent_score) AS score
           FROM behavior_events
           WHERE created_at >= ?
           GROUP BY event_type
           ORDER BY score DESC, n DESC`
        )
        .bind(since)
        .all(),
      db
        .prepare(
          `SELECT target_text, target_href, path, event_type, COUNT(*) AS n, SUM(intent_score) AS score
           FROM behavior_events
           WHERE created_at >= ?
             AND target_text IS NOT NULL
             AND target_text != ''
           GROUP BY target_text, target_href, path, event_type
           ORDER BY score DESC, n DESC
           LIMIT 30`
        )
        .bind(since)
        .all(),
      db
        .prepare(
          `SELECT COALESCE(tool, path) AS tool, COUNT(*) AS n, SUM(intent_score) AS score
           FROM behavior_events
           WHERE created_at >= ?
             AND (tool IS NOT NULL OR path LIKE '/tools/%' OR path LIKE '%gpu%' OR event_type LIKE 'gpu_%')
           GROUP BY COALESCE(tool, path)
           ORDER BY score DESC, n DESC
           LIMIT 20`
        )
        .bind(since)
        .all(),
      db
        .prepare(
          `SELECT country, COUNT(*) AS n
           FROM behavior_events
           WHERE created_at >= ? AND country IS NOT NULL
           GROUP BY country
           ORDER BY n DESC
           LIMIT 12`
        )
        .bind(since)
        .all(),
      db
        .prepare(
          `SELECT path,
                  SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) AS views,
                  SUM(CASE WHEN event_type LIKE '%click%' OR event_type IN ('download_intent','checkout_intent','waitlist_intent','gpu_generate_click') THEN 1 ELSE 0 END) AS clicks,
                  SUM(CASE WHEN event_type='gpu_offline_modal' THEN 1 ELSE 0 END) AS gpu_offline,
                  SUM(CASE WHEN event_type='form_submit' THEN 1 ELSE 0 END) AS submits,
                  SUM(intent_score) AS score
           FROM behavior_events
           WHERE created_at >= ?
           GROUP BY path
           HAVING views > 0
           ORDER BY views DESC, score DESC
           LIMIT 40`
        )
        .bind(since)
        .all(),
    ]);

    return json({
      ok: true,
      source: "d1",
      window_days: days,
      totals: {
        events: totals?.events || 0,
        visitors: totals?.visitors || 0,
        intent_score: totals?.intent_score || 0,
      },
      pages: pages.results || [],
      events: events.results || [],
      clicks: clicks.results || [],
      gpu_tools: tools.results || [],
      countries: countries.results || [],
      fixes: buildFixList(fixes.results || []),
    });
  } catch (e) {
    return json({ ok: false, error: String(e) }, 500);
  }
}

function normalizeEvent(body, request) {
  const eventType = clean(body.event_type || body.type || "event", 60);
  const path = normalizePath(body.path || "/");
  const meta = body.meta && typeof body.meta === "object" ? body.meta : {};
  const event = {
    created_at: Number.isFinite(body.ts) ? body.ts : Date.now(),
    session_id: clean(body.session_id || "anonymous", 80),
    event_type: eventType,
    path,
    title: clean(body.title, 160),
    referrer: clean(body.referrer, 300),
    target_text: clean(body.target_text, 140),
    target_href: clean(body.target_href, 300),
    section: clean(body.section, 120),
    tool: clean(body.tool || inferTool(path), 120),
    country: request.cf?.country || request.headers.get("CF-IPCountry") || null,
    meta_json: JSON.stringify(meta).slice(0, 1200),
  };
  event.intent_score = scoreEvent(event, meta);
  return event;
}

function scoreEvent(event, meta) {
  let score = 1;
  const type = event.event_type;
  const href = (event.target_href || "").toLowerCase();
  const text = (event.target_text || "").toLowerCase();
  const path = (event.path || "").toLowerCase();

  if (type === "page_view") score = 2;
  if (type === "scroll_depth") score = Number(meta.depth || 0) >= 90 ? 8 : Number(meta.depth || 0) >= 75 ? 6 : 3;
  if (type === "click") score = 4;
  if (type === "cta_click") score = 10;
  if (type === "download_intent") score = 18;
  if (type === "checkout_intent") score = 35;
  if (type === "form_submit") score = 30;
  if (type === "waitlist_intent") score = 28;
  if (type === "gpu_tool_view") score = 12;
  if (type === "gpu_generate_click") score = 40;
  if (type === "gpu_priority_vote") score = 45;
  if (type === "gpu_offline_modal") score = 25;
  if (type === "video_interest") score = 20;

  if (path.includes("/tools/") || path.includes("gpu") || path.includes("comfy") || event.tool) score += 4;
  if (href.includes("stripe") || href.includes("checkout") || text.includes("buy") || text.includes("start")) score += 12;
  if (href.includes("/downloads/") || text.includes("download")) score += 8;
  if (text.includes("gpu") || text.includes("video") || text.includes("comfy")) score += 8;

  return Math.min(score, 100);
}

function buildFixList(rows) {
  const fixes = [];
  for (const r of rows) {
    const views = Number(r.views || 0);
    const clicks = Number(r.clicks || 0);
    const offline = Number(r.gpu_offline || 0);
    const submits = Number(r.submits || 0);
    const path = r.path || "/";

    if (offline > 0) {
      fixes.push({
        priority: "critical",
        path,
        reason: `${offline} GPU-offline friction event(s)`,
        action: "Make the GPU tool either run reliably or route to a waitlist/demo capture above the fold.",
      });
    }
    if (views >= 5 && clicks === 0) {
      fixes.push({
        priority: "high",
        path,
        reason: `${views} view(s), zero tracked clicks`,
        action: "Strengthen the first CTA, reduce page clutter, and make the next action obvious.",
      });
    }
    if (views >= 5 && clicks > 0 && clicks / views < 0.08) {
      fixes.push({
        priority: "medium",
        path,
        reason: `${views} view(s), ${clicks} click(s)`,
        action: "Improve CTA placement, headline clarity, and proof near the first screen.",
      });
    }
    if (submits > 0) {
      fixes.push({
        priority: "revenue",
        path,
        reason: `${submits} form submit(s)`,
        action: "Follow up fast and turn the page into a finished product/offer path.",
      });
    }
  }
  return fixes.slice(0, 20);
}

async function ensureTable(db) {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS behavior_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at INTEGER NOT NULL,
        session_id TEXT,
        event_type TEXT NOT NULL,
        path TEXT NOT NULL,
        title TEXT,
        referrer TEXT,
        target_text TEXT,
        target_href TEXT,
        section TEXT,
        tool TEXT,
        intent_score INTEGER NOT NULL DEFAULT 1,
        country TEXT,
        meta_json TEXT
      )`
    )
    .run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_behavior_created ON behavior_events(created_at)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_behavior_path ON behavior_events(path)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_behavior_type ON behavior_events(event_type)").run();
}

function clean(value, max = 120) {
  if (value == null) return null;
  return String(value).replace(/\s+/g, " ").trim().slice(0, max) || null;
}

function normalizePath(value) {
  try {
    const u = new URL(String(value), "https://abuz8ai.com");
    return (u.pathname || "/").slice(0, 240);
  } catch {
    return String(value || "/").split("?")[0].slice(0, 240);
  }
}

function inferTool(path) {
  const m = String(path || "").match(/\/tools\/([^/?#]+)\.html$/i);
  return m ? m[1] : null;
}

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
