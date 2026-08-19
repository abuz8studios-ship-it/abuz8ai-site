# -*- coding: utf-8 -*-
# Morning Shift 2026-08-04 — publish the 7 skilled-trades blog posts
# (add to sitemap.xml + blog/index.html cards). Reversible, verified.
import sys, io, os, re, shutil, datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="ignore")
ROOT = r"E:\ABU\abuz8ai-site"
BLOG = os.path.join(ROOT, "blog")
SITEMAP = os.path.join(ROOT, "sitemap.xml")
INDEX = os.path.join(BLOG, "index.html")
STAMP = "2026-08-04"
DATE_HUMAN = "August 4, 2026"

SLUGS = [
    "plumbers", "electricians", "roofers", "landscapers",
    "auto-repair-shops", "pest-control", "cleaning-services",
]

def meta(slug):
    p = os.path.join(BLOG, f"ai-agent-for-{slug}.html")
    html = open(p, encoding="utf-8", errors="ignore").read()
    def grab(pat):
        m = re.search(pat, html, re.I)
        return m.group(1).strip() if m else ""
    title = grab(r'<meta property="og:title" content="([^"]+)"') or grab(r"<title>([^<]+)</title>")
    desc = grab(r'<meta name="description" content="([^"]+)"') or grab(r'<meta property="og:description" content="([^"]+)"')
    return title, desc, os.path.exists(p)

print("=== metadata extracted ===")
POSTS = []
for s in SLUGS:
    t, d, ex = meta(s)
    POSTS.append((s, t, d))
    print(f"[{'OK' if ex else 'MISS'}] {s} :: {t[:60]}")

# ---------- SITEMAP ----------
sm = open(SITEMAP, encoding="utf-8", errors="ignore").read()
before = sm.count("<loc>")
existing_slugs = set(re.findall(r"/blog/(ai-agent-for-[a-z0-9-]+)</loc>", sm))
new_lines = []
for s, t, d in POSTS:
    loc = f"ai-agent-for-{s}"
    if loc in existing_slugs:
        print(f"  SKIP (already in sitemap): {loc}")
        continue
    new_lines.append(
        f"  <url><loc>https://abuz8ai.com/blog/{loc}</loc>"
        f"<lastmod>{STAMP}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>"
    )
block = "\n".join(new_lines)
assert "</urlset>" in sm, "no </urlset> close tag!"
if new_lines:
    shutil.copyfile(SITEMAP, SITEMAP + ".bak-2026-08-04-publish7")
    sm2 = sm.replace("</urlset>", block + "\n</urlset>")
    open(SITEMAP, "w", encoding="utf-8").write(sm2)
    after = sm2.count("<loc>")
    print(f"SITEMAP: {before} -> {after} locs (+{len(new_lines)})")
else:
    print("SITEMAP: nothing to add")

# validate well-formed + dup check
import xml.dom.minidom as MD
try:
    MD.parse(SITEMAP)
    print("SITEMAP: XML well-formed OK")
except Exception as e:
    print("SITEMAP: XML PARSE ERROR:", e)
locs = re.findall(r"<loc>([^<]+)</loc>", open(SITEMAP, encoding="utf-8", errors="ignore").read())
dups = [x for x in set(locs) if locs.count(x) > 1]
print(f"SITEMAP: total {len(locs)} locs, {len(dups)} dups")

# ---------- BLOG INDEX ----------
def esc(x):
    return (x.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))

idx = open(INDEX, encoding="utf-8", errors="ignore").read()
idx_before_cards = len(re.findall(r'<a href="/blog/[^"]+" class="post"', idx))
# already-carded slugs
carded = set(re.findall(r'<a href="/blog/(ai-agent-for-[a-z0-9-]+)\.html" class="post"', idx))

cards = []
for s, t, d in POSTS:
    slug = f"ai-agent-for-{s}"
    if slug in carded:
        print(f"  SKIP (already carded): {slug}")
        continue
    card = (
        f'  <a href="/blog/{slug}.html" class="post" data-date="{STAMP}">\n'
        f'    <div class="post-meta">Builder Notes &middot; {DATE_HUMAN}</div>\n'
        f'    <div class="post-title">{esc(t)}</div>\n'
        f'    <div class="post-desc">{esc(d)}</div>\n'
        f'  </a>'
    )
    cards.append(card)

# insertion boundary: right before the first existing post card (newest-first top)
m = re.search(r'\n  <a href="/blog/[^"]+" class="post"', idx)
if cards and m:
    shutil.copyfile(INDEX, INDEX + ".bak-2026-08-04-publish7")
    ins = "\n" + "\n".join(cards)
    pos = m.start()
    idx2 = idx[:pos] + ins + idx[pos:]
    open(INDEX, "w", encoding="utf-8").write(idx2)
    idx_after_cards = len(re.findall(r'<a href="/blog/[^"]+" class="post"', idx2))
    print(f"INDEX: {idx_before_cards} -> {idx_after_cards} cards (+{len(cards)})")
else:
    idx2 = idx
    print("INDEX: nothing to insert or boundary not found (cards=%d, boundary=%s)" % (len(cards), bool(m)))

# ---------- VERIFY INDEX ----------
from html.parser import HTMLParser
class ACount(HTMLParser):
    def __init__(self): super().__init__(); self.o=0; self.c=0
    def handle_starttag(self,tag,attrs):
        if tag=="a": self.o+=1
    def handle_endtag(self,tag):
        if tag=="a": self.c+=1

final = open(INDEX, encoding="utf-8", errors="ignore").read()
hrefs = re.findall(r'<a href="/blog/([^"]+\.html)" class="post"', final)
missing = [h for h in hrefs if not os.path.exists(os.path.join(BLOG, h))]
dups = [x for x in set(hrefs) if hrefs.count(x) > 1]
p = ACount(); p.feed(final)
print("=== INDEX VERIFY ===")
print(f"  post-card hrefs: {len(hrefs)}")
print(f"  broken hrefs (no file on disk): {len(missing)} {missing[:5]}")
print(f"  duplicate hrefs: {len(dups)} {dups[:5]}")
print(f"  <a> open={p.o} close={p.c} delta={p.o-p.c}")
print(f"  ends with </html>: {final.rstrip().endswith('</html>')}")
for s,_,_ in POSTS:
    slug=f"ai-agent-for-{s}.html"
    print(f"  present-in-index {slug}: {slug in hrefs}")
print("DONE.")
