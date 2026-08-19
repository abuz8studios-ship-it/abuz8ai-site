#!/usr/bin/env python3
"""
verify_orphan_fix.py — independent verification of index_orphans.py's write.

Deliberately does NOT import index_orphans. A reference implementation you wrote
yourself is not an independent check; this re-derives every assertion from the
files on disk plus the .bak backups.

Checks:
  1. sitemap.xml parses as XML, loc count moved by exactly +N, every new loc is
     unique, and no pre-existing loc was lost.
  2. blog/index.html card count moved by exactly +N, <a>/</a> balance unchanged,
     the file still ends in </html>, and the ONLY textual difference vs the
     backup is the inserted block (backup with the block removed == original).
  3. Every newly linked slug resolves to a real file on disk.
"""

import os
import re
import sys
import xml.etree.ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITEMAP = os.path.join(ROOT, "sitemap.xml")
BLOG_INDEX = os.path.join(ROOT, "blog", "index.html")

fails = []


def read(p):
    with open(p, "r", encoding="utf-8", errors="replace") as fh:
        return fh.read()


def newest_bak(path):
    d, base = os.path.dirname(path), os.path.basename(path)
    cands = [f for f in os.listdir(d) if f.startswith(base + ".bak") and "orphans" in f]
    if not cands:
        return None
    cands.sort()
    return os.path.join(d, cands[-1])


def check(label, cond, detail=""):
    print("%-46s %s %s" % (label, "PASS" if cond else "FAIL", detail))
    if not cond:
        fails.append(label)


# ---------- 1. sitemap ----------
raw = read(SITEMAP)
try:
    root = ET.fromstring(raw)
    parsed = True
except ET.ParseError as exc:
    parsed = False
    print("sitemap parse error: %s" % exc)
check("sitemap.xml parses as XML", parsed)

locs = re.findall(r"<loc>([^<]+)</loc>", raw)
check("sitemap loc count == 815", len(locs) == 815, "(got %d)" % len(locs))
check("sitemap locs are unique", len(locs) == len(set(locs)),
      "(%d dupes)" % (len(locs) - len(set(locs))))

bak = newest_bak(SITEMAP)
check("sitemap backup exists", bak is not None, os.path.basename(bak) if bak else "")
if bak:
    old = re.findall(r"<loc>([^<]+)</loc>", read(bak))
    lost = set(old) - set(locs)
    check("no pre-existing sitemap loc lost", not lost, str(sorted(lost)[:5]))
    check("sitemap grew by exactly 7", len(locs) - len(old) == 7,
          "(%d -> %d)" % (len(old), len(locs)))

# ---------- 2. blog index ----------
idx = read(BLOG_INDEX)
cards = re.findall(r'href="/blog/([a-z0-9\-]+)\.html"', idx)
check("blog index card count == 568", len(cards) == 568, "(got %d)" % len(cards))
check("blog index card slugs unique", len(cards) == len(set(cards)),
      "(%d dupes)" % (len(cards) - len(set(cards))))
# Anchor balance must be measured on MARKUP ONLY. blog/index.html's pagination
# script carries a code comment containing the literal text `<a class="post">`,
# which a naive count reads as an unclosed anchor. Verify the instrument before
# believing a red light: strip <script>/<style> first, and assert the DELTA vs
# the backup rather than an absolute, so a pre-existing quirk is never scored as
# damage from this edit.
def markup_only(s):
    s = re.sub(r"<script\b.*?</script>", "", s, flags=re.S | re.I)
    return re.sub(r"<style\b.*?</style>", "", s, flags=re.S | re.I)


_m = markup_only(idx)
_open, _close = len(re.findall(r"<a[\s>]", _m)), _m.count("</a>")
check("blog index <a>/</a> balanced (markup only)", _open == _close,
      "(%d open / %d close)" % (_open, _close))
check("blog index ends </html>", idx.rstrip().endswith("</html>"))
check("blog index has no NUL bytes", "\x00" not in idx)
check("no unsubstituted template tokens",
      "{slug}" not in idx and "{title}" not in idx and "{pretty}" not in idx)

ibak = newest_bak(BLOG_INDEX)
check("blog index backup exists", ibak is not None,
      os.path.basename(ibak) if ibak else "")
NEW = [
    "ai-agent-for-solar-installers", "ai-agent-for-locksmiths",
    "ai-agent-for-physical-therapists", "ai-agent-for-auto-detailing",
    "ai-agent-for-junk-removal", "ai-agent-for-medical-billing",
    "ai-agent-for-staffing-agencies",
]
if ibak:
    old_idx = read(ibak)
    _om = markup_only(old_idx)
    _oo, _oc = len(re.findall(r"<a[\s>]", _om)), _om.count("</a>")
    check("anchor delta == +7 open / +7 close",
          (_open - _oo, _close - _oc) == (7, 7),
          "(+%d / +%d)" % (_open - _oo, _close - _oc))
    # Strip the inserted cards back out; the result must equal the backup byte
    # for byte. This proves the edit touched NOTHING but the insertion.
    stripped = idx
    for slug in NEW:
        m = re.search(
            r'[ \t]*<a href="/blog/%s\.html".*?</a>\n' % re.escape(slug),
            stripped, re.S)
        if m:
            stripped = stripped[: m.start()] + stripped[m.end():]
    check("edit is insertion-only (strip == backup)", stripped == old_idx,
          "(len %d vs %d)" % (len(stripped), len(old_idx)))

# ---------- 3. every new link resolves ----------
missing = [s for s in NEW if not os.path.isfile(os.path.join(ROOT, "blog", s + ".html"))]
check("all 7 new slugs resolve to a file", not missing, str(missing))

in_sitemap = [s for s in NEW if "https://abuz8ai.com/blog/%s</loc>" % s in raw]
check("all 7 new slugs in sitemap", len(in_sitemap) == 7,
      "(%d/7)" % len(in_sitemap))
in_index = [s for s in NEW if '/blog/%s.html"' % s in idx]
check("all 7 new slugs in blog index", len(in_index) == 7, "(%d/7)" % len(in_index))

print("\n%s — %d check(s) failed" % ("FAILED" if fails else "ALL GREEN", len(fails)))
sys.exit(1 if fails else 0)
