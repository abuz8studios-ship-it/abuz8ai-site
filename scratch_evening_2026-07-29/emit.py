import sys, io, os, re, json, html
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SITE = r"E:\ABU\abuz8ai-site"
BLOG = os.path.join(SITE, "blog")
SRT = os.path.join(SITE, "scratch_evening_2026-07-29", "posts_sorted.json")
INDEX = os.path.join(BLOG, "index.html")
rows = json.load(open(SRT, encoding='utf-8'))

# --- harvest existing slug -> category label from the current feed ---
idx = open(INDEX, encoding='utf-8').read()
cat = {}
for m in re.finditer(
    r'href="/blog/([^"#?]+?)\.html"\s+class="post"[^>]*>\s*<div class="post-meta">(.*?)\s*(?:&middot;|·)\s*[^<]*</div>',
    idx, re.S):
    slug, label = m.group(1).strip(), m.group(2).strip()
    cat[slug] = html.unescape(label)
print("harvested category labels:", len(cat))

def esc(t):
    return html.escape(t or "", quote=True)

def label_for(slug):
    return cat.get(slug, "Builder Notes")

def card(r):
    lab = esc(label_for(r["slug"]))
    return (
      f'  <a href="/blog/{esc(r["slug"])}.html" class="post" data-date="{esc(r.get("date") or "")}">\n'
      f'    <div class="post-meta">{lab} &middot; {esc(r["disp"])}</div>\n'
      f'    <div class="post-title">{esc(r["title"])}</div>\n'
      f'    <div class="post-desc">{esc(r["desc"])}</div>\n'
      f'  </a>'
    )

cards = "\n".join(card(r) for r in rows)
print("cards built:", len(rows), "| labeled(non-default):",
      sum(1 for r in rows if r["slug"] in cat))
open(os.path.join(SITE,"scratch_evening_2026-07-29","cards.html"),"w",encoding='utf-8').write(cards)
print("wrote cards.html bytes:", len(cards))
