#!/usr/bin/env node
/**
 * pause-checkout.js — take every buy button off the store, keep every page.
 *
 * WHY (measured 2026-07-29, verified against the LIVE R2 bucket)
 * The fulfilment PDFs that customers receive are not the products the store
 * describes. sovereign_ai_stack.pdf, sold at $97 as "the full local-first AI
 * stack ABUZ8 runs on", is a 17-page children's picture book: "You are now
 * officially an ABUZ8 Junior Explorer", "Ask a grown-up to email us". Its only
 * code is print("You did it! Great job!"). 33 of 35 product PDFs carry the same
 * markers. workforce_scout_guide.pdf ($27) has 0 readable pages.
 *
 * This was confirmed against production, not an archive copy:
 *   wrangler r2 object get abuz8-downloads/sovereign_ai_stack.pdf
 *   SHA256 35f13cae957411ca01cf9245bbce1a74633e9b0fb8c1cdd479690ca55938d326
 *   — byte-identical to the file read above.
 *
 * The 8 SKUs retired earlier were harmless because their buttons were broken
 * GET links against a POST-only endpoint. These 28 are live buy.stripe.com
 * payment links returning HTTP 200, so a real customer could pay today and
 * receive a children's book. That is the chargeback / Stripe-ban / FTC
 * exposure the money guardrail exists to prevent.
 *
 * WHAT THIS DOES
 * Replaces each buy anchor with a non-interactive .buy-paused notice. Prices,
 * copy, detail pages, and Stripe payment links are all left intact — nothing
 * is deleted and no money moves. Fully reversible: --restore puts every
 * original anchor back from the .pause-bak sidecar.
 *
 * Run:  node scripts/pause-checkout.js            # dry run
 *       node scripts/pause-checkout.js --fix
 *       node scripts/pause-checkout.js --restore
 */

'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FIX = process.argv.includes('--fix');
const RESTORE = process.argv.includes('--restore');

const NOTICE =
  '<span class="buy-paused" role="status" aria-live="polite" ' +
  'title="Checkout paused 2026-07-29 pending a fulfilment audit.">' +
  'Checkout paused &mdash; under review</span>';

// Any anchor whose href is a Stripe payment link, whatever its classes or label.
const BUY_ANCHOR = /<a\b[^>]*href="https:\/\/buy\.stripe\.com\/[A-Za-z0-9]+"[^>]*>[\s\S]*?<\/a>/g;

function targets() {
  const out = [];
  const push = (p) => { if (fs.existsSync(p)) out.push(p); };
  push(path.join(ROOT, 'store.html'));
  push(path.join(ROOT, 'comfyui-blueprint.html'));
  push(path.join(ROOT, 'store-preview.html'));
  const pdir = path.join(ROOT, 'products');
  if (fs.existsSync(pdir)) {
    for (const f of fs.readdirSync(pdir)) {
      if (f.endsWith('.html') && !f.includes('.bak')) push(path.join(pdir, f));
    }
  }
  return out;
}

let files = 0, anchors = 0, stock = 0;

for (const abs of targets()) {
  const rel = path.relative(ROOT, abs);
  const bak = abs + '.pause-bak';

  if (RESTORE) {
    if (fs.existsSync(bak)) {
      if (FIX) { fs.copyFileSync(bak, abs); fs.unlinkSync(bak); }
      files++;
      console.log(`  restore ${rel}`);
    }
    continue;
  }

  const before = fs.readFileSync(abs, 'utf8');
  const hits = (before.match(BUY_ANCHOR) || []).length;
  const instock = (before.match(/https:\/\/schema\.org\/InStock/g) || []).length;
  if (!hits && !instock) continue;

  let after = before.replace(BUY_ANCHOR, NOTICE);
  // Structured data must not advertise stock we are not selling — Google shows
  // availability in rich results, so leaving InStock here would keep promising
  // a purchase the page no longer offers.
  after = after.replace(/https:\/\/schema\.org\/InStock/g, 'https://schema.org/PreOrder');

  anchors += hits; stock += instock; files++;
  console.log(`  ${rel.padEnd(46)} ${String(hits).padStart(2)} buy  ${String(instock).padStart(2)} InStock`);

  if (FIX) {
    if (!fs.existsSync(bak)) fs.writeFileSync(bak, before, 'utf8');
    fs.writeFileSync(abs, after, 'utf8');
  }
}

/* ---- the paused-state style, appended to the theme once ---- */
const CSS = path.join(ROOT, 'assets', 'css', 'abuz8-theme.css');
const CSS_MARK = '.buy-paused';
if (!RESTORE && fs.existsSync(CSS)) {
  const css = fs.readFileSync(CSS, 'utf8');
  if (!css.includes(CSS_MARK)) {
    const block = `

/* ---------- CHECKOUT PAUSED (2026-07-29) ----------
   Shown where a buy button used to be. Deliberately not a link and not
   styled like one: the visitor must not be able to start a purchase we
   cannot honestly fulfil. Restored by scripts/pause-checkout.js --restore. */
.buy-paused{display:inline-flex;align-items:center;justify-content:center;
  min-height:44px;padding:11px 16px;border-radius:var(--r-sm);font-weight:600;
  font-size:13px;letter-spacing:.02em;cursor:default;
  color:var(--dim);background:rgba(85,96,112,.12);
  border:1px dashed var(--border)}
`;
    if (FIX) fs.writeFileSync(CSS, css.replace(/\s*$/, '\n') + block, 'utf8');
    console.log(`\n${FIX ? 'Added' : 'Would add'} .buy-paused style to abuz8-theme.css`);
  }
}

console.log(
  RESTORE
    ? `\n${FIX ? 'Restored' : 'Would restore'} ${files} files from .pause-bak`
    : `\n${FIX ? 'Paused' : 'Would pause'} ${anchors} buy anchors + ${stock} InStock claims across ${files} files`
);
if (!FIX) console.log('Run with --fix to apply.\n');
