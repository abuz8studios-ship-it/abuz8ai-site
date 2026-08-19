#!/usr/bin/env node
/**
 * verify-counts.js — single source of truth for every number ABUZ8 publishes.
 *
 * WHY THIS EXISTS
 * The site's whole promise is "every count is verified from disk." On 2026-07-29
 * an audit found every published count had drifted: the site advertised 169 free
 * tools against 180 on disk, 441 blog posts against 527, 99 email templates
 * against 141, and 422 sitemap URLs against 800. Nobody lied — the numbers were
 * true when they were typed and then the site kept growing. That is exactly the
 * failure mode a transparency page cannot afford, because a stale honest number
 * is indistinguishable from a dishonest one to the person reading it.
 *
 * So counts stop being prose that a human maintains and become an artifact the
 * build derives. Run it in verify mode from the deploy gate; it exits non-zero
 * the moment a published number stops matching the disk.
 *
 * USAGE
 *   node scripts/verify-counts.js            # verify; exit 1 on any drift
 *   node scripts/verify-counts.js --fix      # rewrite every published count
 *   node scripts/verify-counts.js --json     # emit counts.json only
 *
 * WHAT IT DELIBERATELY DOES NOT TOUCH
 * Historical numbers. The incident log says the sitemap was "repaired to its
 * full 422 URLs" on 2026-07-17 — that is a true statement about the past and
 * rewriting it to today's count would manufacture a new falsehood while trying
 * to prevent one. Those contexts are matched and skipped explicitly below.
 */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FIX = process.argv.includes('--fix');
const JSON_ONLY = process.argv.includes('--json');

/* ---------- 1. Count from disk ---------- */

const isLive = (name) => name.endsWith('.html') && !name.includes('.bak');

function countHtml(dir) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return 0;
  return fs.readdirSync(abs).filter(isLive).length;
}

function findSitemap() {
  for (const rel of ['sitemap.xml', 'public/sitemap.xml']) {
    const abs = path.join(ROOT, rel);
    if (fs.existsSync(abs)) return abs;
  }
  return null;
}

function countSitemap() {
  const abs = findSitemap();
  if (!abs) return 0;
  const m = fs.readFileSync(abs, 'utf8').match(/<loc>/g);
  return m ? m.length : 0;
}

function countStoreProducts() {
  // Truth = distinct Stripe checkout destinations actually offered for sale on
  // the store, NOT the number of cards rendered. A card without a working
  // checkout is not a product, it is a promise.
  const abs = path.join(ROOT, 'store.html');
  if (!fs.existsSync(abs)) return 0;
  const html = fs.readFileSync(abs, 'utf8');
  const links = html.match(/buy\.stripe\.com\/[A-Za-z0-9]+/g) || [];
  return new Set(links).size;
}

function countEmailTemplates() {
  const abs = path.join(ROOT, 'email-templates');
  if (!fs.existsSync(abs)) return 0;
  return fs.readdirSync(abs).filter((f) => !f.includes('.bak')).length;
}

const counts = {
  tools: countHtml('tools'),
  blog: countHtml('blog'),
  products: countHtml('products'),
  storeProducts: countStoreProducts(),
  emailTemplates: countEmailTemplates(),
  sitemap: countSitemap(),
  verifiedAt: new Date().toISOString().slice(0, 10),
};

/* ---------- 2. Where each count is published ---------- */

/**
 * Every rule is anchored two ways, because one anchor is not enough.
 *
 * 1. PHRASE — the words after the number must name the thing being counted.
 * 2. KNOWN — the number itself must be a value ABUZ8 has actually published.
 *
 * The second anchor is the one that matters. A phrase match alone happily
 * rewrites "5-10 blog posts per week" (advice to a reader), "a 2021 blog post"
 * (a date), and "how to write 30 blog posts a month" (an article title) into
 * the site's own post count. All three were caught in the first dry run. A
 * number that passes the phrase but not the allowlist is reported for a human
 * to look at and otherwise left exactly where it is.
 */
const KNOWN = {
  // Historical published values for each surface, oldest → newest.
  tools: [100, 145, 148, 150, 169, 171, 175],
  blog: [147, 185, 398, 441, 483, 498],
  storeProducts: [13, 28, 29, 36, 39],
};

