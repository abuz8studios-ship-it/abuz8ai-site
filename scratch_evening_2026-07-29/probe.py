import sys, io, os, re, glob, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

SITE = r"E:\ABU\abuz8ai-site"
BLOG = os.path.join(SITE, "blog")
TOOLS = os.path.join(SITE, "tools")
SITEMAP = os.path.join(SITE, "sitemap.xml")
INDEX = os.path.join(BLOG, "index.html")

# --- disk counts ---
tool_files = [f for f in glob.glob(os.path.join(TOOLS, "*.html"))
              if not f.endswith(".bak") and ".bak-" not in f]
blog_files = [f for f in glob.glob(os.path.join(BLOG, "*.html"))
              if os.path.basename(f) != "index.html" and ".bak-" not in f]
print("DISK tools *.html      :", len(tool_files))
print("DISK blog *.html (-idx):", len(blog_files))

# --- sitemap parse ---
sm = open(SITEMAP, encoding='utf-8').read()
locs = re.findall(r"<loc>(.*?)</loc>", sm)
print("SITEMAP total <loc>    :", len(locs))
blog_locs = [l for l in locs if "/blog/" in l and not l.rstrip("/").endswith("/blog")]
tool_locs = [l for l in locs if "/tools/" in l]
print("SITEMAP /blog/ locs    :", len(blog_locs))
print("SITEMAP /tools/ locs   :", len(tool_locs))

# --- blog slug helper ---
def slug_of(url):
    p = url.rstrip("/").split("/blog/")[-1]
    p = p.split("#")[0].split("?")[0]
    if p.endswith(".html"): p = p[:-5]
    return p

# --- what's already linked in the human index feed ---
idx = open(INDEX, encoding='utf-8').read()
linked = set(re.findall(r'href="/blog/([^"#?]+?)(?:\.html)?"', idx))
linked = {s.rstrip("/") for s in linked}
card_count = idx.count('class="post"')
print("INDEX card_count       :", card_count)
print("INDEX distinct /blog/ hrefs:", len(linked))

# --- disk basenames (no .html) ---
disk_slugs = {os.path.basename(f)[:-5] for f in blog_files}

# --- the gap: in sitemap AND on disk, but NOT in the feed ---
sm_blog_slugs = {slug_of(l) for l in blog_locs}
missing = sorted((sm_blog_slugs & disk_slugs) - linked)
print("SITEMAP∩DISK blog slugs:", len(sm_blog_slugs & disk_slugs))
print("MISSING from feed      :", len(missing))
print("MISSING first 5        :", missing[:5])
print("MISSING last 5         :", missing[-5:])

# save the missing set for the build step
out = os.path.join(SITE, "scratch_evening_2026-07-29", "missing_slugs.json")
json.dump(missing, open(out, "w", encoding='utf-8'))
print("WROTE:", out)
