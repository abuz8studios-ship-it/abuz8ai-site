import sys, io, os, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
SITE = r"E:\ABU\abuz8ai-site"
SCR = os.path.join(SITE, "scratch_evening_2026-07-29")
cards = open(os.path.join(SCR, "cards.html"), encoding='utf-8').read()
n = cards.count('class="post"')

HEAD = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>ABUZ8 Blog \u2014 AI Tools, Sovereign Systems, Builder Notes</title>
<meta name="description" content="Tactics, teardowns, and field notes on AI tools \u2014 from the team building the sovereign agentic OS. Free tools, no fluff, ship it.">
<link rel="canonical" href="https://abuz8ai.com/blog/">
<meta property="og:title" content="ABUZ8 Blog \u2014 AI Tools, Sovereign Systems, Builder Notes">
<meta property="og:description" content="Tactics, teardowns, and field notes on AI tools.">
<meta property="og:type" content="website">
<meta property="og:url" content="https://abuz8ai.com/blog/">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/_mobile-fix.css">
<style>
:root {
  --lapis: #0a1628; --lapis-mid: #0f2040; --gold: #c9a84c; --gold-light: #e8d48b;
  --turq: #0e9f6e; --text: #e8e4d8; --dim: #8a9aaa; --border: #1a2e50;
  --card: #0d1a30; --cream: #f5f0e8;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: var(--lapis); color: var(--text); font-family: 'Inter', sans-serif; line-height: 1.7; min-height: 100vh; }
.container { max-width: 920px; margin: 0 auto; padding: 60px 24px; }
.back { color: var(--gold); text-decoration: none; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; }
.back:hover { color: var(--gold-light); }
h1 { font-family: 'Playfair Display', serif; font-size: clamp(2.4rem, 6vw, 4rem); color: var(--cream); margin: 24px 0 12px; line-height: 1.05; }
.sub { color: var(--dim); font-size: 18px; font-weight: 300; margin-bottom: 50px; max-width: 640px; }
.post { display: block; padding: 28px 0; border-bottom: 1px solid var(--border); text-decoration: none; color: var(--text); transition: padding 0.2s; }
.post:hover { padding-left: 8px; }
.post-meta { color: var(--turq); font-size: 11px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 6px; }
.post-title { font-family: 'Playfair Display', serif; font-size: 26px; color: var(--cream); margin-bottom: 8px; }
.post:hover .post-title { color: var(--gold-light); }
.post-desc { color: var(--dim); font-size: 15px; }
footer { margin-top: 60px; padding-top: 30px; border-top: 1px solid var(--border); color: var(--dim); font-size: 13px; }
'''
open(os.path.join(SCR, "_head.txt"), "w", encoding='utf-8').write(HEAD)
print("wrote _head.txt; cards n=", n)

PAGI_CSS = '''/* --- archive controls (added 2026-07-29: full-archive pagination + filter) --- */
.blog-tools { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 8px; }
#blog-search { flex: 1 1 260px; background: var(--card); border: 1px solid var(--border); color: var(--text);
  font-family: 'Inter', sans-serif; font-size: 15px; padding: 12px 16px; border-radius: 8px; }
#blog-search::placeholder { color: var(--dim); }
#blog-search:focus { outline: none; border-color: var(--gold-dim, #8a7030); }
.blog-count { color: var(--dim); font-size: 13px; white-space: nowrap; }
.pager { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; justify-content: center;
  margin-top: 44px; padding-top: 28px; border-top: 1px solid var(--border); }
.pager button { background: var(--card); border: 1px solid var(--border); color: var(--text);
  font-family: 'Inter', sans-serif; font-size: 14px; padding: 9px 15px; border-radius: 8px; cursor: pointer;
  transition: border-color 0.2s, color 0.2s; }
.pager button:hover:not(:disabled) { border-color: var(--gold); color: var(--gold-light); }
.pager button:disabled { opacity: 0.4; cursor: default; }
.pager button.active { background: var(--gold); color: var(--lapis); border-color: var(--gold); font-weight: 600; }
.pager .gap { color: var(--dim); padding: 0 4px; }
.no-results { color: var(--dim); padding: 40px 0; font-size: 16px; }
@media (prefers-reduced-motion: reduce) {
  .post, .pager button { transition: none; }
}
</style>
</head>
<body>
<div class="container">
  <a href="/" class="back">&larr; ABUZ8.AI</a>
  <h1>Builder Notes</h1>
  <p class="sub">Tactics, teardowns, and field notes from the team building the sovereign agentic OS. Free tools. No fluff. Ship it.</p>
  <div class="blog-tools">
    <input type="search" id="blog-search" placeholder="Search the archive…" aria-label="Search blog posts">
    <span class="blog-count" id="blog-count"></span>
  </div>
  <div id="post-list">
