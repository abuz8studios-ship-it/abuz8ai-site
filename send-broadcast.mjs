#!/usr/bin/env node
/**
 * send-broadcast.mjs — send one HTML email to the whole abuz8_waitlist list via Resend.
 *
 * WHY THIS EXISTS: functions/api/waitlist.js already sends a *per-signup notification*
 * to Ahmad via Resend, but there was NO way to send the weekly/welcome/launch template
 * to the whole list. This is that missing piece. Built 2026-08-02 (AbuJarvis).
 *
 * WHAT YOU NEED (one-time):
 *   1. A Resend account (free, resend.com) with abuz8ai.com domain verified (DNS in Cloudflare).
 *   2. A Resend API key. Provide it as env RESEND_API_KEY (or paste with --key=...).
 *   The list itself already exists — the D1 `waitlist` table. Nothing to buy.
 *
 * USAGE (from E:\ABU\abuz8ai-site):
 *   # DRY RUN (default — reads the list, renders, sends NOTHING, prints who would get it):
 *   node send-broadcast.mjs --template=email-templates/weekly-2026-08-02.html --subject="ABUZ8 Weekly — The businesses AI was actually built for"
 *
 *   # REAL SEND (requires RESEND_API_KEY):
 *   node send-broadcast.mjs --template=email-templates/weekly-2026-08-02.html --subject="..." --send
 *
 *   # send only to one address to test the pipeline first:
 *   node send-broadcast.mjs --template=email-templates/welcome-2026-08-02.html --subject="Welcome to ABUZ8" --send --only=you@example.com
 *
 * FLAGS:
 *   --template=PATH     (required) local HTML file to send. {{first_name}} -> "there"; {{unsubscribe_url}} -> real link.
 *   --subject="..."     (required) email subject line.
 *   --send              actually send. Without it, DRY RUN (default, safe).
 *   --only=EMAIL        restrict to a single recipient (good for a live test).
 *   --from=ADDR         sender (default delivery@abuz8ai.com — matches waitlist.js FROM_EMAIL).
 *   --reply=ADDR        Reply-To (default ahmad@abuz8ai.com).
 *   --key=KEY           Resend API key (else env RESEND_API_KEY).
 *   --db=NAME           D1 database name (default abuz8_waitlist).
 *   --product=FILTER    only email signups whose `product` matches (default: everyone, deduped by email).
 *   --limit=N           cap recipients (safety while testing).
 *   --unsub-base=URL    unsubscribe link base (default https://abuz8ai.com/api/unsubscribe?e=). See note at bottom.
 *
 * SAFETY: dry-run by default; batches of 2/sec (Resend free-tier friendly); every send result
 * logged to _broadcast-log-<ts>.json; a recipient that errors does not stop the run.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

// ---------- arg parsing ----------
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    return m ? [m[1], m[2] === undefined ? true : m[2]] : [a, true];
  })
);
const TEMPLATE = args.template;
const SUBJECT = args.subject;
const SEND = !!args.send;
const ONLY = args.only ? String(args.only).trim().toLowerCase() : null;
const FROM = args.from || "delivery@abuz8ai.com";
const REPLY = args.reply || "ahmad@abuz8ai.com";
const KEY = args.key || process.env.RESEND_API_KEY || "";
const DB = args.db || "abuz8_waitlist";
const PRODUCT = args.product || null;
const LIMIT = args.limit ? parseInt(args.limit, 10) : Infinity;
const UNSUB_BASE = args["unsub-base"] || "https://abuz8ai.com/api/unsubscribe?e=";

function die(msg) {
  console.error("ERROR: " + msg);
  process.exit(1);
}
if (!TEMPLATE) die("--template=PATH is required (e.g. email-templates/weekly-2026-08-02.html)");
if (!SUBJECT) die('--subject="..." is required');

// ---------- load template ----------
let templateHtml;
try {
  templateHtml = readFileSync(TEMPLATE, "utf8");
} catch (e) {
  die(`could not read template ${TEMPLATE}: ${e.message}`);
}

// ---------- read the list from D1 via wrangler ----------
function readList() {
  const sql = PRODUCT
    ? `SELECT DISTINCT email FROM waitlist WHERE product='${String(PRODUCT).replace(/'/g, "''")}' ORDER BY created_at DESC;`
    : `SELECT DISTINCT email FROM waitlist ORDER BY created_at DESC;`;
  // --json returns structured rows for a --command (unlike --file which only returns meta)
  // On Windows, execFileSync can't spawn npx.cmd directly (EINVAL) — go through cmd /c.
  const isWin = process.platform === "win32";
  const file = isWin ? "cmd" : "npx";
  const argv = isWin
    ? ["/c", "npx", "wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql]
    : ["wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql];
  let out;
  try {
    out = execFileSync(file, argv, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  } catch (e) {
    die(
      "wrangler d1 execute failed. Are you in E:\\ABU\\abuz8ai-site and logged in (npx wrangler whoami)?\n" +
        (e.stdout || "") + (e.stderr || e.message)
    );
  }
  // wrangler prints some noise before the JSON array; grab the last JSON array in the output.
  const start = out.indexOf("[");
  const end = out.lastIndexOf("]");
  if (start === -1 || end === -1) die("could not find JSON in wrangler output:\n" + out);
  let parsed;
  try {
    parsed = JSON.parse(out.slice(start, end + 1));
  } catch (e) {
    die("could not parse wrangler JSON: " + e.message + "\n" + out.slice(start, end + 1));
  }
  const results = parsed?.[0]?.results || [];
  let emails = results
    .map((r) => String(r.email || "").trim().toLowerCase())
    .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  // dedupe + drop obvious test/audit addresses. Prior data-integrity audits (see MEMORY.md
  // 2026-07-22) found the only "signups" were internal link-checker rows; keep those out by default.
  // Excluded: reserved TLDs (.test/.invalid/.example/.localhost), any *.abuz8.com / *.abuz8ai.com
  // (our own test domains), and local-parts that scream test/audit/verify/noreply.
  const isJunk = (e) => {
    const [local, domain = ""] = e.split("@");
    if (/\.(test|invalid|example|localhost)$/.test(domain)) return true;
    if (/(^|\.)abuz8(ai)?\.com$/.test(domain)) return true; // our own domains = test rows
    if (/^(test|verify|audit|noreply|no-reply|qa|dummy|sample)([._-]|\d|$)/.test(local)) return true;
    if (/(truth-audit|link-?check|smoke|healthcheck)/.test(local)) return true;
    return false;
  };
  emails = [...new Set(emails)].filter((e) => !isJunk(e) || (ONLY && e === ONLY));
  // Honor unsubscribes: drop anyone in the suppressions table (built by /api/unsubscribe).
  const suppressed = readSuppressions();
  if (suppressed.size) {
    const before = emails.length;
    emails = emails.filter((e) => !suppressed.has(e));
    if (before !== emails.length) console.log(`(skipped ${before - emails.length} unsubscribed)`);
  }
  if (ONLY) emails = emails.filter((e) => e === ONLY);
  if (emails.length > LIMIT) emails = emails.slice(0, LIMIT);
  return emails;
}

// Read opt-outs so we never email someone who unsubscribed. Table may not exist yet (returns empty).
function readSuppressions() {
  const isWin = process.platform === "win32";
  const file = isWin ? "cmd" : "npx";
  const sql = "SELECT email FROM suppressions;";
  const argv = isWin
    ? ["/c", "npx", "wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql]
    : ["wrangler", "d1", "execute", DB, "--remote", "--json", "--command", sql];
  try {
    const out = execFileSync(file, argv, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
    const s = out.indexOf("["), e = out.lastIndexOf("]");
    const rows = JSON.parse(out.slice(s, e + 1))?.[0]?.results || [];
    return new Set(rows.map((r) => String(r.email || "").trim().toLowerCase()));
  } catch {
    return new Set(); // table absent / no opt-outs yet — fine
  }
}

// ---------- render per recipient ----------
function renderFor(email) {
  const unsub = UNSUB_BASE + encodeURIComponent(email);
  return templateHtml
    .replaceAll("{{first_name}}", "there")
    .replaceAll("{{unsubscribe_url}}", unsub)
    .replaceAll("{{email}}", email);
}

// ---------- send one via Resend (same endpoint waitlist.js uses) ----------
async function sendOne(email) {
  const html = renderFor(email);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM,
      to: email,
      reply_to: REPLY,
      subject: SUBJECT,
      html,
      headers: { "List-Unsubscribe": `<${UNSUB_BASE}${encodeURIComponent(email)}>` },
    }),
  });
  const bodyText = await res.text();
  return { email, ok: res.ok, status: res.status, id: safeId(bodyText), body: res.ok ? undefined : bodyText };
}
function safeId(t) {
  try {
    return JSON.parse(t).id;
  } catch {
    return undefined;
  }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- main ----------
(async () => {
  const emails = readList();
  const ts = new Date().toISOString().replace(/[:.]/g, "-");

  console.log("========================================");
  console.log("ABUZ8 waitlist broadcast");
  console.log("  template : " + TEMPLATE);
  console.log("  subject  : " + SUBJECT);
  console.log("  from     : " + FROM + "   reply-to: " + REPLY);
  console.log("  db       : " + DB + (PRODUCT ? "   product=" + PRODUCT : "   (all products, deduped)"));
  console.log("  recipients: " + emails.length + (ONLY ? "  (--only=" + ONLY + ")" : ""));
  console.log("  mode     : " + (SEND ? "*** LIVE SEND ***" : "DRY RUN (nothing sent)"));
  console.log("========================================");

  if (emails.length === 0) {
    console.log("No recipients matched. Nothing to do.");
    return;
  }
  console.log("Recipients:");
  emails.forEach((e, i) => console.log("  " + (i + 1) + ". " + e));

  if (!SEND) {
    console.log("\nDRY RUN complete — no emails were sent.");
    console.log("Rendered preview for the first recipient (first 600 chars):\n");
    console.log(renderFor(emails[0]).replace(/\s+/g, " ").slice(0, 600) + " …");
    console.log("\nTo actually send: add --send  (needs a valid Resend API key via RESEND_API_KEY or --key=).");
    if (!KEY) console.log("NOTE: no RESEND_API_KEY detected — a live --send would fail until you set one.");
    return;
  }

  if (!KEY) die("--send given but no Resend API key (set RESEND_API_KEY or pass --key=). Aborting before sending.");

  const results = [];
  for (let i = 0; i < emails.length; i++) {
    const r = await sendOne(emails[i]);
    results.push(r);
    console.log(`  [${i + 1}/${emails.length}] ${r.ok ? "OK " : "FAIL"} ${r.email}${r.id ? " id=" + r.id : ""}${r.ok ? "" : " " + r.status + " " + r.body}`);
    await sleep(600); // ~2/sec, gentle on free tier
  }
  const okCount = results.filter((r) => r.ok).length;
  const logPath = `_broadcast-log-${ts}.json`;
  writeFileSync(logPath, JSON.stringify({ subject: SUBJECT, template: TEMPLATE, from: FROM, sent: okCount, total: results.length, results }, null, 2));
  console.log(`\nDONE: ${okCount}/${results.length} sent. Log: ${logPath}`);
})();
