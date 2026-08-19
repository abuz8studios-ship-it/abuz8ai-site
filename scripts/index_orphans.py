#!/usr/bin/env python3
"""
index_orphans.py — find blog posts on disk that have NO discovery path
(absent from sitemap.xml AND/OR absent from blog/index.html) and wire them in.

Written 2026-08-10 morning shift.

WHY THIS EXISTS
---------------
A published .html file that is in neither the sitemap nor the blog index is
invisible to crawlers and to humans. Page-liveness, sitemap-presence and
index-linkage are THREE INDEPENDENT SURFACES. A 200 on the page proves none
of the other two. This script asserts all three.

Usage:
    python3 scripts/index_orphans.py --report        # measure only, write nothing
    python3 scripts/index_orphans.py --apply         # take .bak then wire orphans in
"""

import argparse
import datetime
import html
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BLOG_DIR = os.path.join(ROOT, "blog")
SITEMAP = os.path.join(ROOT, "sitemap.xml")
BLOG_INDEX = os.path.join(BLOG_DIR, "index.html")
BASE = "https://abuz8ai.com"

SITEMAP_LINE = (
    '  <url><loc>{base}/blog/{slug}</loc><lastmod>{lastmod}</lastmod>'
    '<changefreq>monthly</changefreq><priority>0.7</priority></url>'
)

CARD = (
    '  <a href="/blog/{slug}.html" class="post" data-date="{date}">\n'
    '    <div class="post-meta">Builder Notes &middot; {pretty}</div>\n'
    '    <div class="post-title">{title}</div>\n'
    '    <div class="post-desc">{desc}</div>\n'
    '  </a>\n'
)

# Files in blog/ that are pages-about-the-blog, not posts.
NON_POST = {"index.html"}


