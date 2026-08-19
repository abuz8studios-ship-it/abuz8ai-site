#!/usr/bin/env node
/**
 * unify-store-nav.js — one storefront, one nav item, one canonical URL.
 *
 * THE PROBLEM (audited 2026-07-29)
 * The site shipped two catalogues of the same 28 products:
 *
 *   /store.html     28 cards, 28 Stripe checkouts, 28 detail links  ← sells
 *   /products.html  the same 28 products alphabetised, 0 buy links  ← dead end
 *
 * Both sat in the global nav on 67 pages — "Store" (142 anchors) and
 * "Products" (131 anchors). Half of everyone who wanted to buy something
 * clicked the half that cannot take money, and the two pages competed with
 * each other for the same search query on top of that.
 *
 * THE FIX
 *   1. Drop the "Products" nav anchor everywhere. One nav item: Store.
 *   2. 301 /products.html → /store.html so existing links and any accrued
 *      ranking land on the page that sells.
 *   3. Keep /products/<slug>.html — the 28 detail pages are real SEO surface
 *      and are linked from every store card. Only the duplicate INDEX dies.
 *
 * Run:  node scripts/unify-store-nav.js [--fix]
 */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FIX = process.argv.includes('--fix');

// Only the nav anchor — an exact href + exact label pair. Contextual in-body
// links read differently ("Product detail pages", "see the products") and are
// left alone so this can never eat prose.
const NAV_ANCHOR = /<a\s+href="\/products\.html"\s*>Products<\/a>/g;

const files = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith('.html') && !f.includes('.bak') && f !== 'products.html');

let changed = 0;
let anchors = 0;
const touched = [];

for (const f of files) {
  const abs = path.join(ROOT, f);
  const before = fs.readFileSync(abs, 'utf8');
  const hits = (before.match(NAV_ANCHOR) || []).length;
  if (!hits) continue;
  const after = before.replace(NAV_ANCHOR, '');
  anchors += hits;
  changed++;
  touched.push(`${f} (${hits})`);
  if (FIX) fs.writeFileSync(abs, after, 'utf8');
}

console.log(`\n${FIX ? 'Removed' : 'Would remove'} ${anchors} "Products" nav anchors across ${changed} pages.`);
console.log(touched.slice(0, 6).map((t) => '  ' + t).join('\n'));
if (touched.length > 6) console.log(`  … and ${touched.length - 6} more`);

/* ---- the redirect ---- */
const redirects = path.join(ROOT, '_redirects');
const RULE = '/products.html  /store.html  301';
const body = fs.existsSync(redirects) ? fs.readFileSync(redirects, 'utf8') : '';

if (body.includes('/products.html')) {
  console.log('\n_redirects already routes /products.html — left as is.');
} else if (FIX) {
  const header = '\n# Duplicate catalogue retired 2026-07-29: /products.html listed the same\n' +
                 '# 28 products as /store.html with no buy buttons. One storefront.\n';
  fs.writeFileSync(redirects, body.replace(/\s*$/, '\n') + header + RULE + '\n', 'utf8');
  console.log('\nAdded 301: /products.html → /store.html');
} else {
  console.log('\nWould add 301: /products.html → /store.html');
}

if (!FIX) console.log('\nRun with --fix to apply.\n');