const RULES = [
  { key: 'tools', re: /\b\d{2,4}(?=\s+free\s+(?:browser\s+|AI\s+)?tools?\b)/g },
  { key: 'tools', re: /\b\d{2,4}(?=\s+free\s+tool\s+pages\b)/g },
  { key: 'blog', re: /\b\d{2,4}(?=\s+blog\s+(?:posts?|guides?|pages?|articles?)\b)/g },
  { key: 'blog', re: /\b\d{2,4}(?=\s+guides\s+and\s+posts\b)/g },
  { key: 'storeProducts', re: /\b\d{1,3}(?=\s+(?:store|real|digital)\s+products\b)/g },
  { key: 'storeProducts', re: /\b\d{1,3}(?=-product\s+store\b)/g },
];

// Contexts that are statements about the PAST. Never rewrite a line that
// matches one of these — the number is correct precisely because it is old.
const HISTORICAL = [
  /incident/i,
  /postmortem/i,
  /INC-\d{4}-\d{2}-\d{2}/,
  /was\s+(?:rebuilt|repaired|truncated)/i,
  /repaired\s+it/i,
  /shipped\s+truncated/i,
  /as\s+of\s+20\d\d-\d\d-\d\d/i,
];

const isHistorical = (line) => HISTORICAL.some((re) => re.test(line));

/* data-count attributes are keyed off the human label that sits next to them,
   so the markup stays the source of the mapping and nothing needs hand-keying. */
/* Specific patterns first: on an exact index tie the earlier entry wins, so the
   bare `products` catch-all must sit last or it would shadow "product detail". */
const LABEL_KEYS = [
  [/free\s+tool/i, 'tools'],
  [/guides?\s*&(?:amp;)?\s*posts/i, 'blog'],
  [/blog\s+post/i, 'blog'],
  [/store\s+product/i, 'storeProducts'],
  [/product\s+detail/i, 'products'],
  [/sitemap/i, 'sitemap'],
  [/email\s+template/i, 'emailTemplates'],
  [/\btools?\b/i, 'tools'],
  [/\bproducts?\b/i, 'storeProducts'],
];

/* ---------- 3. Walk the site ---------- */

function targetFiles() {
  const out = [];
  const walk = (dir, depth) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      if (entry.name === '_BACKUPS' || entry.name === 'scratchpad') continue;
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (depth < 2) walk(abs, depth + 1);
      } else if (isLive(entry.name)) {
        out.push(abs);
      }
    }
  };
  walk(ROOT, 0);
  return out;
}

const drift = [];   // published one of our numbers, and it went stale → rewrite
const review = [];  // matched the phrase but was never our number → human call
let filesChanged = 0;