def read(path):
    with open(path, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()


def post_files():
    out = []
    for name in sorted(os.listdir(BLOG_DIR)):
        if not name.endswith(".html"):
            continue
        if ".bak" in name or name in NON_POST:
            continue
        out.append(name)
    return out


def extract(slug):
    """Pull the card fields out of the post itself. H1 is the canonical
    on-page title; the <title> tag carries a ' | ABUZ8' suffix the cards
    do not use."""
    src = read(os.path.join(BLOG_DIR, slug + ".html"))

    m = re.search(r"<h1[^>]*>(.*?)</h1>", src, re.S | re.I)
    if not m:
        m = re.search(r"<title>(.*?)</title>", src, re.S | re.I)
    title = re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else slug
    title = re.sub(r"\s*\|\s*ABUZ8\s*$", "", title)

    m = re.search(
        r'<meta\s+name=["\']description["\']\s+content=["\'](.*?)["\']', src, re.S | re.I
    )
    desc = m.group(1).strip() if m else ""

    # Prefer an explicit machine-readable date; fall back to file mtime.
    date = ""
    for pat in (
        r'"datePublished"\s*:\s*"(\d{4}-\d{2}-\d{2})',
        r'<meta[^>]+article:published_time["\'][^>]+content=["\'](\d{4}-\d{2}-\d{2})',
        r'data-date=["\'](\d{4}-\d{2}-\d{2})',
    ):
        m = re.search(pat, src, re.I)
        if m:
            date = m.group(1)
            break
    if not date:
        ts = os.path.getmtime(os.path.join(BLOG_DIR, slug + ".html"))
        date = datetime.date.fromtimestamp(ts).isoformat()

    d = datetime.date.fromisoformat(date)
    pretty = "%s %d, %d" % (d.strftime("%B"), d.day, d.year)

    return {
        "slug": slug,
        "title": html.escape(title, quote=False),
        "desc": html.escape(desc, quote=False),
        "date": date,
        "pretty": pretty,
    }


def audit():
    sitemap = read(SITEMAP)
    index = read(BLOG_INDEX)
    sm_slugs = set(re.findall(r"<loc>https://abuz8ai\.com/blog/([^<\s]+)</loc>", sitemap))
    ix_slugs = set(re.findall(r'href="/blog/([a-z0-9\-]+)\.html"', index))

    disk = [f[:-5] for f in post_files()]
    missing_sitemap = [s for s in disk if s not in sm_slugs]
    missing_index = [s for s in disk if s not in ix_slugs]
    orphans = sorted(set(missing_sitemap) & set(missing_index))

    # Reverse direction: entries pointing at files that no longer exist.
    disk_set = set(disk)
    ghost_sitemap = sorted(s for s in sm_slugs if s not in disk_set)
    ghost_index = sorted(s for s in ix_slugs if s not in disk_set)

    return {
        "disk": disk,
        "sitemap_slugs": sm_slugs,
        "index_slugs": ix_slugs,
        "missing_sitemap": sorted(missing_sitemap),
        "missing_index": sorted(missing_index),
        "orphans": orphans,
        "ghost_sitemap": ghost_sitemap,
        "ghost_index": ghost_index,
    }


def apply_fix(a):
    stamp = datetime.date.today().isoformat()
    changed = []

    if a["missing_sitemap"]:
        shutil.copy2(SITEMAP, SITEMAP + ".bak-%s-orphans" % stamp)
        sitemap = read(SITEMAP)
        lines = []
        for slug in a["missing_sitemap"]:
            meta = extract(slug)
            lines.append(
                SITEMAP_LINE.format(base=BASE, slug=slug, lastmod=meta["date"])
            )
        block = "\n".join(lines) + "\n"
        assert "</urlset>" in sitemap, "sitemap has no </urlset>"
        sitemap = sitemap.replace("</urlset>", block + "</urlset>")
        with open(SITEMAP, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(sitemap)
        changed.append("sitemap.xml +%d" % len(a["missing_sitemap"]))

    if a["missing_index"]:
        shutil.copy2(BLOG_INDEX, BLOG_INDEX + ".bak-%s-orphans" % stamp)
        index = read(BLOG_INDEX)
        anchor = re.search(r'^[ \t]*<a href="/blog/[^"]+" class="post"', index, re.M)
        assert anchor, "could not locate the first post card in blog/index.html"
        # Newest first, matching how the existing list is ordered.
        metas = [extract(s) for s in a["missing_index"]]
        metas.sort(key=lambda m: (m["date"], m["slug"]), reverse=True)
        cards = "".join(CARD.format(**m) for m in metas)
        index = index[: anchor.start()] + cards + index[anchor.start() :]
        with open(BLOG_INDEX, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(index)
        changed.append("blog/index.html +%d" % len(a["missing_index"]))

    return changed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true")
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()

    a = audit()
    print("posts on disk        : %d" % len(a["disk"]))
    print("in sitemap.xml       : %d" % len(a["sitemap_slugs"] & set(a["disk"])))
    print("linked in blog index : %d" % len(a["index_slugs"] & set(a["disk"])))
    print("missing from sitemap : %d  %s" % (len(a["missing_sitemap"]), a["missing_sitemap"]))
    print("missing from index   : %d  %s" % (len(a["missing_index"]), a["missing_index"]))
    print("FULL ORPHANS (both)  : %d  %s" % (len(a["orphans"]), a["orphans"]))
    print("ghost sitemap entries: %d  %s" % (len(a["ghost_sitemap"]), a["ghost_sitemap"]))
    print("ghost index links    : %d  %s" % (len(a["ghost_index"]), a["ghost_index"]))

    if args.apply:
        changed = apply_fix(a)
        print("APPLIED: %s" % (changed or "nothing to do"))
        post = audit()
        print(
            "RE-AUDIT missing_sitemap=%d missing_index=%d orphans=%d"
            % (
                len(post["missing_sitemap"]),
                len(post["missing_index"]),
                len(post["orphans"]),
            )
        )
        return 0 if not post["orphans"] else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
