#!/usr/bin/env python3
# Morning Shift 2026-08-09 (AbuJarvis) — wire the 7 net-new 2026-08-09 blog posts into
# the two discovery surfaces (sitemap.xml + blog/index.html). The 04:5x weekly run wrote
# the post files to disk but did NOT touch sitemap/index (per MEMORY.md 2026-08-09 entry).
#
# Rules honored:
#  - EXACT-slug matching (ERRORS.md warns against substring collisions).
#  - Idempotent: re-running does nothing if slugs already present.
#  - Titles/descriptions pulled FROM the post files, never hand-transcribed.
#  - Backups already made (.bak-2026-08-09-publish7). Deploy left as on-box/owner step.
import re, sys, html, os

SITE = "/sessions/affectionate-gifted-goodall/mnt/ABU/abuz8ai-site"
BLOGDIR = os.path.join(SITE, "blog")
SITEMAP = os.path.join(SITE, "sitemap.xml")
INDEX = os.path.join(BLOGDIR, "index.html")
DATE_ISO = "2026-08-09"
DATE_HUMAN = "August 9, 2026"

SLUGS = ["barbers", "pet-groomers", "moving-companies", "pool-services",
         "tutors", "appliance-repair", "home-inspectors"]

def extract(slug):
    """Pull og:title + meta description straight from the post file on disk."""
    path = os.path.join(BLOGDIR, f"ai-agent-for-{slug}.html")
    with open(path, encoding="utf-8") as fh:
        src = fh.read()
    m_title = re.search(r'<meta property="og:title" content="([^"]*)"', src)
    m_desc  = re.search(r'<meta name="description" content="([^"]*)"', src)
    if not m_title or not m_desc:
        sys.exit(f"FATAL: could not extract title/desc for {slug}")
    return m_title.group(1), m_desc.group(1)

posts = {s: extract(s) for s in SLUGS}

# ---------- 1. SITEMAP ----------
with open(SITEMAP, encoding="utf-8") as fh:
    sm = fh.read()

sm_added = 0
new_loc_lines = []
for slug in SLUGS:
    loc = f"https://abuz8ai.com/blog/ai-agent-for-{slug}"
    # exact match on the full loc URL (word boundary via the closing </loc>)
    if f"<loc>{loc}</loc>" in sm:
        continue
    new_loc_lines.append(
        f"  <url><loc>{loc}</loc><lastmod>{DATE_ISO}</lastmod>"
        f"<changefreq>monthly</changefreq><priority>0.7</priority></url>"
    )
    sm_added += 1

if sm_added:
    # insert immediately before the closing </urlset>
    assert sm.count("</urlset>") == 1, "unexpected sitemap structure"
    block = "\n".join(new_loc_lines) + "\n"
    sm = sm.replace("</urlset>", block + "</urlset>")
    with open(SITEMAP, "w", encoding="utf-8") as fh:
        fh.write(sm)

# ---------- 2. BLOG INDEX ----------
with open(INDEX, encoding="utf-8") as fh:
    idx = fh.read()

idx_added = 0
cards = []
for slug in SLUGS:
    href = f"/blog/ai-agent-for-{slug}.html"
    if f'href="{href}"' in idx:   # exact href match
        continue
    title, desc = posts[slug]
    # match the existing card format byte-for-byte (2-space + 4-space indentation)
    cards.append(
        f'  <a href="{href}" class="post" data-date="{DATE_ISO}">\n'
        f'    <div class="post-meta">Builder Notes &middot; {DATE_HUMAN}</div>\n'
        f'    <div class="post-title">{title}</div>\n'
        f'    <div class="post-desc">{desc}</div>\n'
        f'  </a>\n'
    )
    idx_added += 1

if idx_added:
    anchor = '  <div id="post-list">\n'
    assert idx.count(anchor) == 1, "unexpected post-list anchor"
    idx = idx.replace(anchor, anchor + "".join(cards), 1)
    with open(INDEX, "w", encoding="utf-8") as fh:
        fh.write(idx)

print(f"sitemap: +{sm_added} loc   index: +{idx_added} cards")
