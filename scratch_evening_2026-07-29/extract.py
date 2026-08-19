import sys, io, os, re, glob, json, html
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SITE = r"E:\ABU\abuz8ai-site"
BLOG = os.path.join(SITE, "blog")

blog_files = [f for f in glob.glob(os.path.join(BLOG, "*.html"))
              if os.path.basename(f) != "index.html" and ".bak-" not in f
              and ".bak" not in os.path.basename(f)]

def grab(rx, s, default=""):
    m = re.search(rx, s, re.I | re.S)
    return m.group(1).strip() if m else default

def extract(path):
    s = open(path, encoding='utf-8', errors='replace').read()
    slug = os.path.basename(path)[:-5]
    # title: prefer <title>, strip site suffix
    title = grab(r"<title>(.*?)</title>", s, slug)
    title = re.sub(r"\s*[|\u2014\-]\s*ABUZ8.*$", "", title, flags=re.I).strip()
    # description: meta description
    desc = grab(r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', s)
    if not desc:
        desc = grab(r'<meta\s+property=["\']og:description["\']\s+content=["\'](.*?)["\']', s)
    # date: JSON-LD datePublished, else og:article:published_time, else file mtime
    date = grab(r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})', s)
    if not date:
        date = grab(r'article:published_time["\']\s+content=["\'](\d{4}-\d{2}-\d{2})', s)
    mtime = os.path.getmtime(path)
    return {"slug": slug, "title": title, "desc": desc, "date": date, "mtime": mtime}

rows = [extract(f) for f in blog_files]
print("extracted:", len(rows))
# sanity: how many have real dates / titles / descs
print("with date :", sum(1 for r in rows if r["date"]))
print("with desc :", sum(1 for r in rows if r["desc"]))
print("title==slug (unparsed):", sum(1 for r in rows if r["title"] == r["slug"]))
# show 3 samples
for r in rows[:3]:
    print("---")
    print(" slug:", r["slug"])
    print(" title:", r["title"][:70])
    print(" date:", r["date"], "| descLen:", len(r["desc"]))
json.dump(rows, open(os.path.join(SITE, "scratch_evening_2026-07-29", "posts.json"), "w", encoding='utf-8'))
print("WROTE posts.json")