for (const file of targetFiles()) {
  const original = fs.readFileSync(file, 'utf8');
  let html = original;
  const rel = path.relative(ROOT, file).replace(/\\/g, '/');

  // 3a. data-count="N" — match to its neighbouring label
  /**
   * The label sits in a SIBLING element, so the window has to run past the
   * counter's own closing tag — anchoring to the first `</div>` stops at
   * `>0</div>` and never sees "Free Tool Pages".
   *
   * The window is a LOOKAHEAD, not part of the match, and that detail is load
   * bearing. Consuming the 200 chars makes the regex resume *after* them, so
   * in a row of four counters only the 1st and 3rd are ever examined — the
   * others sit inside an already-consumed window. That bug shipped a green
   * "every count matches disk" while Blog Posts and Sitemap URLs were both
   * still stale, which is a worse failure than the drift it was hunting.
   */
  html = html.replace(
    /data-count="(\d+)"(>)([^<]*)(?=([\s\S]{0,200}))/g,
    (match, num, gt, fallback, tail) => {
      // Pick the label that appears EARLIEST IN THE TAIL, not the first entry
      // in LABEL_KEYS. Counters sit in rows, so a 200-char window routinely
      // reaches the *next* counter's label too. Trusting list order made a
      // "Store Products" counter match /blog post/ and rewrote 28 → 527.
      let best = null;
      let bestAt = Infinity;
      for (const [re, key] of LABEL_KEYS) {
        const m = tail.match(re);
        if (m && m.index < bestAt) { bestAt = m.index; best = key; }
      }
      // No label we recognise (e.g. "RTX 5090 Rig", "Fake Claims"). The value
      // is a hand-set constant and stays hand-set — but the pre-JS fallback
      // still has to agree with it, or the page renders 0 until scripts run.
      if (!best) {
        return /^\d+$/.test(fallback) && fallback !== num
          ? `data-count="${num}"${gt}${num}`
          : match;
      }
      const truth = String(counts[best]);
      // The inner text is the pre-JS fallback a crawler or a reader with
      // scripting off actually sees, so it has to move with the attribute.
      if (truth === num && (fallback === truth || !/^\d+$/.test(fallback))) return match;
      if (truth !== num) {
        drift.push({ file: rel, what: `data-count (${best})`, published: num, disk: truth });
      }
      const nextFallback = /^\d+$/.test(fallback) ? truth : fallback;
      return `data-count="${truth}"${gt}${nextFallback}`;
    }
  );

  // 3b. prose counts, line by line so historical lines can be skipped
  html = html
    .split('\n')
    .map((line) => {
      if (isHistorical(line)) return line;
      let next = line;
      for (const { key, re } of RULES) {
        next = next.replace(re, (num) => {
          const truth = counts[key];
          if (String(truth) === num) return num;
          if (!KNOWN[key].includes(Number(num))) {
            // Phrase matched but the value was never one of ours. Almost always
            // a date, a range, or someone else's number. Flag, do not touch.
            review.push({ file: rel, what: `prose (${key})`, value: num, line: line.trim().slice(0, 110) });
            return num;
          }
          drift.push({ file: rel, what: `prose (${key})`, published: num, disk: truth });
          return String(truth);
        });
      }
      return next;
    })
    .join('\n');

  if (html !== original) {
    filesChanged++;
    if (FIX) fs.writeFileSync(file, html, 'utf8');
  }
}

/* ---------- 4. Report ---------- */

fs.writeFileSync(path.join(ROOT, 'counts.json'), JSON.stringify(counts, null, 2) + '\n', 'utf8');
if (JSON_ONLY) process.exit(0);

console.log('\nABUZ8 — disk truth ' + counts.verifiedAt);
console.log('─'.repeat(52));
for (const [k, v] of Object.entries(counts)) {
  if (k !== 'verifiedAt') console.log(`  ${k.padEnd(18)} ${v}`);
}

if (review.length) {
  const uniq = new Map();
  for (const r of review) if (!uniq.has(r.line)) uniq.set(r.line, r);
  console.log(`\nℹ️  ${uniq.size} number(s) matched a count phrase but were never ours — left untouched:`);
  for (const r of [...uniq.values()].slice(0, 8)) {
    console.log(`     ${r.value.padStart(4)}  ${r.file}\n           "${r.line}"`);
  }
  if (uniq.size > 8) console.log(`     … and ${uniq.size - 8} more`);
}

if (!drift.length) {
  console.log('\n✅ Every published count matches disk.\n');
  process.exit(0);
}

// Collapse to unique claims so one stale number repeated across 13 pages reads
// as one problem with a blast radius, not as 13 unrelated problems.
const grouped = new Map();
for (const d of drift) {
  const k = `${d.what}|${d.published}→${d.disk}`;
  if (!grouped.has(k)) grouped.set(k, { ...d, files: new Set() });
  grouped.get(k).files.add(d.file);
}

console.log(`\n${FIX ? '🔧 REWROTE' : '⚠️  DRIFT'} — ${grouped.size} stale claims across ${filesChanged} files\n`);
for (const g of [...grouped.values()].sort((a, b) => b.files.size - a.files.size)) {
  console.log(`  ${g.what.padEnd(26)} ${String(g.published).padStart(4)} → ${String(g.disk).padEnd(5)} (${g.files.size} file${g.files.size > 1 ? 's' : ''})`);
}

if (!FIX) {
  console.log('\nRun with --fix to correct them.\n');
  process.exit(1);
}
console.log('\n✅ Counts rewritten. Re-run without --fix to confirm clean.\n');