'''
open(os.path.join(SCR, "_pagi_body.txt"), "w", encoding='utf-8').write(PAGI_CSS)
print("wrote _pagi_body.txt")

TAIL = '''  </div>
  <div class="pager" id="pager"></div>
  <footer>
    Built by ABUZ8 LLC. We're building <a href="/qadir.html" style="color:var(--turq);">QADIR OS</a> — the sovereign agentic operating system.
  </footer>
</div>
<script>
/* Full-archive blog index: client-side pagination + filter.
   Progressive enhancement — if this script does nothing, every post
   is still a visible <a class="post"> in the DOM (fails open). */
(function () {
  var PER = 24;
  var list = document.getElementById('post-list');
  if (!list) return;
  var all = Array.prototype.slice.call(list.querySelectorAll('a.post'));
  var pager = document.getElementById('pager');
  var search = document.getElementById('blog-search');
  var count = document.getElementById('blog-count');
  var page = 1, filtered = all;

  function haystack(el) {
    return (el.textContent || '').toLowerCase();
  }
  function applyFilter(q) {
    q = (q || '').trim().toLowerCase();
    filtered = !q ? all : all.filter(function (el) { return haystack(el).indexOf(q) !== -1; });
    page = 1;
    render();
  }
  function render() {
    var total = filtered.length;
    var pages = Math.max(1, Math.ceil(total / PER));
    if (page > pages) page = pages;
    var start = (page - 1) * PER, end = start + PER;
    all.forEach(function (el) { el.style.display = 'none'; });
    filtered.slice(start, end).forEach(function (el) { el.style.display = 'block'; });
    if (count) count.textContent = total + (total === 1 ? ' post' : ' posts');
    var nr = list.querySelector('.no-results');
    if (total === 0) {
      if (!nr) { nr = document.createElement('div'); nr.className = 'no-results';
        nr.textContent = 'No posts match that search.'; list.appendChild(nr); }
    } else if (nr) { nr.remove(); }
    buildPager(pages);
  }
  function btn(label, target, opts) {
    opts = opts || {};
    var b = document.createElement('button');
    b.textContent = label;
    if (opts.active) b.className = 'active';
    if (opts.disabled) b.disabled = true;
    if (opts.aria) b.setAttribute('aria-label', opts.aria);
    b.addEventListener('click', function () {
      page = target;
      render();
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
    return b;
  }
  function buildPager(pages) {
    if (!pager) return;
    pager.innerHTML = '';
    if (pages <= 1) return;
    pager.appendChild(btn('\\u2190 Prev', page - 1, { disabled: page === 1, aria: 'Previous page' }));
    var win = [], i;
    win.push(1);
    for (i = page - 1; i <= page + 1; i++) if (i > 1 && i < pages) win.push(i);
    if (pages > 1) win.push(pages);
    win = win.filter(function (v, idx, a) { return a.indexOf(v) === idx; }).sort(function (a, b) { return a - b; });
    var prev = 0;
    win.forEach(function (p) {
      if (prev && p - prev > 1) { var g = document.createElement('span'); g.className = 'gap'; g.textContent = '…'; pager.appendChild(g); }
      pager.appendChild(btn(String(p), p, { active: p === page, aria: 'Page ' + p }));
      prev = p;
    });
    pager.appendChild(btn('Next \\u2192', page + 1, { disabled: page === pages, aria: 'Next page' }));
  }
  if (search) {
    var t;
    search.addEventListener('input', function () {
      clearTimeout(t); t = setTimeout(function () { applyFilter(search.value); }, 120);
    });
  }
  render();
})();
</script>
<script src="/assets/js/abuz8-intent.js" defer></script>
<script src="/blog/_blog-shared.js" defer></script>
</body>
</html>
'''
open(os.path.join(SCR, "_tail.txt"), "w", encoding='utf-8').write(TAIL)

# assemble full file
head = open(os.path.join(SCR, "_head.txt"), encoding='utf-8').read()
pagi = open(os.path.join(SCR, "_pagi_body.txt"), encoding='utf-8').read()
tail = open(os.path.join(SCR, "_tail.txt"), encoding='utf-8').read()
full = head + pagi + cards + "\n" + tail
OUT = os.path.join(SCR, "index_new.html")
open(OUT, "w", encoding='utf-8').write(full)
print("wrote", OUT, "bytes:", len(full))
print("cards in file:", full.count('class="post"'))
print("ends with </html>:", full.rstrip().endswith("</html>"))
