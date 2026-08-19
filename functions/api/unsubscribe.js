// functions/api/unsubscribe.js  →  GET/POST /api/unsubscribe?e=<email>
//
// Records an opt-out so the broadcaster (send-broadcast.mjs) never emails that address again,
// and shows a friendly confirmation page. Built 2026-08-02 (AbuJarvis) to make the waitlist
// email path CAN-SPAM/List-Unsubscribe compliant — every broadcast links here.
//
// Storage: writes to a `suppressions` table in the same D1 bound as WAITLIST_DB (falls back to
// the `abuz8_waitlist` binding names the project already uses). Auto-creates the table.
//
// Bindings (any one of these D1 bindings works; checked in order):
//   WAITLIST_DB, DB, ABUZ8_WAITLIST, abuz8_waitlist
//
// The link is intentionally one-click (GET) so it satisfies RFC 8058 one-click List-Unsubscribe.

const DB_BINDINGS = ["WAITLIST_DB", "DB", "ABUZ8_WAITLIST", "abuz8_waitlist"];

function pickDb(env) {
  for (const b of DB_BINDINGS) if (env[b] && typeof env[b].prepare === "function") return env[b];
  return null;
}

function page(title, body) {
  return new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8">` +
      `<meta name="viewport" content="width=device-width,initial-scale=1">` +
      `<title>${title} — ABUZ8</title>` +
      `<style>body{margin:0;background:#0a1628;color:#e8e4d8;font-family:-apple-system,Segoe UI,Roboto,sans-serif;` +
      `display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}` +
      `.card{max-width:520px;background:#0d1a30;border:1px solid #1a2e50;border-left:3px solid #c9a84c;` +
      `border-radius:14px;padding:36px}h1{font-family:Georgia,'Playfair Display',serif;color:#c9a84c;` +
      `font-size:24px;margin:0 0 14px}p{line-height:1.7;color:#cfd6dd;margin:0 0 12px}a{color:#2fbf8f}` +
      `.dim{color:#8a9aaa;font-size:13px;margin-top:18px}</style></head><body><div class="card">${body}` +
      `<p class="dim">ABUZ8 LLC · <a href="https://abuz8ai.com">abuz8ai.com</a></p></div></body></html>`,
    { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" }, status: 200 }
  );
}

async function ensureTable(db) {
  await db
    .prepare(
      "CREATE TABLE IF NOT EXISTS suppressions (email TEXT PRIMARY KEY, reason TEXT, created_at INTEGER NOT NULL)"
    )
    .run();
}

async function suppress(db, email, reason) {
  await ensureTable(db);
  await db
    .prepare("INSERT OR IGNORE INTO suppressions (email, reason, created_at) VALUES (?, ?, ?)")
    .bind(email, reason || "unsubscribe", Date.now())
    .run();
}

function getEmail(request) {
  const url = new URL(request.url);
  return String(url.searchParams.get("e") || url.searchParams.get("email") || "")
    .trim()
    .toLowerCase();
}

const VALID = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;

export async function onRequestGet({ request, env }) {
  const email = getEmail(request);
  if (!VALID(email)) {
    return page("Unsubscribe", `<h1>Hmm, that link looks off</h1><p>We couldn't read an email address to unsubscribe. If you keep getting mail you didn't want, reply to any message and we'll remove you by hand.</p>`);
  }
  const db = pickDb(env);
  if (db) {
    try {
      await suppress(db, email, "one-click");
    } catch (e) {
      // Even if the write fails, tell the user they're out and log it — never show them an error.
      console.error("[unsubscribe] write failed", email, String(e));
    }
  } else {
    console.log(`[unsubscribe] no D1 binding; opt-out for ${email} logged only.`);
  }
  console.log(`[unsubscribe] ${email} opted out`);
  return page(
    "Unsubscribed",
    `<h1>You're unsubscribed</h1><p><strong>${email}</strong> won't get any more ABUZ8 emails. No hard feelings — the door's open if you ever want back in.</p><p>Everything on the site stays free either way: <a href="https://abuz8ai.com/tools.html">the tools</a> and <a href="https://abuz8ai.com/blog/">the guides</a>.</p>`
  );
}

// POST is what RFC 8058 one-click clients send; treat it the same.
export async function onRequestPost(ctx) {
  return onRequestGet(ctx);
}
