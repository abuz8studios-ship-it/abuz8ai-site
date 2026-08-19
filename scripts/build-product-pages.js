/**
 * Build product pages + wire cinematic covers into store.html.
 *
 * - Parses every .pack card in store.html (name, desc, price, stripe url).
 * - Matches each product to a cover in assets/img/covers/ by token overlap
 *   with the PDF stem (covers were rendered 1:1 from the product PDFs).
 * - Injects <img> into matched store cards (idempotent).
 * - Emits /products/<slug>.html — light palette per the design system,
 *   one-time pricing language only, direct Stripe checkout.
 *
 * Run: node scripts/build-product-pages.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const STORE = path.join(ROOT, "store.html");
const COVERS = path.join(ROOT, "assets", "img", "covers");
const OUTDIR = path.join(ROOT, "products");

const html = fs.readFileSync(STORE, "utf8");
const covers = fs.readdirSync(COVERS).filter((f) => f.endsWith(".jpg"));

const tokens = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w && !["the", "ai", "pro", "abuz8", "qadir", "vol", "1", "2"].includes(w));

function matchCover(name) {
  const nt = new Set(tokens(name));
  let best = null;
  let bestScore = 0;
  for (const c of covers) {
    const ct = tokens(c.replace(".jpg", ""));
    const hits = ct.filter((t) => nt.has(t)).length;
    const score = hits / Math.max(ct.length, 1) + hits * 0.1;
    if (hits >= 1 && score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/&amp;/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// ── parse .pack cards ─────────────────────────────────────────────────
const packRe =
  /<div class="pack[^"]*">([\s\S]*?)<a class="buy" href="(https:\/\/buy\.stripe\.com\/[^"]+)"[^>]*>[\s\S]*?<\/div>/g;
const products = [];
let m;
while ((m = packRe.exec(html))) {
  const block = m[1];
  const name = (block.match(/<h4>([\s\S]*?)<\/h4>/) || [])[1];
  const desc = (block.match(/<p>([\s\S]*?)<\/p>/) || [])[1];
  const price = (block.match(/<div class="price">\s*\$([\d.]+)/) || [])[1];
  if (!name || !price) continue;
  products.push({
    name: name.trim(),
    desc: (desc || "").trim().replace(/\s+/g, " "),
    price,
    stripe: m[2],
    slug: slugify(name.trim()),
    cover: matchCover(name),
    blockStart: m.index,
  });
}

// ── product page template (light, vision-safe, one-time only) ─────────
const page = (p) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${p.name} — ABUZ8 Store</title>
<meta name="description" content="${p.desc.slice(0, 150).replace(/"/g, "&quot;")}">
<link rel="canonical" href="https://abuz8ai.com/products/${p.slug}.html">
<script type="application/ld+json">
${JSON.stringify(
  {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.desc,
    image: p.cover ? `https://abuz8ai.com/assets/img/covers/${p.cover}` : undefined,
    offers: {
      "@type": "Offer",
      price: p.price,
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `https://abuz8ai.com/products/${p.slug}.html`,
    },
  },
  null,
  1
)}
</script>
<style>
:root{--bg:#F8FAFC;--panel:#fff;--line:#dbe4ee;--text:#2C3E50;--muted:#5d7186;--primary:#2E75B6;--green:#1e7e4e}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--text);font:16px/1.65 'DM Sans',system-ui,sans-serif}
.nav{padding:16px 24px;border-bottom:1px solid var(--line);background:var(--panel)}
.nav a{color:var(--primary);text-decoration:none;font-weight:600}
.wrap{max-width:880px;margin:0 auto;padding:48px 24px}
.card{display:grid;grid-template-columns:300px 1fr;gap:36px;background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:36px}
.card img{width:100%;border-radius:10px;border:1px solid var(--line)}
h1{font-size:28px;line-height:1.25;margin-bottom:12px}
.price{font-size:30px;font-weight:700;margin:18px 0 4px}
.price span{font-size:14px;color:var(--muted);font-weight:400}
.desc{color:var(--muted)}
.buy{display:inline-block;margin-top:22px;padding:14px 30px;background:var(--primary);color:#fff;border-radius:10px;text-decoration:none;font-weight:700}
.meta{margin-top:18px;font-size:13px;color:var(--muted)}
.back{display:inline-block;margin-bottom:22px;color:var(--primary);text-decoration:none;font-size:14px}
@media(max-width:720px){.card{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="nav"><a href="/">ABUZ8 AI</a> · <a href="/store.html">Store</a></div>
<div class="wrap">
<a class="back" href="/store.html">&larr; Back to the store</a>
<div class="card">
  <div>${p.cover ? `<img src="/assets/img/covers/${p.cover}" alt="${p.name} — cinematic cover">` : ""}</div>
  <div>
    <h1>${p.name}</h1>
    <p class="desc">${p.desc}</p>
    <div class="price">$${p.price} <span>one-time · instant download</span></div>
    <a class="buy" href="${p.stripe}" target="_blank" rel="noopener">Buy now — secure Stripe checkout &rarr;</a>
    <p class="meta">Delivered to your email automatically after payment · Tested before it's sold · Sold by ABUZ8 LLC</p>
  </div>
</div>
</div>
</body></html>
`;

fs.mkdirSync(OUTDIR, { recursive: true });
let pages = 0;
for (const p of products) {
  fs.writeFileSync(path.join(OUTDIR, `${p.slug}.html`), page(p));
  pages++;
}

// ── inject covers + details links into store cards (idempotent) ───────
let out = html;
for (const p of products) {
  if (out.includes(`covers/${p.cover}`)) continue;
  const cardRe = new RegExp(`(<h4>${p.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</h4>)`);
  const img = p.cover
    ? `<img class="cover" src="/assets/img/covers/${p.cover}" alt="${p.name} cover" loading="lazy">`
    : "";
  out = out.replace(cardRe, `${img}$1`);
  // add a details link next to Buy
  const buyRe = new RegExp(
    `(<a class="buy" href="${p.stripe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>[^<]*</a>)`
  );
  if (!out.includes(`/products/${p.slug}.html`))
    out = out.replace(buyRe, `$1\n          <a class="details" href="/products/${p.slug}.html">Details →</a>`);
}
// cover + details CSS (once)
if (!out.includes(".pack img.cover")) {
  out = out.replace(
    "</style>",
    ".pack img.cover{width:100%;border-radius:10px;border:1px solid var(--line);margin-bottom:12px;aspect-ratio:600/776;object-fit:cover}\n.details{display:inline-block;margin-left:12px;font-size:13px;color:var(--primary);text-decoration:none}\n</style>"
  );
}
fs.writeFileSync(STORE, out);

const withCover = products.filter((p) => p.cover).length;
console.log(`products parsed: ${products.length}, pages written: ${pages}, covers matched: ${withCover}`);
console.log("unmatched:", products.filter((p) => !p.cover).map((p) => p.name).join(" | ") || "none");
